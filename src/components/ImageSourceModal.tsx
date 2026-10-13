import React, { useState } from 'react';
import { Image, FolderArchive, Camera, X, Loader2 } from 'lucide-react';
import { pickImageBySource, ImagePickSource } from '../utils/imagePicker';

interface ImageSourceModalProps {
  title?: string;
  isOpen: boolean;
  onClose: () => void;
  onImageSelected: (dataUrl: string) => void;
}

export function ImageSourceModal({
  title = 'Upload Image',
  isOpen,
  onClose,
  onImageSelected,
}: ImageSourceModalProps) {
  const [loadingSource, setLoadingSource] = useState<ImagePickSource | null>(null);

  if (!isOpen) return null;

  const handleSelect = async (source: ImagePickSource) => {
    try {
      setLoadingSource(source);
      const dataUrl = await pickImageBySource(source);
      if (dataUrl) {
        onImageSelected(dataUrl);
        onClose();
      }
    } catch (err) {
      console.error('Failed to pick image:', err);
    } finally {
      setLoadingSource(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-surface rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-line animate-in fade-in slide-in-from-bottom-6 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-line">
          <div>
            <h3 className="text-[16px] font-bold text-ink">{title}</h3>
            <p className="text-[12px] text-ink-2">Choose where to select your image from</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-canvasbg grid place-items-center text-ink-2 hover:text-ink active:scale-95 transition-transform"
          >
            <X size={17} />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-2 py-2">
          {/* Option 1: Gallery & Google Photos & Samsung Gallery */}
          <button
            type="button"
            disabled={loadingSource !== null}
            onClick={() => handleSelect('gallery')}
            className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-canvasbg hover:bg-line/40 active:scale-[0.98] transition-all text-left group border border-line/60"
          >
            <div className="w-11 h-11 rounded-xl bg-brand/15 text-brand grid place-items-center shrink-0 group-hover:scale-105 transition-transform">
              {loadingSource === 'gallery' ? (
                <Loader2 size={22} className="animate-spin text-brand" />
              ) : (
                <Image size={22} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold text-ink flex items-center justify-between">
                <span>Gallery & Photos</span>
                <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-brand/10 text-brand">
                  Recommended
                </span>
              </div>
              <p className="text-[11.5px] text-ink-2 truncate">
                Samsung Gallery, Google Photos, Albums & Camera Roll
              </p>
            </div>
          </button>

          {/* Option 2: ZArchiver / File Managers & Storage */}
          <button
            type="button"
            disabled={loadingSource !== null}
            onClick={() => handleSelect('files')}
            className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-canvasbg hover:bg-line/40 active:scale-[0.98] transition-all text-left group border border-line/60"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-500 grid place-items-center shrink-0 group-hover:scale-105 transition-transform">
              {loadingSource === 'files' ? (
                <Loader2 size={22} className="animate-spin text-amber-500" />
              ) : (
                <FolderArchive size={22} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold text-ink">
                File Manager & Archives
              </div>
              <p className="text-[11.5px] text-ink-2 truncate">
                ZArchiver, My Files, Google Drive, Downloads & SD Card
              </p>
            </div>
          </button>

          {/* Option 3: Camera */}
          <button
            type="button"
            disabled={loadingSource !== null}
            onClick={() => handleSelect('camera')}
            className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-canvasbg hover:bg-line/40 active:scale-[0.98] transition-all text-left group border border-line/60"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-500 grid place-items-center shrink-0 group-hover:scale-105 transition-transform">
              {loadingSource === 'camera' ? (
                <Loader2 size={22} className="animate-spin text-emerald-500" />
              ) : (
                <Camera size={22} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold text-ink">
                Take Photo
              </div>
              <p className="text-[11.5px] text-ink-2 truncate">
                Capture directly using your device camera
              </p>
            </div>
          </button>
        </div>

        {/* Cancel button */}
        <button
          onClick={onClose}
          className="w-full mt-2 py-3 rounded-xl bg-canvasbg hover:bg-line/40 text-[13px] font-bold text-ink-2 transition-colors active:scale-[0.99]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
