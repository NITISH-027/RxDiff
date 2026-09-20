import React, { useState, useEffect, useRef, useMemo } from 'react';

interface ImageUploadDropzoneProps {
  label: string;
  subtitle: string;
  file: File | null;
  onFileSelected: (file: File) => void;
  onFileRemoved: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  srLabel?: string;
  placeholder?: string;
}

export const ImageUploadDropzone: React.FC<ImageUploadDropzoneProps> = ({
  label,
  subtitle,
  file,
  onFileSelected,
  onFileRemoved,
  disabled = false,
  ariaLabel,
  srLabel,
  placeholder,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    try {
      if (typeof URL !== 'undefined' && URL.createObjectURL) {
        return URL.createObjectURL(file);
      }
    } catch {
      // Ignore in environments where createObjectURL throws
    }
    return null;
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
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
    <div className="flex flex-col h-full bg-white border border-[#E5E0D8] rounded-[6px] p-3.5 shadow-card select-none overflow-hidden">
      {/* Sleeve Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E5E0D8]">
        <div className="flex items-baseline gap-2">
          <span className="font-sans text-[12px] font-semibold tracking-wide text-[#1A1D20]">
            <span>{label}</span>
            {srLabel && <span className="sr-only">{srLabel}</span>}
          </span>
          <span className="text-[10.5px] text-[#75808B] font-mono">
            [{subtitle}]
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {!file && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cameraInputRef.current?.click();
              }}
              title="Snap photo directly with mobile camera"
              className="inline-flex sm:hidden items-center gap-1 px-2 py-0.5 text-[10px] font-mono bg-[#FAF8F5] text-[#3D5A4C] border border-[#E5E0D8] rounded hover:bg-[#F5F2EB]"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Camera</span>
            </button>
          )}
          {file && (
            <span className="font-mono text-[10px] text-[#75808B] tabular-nums">
              {formatFileSize(file.size)}
            </span>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
        aria-label={ariaLabel || label}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
        aria-label={`Take camera photo for ${label}`}
      />

      {/* Sleeve Tray Container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !file && !disabled && fileInputRef.current?.click()}
        className={`flex-1 flex flex-col items-center justify-center p-3 rounded-[4px] transition-all duration-150 ${
          file
            ? 'bg-[#FAF8F5] text-[#1A1D20] border border-[#E5E0D8] shadow-xs'
            : isDragOver
              ? 'border-2 border-[#3D5A4C] bg-[#E8EFEA]/40'
              : 'border border-[#E5E0D8] bg-[#FAF8F5]/30 hover:bg-[#FAF8F5] hover:border-[#3D5A4C]/60 cursor-pointer'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {file && previewUrl ? (
          <div className="flex flex-col items-center justify-between h-full w-full gap-2.5">
            {/* Paper Document Preview */}
            <div className="relative flex-1 w-full flex items-center justify-center min-h-[120px] max-h-[220px] bg-white rounded-[4px] overflow-hidden border border-[#E5E0D8]">
              <img
                src={previewUrl}
                alt={`${label} Preview`}
                className="max-h-full max-w-full object-contain"
              />
            </div>

            {/* Document Details & Replace/Remove Actions */}
            <div className="w-full flex items-center justify-between gap-2 pt-2 border-t border-[#E5E0D8] text-[11px] font-mono">
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-[#1A1D20] truncate max-w-[170px]">
                  {file.name}
                </span>
                <span className="text-[#75808B] text-[10px]">
                  {file.type.replace('image/', '')} · {formatFileSize(file.size)}
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
                  className="px-2.5 py-1 bg-white hover:bg-[#F5F2EB] text-[#1A1D20] text-[10.5px] font-sans font-medium border border-[#E5E0D8] rounded-[3px] shadow-xs transition-colors"
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
                  className="px-2.5 py-1 bg-[#FFE4E6] hover:bg-[#FECDD3] text-[#9F1239] text-[10.5px] font-sans font-medium rounded-[3px] transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center text-center space-y-1.5 py-4 px-3">
            <div className="w-9 h-9 rounded-[4px] bg-white border border-[#E5E0D8] shadow-xs flex items-center justify-center text-[#75808B] mb-1">
              <svg
                aria-hidden="true"
                className="w-4 h-4 text-[#48525B]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </div>
            <p className="font-sans text-[13px] font-medium text-[#1A1D20]">
              {placeholder || 'Place image'}
            </p>
            <p className="text-[11px] text-[#75808B] font-mono leading-tight">
              JPEG, PNG, or WebP up to 5 MB
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
