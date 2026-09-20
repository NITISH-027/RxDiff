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
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <div className="flex flex-col h-full bg-[#101417] border border-line-dark rounded-[8px] p-3 shadow-sm select-none overflow-hidden">
      {/* Sleeve Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-line-dark/60">
        <div className="flex items-baseline gap-2">
          <span className="font-sans text-[12px] font-semibold tracking-wide text-text-1 uppercase">
            <span>{label}</span>
            {srLabel && <span className="sr-only">{srLabel}</span>}
          </span>
          <span className="text-[10.5px] text-text-3 font-mono">
            [{subtitle}]
          </span>
        </div>
        {file && (
          <span className="font-mono text-[10px] text-text-3 tabular-nums">
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
        aria-label={ariaLabel || label}
      />

      {/* Sleeve Tray Container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !file && !disabled && fileInputRef.current?.click()}
        className={`flex-1 flex flex-col items-center justify-center p-3 rounded-[6px] transition-all duration-150 ${
          file
            ? 'bg-paper text-paper-ink border border-paper-edge shadow-paper'
            : isDragOver
              ? 'border-2 border-dashed border-active bg-active/5'
              : 'border border-dashed border-paper-edge/30 bg-[#0B0E10] hover:border-paper-edge/60 cursor-pointer'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {file && previewUrl ? (
          <div className="flex flex-col items-center justify-between h-full w-full gap-2.5">
            {/* Paper Document Preview */}
            <div className="relative flex-1 w-full flex items-center justify-center min-h-[120px] max-h-[220px] bg-[#EAE6DD]/50 rounded-[4px] overflow-hidden border border-paper-edge/60">
              <img
                src={previewUrl}
                alt={`${label} Preview`}
                className="max-h-full max-w-full object-contain"
              />
            </div>

            {/* Document Details & Replace/Remove Actions */}
            <div className="w-full flex items-center justify-between gap-2 pt-2 border-t border-paper-edge/70 text-[11px] font-mono">
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-paper-ink truncate max-w-[170px]">
                  {file.name}
                </span>
                <span className="text-paper-muted text-[10px]">
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
                  className="px-2 py-1 bg-[#EAE6DD] hover:bg-[#DDD9CF] text-paper-ink text-[10.5px] font-sans font-medium rounded-[3px] transition-colors"
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
                  className="px-2 py-1 bg-[#FB7185]/15 hover:bg-[#FB7185]/25 text-[#BE123C] text-[10.5px] font-sans font-medium rounded-[3px] transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Inset Paper Silhouette Empty State */
          <div className="flex flex-col items-center justify-center text-center space-y-1.5 py-4 px-3">
            <div className="w-9 h-9 rounded-[5px] bg-[#161B20] border border-line-dark flex items-center justify-center text-text-3 mb-1">
              <svg
                aria-hidden="true"
                className="w-4 h-4 text-text-2"
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
            <p className="font-sans text-[13px] font-medium text-text-1">
              Place image
            </p>
            <p className="text-[11px] text-text-3 font-mono leading-tight">
              JPEG, PNG, or WebP up to 5 MB
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
