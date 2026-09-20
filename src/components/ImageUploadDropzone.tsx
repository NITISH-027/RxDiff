import React, { useState, useEffect, useRef, useMemo } from 'react';

interface ImageUploadDropzoneProps {
  label: string;
  subtitle: string;
  file: File | null;
  onFileSelected: (file: File) => void;
  onFileRemoved: () => void;
  disabled?: boolean;
}

export const ImageUploadDropzone: React.FC<ImageUploadDropzoneProps> = ({
  label,
  subtitle,
  file,
  onFileSelected,
  onFileRemoved,
  disabled = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive object URL during render without setState in effect
  const previewUrl = useMemo(() => {
    if (!file) return null;
    try {
      if (typeof URL !== 'undefined' && URL.createObjectURL) {
        return URL.createObjectURL(file);
      }
    } catch {
      // In environments where createObjectURL is unavailable or throws
    }
    return null;
  }, [file]);

  // Clean up object URL when previewUrl changes or unmounts
  useEffect(() => {
    return () => {
      if (previewUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    const dropped = e.dataTransfer.files?.[0];
    if (dropped && ['image/jpeg', 'image/png', 'image/webp'].includes(dropped.type)) {
      onFileSelected(dropped);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      onFileSelected(selected);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="flex flex-col h-full bg-paper text-paper-ink border border-line-paper rounded-[4px] shadow-sm overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-line-paper bg-[#EAE7DF]">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-bold tracking-[0.10em] text-paper-ink uppercase">
            {label}
          </span>
          <span className="text-[10px] text-paper-muted font-mono uppercase">
            [{subtitle}]
          </span>
        </div>
        {file && (
          <span className="font-mono text-[10px] text-paper-muted tabular-nums">
            {formatFileSize(file.size)}
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
        aria-label={label}
      />

      {/* Main Container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !file && !disabled && fileInputRef.current?.click()}
        className={`flex-1 flex flex-col items-center justify-center p-4 m-2 rounded-[3px] border-2 border-dashed transition-all duration-150 ${
          isDragOver
            ? 'border-active bg-active/5'
            : file
              ? 'border-line-paper bg-[#FAF8F5]'
              : 'border-[#D9D5CC] bg-[#F7F5EE] hover:bg-white hover:border-paper-muted cursor-pointer'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {file && previewUrl ? (
          <div className="flex flex-col items-center justify-between h-full w-full gap-3">
            {/* Thumbnail Preview */}
            <div className="relative flex-1 w-full flex items-center justify-center min-h-[140px] max-h-[260px] bg-[#EAE7DF]/40 rounded-[2px] overflow-hidden border border-line-paper">
              <img
                src={previewUrl}
                alt={`${label} Preview`}
                className="max-h-full max-w-full object-contain"
              />
            </div>

            {/* File Details & Actions */}
            <div className="w-full flex items-center justify-between gap-2 pt-2 border-t border-line-paper text-[11px] font-mono">
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-paper-ink truncate max-w-[180px]">
                  {file.name}
                </span>
                <span className="text-paper-muted text-[10px]">
                  {file.type} · {formatFileSize(file.size)}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!disabled) fileInputRef.current?.click();
                  }}
                  disabled={disabled}
                  className="px-2 py-1 bg-[#EAE7DF] hover:bg-[#DDD9CE] text-paper-ink text-[10px] font-medium rounded-[2px] transition-colors"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!disabled) onFileRemoved();
                  }}
                  disabled={disabled}
                  className="px-2 py-1 bg-[#FB7185]/15 hover:bg-[#FB7185]/25 text-[#BE123C] text-[10px] font-medium rounded-[2px] transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center space-y-2 max-w-[240px]">
            <div className="w-10 h-10 rounded-full bg-[#EAE7DF] flex items-center justify-center text-paper-muted mb-1">
              <svg
                aria-hidden="true"
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                />
              </svg>
            </div>
            <p className="font-mono text-[12px] font-bold text-paper-ink">
              Drop image here or click to browse
            </p>
            <p className="text-[11px] text-paper-muted font-mono leading-tight">
              JPEG, PNG, WebP up to 5 MB
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
