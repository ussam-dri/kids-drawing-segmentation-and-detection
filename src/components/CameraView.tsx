import React, { useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, X } from 'lucide-react';

interface CameraViewProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

const CameraView: React.FC<CameraViewProps> = ({ onCapture, onClose }) => {
  const webcamRef = useRef<Webcam>(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      onCapture(imageSrc);
    }
  }, [onCapture]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded-lg shadow-lg max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Camera</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="relative">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            className="w-full rounded-lg"
          />
        </div>
        
        <div className="mt-4 flex justify-center">
          <button
            onClick={capture}
            className="bg-purple-600 text-white px-6 py-2 rounded-full font-medium hover:bg-purple-700 transition-colors flex items-center"
          >
            <Camera size={20} className="mr-2" />
            Capture
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameraView;