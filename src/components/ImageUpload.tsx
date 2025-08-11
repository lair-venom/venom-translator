import React, { useState, useRef } from 'react';
import { Upload, Clipboard, X, Image } from 'lucide-react';

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  currentImage?: string | null;
  onClearImage: () => void;
  loading?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageSelect,
  currentImage,
  onClearImage,
  loading = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      onImageSelect(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onImageSelect(files[0]);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      // Проверяем поддержку Clipboard API
      if (!navigator.clipboard || !navigator.clipboard.read) {
        throw new Error('Clipboard API не поддерживается в этом браузере');
      }
      
      const clipboardItems = await navigator.clipboard.read();
      
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith('image/')) {
            const blob = await clipboardItem.getType(type);
            const file = new File([blob], 'clipboard-image.png', { type });
            onImageSelect(file);
            return;
          }
        }
      }
      throw new Error('В буфере обмена нет изображений');
    } catch (err: any) {
      console.error('Failed to read clipboard:', err);
      throw err;
    }
  };

  if (currentImage) {
    return (
      <div className="relative">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Изображение для перевода
        </label>
        <div className="relative glass rounded-lg p-4 hover-glow">
        <div className="relative glass-border rounded-lg p-4 hover-glow">
          <button
            onClick={onClearImage}
            className="absolute top-2 right-2 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <img
            src={currentImage}
            alt="Uploaded"
            className="w-full max-h-64 object-contain rounded"
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Загрузить изображение
      </label>
      <div
        className={`glass-border rounded-lg border-2 border-dashed transition-all cursor-pointer hover-glow ${
          dragOver ? 'border-orange-400 bg-orange-400 bg-opacity-10' : 'border-gray-600'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="p-8 text-center">
          <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-300 mb-4">
            Перетащите изображение сюда или нажмите для выбора
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-400 to-orange-600 text-white rounded-lg hover:from-orange-500 hover:to-orange-700 transition-all"
            >
              <Upload className="w-4 h-4 mr-2" />
              Выбрать файл
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePasteFromClipboard();
              }}
              className="inline-flex items-center px-4 py-2 glass-border text-orange-400 rounded-lg hover:bg-orange-400 hover:bg-opacity-20 transition-all"
            >
              <Clipboard className="w-4 h-4 mr-2" />
              Из буфера
            </button>
          </div>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
    )
  }
}