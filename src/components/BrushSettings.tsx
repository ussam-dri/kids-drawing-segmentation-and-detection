import React from 'react';
import { useDrawingContext } from '../contexts/DrawingContext';

const BrushSettings: React.FC = () => {
  const { brushSize, setBrushSize } = useDrawingContext();
  
  const brushSizes = [2, 5, 10, 15, 20];
  
  return (
    <div className="mt-4 animate-fade-in">
      <h4 className="font-medium text-purple-900 mb-2">Brush Size</h4>
      
      <div className="mb-4">
        <input
          type="range"
          min="1"
          max="30"
          value={brushSize}
          onChange={(e) => setBrushSize(parseInt(e.target.value))}
          className="brush-size-slider"
        />
      </div>
      
      <div className="flex justify-between">
        {brushSizes.map((size) => (
          <button
            key={size}
            onClick={() => setBrushSize(size)}
            className={`flex items-center justify-center ${
              brushSize === size
                ? 'bg-purple-200 text-purple-800'
                : 'bg-gray-100 text-gray-600'
            } rounded-full font-medium transition-colors`}
            style={{
              width: `${Math.max(32, size + 20)}px`,
              height: `${Math.max(32, size + 20)}px`,
            }}
          >
            <div
              className="rounded-full bg-current"
              style={{
                width: `${size}px`,
                height: `${size}px`,
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default BrushSettings;