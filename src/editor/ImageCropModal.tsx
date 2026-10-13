import React, { useRef, useState } from 'react';
import { Check, X, RotateCcw, ZoomIn, Move } from 'lucide-react';
import { ImageElement } from '../types';

interface Props {
  image: ImageElement;
  onApply: (patch: { zoom: number; offsetX: number; offsetY: number; fit: 'cover' | 'contain' }) => void;
  onClose: () => void;
}

export function ImageCropModal({ image, onApply, onClose }: Props) {
  const [zoom, setZoom] = useState(image.zoom || 1);
  const [offsetX, setOffsetX] = useState(image.offsetX || 0);
  const [offsetY, setOffsetY] = useState(image.offsetY || 0);
  const [fit, setFit] = useState<'cover' | 'contain'>(image.fit || 'cover');

  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startOffset = useRef({ x: 0, y: 0 });
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<{ dist: number; zoom: number }>({ dist: 0, zoom: 1 });

  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        zoom,
      };
      return;
    }
    isDragging.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    startOffset.current = { x: offsetX, y: offsetY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (pointers.current.has(e.pointerId)) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchStart.current.dist > 0) {
        const factor = d / pinchStart.current.dist;
        setZoom(Math.max(1, Math.min(3.5, pinchStart.current.zoom * factor)));
      }
      return;
    }
    if (!isDragging.current) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    // Map screen pixel drag to percentage offset
    const speed = 0.35 / zoom;
    const nx = Math.max(-60, Math.min(60, startOffset.current.x - dx * speed));
    const ny = Math.max(-60, Math.min(60, startOffset.current.y - dy * speed));
    setOffsetX(nx);
    setOffsetY(ny);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      isDragging.current = false;
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom((z) => Math.max(1, Math.min(3.5, z + delta)));
  };

  const resetPosition = () => {
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  const handleSave = () => {
    onApply({
      zoom: Math.round(zoom * 100) / 100,
      offsetX: Math.round(offsetX),
      offsetY: Math.round(offsetY),
      fit,
    });
    onClose();
  };

  const frameRatio = image.width / image.height;

  return (
    <div className="fixed inset-0 z-[11000] flex flex-col bg-ink select-none touch-none sheet-in">
      {/* Header with Title and Prominent Checkmark */}
      <div className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] border-b border-white/10 shrink-0">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 text-white grid place-items-center active:bg-white/20"
        >
          <X size={20} />
        </button>
        <div className="text-center">
          <h3 className="text-[15px] font-bold text-white">Crop & Position</h3>
          <p className="text-[11px] text-white/60">Drag to reposition, pinch to zoom</p>
        </div>
        <button
          onClick={handleSave}
          className="h-10 px-4 rounded-full bg-brand text-white font-bold text-[14px] flex items-center gap-1.5 active:bg-brand-dark shadow-md"
        >
          <Check size={18} strokeWidth={2.5} />
          <span>Done</span>
        </button>
      </div>

      {/* Main Crop Viewport */}
      <div
        className="flex-1 relative flex items-center justify-center p-6 overflow-hidden cursor-move"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={handleWheel}
      >
        {/* Shaded Backdrop */}
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />

        {/* Framing Container matching the layer proportions */}
        <div
          className="relative max-w-[90vw] max-h-[58vh] overflow-hidden border-2 border-white/90 shadow-2xl transition-all"
          style={{
            aspectRatio: `${frameRatio}`,
            width: frameRatio >= 1 ? '340px' : 'auto',
            height: frameRatio < 1 ? '340px' : 'auto',
            borderRadius: image.circle ? '50%' : Math.min(24, image.radius),
          }}
        >
          {/* The image being cropped and positioned */}
          {image.src && (
            <img
              src={image.src}
              draggable={false}
              className="pointer-events-none absolute top-1/2 left-1/2"
              style={{
                minWidth: fit === 'cover' ? '100%' : '0',
                minHeight: fit === 'cover' ? '100%' : '0',
                maxWidth: fit === 'contain' ? '100%' : 'none',
                maxHeight: fit === 'contain' ? '100%' : 'none',
                width: 'auto',
                height: 'auto',
                transform: `translate(-50%, -50%) translate(${-(offsetX || 0)}%, ${-(offsetY || 0)}%) scale(${zoom})`,
              }}
            />
          )}

          {/* Rule of Thirds Grid Overlay */}
          <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
            <div className="border-r border-b border-white/30" />
            <div className="border-r border-b border-white/30" />
            <div className="border-b border-white/30" />
            <div className="border-r border-b border-white/30" />
            <div className="border-r border-b border-white/30" />
            <div className="border-b border-white/30" />
            <div className="border-r border-white/30" />
            <div className="border-r border-white/30" />
            <div />
          </div>

          {/* Hint Overlay */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 text-white text-[11px] font-medium pointer-events-none backdrop-blur-sm">
            <Move size={12} />
            <span>Drag photo to pan</span>
          </div>
        </div>
      </div>

      {/* Bottom Tool Controls */}
      <div className="bg-surface rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shrink-0 border-t border-line">
        {/* Zoom Slider */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-[12px] font-semibold text-ink-2 mb-1.5">
            <span className="flex items-center gap-1.5">
              <ZoomIn size={15} /> Zoom
            </span>
            <span className="tabular-nums font-bold text-ink">{Math.round(zoom * 100)}%</span>
          </div>
          <input
            type="range"
            min={1}
            max={3}
            step={0.02}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Fit and Reset Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setFit(fit === 'cover' ? 'contain' : 'cover')}
            className={`flex-1 h-11 rounded-2xl text-[13px] font-bold border transition-colors ${
              fit === 'cover' ? 'bg-ink text-white border-ink' : 'bg-canvasbg text-ink border-line'
            }`}
          >
            {fit === 'cover' ? 'Fill Frame (Cover)' : 'Fit Whole Photo (Contain)'}
          </button>

          <button
            onClick={resetPosition}
            title="Reset position"
            className="h-11 px-4 rounded-2xl bg-canvasbg border border-line text-ink flex items-center justify-center gap-1.5 text-[13px] font-bold active:bg-line"
          >
            <RotateCcw size={15} />
            <span>Center</span>
          </button>
        </div>
      </div>
    </div>
  );
}
