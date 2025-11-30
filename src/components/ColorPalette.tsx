import React from 'react';
import { useDrawingContext } from '../contexts/DrawingContext';

const ColorPalette: React.FC = () => {
  const { brushColor, setBrushColor } = useDrawingContext();
  
  const colors = [
    '#000000', // Black
    '#FFFFFF', // White
    '#EF4444', // Red
    '#F97316', // Orange
    '#FCD34D', // Yellow
    '#10B981', // Green
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#78716C', // Gray
  ];
  
  return (
    <div className="mt-4 animate-fade-in">
      <h4 className="font-medium text-purple-900 mb-2">Choose Color</h4>
      <div className="grid grid-cols-5 gap-2">
        {colors.map((color) => (
          <button
            key={color}
            className={`color-swatch ${color === brushColor ? 'selected' : ''}`}
            style={{ backgroundColor: color }}
            onClick={() => setBrushColor(color)}
            aria-label={`Color ${color}`}
          />
        ))}
      </div>
    </div>
  );
};

export default ColorPalette;