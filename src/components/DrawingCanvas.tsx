import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { useDrawingContext } from '../contexts/DrawingContext';

const DrawingCanvas = forwardRef<HTMLCanvasElement>((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { brushColor, brushSize, tool } = useDrawingContext();
  const [isDrawing, setIsDrawing] = useState(false);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  
  useImperativeHandle(ref, () => canvasRef.current!);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext('2d');
    if (!context) return;
    
    setCtx(context);
    
    context.lineCap = 'round';
    context.lineJoin = 'round';
    
    const updateCanvasSize = () => {
      const container = canvas.parentElement;
      if (!container) return;
      
      const { width, height } = container.getBoundingClientRect();
      setCanvasSize({ width, height });
      
      canvas.width = width;
      canvas.height = height;
      
      if (context) {
        context.lineCap = 'round';
        context.lineJoin = 'round';
      }
    };
    
    updateCanvasSize();
    
    const resizeObserver = new ResizeObserver(updateCanvasSize);
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  
  useEffect(() => {
    if (!ctx) return;
    
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
  }, [ctx, brushColor, brushSize]);
  
  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!ctx || !canvasRef.current) return;
    
    setIsDrawing(true);
    ctx.beginPath();
    
    const { offsetX, offsetY } = getCoordinates(e);
    ctx.moveTo(offsetX, offsetY);
  };
  
  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing || !ctx) return;
    
    const { offsetX, offsetY } = getCoordinates(e);
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  };
  
  const stopDrawing = () => {
    if (!ctx) return;
    
    setIsDrawing(false);
    ctx.closePath();
  };
  
  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!canvasRef.current) return { offsetX: 0, offsetY: 0 };
    
    if ('touches' in e) {
      const touch = e.touches[0];
      const rect = canvasRef.current.getBoundingClientRect();
      return {
        offsetX: touch.clientX - rect.left,
        offsetY: touch.clientY - rect.top
      };
    } else {
      return {
        offsetX: e.nativeEvent.offsetX,
        offsetY: e.nativeEvent.offsetY
      };
    }
  };
  
  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
    </div>
  );
});

export default DrawingCanvas;