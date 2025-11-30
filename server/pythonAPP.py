import tkinter as tk
from tkinter import filedialog, messagebox
from PIL import Image, ImageDraw, ImageTk
import requests
import io
import json
import base64

class ImageSegmenter:
    def __init__(self, root):
        self.root = root
        self.root.title("Image Segmenter")
        self.root.geometry("600x400")

        # API Configuration
        self.api_key = "7kDS0qoq56Si0jbdcRHV"
        self.model_endpoint = "https://serverless.roboflow.com/infer/workflows/wisd-scixc/custom-workflow-6"

        # GUI Elements
        self.label = tk.Label(root, text="Select an image or enter URL to segment")
        self.label.pack(pady=10)

        self.load_button = tk.Button(root, text="Load Image", command=self.load_image)
        self.load_button.pack(pady=5)

        self.url_entry = tk.Entry(root, width=50)
        self.url_entry.pack(pady=5)
        self.url_entry.insert(0, "IMAGE_URL")

        self.segment_button = tk.Button(root, text="Segment Image", command=self.segment_image, state='disabled')
        self.segment_button.pack(pady=5)

        self.canvas = tk.Canvas(root, width=500, height=300)
        self.canvas.pack(pady=10)

        self.image = None
        self.photo = None

    def load_image(self):
        file_path = filedialog.askopenfilename(filetypes=[("Image files", "*.png *.jpg *.jpeg *.bmp")])
        if file_path:
            self.image = Image.open(file_path).convert("RGB")
            self.photo = ImageTk.PhotoImage(self.image.resize((500, 300), Image.Resampling.LANCZOS))
            self.canvas.create_image(250, 150, image=self.photo)
            self.segment_button.config(state='normal')

    def segment_image(self):
        if not self.image and not self.url_entry.get().strip() != "IMAGE_URL":
            messagebox.showerror("Error", "Please load an image or enter a valid URL!")
            return

        # Prepare image data
        if self.image:
            img_byte_arr = io.BytesIO()
            self.image.save(img_byte_arr, format='JPEG')
            img_data = base64.b64encode(img_byte_arr.getvalue()).decode('utf-8')
        else:
            img_data = self.url_entry.get().strip()

        # API Request
        payload = {
            "api_key": self.api_key,
            "inputs": {
                "image": {"type": "url" if not self.image else "base64", "value": img_data}
            }
        }
        headers = {"Content-Type": "application/json"}
        try:
            response = requests.post(self.model_endpoint, headers=headers, data=json.dumps(payload))
            response.raise_for_status()  # Raise an exception for bad status codes
            result = response.json()

            # Debug: Print the raw response to understand its structure
            print("API Response:", json.dumps(result, indent=2))

            if "outputs" in result and result["outputs"]:
                predictions = result["outputs"][0].get("predictions", [])
                if not isinstance(predictions, list):
                    messagebox.showerror("Error", "Unexpected predictions format in API response!")
                    return
                image_size = result["outputs"][0].get("image", {"width": 500, "height": 300})
                self.draw_segmentation(predictions, image_size)
            else:
                messagebox.showinfo("Info", "No objects detected!")
        except requests.exceptions.RequestException as e:
            messagebox.showerror("Error", f"API request failed: {str(e)}")
        except json.JSONDecodeError as e:
            messagebox.showerror("Error", f"Failed to parse API response: {str(e)}")

    def draw_segmentation(self, predictions, image_size):
        if not self.image:
            return

        # Create a new image for drawing
        draw_image = self.image.copy()
        draw = ImageDraw.Draw(draw_image)

        for prediction in predictions:
            if isinstance(prediction, dict) and prediction.get("confidence", 0) >= 0.3 and "points" in prediction:
                points = prediction["points"]
                if points and isinstance(points, list):
                    scaled_points = [
                        (point["x"] * 500 / image_size["width"], point["y"] * 300 / image_size["height"])
                        for point in points if isinstance(point, dict) and "x" in point and "y" in point
                    ]
                    if len(scaled_points) > 2:  # Need at least 3 points for a polygon
                        draw.polygon(scaled_points, outline="red", fill="rgba(255, 0, 0, 0.2)")
                        # Add class label
                        x, y = scaled_points[0]
                        draw.text((x, y - 10), prediction.get("class", "Unknown"), fill="black")

        self.photo = ImageTk.PhotoImage(draw_image.resize((500, 300), Image.Resampling.LANCZOS))
        self.canvas.create_image(250, 150, image=self.photo)

if __name__ == "__main__":
    root = tk.Tk()
    app = ImageSegmenter(root)
    root.mainloop()