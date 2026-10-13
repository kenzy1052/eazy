import React, { useRef, useState } from 'react';
import { Check, X, RotateCcw, ZoomIn, Move } from 'lucide-react';
import { CanvasSize, ShapeKind } from '../types';

interface Props {
  src: string;
  canvas: CanvasSize;
  initial: { zoom: number; offsetX: number; offsetY: number };
  onApply: (patch: { zoom: number; offsetX: number; offsetY: number }) => void;
  onClose: () => void;
  /** When set, the frame is masked to this shape (matching how it will
   * actually render) instead of a plain rectangle — e.g. a circle shows a
   * true circular window with everything outside it dimmed. */
  shapeKind?: ShapeKind;
  sides?: number;
  title?: string;
}

/** Shared geometry for both the mask hole and its outline stroke, in a
 * normalized 0–100 box that gets non-uniformly stretched to the frame's
 * real aspect ratio — the same trick ShapeView itself uses, so the preview
 * matches the final render exactly. */
function shapeGeometry(shape: ShapeKind, sides?: number): { kind: 'ellipse' } | { kind: 'polygon'; points: string } | null {
  const cx = 50, cy = 50, rx = 50, ry = 50;
  if (shape === 'circle') return { kind: 'ellipse' };

  const polygonal: ShapeKind[] = ['triangle', 'pentagon', 'hexagon', 'octagon', 'star', 'polygon'];
  if (polygonal.includes(shape)) {
    let points: string;
    if (shape === 'star') {
      const pts: string[] = [];
      const numPoints = 5;
      for (let i = 0; i < numPoints * 2; i++) {
        const isOuter = i % 2 === 0;
        const curRx = isOuter ? rx : rx * 0.42;
        const curRy = isOuter ? ry : ry * 0.42;
        const angle = -Math.PI / 2 + (i * Math.PI) / numPoints;
        pts.push(`${cx + curRx * Math.cos(angle)},${cy + curRy * Math.sin(angle)}`);
      }
      points = pts.join(' ');
    } else {
      const sideCount = shape === 'triangle' ? 3 : shape === 'pentagon' ? 5 : shape === 'hexagon' ? 6 : shape === 'octagon' ? 8 : Math.max(3, sides || 5);
      const pts: string[] = [];
      for (let i = 0; i < sideCount; i++) {
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / sideCount;
        pts.push(`${cx + rx * Math.cos(angle)},${cy + ry * Math.sin(angle)}`);
      }
      points = pts.join(' ');
    }
    return { kind: 'polygon', points };
  }
  // rect / pill / line already match (or are close enough to) the rectangular
  // frame itself, so no special hole is drawn for those.
  return null;
}

function ShapeHole({ shape, sides }: { shape: ShapeKind; sides?: number }) {
  const g = shapeGeometry(shape, sides);
  if (!g) return null;
  if (g.kind === 'ellipse') return <ellipse cx={50} cy={50} rx={50} ry={50} fill="black" />;
  return <polygon points={g.points} fill="black" />;
}

function ShapeHoleOutline({ shape, sides }: { shape: ShapeKind; sides?: number }) {
  const g = shapeGeometry(shape, sides);
  if (!g) return null;
  if (g.kind === 'ellipse') return <ellipse cx={50} cy={50} rx={50} ry={50} />;
  return <polygon points={g.points} />;
}

/** Same drag/pinch crop interaction as the per-image crop modal, but framed
 * to the page's own aspect ratio since a background always fills the canvas. */
export function BackgroundCropModal({ src, canvas, initial, onApply, onClose, shapeKind, sides, title }: Props) {
  const [zoom, setZoom] = useState(initial.zoom || 1);
  const [offsetX, setOffsetX] = useState(initial.offsetX || 0);
  const [offsetY, setOffsetY] = useState(initial.offsetY || 0);

  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startOffset = useRef({ x: 0, y: 0 });
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<{ dist: number; zoom: number }>({ dist: 0, zoom: 1 });

  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
      return;
    }
    isDragging.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    startOffset.current = { x: offsetX, y: offsetY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
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
    const speed = 0.35 / zoom;
    const nx = Math.max(-60, Math.min(60, startOffset.current.x - dx * speed));
    const ny = Math.max(-60, Math.min(60, startOffset.current.y - dy * speed));
    setOffsetX(nx);
    setOffsetY(ny);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) isDragging.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom((z) => Math.max(1, Math.min(3.5, z + delta)));
  };

  const resetPosition = () => { setZoom(1); setOffsetX(0); setOffsetY(0); };

  const handleSave = () => {
    onApply({ zoom: Math.round(zoom * 100) / 100, offsetX: Math.round(offsetX), offsetY: Math.round(offsetY) });
    onClose();
  };

  const frameRatio = canvas.width / canvas.height;
  const hasShapeMask = !!shapeKind && !['rect', 'pill', 'line'].includes(shapeKind);

  return (
    <div className="fixed inset-0 z-[11000] flex flex-col bg-ink select-none touch-none sheet-in">
      <div className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] border-b border-white/10 shrink-0">
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 text-white grid place-items-center active:bg-white/20">
          <X size={20} />
        </button>
        <div className="text-center">
          <h3 className="text-[15px] font-bold text-white">{title || 'Crop background'}</h3>
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

      <div
        className="flex-1 relative flex items-center justify-center p-6 overflow-hidden cursor-move"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={handleWheel}
      >
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />

        <div
          className="relative max-w-[90vw] max-h-[64vh] overflow-hidden shadow-2xl"
          style={{
            aspectRatio: `${frameRatio}`,
            width: frameRatio >= 1 ? '340px' : 'auto',
            height: frameRatio < 1 ? '420px' : 'auto',
            border: hasShapeMask ? 'none' : '2px solid rgba(255,255,255,0.9)',
          }}
        >
          <img
            src={src}
            draggable={false}
            className="pointer-events-none absolute top-1/2 left-1/2"
            style={{
              minWidth: '100%',
              minHeight: '100%',
              width: 'auto',
              height: 'auto',
              transform: `translate(-50%, -50%) translate(${-(offsetX || 0)}%, ${-(offsetY || 0)}%) scale(${zoom})`,
            }}
          />

          {hasShapeMask ? (
            <>
              {/* Everything outside the actual shape is dimmed, so what's
                  left bright is exactly what will show through the shape. */}
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                  <mask id={`crop-hole-${shapeKind}`}>
                    <rect x={0} y={0} width={100} height={100} fill="white" />
                    <ShapeHole shape={shapeKind!} sides={sides} />
                  </mask>
                </defs>
                <rect x={0} y={0} width={100} height={100} fill="rgba(0,0,0,0.68)" mask={`url(#crop-hole-${shapeKind})`} />
                <g fill="none" stroke="white" strokeWidth={0.8} vectorEffect="non-scaling-stroke" opacity={0.95}>
                  <ShapeHoleOutline shape={shapeKind!} sides={sides} />
                </g>
              </svg>
            </>
          ) : (
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className={`${i % 3 !== 2 ? 'border-r' : ''} ${i < 6 ? 'border-b' : ''} border-white/30`} />
              ))}
            </div>
          )}

          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 text-white text-[11px] font-medium pointer-events-none backdrop-blur-sm">
            <Move size={12} />
            <span>Drag photo to pan</span>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shrink-0 border-t border-line">
        <div className="mb-4">
          <div className="flex items-center justify-between text-[12px] font-semibold text-ink-2 mb-1.5">
            <span className="flex items-center gap-1.5"><ZoomIn size={15} /> Zoom</span>
            <span className="tabular-nums font-bold text-ink">{Math.round(zoom * 100)}%</span>
          </div>
          <input type="range" min={1} max={3} step={0.02} value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="w-full" />
        </div>

        <button
          onClick={resetPosition}
          className="w-full h-11 rounded-2xl bg-canvasbg border border-line text-ink flex items-center justify-center gap-1.5 text-[13px] font-bold active:bg-line"
        >
          <RotateCcw size={15} />
          <span>Center</span>
        </button>
      </div>
    </div>
  );
}
