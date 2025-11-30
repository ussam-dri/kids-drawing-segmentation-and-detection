from inference import InferencePipeline
import cv2
import threading
import tkinter as tk
import signal
import sys
import time

# Global variable to stop the pipeline externally
stop_event = threading.Event()
pipeline = None

def my_sink(result, video_frames):
    if stop_event.is_set():
        return  # Skip processing if we're stopping
    
    try:
        # Handle both single VideoFrame and list of VideoFrames
        if hasattr(video_frames, 'image'):
            # Single VideoFrame object
            frame = video_frames.image
        elif isinstance(video_frames, list) and len(video_frames) > 0:
            # List of VideoFrames
            frame = video_frames[0].image
        else:
            print("Unexpected video_frames format")
            return
        
        # Handle Detections object format
        if isinstance(result, dict) and "predictions" in result:
            detections = result["predictions"]
            
            # Check if it's a Detections object with the expected attributes
            if hasattr(detections, 'mask') and hasattr(detections, 'confidence') and hasattr(detections, 'class_id'):
                # Extract detection data
                masks = detections.mask  # Segmentation masks
                confidences = detections.confidence
                class_ids = detections.class_id
                
                # Get class names if available
                class_names = None
                if hasattr(detections, 'data') and 'class_name' in detections.data:
                    class_names = detections.data['class_name']
                
                # Draw contours for each detection
                for i in range(len(masks)):
                    mask = masks[i].astype('uint8')  # Convert boolean mask to uint8
                    confidence = confidences[i]
                    class_id = class_ids[i]
                    
                    # Get class name
                    if class_names is not None and i < len(class_names):
                        label = class_names[i]
                    else:
                        label = f"Class_{class_id}"
                    
                    # Find contours from the mask
                    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                    
                    # Draw contours
                    cv2.drawContours(frame, contours, -1, (0, 255, 0), 2)
                    
                    # Optional: Fill the contours with semi-transparent color
                    overlay = frame.copy()
                    cv2.drawContours(overlay, contours, -1, (0, 255, 0), -1)
                    cv2.addWeighted(overlay, 0.3, frame, 0.7, 0, frame)
                    
                    # Find a good position for the label (top-left of the largest contour)
                    if contours:
                        # Get the largest contour
                        largest_contour = max(contours, key=cv2.contourArea)
                        # Get bounding rect for label positioning
                        x, y, w, h = cv2.boundingRect(largest_contour)
                        
                        # Draw label with confidence
                        cv2.putText(
                            frame,
                            f"{label} ({confidence:.2f})",
                            (x, y - 10),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.6,
                            (0, 255, 0),
                            2,
                        )
                
                print(f"Found {len(masks)} segmented objects")
            else:
                print("No segmentation masks found in detections")
        else:
            print("No predictions found in result")
        
        # Show the frame
        cv2.imshow("Segmented Objects", frame)
        
        # Check for 'q' key press to quit
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            stop_pipeline()
            
    except Exception as e:
        print(f"Error in sink function: {e}")
        import traceback
        traceback.print_exc()

def stop_pipeline():
    print("Stopping pipeline...")
    stop_event.set()
    
    global pipeline
    if pipeline:
        try:
            pipeline.stop()  # Stop inference pipeline
        except Exception as e:
            print(f"Error stopping pipeline: {e}")
    
    cv2.destroyAllWindows()
    
    # Close tkinter window if it exists
    try:
        root.quit()
        root.destroy()
    except:
        pass

def run_pipeline():
    global pipeline
    try:
        pipeline = InferencePipeline.init_with_workflow(
            api_key="7kDS0qoq56Si0jbdcRHV",
            workspace_name="wisd-scixc", 
            workflow_id="custom-workflow-6",
            video_reference=0,  # Use default camera (0)
            max_fps=30,
            on_prediction=my_sink,
        )
        
        print("Starting pipeline...")
        pipeline.start()
        pipeline.join()
        
    except Exception as e:
        print(f"Error running pipeline: {e}")
        stop_pipeline()

# Setup signal handler for Ctrl+C
def signal_handler(sig, frame):
    print("Exiting via Ctrl+C...")
    stop_pipeline()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

def on_window_close():
    stop_pipeline()
    sys.exit(0)

# --- Tkinter Window Setup ---
root = tk.Tk()
root.title("Roboflow Inference Control")
root.geometry("300x150")

# Handle window close event
root.protocol("WM_DELETE_WINDOW", on_window_close)

# Instructions label
instructions = tk.Label(
    root, 
    text="Camera feed will open in separate window.\nPress 'q' in camera window or click Exit to stop.",
    font=("Arial", 10),
    wraplength=280
)
instructions.pack(padx=10, pady=10)

# Exit button
exit_button = tk.Button(
    root, 
    text="Exit", 
    command=stop_pipeline, 
    font=("Arial", 16), 
    bg="red", 
    fg="white",
    width=10,
    height=2
)
exit_button.pack(padx=20, pady=20)

# Start pipeline in background thread
pipeline_thread = threading.Thread(target=run_pipeline, daemon=True)
pipeline_thread.start()

print("Starting application...")
print("Camera window should open shortly...")
print("Press 'q' in the camera window or click 'Exit' button to stop.")

# Start GUI loop
try:
    root.mainloop()
except KeyboardInterrupt:
    stop_pipeline()
finally:
    # Ensure cleanup
    stop_pipeline()
    sys.exit(0)