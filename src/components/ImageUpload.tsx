import React from 'react';

interface ImageUploadProps {
  onUpload: (file: File) => void;
  onClose: () => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onUpload, onClose }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUpload(file);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl">
        <h3 className="text-lg font-bold mb-4">Upload Image</h3>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="mb-4"
        />
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;