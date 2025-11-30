from flask import Flask, request, jsonify
from flask_cors import CORS
from inference_sdk import InferenceHTTPClient
from dotenv import load_dotenv
import os
import base64
from PIL import Image
from io import BytesIO

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize Roboflow client
client = InferenceHTTPClient(
    api_url="https://detect.roboflow.com",
    api_key=os.getenv('ROBOFLOW_API_KEY')
)


@app.route('/api/detect', methods=['POST'])
def detect_objects():
    try:
        # Get the base64 image from the request
        data = request.json
        image_data = data.get('image', '')

        if not image_data:
            return jsonify({'error': 'No image data provided'}), 400

        # Remove the data URL prefix if present
        if 'base64,' in image_data:
            image_data = image_data.split('base64,')[1]

        # Decode base64 to binary
        image_bytes = base64.b64decode(image_data)

        # Convert to PIL Image
        image = Image.open(BytesIO(image_bytes))

        # Save temporarily
        temp_path = 'temp_image.png'
        image.save(temp_path)

        # Make prediction using Roboflow API
        with open(temp_path, "rb") as image_file:
            result = client.infer(
                temp_path,  # Changed from image=temp_path to just temp_path
                model_id=os.getenv('ROBOFLOW_MODEL_ID'),
                confidence=0.5,
                overlap=0.5,
            )

        # Clean up temporary file
        os.remove(temp_path)

        return jsonify({"predictions": result.json()["predictions"]})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)