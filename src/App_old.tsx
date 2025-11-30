import React, { useState, useRef, useEffect } from 'react';
import { Palette, Eraser, Undo2, Redo2, ArrowRight, Home, Image, Camera, Upload, Trash2, Zap, Eye, Download, RefreshCw } from 'lucide-react';
import DrawingCanvas from './components/DrawingCanvas';
import ColorPalette from './components/ColorPalette';
import BrushSettings from './components/BrushSettings';
import DrawChallenge from './components/DrawChallenge';
import CameraView from './components/CameraView';
import ImageUpload from './components/ImageUpload';
import Header from './components/Header';
import { DrawingProvider } from './contexts/DrawingContext';
import { detectObjects, canvasToBase64, drawImageAndPredictions } from './services/RoboflowService';
import { createAnimationElements } from './services/AnimationService';
import { saveCanvasImage } from './utils/imageUtils';
import './App.css';

// Add type for timeout
type Timeout = ReturnType<typeof setTimeout>;

function App() {
  const [activeTab, setActiveTab] = useState<'draw' | 'challenge'>('draw');
  const [showTools, setShowTools] = useState(true);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [showBrushSettings, setShowBrushSettings] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [currentImage, setCurrentImage] = useState<HTMLImageElement | null>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const segmentationCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const resizeTimeoutRef = useRef<Timeout>();
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageURL, setImageURL] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [showPredictions, setShowPredictions] = useState(true);
  const [processingTime, setProcessingTime] = useState<number | null>(null);

  // Initialize segmentation canvas
  useEffect(() => {
    if (segmentationCanvasRef.current && drawingCanvasRef.current) {
      const drawingCanvas = drawingCanvasRef.current;
      const segmentationCanvas = segmentationCanvasRef.current;
      
      // Match the size of the segmentation canvas to the drawing canvas
      segmentationCanvas.width = drawingCanvas.width;
      segmentationCanvas.height = drawingCanvas.height;
      
      // Position the segmentation canvas on top of the drawing canvas
      segmentationCanvas.style.position = 'absolute';
      segmentationCanvas.style.top = '0';
      segmentationCanvas.style.left = '0';
      segmentationCanvas.style.pointerEvents = 'none'; // Allow drawing through the segmentation canvas
    }
  }, []);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && segmentationCanvasRef.current) {
        const container = containerRef.current;
        const segmentationCanvas = segmentationCanvasRef.current;
        
        // Update segmentation canvas size to match container
        segmentationCanvas.width = container.clientWidth;
        segmentationCanvas.height = container.clientHeight;
        
        // Store and restore the current segmentation data
        const ctx = segmentationCanvas.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, segmentationCanvas.width, segmentationCanvas.height);
          ctx.putImageData(imageData, 0, 0);
        }
      }
    };

    // Initial size calculation
    handleResize();

    // Add resize listener
    window.addEventListener('resize', () => {
      setIsResizing(true);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(() => {
        handleResize();
        setIsResizing(false);
      }, 250); // Debounce resize events
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  // Update canvas sizes when canvasSize changes
  useEffect(() => {
    if (drawingCanvasRef.current && segmentationCanvasRef.current) {
      const drawingCanvas = drawingCanvasRef.current;
      const segmentationCanvas = segmentationCanvasRef.current;

      // Store the current drawing context
      const drawingCtx = drawingCanvas.getContext('2d');
      const segmentationCtx = segmentationCanvas.getContext('2d');
      
      if (drawingCtx && segmentationCtx) {
        // Store the current image data
        const drawingImageData = drawingCtx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height);
        const segmentationImageData = segmentationCtx.getImageData(0, 0, segmentationCanvas.width, segmentationCanvas.height);

        // Update canvas sizes
        drawingCanvas.width = containerRef.current?.clientWidth || drawingCanvas.width;
        drawingCanvas.height = containerRef.current?.clientHeight || drawingCanvas.height;
        segmentationCanvas.width = containerRef.current?.clientWidth || segmentationCanvas.width;
        segmentationCanvas.height = containerRef.current?.clientHeight || segmentationCanvas.height;

        // Restore the image data
        drawingCtx.putImageData(drawingImageData, 0, 0);
        segmentationCtx.putImageData(segmentationImageData, 0, 0);
      }
    }
  }, []);

  const clearSegmentation = () => {
    if (segmentationCanvasRef.current) {
      const ctx = segmentationCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, segmentationCanvasRef.current.width, segmentationCanvasRef.current.height);
      }
    }
  };

  const toggleColorPalette = () => {
    setShowColorPalette(!showColorPalette);
    if (showBrushSettings) setShowBrushSettings(false);
  };

  const toggleBrushSettings = () => {
    setShowBrushSettings(!showBrushSettings);
    if (showColorPalette) setShowColorPalette(false);
  };

  const handleAnimate = async () => {
    if (!drawingCanvasRef.current || !containerRef.current || !segmentationCanvasRef.current) return;

    try {
      setIsLoading(true);
      setMessages([]);

      // Save the canvas image first
     // const savedFilename = await saveCanvasImage(drawingCanvasRef.current);
    //  console.log('Saved canvas image as:', savedFilename);

      // Get the image data and send to Roboflow
      const imageData = canvasToBase64(drawingCanvasRef.current);
      const result = await detectObjects(imageData);
      console.log('Roboflow response:', result);

      if (result.outputs && result.outputs.length > 0) {
        const output = result.outputs[0];
        console.log('Output predictions:', output.predictions);
        const ctx = segmentationCanvasRef.current.getContext('2d');
        if (ctx && currentImage) {
          // Clear previous segmentation
          clearSegmentation();
          
          // Draw the image and predictions on the segmentation canvas
          drawImageAndPredictions(
            ctx,
            currentImage,
            output.predictions,
            output.image,
            segmentationCanvasRef.current.width,
            segmentationCanvasRef.current.height
          );
        }

        // Display encouraging messages
        setMessages(result.messages);
      }
    } catch (error) {
      console.error('Animation error:', error);
      setMessages(['Oops! Something went wrong, but keep drawing and try again!']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!drawingCanvasRef.current || !segmentationCanvasRef.current) return;
    setIsLoading(true);
    setMessages([]);

    try {
      // Create image element and load the file
      const img = new window.Image();
      const imageUrl = URL.createObjectURL(file);
      
      img.onload = async () => {
        // Store the image for later use
        setCurrentImage(img);
        
        // Draw image on drawing canvas
        const ctx = drawingCanvasRef.current?.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, drawingCanvasRef.current!.width, drawingCanvasRef.current!.height);
          ctx.drawImage(img, 0, 0, drawingCanvasRef.current!.width, drawingCanvasRef.current!.height);
          
          // Get base64 of the drawn image
          const imageData = canvasToBase64(drawingCanvasRef.current!);
          
          try {
            // Send to Roboflow
            const result = await detectObjects(imageData);
            
            if (result.outputs && result.outputs.length > 0) {
              const output = result.outputs[0];
              // Draw image and predictions on segmentation canvas
              const segCtx = segmentationCanvasRef.current?.getContext('2d');
              if (segCtx) {
                clearSegmentation();
                drawImageAndPredictions(
                  segCtx,
                  img,
                  output.predictions,
                  output.image,
                  segmentationCanvasRef.current!.width,
                  segmentationCanvasRef.current!.height
                );
              }
              
              setMessages(result.messages);
            }
          } catch (error) {
            console.error('Error with Roboflow API:', error);
            setMessages(['Failed to analyze the image. Please try again.']);
          }
        }
      };

      img.src = imageUrl;
    } catch (error) {
      console.error('Error loading image:', error);
      setMessages(['Failed to load the image. Please try again.']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCameraCapture = async (imageData: string) => {
    setShowCamera(false);
    try {
      setIsLoading(true);
      setMessages([]);
      const result = await detectObjects(imageData.split(',')[1]);
      setMessages(result.messages);
    } catch (error) {
      console.error('Camera capture error:', error);
      setMessages(['Oops! Something went wrong with the camera capture. Please try again!']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const startTime = Date.now();
    setIsLoading(true);
    const localImageURL = URL.createObjectURL(file);
    setImageURL(localImageURL);
    setStatus('Converting image to base64...');

    try {
      const base64 = await toBase64(file);
      setStatus('🚀 Analyzing image with AI...');

      const result = await detectObjects(base64);
      console.log('Roboflow Response:', result);
      setStatus('✨ Processing results...');

      const predictionsData = result?.outputs?.[0]?.predictions || [];
      console.log('Parsed Predictions:', predictionsData);
      setPredictions(predictionsData);
      setMessages(result.messages);

      const img = imageRef.current;
      const imageData = result?.outputs?.[0]?.image || { width: 0, height: 0 };
      console.log('Image Data:', imageData);

      calculateAndSetCanvasSize(img, imageData);

      const endTime = Date.now();
      setProcessingTime(((endTime - startTime) / 1000));
      setStatus('🎉 Image segmented successfully!');
    } catch (error) {
      console.error('Error:', error);
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAndSetCanvasSize = (img: HTMLImageElement | null, imageData: { width: number; height: number }) => {
    const maxWidth = 800;
    const maxHeight = 600;
    let width = imageData.width || 200;
    let height = imageData.height || 200;

    const aspectRatio = width / height;

    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    if (width < 200) {
      width = 200;
      height = width / aspectRatio;
    }

    setCanvasSize({ width: Math.round(width), height: Math.round(height) });
    console.log('Canvas Size Set:', { width, height });
  };

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
    });

  const drawCanvas = (data: any) => {
    const canvas = segmentationCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;

    if (!canvas || !ctx || !img || !img.complete) {
      console.log('Cannot draw canvas:', { canvas, ctx, img, imgComplete: img?.complete });
      return;
    }

    const imageData = data?.outputs?.[0]?.image || { width: 0, height: 0 };
    const predictions = data?.outputs?.[0]?.predictions || [];
    console.log('Drawing with:', { imageData, predictions });

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / (imageData.width || 1);
    const scaleY = canvas.height / (imageData.height || 1);
    console.log('Scale Factors:', { scaleX, scaleY });

    if (showPredictions && predictions.length > 0) {
      predictions.forEach((pred) => {
        const { points, class: className, confidence } = pred;
        console.log('Drawing Prediction:', { className, confidence, points });

        if (points && points.length > 0) {
          // Draw polygon
          ctx.beginPath();
          points.forEach((pt: any, i: number) => {
            const scaledX = pt.x * scaleX;
            const scaledY = pt.y * scaleY;
            if (i === 0) ctx.moveTo(scaledX, scaledY);
            else ctx.lineTo(scaledX, scaledY);
          });
          ctx.closePath();

          // Fill polygon with semi-transparent red
          ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
          ctx.fill();

          // Draw border
          ctx.strokeStyle = 'red';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Add label
          const label = `${className} ${Math.round(confidence * 100)}%`;
          const labelX = points[0].x * scaleX;
          const labelY = points[0].y * scaleY - 10;

          ctx.fillStyle = 'black';
          ctx.fillRect(labelX, labelY - 14, ctx.measureText(label).width + 8, 16);

          ctx.fillStyle = 'white';
          ctx.font = '12px Arial';
          ctx.fillText(label, labelX + 4, labelY - 2);
        }
      });
    } else {
      console.log('No predictions to draw or predictions hidden');
    }
  };

  const downloadImage = () => {
    const canvas = segmentationCanvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `segmented-image-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const clearImage = () => {
    setImageURL(null);
    setPredictions([]);
    setStatus('');
    setProcessingTime(null);
    setMessages([]);
    
    const canvas = segmentationCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const togglePredictions = () => {
    setShowPredictions(!showPredictions);
    if (segmentationCanvasRef.current) {
      drawCanvas({ outputs: [{ image: { ...canvasSize }, predictions }] });
    }
  };

  useEffect(() => {
    if (imageURL && predictions.length > 0) {
      const img = imageRef.current;
      console.log('useEffect Triggered:', { imageURL, predictions, imgComplete: img?.complete });
      if (img?.complete) {
        drawCanvas({ outputs: [{ image: { ...canvasSize }, predictions }] });
      } else {
        img.onload = () => {
          console.log('Image Loaded, Drawing Canvas');
          drawCanvas({ outputs: [{ image: { ...canvasSize }, predictions }] });
        };
        img.onerror = () => {
          console.error('Image failed to load');
          setStatus('❌ Error: Failed to load image');
        };
      }
    }
  }, [imageURL, predictions, showPredictions, canvasSize]);

  return (
    <DrawingProvider>
      <div className="min-h-screen bg-indigo-50 flex flex-col">
        <Header />
        
        <main className="flex-1 flex flex-col">
          <div className="bg-white shadow-md mb-4 px-4">
            <div className="max-w-6xl mx-auto flex">
              <button 
                className={`py-3 px-5 font-bold text-lg transition-colors ${activeTab === 'draw' ? 'text-purple-600 border-b-4 border-purple-600' : 'text-gray-500 hover:text-purple-400'}`}
                onClick={() => setActiveTab('draw')}
              >
                Draw Freely
              </button>
              <button 
                className={`py-3 px-5 font-bold text-lg transition-colors ${activeTab === 'challenge' ? 'text-purple-600 border-b-4 border-purple-600' : 'text-gray-500 hover:text-purple-400'}`}
                onClick={() => setActiveTab('challenge')}
              >
                Challenge Mode
              </button>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col sm:flex-row relative px-4 py-2">
            <div className="flex-1 flex flex-col relative" ref={containerRef}>
              {activeTab === 'draw' ? (
                <>
                  <DrawingCanvas 
                    ref={drawingCanvasRef} 
                  />
                  <canvas
                    ref={segmentationCanvasRef}
                    className="absolute top-0 left-0 w-full h-full"
                  />
                </>
              ) : (
                <DrawChallenge />
              )}
              
              {messages.length > 0 && (
                <div className="mt-4 p-4 bg-yellow-100 rounded-lg animate-bounce-slow">
                  {messages.map((message, index) => (
                    <p key={index} className="text-yellow-800 font-medium text-lg mb-2">
                      {message}
                    </p>
                  ))}
                </div>
              )}
            </div>
            
            <div className={`tools-panel transition-all duration-300 ${showTools ? 'tools-visible' : 'tools-hidden'}`}>
              <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-purple-900">Drawing Tools</h3>
                  <button 
                    onClick={() => setShowTools(!showTools)} 
                    className="text-gray-500 hover:text-purple-600"
                  >
                    <ArrowRight size={20} className={`transform transition-transform ${showTools ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={toggleColorPalette}
                    className="flex flex-col items-center p-3 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors"
                  >
                    <Palette size={28} className="text-purple-600 mb-1" />
                    <span className="text-sm font-medium">Colors</span>
                  </button>
                  <button 
                    onClick={toggleBrushSettings}
                    className="flex flex-col items-center p-3 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors"
                  >
                    <Image size={28} className="text-purple-600 mb-1" />
                    <span className="text-sm font-medium">Brush</span>
                  </button>
                  <button 
                    onClick={() => setShowCamera(true)}
                    className="flex flex-col items-center p-3 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors"
                  >
                    <Camera size={28} className="text-purple-600 mb-1" />
                    <span className="text-sm font-medium">Camera</span>
                  </button>
                  <button 
                    onClick={() => setShowUpload(true)}
                    className="flex flex-col items-center p-3 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors"
                  >
                    <Upload size={28} className="text-purple-600 mb-1" />
                    <span className="text-sm font-medium">Upload</span>
                  </button>
                </div>
                
                {showColorPalette && <ColorPalette />}
                {showBrushSettings && <BrushSettings />}
              </div>
              
              <div className="bg-white rounded-lg shadow-lg p-4">
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={handleAnimate}
                    disabled={isLoading}
                    className={`w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold rounded-lg text-lg hover:opacity-90 transition-opacity flex items-center justify-center ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className="mr-2">{isLoading ? 'Processing...' : 'Check Drawing!'}</span>
                    <Home size={20} />
                  </button>
                  <button 
                    onClick={clearSegmentation}
                    className="w-full py-3 px-6 bg-red-500 text-white font-bold rounded-lg text-lg hover:bg-red-600 transition-colors flex items-center justify-center"
                  >
                    <span className="mr-2">Clear Results</span>
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>

        {showCamera && (
          <CameraView
            onCapture={handleCameraCapture}
            onClose={() => setShowCamera(false)}
          />
        )}

        {showUpload && (
          <ImageUpload
            onUpload={handleImageUpload}
            onClose={() => setShowUpload(false)}
          />
        )}

        {/* Status and Messages Display */}
        {(status || messages.length > 0) && (
          <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg p-4 mb-6 border border-white/50">
            {status && (
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-gray-700 font-medium">{status}</span>
                {processingTime && (
                  <span className="ml-auto text-sm text-gray-500">
                    Processed in {processingTime}s
                  </span>
                )}
              </div>
            )}
            {messages.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold text-gray-800">Feedback:</h3>
                <ul className="list-disc list-inside mt-2">
                  {messages.map((msg, index) => (
                    <li key={index} className="text-gray-700">{msg}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        {imageURL && (
          <div className="flex flex-wrap gap-3 mb-6 justify-center">
            <button
              onClick={togglePredictions}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 rounded-lg shadow-md transition-colors border"
            >
              <Eye className="w-4 h-4" />
              {showPredictions ? 'Hide' : 'Show'} Analysis
            </button>

            {predictions.length > 0 && (
              <button
                onClick={downloadImage}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-md transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Result
              </button>
            )}

            <button
              onClick={clearImage}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-md transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          </div>
        )}

        {/* Canvas Display */}
        {imageURL && (
          <div className="overflow-auto border border-white/50 bg-white/70 backdrop-blur-sm rounded-xl shadow-lg p-4">
            <img
              ref={imageRef}
              src={imageURL}
              alt="Uploaded"
              className="hidden"
              crossOrigin="anonymous"
            />
            <canvas
              ref={segmentationCanvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              className="mx-auto border rounded shadow"
            />
          </div>
        )}
      </div>
    </DrawingProvider>
  );
}

export default App;