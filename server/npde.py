from inference_sdk import InferenceHTTPClient
from PIL import Image
CLIENT = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key="HOvusIwnPVCIHQupCSwH"
)
img=Image.open("aplle.jpg")
result = CLIENT.infer(img, model_id="fruit-3.0-s84nd/1")