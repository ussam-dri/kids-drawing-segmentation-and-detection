import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DrawingContextType {
  brushColor: string;
  brushSize: number;
  tool: 'brush' | 'eraser';
  canvasHistory: ImageData[];
  historyIndex: number;
  setBrushColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  setTool: (tool: 'brush' | 'eraser') => void;
  addToHistory: (imageData: ImageData) => void;
  undo: () => void;
  redo: () => void;
}

const DrawingContext = createContext<DrawingContextType | undefined>(undefined);

export const useDrawingContext = () => {
  const context = useContext(DrawingContext);
  if (!context) {
    throw new Error('useDrawingContext must be used within a DrawingProvider');
  }
  return context;
};

interface DrawingProviderProps {
  children: ReactNode;
}

export const DrawingProvider: React.FC<DrawingProviderProps> = ({ children }) => {
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [canvasHistory, setCanvasHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const addToHistory = (imageData: ImageData) => {
    // If we're not at the end of the history, remove everything after current index
    if (historyIndex < canvasHistory.length - 1) {
      setCanvasHistory((prev) => prev.slice(0, historyIndex + 1));
    }
    
    setCanvasHistory((prev) => [...prev, imageData]);
    setHistoryIndex((prev) => prev + 1);
  };
  
  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
    }
  };
  
  const redo = () => {
    if (historyIndex < canvasHistory.length - 1) {
      setHistoryIndex((prev) => prev + 1);
    }
  };
  
  const value = {
    brushColor,
    brushSize,
    tool,
    canvasHistory,
    historyIndex,
    setBrushColor,
    setBrushSize,
    setTool,
    addToHistory,
    undo,
    redo,
  };
  
  return (
    <DrawingContext.Provider value={value}>
      {children}
    </DrawingContext.Provider>
  );
};