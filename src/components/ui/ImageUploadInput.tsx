import React, { useState, useRef } from 'react';

interface ImageUploadInputProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
}

export const ImageUploadInput: React.FC<ImageUploadInputProps> = ({
  value,
  onChange,
  label = 'Thumbnail / Cover Image',
  placeholder = 'https://images.unsplash.com/... or upload an image file',
}) => {
  const [mode, setMode] = useState<'upload' | 'url'>(value.startsWith('data:') ? 'upload' : 'url');
  const [isDragging, setIsDragging] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (PNG, JPG, JPEG, WebP).');
      return;
    }

    setErrorMessage(null);
    setCompressing(true);

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        // High-fidelity responsive canvas compression (max 1280px dimension, high crisp quality)
        const maxDimension = 1280;
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Export as optimized WebP or JPEG
          const compressedDataUrl = canvas.toDataURL('image/webp', 0.85);
          onChange(compressedDataUrl);
          setMode('upload');
        } else {
          // Fallback to raw data url
          onChange(readerEvent.target?.result as string);
        }
        setCompressing(false);
      };
      img.onerror = () => {
        setErrorMessage('Failed to decode image.');
        setCompressing(false);
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read file from disk.');
      setCompressing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleClear = () => {
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-secondary font-bold text-xs font-mono-data">{label} *</label>
        <div className="flex gap-1 bg-[#0A0E17] p-0.5 rounded-lg border border-outline-variant/30">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`px-2.5 py-1 rounded text-[11px] font-mono-data font-bold transition-all cursor-pointer ${
              mode === 'upload'
                ? 'bg-secondary text-surface-container-lowest shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            📁 Upload File
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`px-2.5 py-1 rounded text-[11px] font-mono-data font-bold transition-all cursor-pointer ${
              mode === 'url'
                ? 'bg-secondary text-surface-container-lowest shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            🔗 Paste URL
          </button>
        </div>
      </div>

      {mode === 'upload' ? (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-secondary bg-secondary/10'
                : 'border-outline-variant/50 bg-[#131929] hover:border-secondary/60 hover:bg-[#182035]'
            }`}
          >
            {compressing ? (
              <div className="py-4 space-y-2">
                <span className="material-symbols-outlined text-secondary text-3xl animate-spin">
                  progress_activity
                </span>
                <p className="text-xs font-mono-data text-secondary font-bold">Optimizing &amp; Encoding Image...</p>
              </div>
            ) : value ? (
              <div className="space-y-2">
                <div className="relative aspect-video max-h-36 mx-auto rounded-lg overflow-hidden border border-secondary/40 bg-black">
                  <img src={value} alt="Uploaded preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-mono-data font-bold">
                    Click or Drop to Replace
                  </div>
                </div>
                <div className="flex justify-center gap-2">
                  <span className="text-[11px] font-mono-data text-[#2ED573] flex items-center gap-1 font-bold">
                    <span className="material-symbols-outlined text-sm">check_circle</span> Image Loaded Ready to Store
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClear();
                    }}
                    className="text-[11px] font-mono-data text-red-400 hover:text-red-300 underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-4 space-y-1.5">
                <span className="material-symbols-outlined text-secondary text-3xl">cloud_upload</span>
                <p className="text-xs font-mono-data text-on-surface font-bold">
                  Click to select image or drag &amp; drop here
                </p>
                <p className="text-[11px] font-mono-data text-on-surface-variant">
                  Supports PNG, JPG, JPEG, WebP • Auto-optimized for instant streaming
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            value={value.startsWith('data:') ? '' : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="input-field w-full p-2.5 rounded-lg bg-[#131929] border border-outline-variant/40 text-on-surface outline-none focus:border-secondary font-mono-data text-xs"
          />
          {value && !value.startsWith('data:') && (
            <div className="relative aspect-video max-h-32 rounded-lg overflow-hidden border border-outline-variant/40 bg-black">
              <img
                src={value}
                alt="URL Preview"
                onError={(e) => {
                  e.currentTarget.src =
                    'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80';
                }}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <p className="text-xs font-mono-data text-red-400 flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">error</span>
          <span>{errorMessage}</span>
        </p>
      )}
    </div>
  );
};
