interface Prediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
  mask?: number[][];
}

interface DetectionResponse {
  predictions: Prediction[];
  messages: string[];
}

// Convert canvas to base64 (image/png)
export const canvasToBase64 = (canvas: HTMLCanvasElement): string => {
  return canvas.toDataURL('image/png').split(',')[1];
};

// Main function to send image to Roboflow and return predictions + messages
export const createAnimationElements = async (imageData: string): Promise<DetectionResponse> => {
  try {
    // Ensure imageData is only the base64 part (remove Data URL prefix if exists)
    const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData;

    const response = await fetch('https://serverless.roboflow.com/infer/workflows/wisd-scixc/custom-workflow-5', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: '7kDS0qoq56Si0jbdcRHV', // Direct key as used in App.js
        inputs: {
          image: {
            type: 'base64',
            value: base64Data
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Raw error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const predictions = result.outputs?.[0]?.predictions || [];

    const messages = predictions.map((pred: Prediction) => {
      const objectClass = pred.class?.toLowerCase?.() || "object";
      return getEncouragingMessage(objectClass);
    });

    return {
      predictions,
      messages: messages.length > 0 ? messages : ["Keep drawing! I can't wait to see what you create next!"]
    };
  } catch (error) {
    console.error('Error in createAnimationElements:', error);
    throw error;
  }
};


// Coordinate mapping for drawing on canvas
export const mapCoordinatesToCanvas = (
  prediction: Prediction,
  originalWidth: number,
  originalHeight: number,
  canvasWidth: number,
  canvasHeight: number
) => {
  const x = (prediction.x / originalWidth) * canvasWidth;
  const y = (prediction.y / originalHeight) * canvasHeight;
  const width = (prediction.width / originalWidth) * canvasWidth;
  const height = (prediction.height / originalHeight) * canvasHeight;

  return {
    x,
    y,
    width,
    height,
    class: prediction.class,
    confidence: prediction.confidence,
    mask: prediction.mask
  };
};

// Generate friendly messages based on detected object class
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
