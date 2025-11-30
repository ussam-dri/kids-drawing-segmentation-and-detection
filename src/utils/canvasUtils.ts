// Utility functions for canvas operations

// Extract image data from a specific region of the canvas
export const extractRegionFromCanvas = (
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number
): ImageData | null => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  
  return ctx.getImageData(x, y, width, height);
};

// Draw segmentation mask on canvas
export const drawSegmentationMask = (
  ctx: CanvasRenderingContext2D,
  mask: number[][],
  x: number,
  y: number,
  width: number,
  height: number
) => {
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskCtx = maskCanvas.getContext('2d');
  if (!maskCtx) return;
  
  // Convert mask array to ImageData
  const imageData = maskCtx.createImageData(width, height);
  for (let i = 0; i < mask.length; i++) {
    for (let j = 0; j < mask[i].length; j++) {
      const idx = (i * width + j) * 4;
      const value = mask[i][j] * 255;
      imageData.data[idx] = 0; // R
      imageData.data[idx + 1] = 255; // G
      imageData.data[idx + 2] = 0; // B
      imageData.data[idx + 3] = value > 128 ? 77 : 0; // A (30% opacity for mask)
    }
  }
  
  maskCtx.putImageData(imageData, 0, 0);
  ctx.drawImage(maskCanvas, x - width / 2, y - height / 2);
};

// Save canvas state to history
export const saveCanvasToHistory = (
  canvas: HTMLCanvasElement,
  addToHistory: (imageData: ImageData) => void
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  addToHistory(imageData);
};

// Restore canvas from history
export const restoreCanvasFromHistory = (
  canvas: HTMLCanvasElement,
  imageData: ImageData
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  ctx.putImageData(imageData, 0, 0);
};

// Clear the canvas
export const clearCanvas = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};