interface Point {
  x: number;
  y: number;
}

interface RoboflowPrediction {
  class: string;
  class_id: number;
  confidence: number;
  points: Point[];
  width: number;
  height: number;
  x: number;
  y: number;
  detection_id: string;
  parent_id: string;
}

interface RoboflowOutput {
  image: {
    width: number;
    height: number;
  };
  predictions: RoboflowPrediction[];
}

interface RoboflowResponse {
  outputs: RoboflowOutput[];
}

interface DetectionResponse {
  outputs: RoboflowOutput[];
  messages: string[];
}

export const detectObjects = async (imageData: string): Promise<DetectionResponse> => {
  try {
    const response = await fetch('https://serverless.roboflow.com/infer/workflows/wisd-scixc/custom-workflow-6', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: import.meta.env.VITE_ROBOFLOW_API_KEY,
        inputs: {
          image: {
            type: "base64",
            value: imageData
          },
          confidence: 0.1
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result: RoboflowResponse = await response.json();
    console.log('Raw Roboflow response:', result);

    if (!result || !result.outputs || !result.outputs.length) {
      throw new Error('Invalid response format from Roboflow');
    }
    
    // Process predictions and add encouraging messages
    const messages = result.outputs[0].predictions.map((pred) => {
      const objectClass = pred.class.toLowerCase();
      return getEncouragingMessage(objectClass);
    });
    
    return {
      outputs: result.outputs,
      messages: messages.length > 0 ? messages : ["Keep drawing! I can't wait to see what you create next!"]
    };
  } catch (error) {
    console.error('Error detecting objects:', error);
    throw error;
  }
};

export const drawImageAndPredictions = (
  ctx: CanvasRenderingContext2D,
  imageElement: HTMLImageElement,
  predictions: RoboflowPrediction[],
  imageSize: { width: number; height: number },
  canvasWidth: number,
  canvasHeight: number
) => {
  console.log('Drawing predictions:', {
    predictions,
    imageSize,
    canvasWidth,
    canvasHeight
  });

  // Clear canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  
  // Draw the image first
  ctx.drawImage(imageElement, 0, 0, canvasWidth, canvasHeight);
  
  // Draw predictions on top
  predictions.forEach((pred) => {
    console.log('Processing prediction:', pred);
    if (pred.points && pred.points.length > 0) {
      const scaleX = canvasWidth / imageSize.width;
      const scaleY = canvasHeight / imageSize.height;

      ctx.beginPath();
      
      // Draw the contour
      pred.points.forEach((point, index) => {
        const x = point.x * scaleX;
        const y = point.y * scaleY;
        console.log(`Point ${index}:`, { x, y, original: point });
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      // Close the path
      ctx.closePath();
      
      // Set styles for the contour
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Fill with semi-transparent color
      ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
      ctx.fill();
      
      // Add label with background
      const label = `${pred.class} (${Math.round(pred.confidence * 100)}%)`;
      const labelX = pred.x * scaleX;
      const labelY = pred.y * scaleY - 5;
      
      ctx.font = '16px Arial';
      const metrics = ctx.measureText(label);
      
      // Draw label background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillRect(labelX - 2, labelY - 16, metrics.width + 4, 20);
      
      // Draw label text
      ctx.fillStyle = 'black';
      ctx.fillText(label, labelX, labelY);
    }
  });
};

export const canvasToBase64 = (canvas: HTMLCanvasElement): string => {
  return canvas.toDataURL('image/png').split(',')[1];
};

const getEncouragingMessage = (objectClass: string): string => {
  const messages: Record<string, string> = {
    person: "Wow! You drew a wonderful person! They look so friendly!",
    car: "Vroom vroom! That's an amazing car you drew!",
    house: "What a beautiful house! I love all the details!",
    tree: "Your tree looks so tall and strong! Great job!",
    butterfly: "Such a pretty butterfly! I love its colorful wings!",
    flower: "Your flowers are blooming with creativity!",
    sun: "The sun is shining bright in your drawing!",
    cat: "Meow! What an adorable cat you've drawn!",
    dog: "Woof! Your dog looks so playful and happy!",
    robot: "Beep boop! That's one cool robot you made!"
  };
  
  return messages[objectClass] || "Amazing drawing! You're such a creative artist!";
};