import React, { useRef, useState, useEffect } from 'react';
import { Upload, Zap, Eye, Download, Trash2, RefreshCw, Palette, Camera, Edit3, Undo2 } from 'lucide-react';

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Prediction {
  bbox?: BoundingBox;
  class: string;
  confidence: number;
  points?: Array<{ x: number; y: number }>;
}

interface CanvasSize {
  width: number;
  height: number;
}

interface RoboflowResponse {
  outputs: Array<{
    predictions: {
      predictions: Prediction[];
      image: {
        width: number;
        height: number;
      };
    };
  }>;
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageURL, setImageURL] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 800, height: 600 });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPredictions, setShowPredictions] = useState<boolean>(true);
  const [processingTime, setProcessingTime] = useState<string | null>(null);
  const [mode, setMode] = useState<'upload' | 'draw'>('upload');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentColor, setCurrentColor] = useState<string>('#000000');
  const [brushSize, setBrushSize] = useState<number>(5);
  const [drawingHistory, setDrawingHistory] = useState<string[]>([]);

  const colors = [
    '#000000', '#FF0000', '#FF8C00', '#FFD700',
    '#00FF00', '#0080FF', '#8000FF', '#FF1493', '#808080'
  ];

  const initializeDrawingCanvas = () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    
    // Set white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Set drawing properties
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== 'draw') return;
    setIsDrawing(true);
    
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(x, y);

    // Save the current state before starting to draw
    const currentState = canvas.toDataURL();
    setDrawingHistory(prev => [...prev, currentState]);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || mode !== 'draw') return;
    
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = currentColor;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearDrawing = () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Clear predictions and status
    setPredictions([]);
    setStatus('');
    setProcessingTime(null);
  };

  const analyzeDrawing = async () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    const startTime = Date.now();
    setIsLoading(true);
    setStatus('🎨 Converting drawing to base64...');

    try {
      const dataURL = canvas.toDataURL('image/png');
      const base64 = dataURL.split(',')[1];
      
      setStatus('🚀 Analyzing drawing with AI...');

      const response = await fetch('https://serverless.roboflow.com/infer/workflows/wisd-scixc/custom-workflow-5', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: '7kDS0qoq56Si0jbdcRHV',
          inputs: {
            image: {
              type: 'base64',
              value: base64,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Roboflow API request failed');
      }

      const result = await response.json() as RoboflowResponse;
      console.log('Roboflow Response:', result);
      setStatus('✨ Processing results...');

      const predictionsData = result?.outputs?.[0]?.predictions?.predictions || [];
      console.log('Parsed Predictions:', predictionsData);
      setPredictions(predictionsData);

      drawSegmentation(predictionsData);

      const endTime = Date.now();
      setProcessingTime(((endTime - startTime) / 1000).toFixed(2));
      setStatus('🎉 Drawing analyzed successfully!');
    } catch (error) {
      console.error('Error:', error);
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const drawSegmentation = (predictions: Prediction[]) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    if (showPredictions && predictions.length > 0) {
      predictions.forEach((pred, index) => {
        const { bbox, class: className, confidence, points } = pred;
        
        // Skip if no location data
        if (!bbox && !points) return;
        
        // Generate a color for each prediction
        const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
        const color = colors[index % colors.length];
        const rgbaColor = hexToRgba(color, 0.3);
        
        if (bbox) {
          // Draw bounding box
          const { x, y, width, height } = bbox;
          ctx.beginPath();
          ctx.rect(x, y, width, height);
          
          // Fill box with semi-transparent color
          ctx.fillStyle = rgbaColor;
          ctx.fill();

          // Draw border
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.stroke();

          // Add label
          const label = `${className} ${Math.round(confidence * 100)}%`;
          const labelX = x;
          const labelY = y - 10;

          // Label background
          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          const textMetrics = ctx.measureText(label);
          ctx.fillRect(labelX - 4, labelY - 16, textMetrics.width + 8, 20);

          // Label text
          ctx.fillStyle = 'white';
          ctx.font = 'bold 14px Arial';
          ctx.fillText(label, labelX, labelY);
        } else if (points) {
          // Draw polygon (for backward compatibility)
          ctx.beginPath();
          points.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.closePath();

          // Fill polygon with semi-transparent color
          ctx.fillStyle = rgbaColor;
          ctx.fill();

          // Draw border
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.stroke();

          // Add label
          const label = `${className} ${Math.round(confidence * 100)}%`;
          const labelX = points[0].x;
          const labelY = points[0].y - 10;

          // Label background
          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          const textMetrics = ctx.measureText(label);
          ctx.fillRect(labelX - 4, labelY - 16, textMetrics.width + 8, 20);

          // Label text
          ctx.fillStyle = 'white';
          ctx.font = 'bold 14px Arial';
          ctx.fillText(label, labelX, labelY);
        }
      });
    }
  };

  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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

      const response = await fetch('https://serverless.roboflow.com/infer/workflows/wisd-scixc/kids-bnd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: '7kDS0qoq56Si0jbdcRHV',
          inputs: {
            image: {
              type: 'base64',
              value: typeof base64 === 'string' ? base64.split(',')[1] : '',
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Roboflow API request failed');
      }

      const result = await response.json();
      console.log('Roboflow Response:', result);
      setStatus('✨ Processing results...');

      const predictionsData = result?.outputs?.[0]?.predictions?.predictions || [];
      console.log('Parsed Predictions:', predictionsData);
      setPredictions(predictionsData);

      const img = imageRef.current;
      const imageData = result?.outputs?.[0]?.predictions?.image || { width: 0, height: 0 };
      console.log('Image Data:', imageData);

      calculateAndSetCanvasSize(img, imageData);

      const endTime = Date.now();
      setProcessingTime(((endTime - startTime) / 1000).toFixed(2));
      setStatus('🎉 Image segmented successfully!');
    } catch (error) {
      console.error('Error:', error);
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
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

  const drawCanvas = (data: RoboflowResponse) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = imageRef.current;
    if (!img || !img.complete) {
      console.log('Cannot draw canvas:', { canvas, ctx, img, imgComplete: img?.complete });
      return;
    }

    const imageData = data?.outputs?.[0]?.predictions?.image || { width: 0, height: 0 };
    const predictions = data?.outputs?.[0]?.predictions?.predictions || [];
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
      predictions.forEach((pred: Prediction) => {
        const { bbox, class: className, confidence, points } = pred;
        
        // Skip if no location data
        if (!bbox && !points) return;
        
        console.log('Drawing Prediction:', { className, confidence, bbox, points });

        if (bbox) {
          // Scale the bounding box coordinates
          const scaledX = bbox.x * scaleX;
          const scaledY = bbox.y * scaleY;
          const scaledWidth = bbox.width * scaleX;
          const scaledHeight = bbox.height * scaleY;

          ctx.beginPath();
          ctx.rect(scaledX, scaledY, scaledWidth, scaledHeight);
          
          // Fill box with semi-transparent red
          ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
          ctx.fill();

          // Draw border
          ctx.strokeStyle = 'red';
          ctx.lineWidth = 2;
          ctx.stroke();

          const label = `${className} ${Math.round(confidence * 100)}%`;
          const labelX = scaledX;
          const labelY = scaledY - 10;

          // Label background
          ctx.fillStyle = 'black';
          ctx.fillRect(labelX, labelY - 14, ctx.measureText(label).width + 8, 16);

          // Label text
          ctx.fillStyle = 'white';
          ctx.font = '12px Arial';
          ctx.fillText(label, labelX + 4, labelY - 2);
        } else if (points) {
          // Draw polygon (for backward compatibility)
          ctx.beginPath();
          points.forEach((pt, i) => {
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

          const label = `${className} ${Math.round(confidence * 100)}%`;
          const labelX = points[0].x * scaleX;
          const labelY = points[0].y * scaleY - 10;

          // Label background
          ctx.fillStyle = 'black';
          ctx.fillRect(labelX, labelY - 14, ctx.measureText(label).width + 8, 16);

          // Label text
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
    const canvas = mode === 'draw' ? drawingCanvasRef.current : canvasRef.current;
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
    
    if (mode === 'draw') {
      clearDrawing();
    } else {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
  };

  const togglePredictions = () => {
    setShowPredictions(!showPredictions);
    if (mode === 'draw') {
      clearDrawing();
      if (showPredictions) {
        drawSegmentation(predictions);
      }
    } else if (canvasRef.current) {
      drawCanvas({ outputs: [{ predictions: { image: { ...canvasSize }, predictions } }] });
    }
  };

  const undoDrawing = () => {
    if (drawingHistory.length === 0) return;
    
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const previousState = drawingHistory[drawingHistory.length - 1];
    
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setDrawingHistory(prev => prev.slice(0, -1));
    };
    img.src = previousState;
  };

  useEffect(() => {
    if (mode === 'draw') {
      initializeDrawingCanvas();
    }
  }, [mode, canvasSize]);

  useEffect(() => {
    if (imageURL && predictions.length > 0 && mode === 'upload') {
      const img = imageRef.current;
      console.log('useEffect Triggered:', { imageURL, predictions, imgComplete: img?.complete });
      if (img?.complete) {
        drawCanvas({ outputs: [{ predictions: { image: { ...canvasSize }, predictions } }] });
      } else if (img) {
        img.onload = () => {
          console.log('Image Loaded, Drawing Canvas');
          drawCanvas({ outputs: [{ predictions: { image: { ...canvasSize }, predictions } }] });
        };
        img.onerror = () => {
          console.error('Image failed to load');
          setStatus('❌ Error: Failed to load image');
        };
      }
    }
  }, [imageURL, predictions, showPredictions, canvasSize, mode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-100">
      <div className="flex">
        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                🎨 Kids Drawing Analyzer
              </h1>
            </div>
            <p className="text-gray-600 text-lg">
              Upload or draw pictures to get instant AI-powered analysis and feedback on your artwork
            </p>
          </div>

          {/* Mode Selection */}
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={() => setMode('upload')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                mode === 'upload'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'bg-white/70 text-gray-700 hover:bg-white/90'
              }`}
            >
              <Upload className="w-5 h-5" />
              Upload Drawing
            </button>
            <button
              onClick={() => setMode('draw')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                mode === 'draw'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'bg-white/70 text-gray-700 hover:bg-white/90'
              }`}
            >
              <Edit3 className="w-5 h-5" />
              Draw Picture
            </button>
          </div>

          {/* Upload Section */}
          {mode === 'upload' && (
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 mb-6 border border-white/50">
              <div className="flex flex-col items-center">
                <label className="group cursor-pointer">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleUpload} 
                    className="hidden"
                    disabled={isLoading}
                  />
                  <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl group-hover:scale-105">
                    {isLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5" />
                    )}
                    <span className="font-semibold">
                      {isLoading ? 'Analyzing Drawing...' : 'Upload Drawing'}
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Status and Predictions Display */}
          {(status || predictions.length > 0) && (
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
              {predictions.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold text-gray-800">Predictions:</h3>
                  <ul className="list-disc list-inside mt-2">
                    {predictions.map((pred, index) => (
                      <li key={index} className="text-gray-700">
                        {pred.class || 'Unknown'}: {Math.round((pred.confidence || 0) * 100)}% 
                        {pred.bbox ? (
                          ` (Box: ${Math.round(pred.bbox.x)}, ${Math.round(pred.bbox.y)}, 
                          ${Math.round(pred.bbox.width)}x${Math.round(pred.bbox.height)})`
                        ) : pred.points ? (
                          ' (Segmentation)'
                        ) : (
                          ' (No location data)'
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-wrap gap-3 mb-6 justify-center">
            {mode === 'draw' && (
              <button
                onClick={analyzeDrawing}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl shadow-lg transition-all duration-300 font-semibold disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Zap className="w-5 h-5" />
                )}
                {isLoading ? 'Analyzing...' : 'Analyze Drawing'}
              </button>
            )}

            {(imageURL || (mode === 'draw' && predictions.length > 0)) && (
              <>
                <button
                  onClick={togglePredictions}
                  className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 rounded-lg shadow-md transition-colors border"
                >
                  <Eye className="w-4 h-4" />
                  {showPredictions ? 'Hide' : 'Show'} Predictions
                </button>

                <button
                  onClick={downloadImage}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-md transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Result
                </button>

                <button
                  onClick={clearImage}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-md transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </button>
              </>
            )}
          </div>

          {/* Canvas Display */}
          <div className="flex justify-center">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-white/50">
              
              {/* Upload Mode Canvas */}
              {mode === 'upload' && imageURL && (
                <>
                  <img
                    ref={imageRef}
                    src={imageURL}
                    alt="Uploaded"
                    className="hidden"
                    crossOrigin="anonymous"
                  />
                  <canvas
                    ref={canvasRef}
                    width={canvasSize.width}
                    height={canvasSize.height}
                    className="border-2 border-gray-300 rounded-lg shadow-inner"
                  />
                </>
              )}

              {/* Drawing Mode Canvas */}
              {mode === 'draw' && (
                <canvas
                  ref={drawingCanvasRef}
                  width={canvasSize.width}
                  height={canvasSize.height}
                  className="border-2 border-gray-300 rounded-lg shadow-inner cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              )}
            </div>
          </div>
        </div>

        {/* Drawing Tools Sidebar */}
        {mode === 'draw' && (
          <div className="w-80 bg-white/70 backdrop-blur-sm p-6 border-l border-white/50">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <h2 className="text-xl font-bold text-purple-700">Drawing Tools</h2>
            </div>

            {/* Tool Icons */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex flex-col items-center p-4 bg-purple-100 rounded-xl">
                <Palette className="w-8 h-8 text-purple-600 mb-2" />
                <span className="text-purple-700 font-medium">Colors</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-purple-100 rounded-xl">
                <Edit3 className="w-8 h-8 text-purple-600 mb-2" />
                <span className="text-purple-700 font-medium">Brush</span>
              </div>
            </div>

            {/* Color Palette */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-purple-700 mb-4">Choose Color</h3>
              <div className="grid grid-cols-3 gap-3">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setCurrentColor(color)}
                    className={`w-12 h-12 rounded-full border-4 transition-all duration-200 hover:scale-110 ${
                      currentColor === color ? 'border-purple-500 scale-110' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Brush Size */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-purple-700 mb-4">Brush Size</h3>
              <input
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${(brushSize - 1) / 19 * 100}%, #e5d3ff ${(brushSize - 1) / 19 * 100}%, #e5d3ff 100%)`
                }}
              />
              <div className="flex justify-between text-sm text-purple-600 mt-2">
                <span>Small</span>
                <span>Size: {brushSize}px</span>
                <span>Large</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={undoDrawing}
                disabled={drawingHistory.length === 0}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-lg transition-all duration-300 font-semibold disabled:opacity-50"
              >
                <Undo2 className="w-5 h-5" />
                Undo
              </button>

              <button
                onClick={analyzeDrawing}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl shadow-lg transition-all duration-300 font-semibold disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Zap className="w-5 h-5" />
                )}
                {isLoading ? 'Analyzing...' : 'Check Drawing!'}
              </button>
              
              <button
                onClick={clearDrawing}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl shadow-lg transition-all duration-300 font-semibold"
              >
                <Trash2 className="w-5 h-5" />
                Clear Results
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;