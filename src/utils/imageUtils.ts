export const saveCanvasImage = async (canvas: HTMLCanvasElement): Promise<string> => {
  try {
    // Create a blob from the canvas
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
      }, 'image/png');
    });

    // Create timestamp for filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `drawing_${timestamp}.png`;

    // Create a download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return filename;
  } catch (error) {
    console.error('Error saving canvas image:', error);
    throw error;
  }
}; 