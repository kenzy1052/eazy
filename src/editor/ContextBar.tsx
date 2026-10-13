import React, { useState, useEffect } from 'react';
import {
  Link as LinkIcon,
  Unlink,
  Maximize2,
  PenTool,
  Edit3,
  Crop,
  Square,
  Circle,
  Triangle,
  Hexagon,
  Star,
  Minus,
  Lock,
  Unlock,
  Sparkles,
  SlidersHorizontal,
  Wand2,
  Users,
  UsersRound,
  AlignJustify,
  List,
  ListOrdered,
  Copy as CopyIcon,
  ClipboardPaste,
  Paintbrush,
  Download,
  Group,
  BringToFront,
  SendToBack,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  Eye,
  EyeOff,
} from 'lucide-react';
import { DesignElement, ImageElement, ShapeElement, ShapeKind, TextElement } from '../types';
import { useStore } from '../store/useStore';
import { ColorPicker, Seg, Sheet, Slider, UploadButton } from './kit';
import {
  IcAlignCenter, IcAlignLeft, IcAlignRight, IcBold, IcCrop, IcDroplet,
  IcImage, IcLayers, IcPalette, IcShapes, IcSize, IcSwap, IcType, IcUp, IcCopy, IcTrash, IcCheck
} from '../ui/icons';
import { image, shape, text } from '../utils/factory';
import { measureTextBox } from '../utils/measureText';
import { renderToPng, downloadImage } from '../utils/exporter';
import { BackgroundCropModal } from './BackgroundCropModal';

const FONTS = [
  'Plus Jakarta Sans', 'Poppins', 'Inter', 'Montserrat', 'Space Grotesk',
  'Playfair Display', 'Cormorant Garamond', 'Lora',
  'Oswald', 'Anton', 'Bebas Neue', 'Archivo Black',
  'Caveat', 'Dancing Script', 'JetBrains Mono',
];

const SHAPE_PRESETS: { kind: ShapeKind; label: string; sides?: number }[] = [
  { kind: 'circle', label: 'Circle' },
  { kind: 'rect', label: 'Rectangle' },
  { kind: 'pill', label: 'Pill' },
  { kind: 'triangle', label: 'Triangle' },
  { kind: 'pentagon', label: 'Pentagon' },
  { kind: 'hexagon', label: 'Hexagon' },
  { kind: 'octagon', label: 'Octagon' },
  { kind: 'star', label: 'Star' },
  { kind: 'polygon', label: 'Polygon (N)' },
  { kind: 'line', label: 'Line' },
];

type Panel =
  | null
  | 'font'
  | 'size'
  | 'colour'
  | 'fill'
  | 'stroke'
  | 'shape'
  | 'dimensions'
  | 'photo'
  | 'crop'
  | 'adjust'
  | 'style'
  | 'shadow'
  | 'effects'
  | 'opacity'
  | 'layer'
  | 'format'
  | 'nudge'
  | 'more';

interface Props {
  el: DesignElement;
  onEditText?: (id: string) => void;
  onCropImage?: (id: string) => void;
}

export function ContextBar({ el, onEditText, onCropImage }: Props) {
  const update = useStore((s) => s.update);
  const snapshot = useStore((s) => s.snapshot);
  const reorder = useStore((s) => s.reorder);
  // NOTE: s.remove deletes a whole PROJECT — deleting a canvas element must use s.del.
  const remove = useStore((s) => s.del);
  const duplicate = useStore((s) => s.duplicate);
  const groupElements = useStore((s) => s.groupElements);
  const ungroupElements = useStore((s) => s.ungroupElements);
  const copyElement = useStore((s) => s.copyElement);
  const pasteElement = useStore((s) => s.pasteElement);
  const copyStyle = useStore((s) => s.copyStyle);
  const pasteStyle = useStore((s) => s.pasteStyle);
  const clipboardElement = useStore((s) => s.clipboardElement);
  const clipboardStyle = useStore((s) => s.clipboardStyle);
  const select = useStore((s) => s.select);
  const [panel, setPanel] = useState<Panel>(null);
  const [multiSelect, setMultiSelect] = useState<string[]>([]);
  const [shapeCropOpen, setShapeCropOpen] = useState(false);

  useEffect(() => {
    const handleMore = (e: any) => {
      if (e.detail.id === el.id) setPanel('more');
    };
    window.addEventListener('open-more-menu', handleMore);
    return () => window.removeEventListener('open-more-menu', handleMore);
  }, [el.id]);

  const selectedId = useStore((s) => s.selectedId);
  const elements = useStore((s) => s.projects.find((p) => p.id === s.currentId)?.elements || []);
  const canvas = useStore((s) => s.projects.find((p) => p.id === s.currentId)?.canvas);

  const set = (patch: any) => update(el.id, patch);
  const setWith = (patch: any) => { snapshot(); update(el.id, patch); };

  const sh = el.type === 'shape' ? (el as ShapeElement) : null;
  const t = el.type === 'text' ? (el as TextElement) : null;
  const img = el.type === 'image' ? (el as ImageElement) : null;

  const [downloading, setDownloading] = useState(false);
  const handleDownloadSelection = async () => {
    const node = document.getElementById(`el-${el.id}`);
    if (!node) return;
    setDownloading(true);
    try {
      const url = await renderToPng(node, Math.round(el.width), Math.round(el.height));
      downloadImage(url, `${el.name || 'layer'}.png`);
    } catch {
      // Best-effort — a failed single-layer export shouldn't disrupt editing.
    } finally {
      setDownloading(false);
    }
  };

  /**
   * Patches a text element's typography and re-fits its box height to the
   * new style at the box's current width. Without this, bolding/italicising
   * (or changing font/size/spacing/case) leaves the box at its old size —
   * which is what made text look like it "shrank" or got clipped.
   */
  const setType = (patch: Partial<TextElement>, withHistory = true) => {
    if (!t) return;
    if (withHistory) snapshot();
    const merged = { ...t, ...patch } as TextElement;
    if (!merged.autoFit) {
      const fit = measureTextBox(merged, { maxWidth: t.width });
      update(el.id, { ...patch, height: fit.height });
    } else {
      update(el.id, patch);
    }
  };

  const tools: { key: Panel | 'edit' | 'crop'; icon: React.ReactNode; label: string }[] =
    el.type === 'text'
      ? [
          { key: 'edit', icon: <Edit3 size={21} />, label: 'Edit' },
          { key: 'font', icon: <IcType size={21} />, label: 'Font' },
          { key: 'size', icon: <IcSize size={21} />, label: 'Size' },
          { key: 'colour', icon: <IcPalette size={21} />, label: 'Color' },
          { key: 'format', icon: <IcAlignCenter size={21} />, label: 'Format' },
          { key: 'effects', icon: <Wand2 size={19} />, label: 'Effects' },
          { key: 'shadow', icon: <Sparkles size={21} />, label: 'Shadow' },
          { key: 'opacity', icon: <IcDroplet size={21} />, label: 'Transparency' },
          { key: 'layer', icon: <IcLayers size={21} />, label: 'Layers' },
          { key: 'dimensions', icon: <Maximize2 size={19} />, label: 'Position' },
          { key: 'nudge', icon: <Square size={21} />, label: 'Nudge' },
        ]
      : el.type === 'image'
      ? [
          { key: 'photo', icon: <IcSwap size={21} />, label: 'Replace' },
          { key: 'crop', icon: <IcCrop size={21} />, label: 'Crop' },
          { key: 'adjust', icon: <SlidersHorizontal size={19} />, label: 'Adjust' },
          { key: 'style', icon: <Wand2 size={19} />, label: 'Style' },
          { key: 'shadow', icon: <Sparkles size={21} />, label: 'Shadow' },
          { key: 'opacity', icon: <IcDroplet size={21} />, label: 'Transparency' },
          { key: 'layer', icon: <IcLayers size={21} />, label: 'Layers' },
          { key: 'dimensions', icon: <Maximize2 size={19} />, label: 'Position' },
          { key: 'nudge', icon: <Square size={21} />, label: 'Nudge' },
        ]
      : [
          { key: 'shape', icon: <IcShapes size={21} />, label: 'Shape' },
          { key: 'fill', icon: <IcPalette size={21} />, label: 'Color' },
          { key: 'stroke', icon: <PenTool size={19} />, label: 'Border' },
          { key: 'shadow', icon: <Sparkles size={21} />, label: 'Shadow' },
          { key: 'opacity', icon: <IcDroplet size={21} />, label: 'Transparency' },
          { key: 'layer', icon: <IcLayers size={21} />, label: 'Layers' },
          { key: 'dimensions', icon: <Maximize2 size={19} />, label: 'Position' },
          { key: 'nudge', icon: <Square size={21} />, label: 'Nudge' },
        ];

  return (
    <>
      {!panel && (
        <div className="bg-surface border-t border-line relative shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          {/* Primary action tabs */}
          <div className="flex px-1 py-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] overflow-x-auto no-scrollbar pr-14">
            {tools.map((tool) => (
              <button
                key={tool.key}
                onClick={() => {
                  if (tool.key === 'edit') onEditText?.(el.id);
                  else if (tool.key === 'crop') onCropImage?.(el.id);
                  else setPanel(tool.key as Panel);
                }}
                className="shrink-0 min-w-[72px] flex flex-col items-center gap-1.5 py-2.5 text-ink-2 active:text-brand transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-canvasbg grid place-items-center shadow-sm">{tool.icon}</div>
                <span className="text-[10px] font-semibold">{tool.label}</span>
              </button>
            ))}
          </div>
          {/* Quick deselect/done button pinned to the right */}
          <button
            onClick={() => useStore.getState().select(null)}
            className="absolute right-3 top-3 w-10 h-10 rounded-full bg-brand text-white shadow-md grid place-items-center active:bg-brand-dark"
          >
            <IcCheck size={22} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* --- Shape Geometry & Corners Sheet --- */}
      {panel === 'shape' && sh && (
        <Sheet title="Shape & Corners" onClose={() => setPanel(null)}>
          <div className="text-[12px] font-semibold text-ink-3 mb-2">Shape Preset</div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {SHAPE_PRESETS.map((p) => {
              const active = sh.shape === p.kind;
              return (
                <button
                  key={p.kind}
                  onClick={() => setWith({ shape: p.kind, sides: p.kind === 'polygon' ? (sh.sides || 5) : undefined })}
                  className={`h-12 rounded-2xl px-3 flex items-center gap-2.5 text-[13px] font-bold border transition-colors ${
                    active ? 'bg-brand/10 border-brand text-brand' : 'bg-canvasbg border-line text-ink'
                  }`}
                >
                  <span className="w-6 h-6 rounded-lg bg-surface grid place-items-center text-ink shrink-0">
                    {p.kind === 'circle' && <Circle size={14} />}
                    {p.kind === 'rect' && <Square size={14} />}
                    {p.kind === 'triangle' && <Triangle size={14} />}
                    {p.kind === 'hexagon' && <Hexagon size={14} />}
                    {p.kind === 'star' && <Star size={14} />}
                    {p.kind === 'line' && <Minus size={14} />}
                    {p.kind !== 'circle' && p.kind !== 'rect' && p.kind !== 'triangle' && p.kind !== 'hexagon' && p.kind !== 'star' && p.kind !== 'line' && <Square size={14} />}
                  </span>
                  <span className="truncate">{p.label}</span>
                </button>
              );
            })}
          </div>

          {sh.shape === 'polygon' && (
            <div className="p-3 bg-canvasbg rounded-2xl border border-line mb-3">
              <Slider
                label="Number of sides (Polygonal corners)"
                value={sh.sides || 5}
                min={3}
                max={12}
                step={1}
                onChange={(v) => set({ sides: v })}
              />
            </div>
          )}

          {(sh.shape === 'rect' || sh.shape === 'polygon' || sh.shape === 'triangle') && (
            <div className="p-3 bg-canvasbg rounded-2xl border border-line">
              <Slider
                label="Corner roundness"
                value={sh.radius || 0}
                min={0}
                max={100}
                step={1}
                suffix="px"
                onChange={(v) => set({ radius: v })}
              />
            </div>
          )}
        </Sheet>
      )}

      {/* --- Position & Size Sheet --- */}
      {panel === 'dimensions' && (
        <Sheet title="Position & size" onClose={() => setPanel(null)}>
          <div className="text-[12px] font-semibold text-ink-3 mb-2">Align to Page</div>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {([
              ['left', 'Left', { x: 0 }],
              ['center', 'Center', { x: (useStore.getState().projects.find(p => p.id === useStore.getState().currentId)!.canvas.width - el.width) / 2 }],
              ['right', 'Right', { x: useStore.getState().projects.find(p => p.id === useStore.getState().currentId)!.canvas.width - el.width }],
              ['top', 'Top', { y: 0 }],
              ['middle', 'Middle', { y: (useStore.getState().projects.find(p => p.id === useStore.getState().currentId)!.canvas.height - el.height) / 2 }],
              ['bottom', 'Bottom', { y: useStore.getState().projects.find(p => p.id === useStore.getState().currentId)!.canvas.height - el.height }],
            ] as const).map(([k, label, patch]) => (
              <button
                key={k}
                onClick={() => setWith(patch)}
                className="h-10 rounded-xl bg-canvasbg border border-line text-[12px] font-bold text-ink active:bg-line transition-colors"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between p-3.5 bg-canvasbg rounded-2xl border border-line mb-4">
            <div>
              <div className="text-[13px] font-bold text-ink">Lock Aspect Ratio</div>
              <div className="text-[11px] text-ink-3">Adjusting width scales height automatically</div>
            </div>
            <button
              onClick={() => setWith({ lockAspectRatio: !el.lockAspectRatio })}
              className={`h-10 px-3.5 rounded-xl font-bold text-[12px] flex items-center gap-1.5 transition-colors ${
                el.lockAspectRatio ? 'bg-brand text-white' : 'bg-surface text-ink border border-line'
              }`}
            >
              {el.lockAspectRatio ? <LinkIcon size={14} /> : <Unlink size={14} />}
              <span>{el.lockAspectRatio ? 'Locked' : 'Unlocked'}</span>
            </button>
          </div>

          <Slider
            label="Width"
            value={el.width}
            min={20}
            max={1200}
            step={2}
            suffix="px"
            onChange={(w) => {
              if (el.lockAspectRatio && el.height > 0) {
                const ratio = el.width / el.height;
                set({ width: w, height: Math.max(20, Math.round(w / ratio)) });
              } else {
                set({ width: w });
              }
            }}
          />

          <Slider
            label="Height"
            value={el.height}
            min={20}
            max={1200}
            step={2}
            suffix="px"
            onChange={(h) => {
              if (el.lockAspectRatio && el.height > 0) {
                const ratio = el.width / el.height;
                set({ height: h, width: Math.max(20, Math.round(h * ratio)) });
              } else {
                set({ height: h });
              }
            }}
          />
        </Sheet>
      )}

      {/* --- Fill Panel (Shapes & Decor) --- */}
      {panel === 'fill' && (
        <Sheet title="Fill & Color" onClose={() => setPanel(null)}>
          {sh && (
            <div className="mb-4 p-3 bg-canvasbg rounded-2xl border border-line">
              <Slider
                label="Fill Opacity (0% = Hollow inside)"
                value={sh.fillOpacity !== undefined ? sh.fillOpacity : 1}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => set({ fillOpacity: v })}
              />
              {sh.fillOpacity === 0 && (
                <p className="text-[11px] text-brand font-semibold mt-1">
                  ✓ Hollow fill (transparent background with stroke border, like Photoshop)
                </p>
              )}
            </div>
          )}

          <div className="text-[12px] font-semibold text-ink-3 mb-2">Fill Colour</div>
          <ColorPicker
            value={sh ? sh.fill : (el as any).color || '#F02D63'}
            onChange={(c) => setWith(sh ? { fill: c } : { color: c })}
          />

          {sh && (
            <>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setWith({ fillOpacity: 0 })}
                  className="flex-1 h-10 rounded-xl bg-canvasbg text-[12px] font-bold text-ink border border-line"
                >
                  Zero fill (Hollow)
                </button>
                <button
                  onClick={() => setWith({ fillOpacity: 1 })}
                  className="flex-1 h-10 rounded-xl bg-canvasbg text-[12px] font-bold text-ink border border-line"
                >
                  Full fill (Solid)
                </button>
              </div>
              <div className="mt-4 pt-4 border-t border-line">
                <div className="text-[12px] font-semibold text-ink-3 mb-2">Fill Image</div>
                <UploadButton
                  label={sh.imageFill?.src ? 'Replace image' : 'Fill with image'}
                  onFile={(src) => { snapshot(); set({ imageFill: { src, zoom: 1, offsetX: 0, offsetY: 0 } }); }}
                />

                {elements.some((q) => q.type === 'image' && (q as ImageElement).src) && (
                  <div className="mt-3">
                    <div className="text-[11px] font-semibold text-ink-3 mb-1.5">Or clip an image already on this design</div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {elements
                        .filter((q) => q.type === 'image' && (q as ImageElement).src)
                        .map((q) => (
                          <button
                            key={q.id}
                            onClick={() => { snapshot(); set({ imageFill: { src: (q as ImageElement).src!, zoom: 1, offsetX: 0, offsetY: 0 } }); }}
                            className="w-14 h-14 rounded-xl overflow-hidden border-2 border-line shrink-0 active:border-brand"
                          >
                            <img src={(q as ImageElement).src!} className="w-full h-full object-cover" />
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {sh.imageFill?.src && (
                  <>
                    <button
                      onClick={() => setShapeCropOpen(true)}
                      className="w-full h-11 mt-3 rounded-2xl bg-brand text-white font-bold text-[13px] flex items-center justify-center gap-2 active:bg-brand-dark"
                    >
                      <Crop size={16} />
                      <span>Open interactive crop & pan</span>
                    </button>
                    <div className="space-y-3 my-4">
                      <Slider
                        label="Zoom"
                        value={sh.imageFill.zoom || 1}
                        min={1} max={3} step={0.02}
                        onChange={(v) => set({ imageFill: { ...sh.imageFill!, zoom: v } })}
                      />
                      <Slider
                        label="Pan X"
                        value={sh.imageFill.offsetX || 0}
                        min={-50} max={50}
                        onChange={(v) => set({ imageFill: { ...sh.imageFill!, offsetX: v } })}
                      />
                      <Slider
                        label="Pan Y"
                        value={sh.imageFill.offsetY || 0}
                        min={-50} max={50}
                        onChange={(v) => set({ imageFill: { ...sh.imageFill!, offsetY: v } })}
                      />
                    </div>
                    <button
                      onClick={() => { snapshot(); set({ imageFill: undefined }); }}
                      className="mt-2 w-full h-10 rounded-xl bg-canvasbg text-[12px] font-bold text-ink-2"
                    >
                      Remove Image
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </Sheet>
      )}

      {shapeCropOpen && sh?.imageFill?.src && (
        <BackgroundCropModal
          src={sh.imageFill.src}
          canvas={{ key: 'square', label: '', note: '', width: sh.width, height: sh.height }}
          initial={sh.imageFill}
          shapeKind={sh.shape}
          sides={sh.sides}
          title="Crop image to shape"
          onApply={({ zoom, offsetX, offsetY }) => {
            snapshot();
            set({ imageFill: { ...sh.imageFill!, zoom, offsetX, offsetY } });
          }}
          onClose={() => setShapeCropOpen(false)}
        />
      )}

      {/* --- Stroke / Border Panel (Photoshop style) --- */}
      {panel === 'stroke' && sh && (
        <Sheet title="Stroke & Border" onClose={() => setPanel(null)}>
          <Slider
            label="Stroke width"
            value={sh.strokeWidth || 0}
            min={0}
            max={40}
            step={1}
            suffix="px"
            onChange={(v) => set({ strokeWidth: v })}
          />

          <div className="mt-3 p-3 bg-canvasbg rounded-2xl border border-line mb-4">
            <Slider
              label="Stroke opacity"
              value={sh.strokeOpacity !== undefined ? sh.strokeOpacity : 1}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => set({ strokeOpacity: v })}
            />
          </div>

          <div className="mb-4">
            <div className="text-[12px] font-semibold text-ink-3 mb-2">Stroke style</div>
            <Seg
              value={sh.strokeStyle || 'solid'}
              onChange={(v) => setWith({ strokeStyle: v })}
              options={[
                { value: 'solid', label: 'Solid' },
                { value: 'dashed', label: 'Dashed' },
              ]}
            />
          </div>

          <div className="text-[12px] font-semibold text-ink-3 mb-2">Stroke colour</div>
          <ColorPicker
            value={sh.strokeColor || '#12131A'}
            onChange={(c) => setWith({ strokeColor: c })}
          />
        </Sheet>
      )}

      {/* --- Text Font Sheet --- */}
      {panel === 'font' && t && (
        <Sheet title="Font" onClose={() => setPanel(null)}>
          <div className="grid grid-cols-1 gap-1.5 pb-2">
            {FONTS.map((f) => (
              <button
                key={f}
                onClick={() => setType({ fontFamily: f })}
                className={`h-14 rounded-2xl px-4 text-left text-[19px] ${t.fontFamily === f ? 'bg-brand-soft ring-2 ring-brand text-ink' : 'bg-canvasbg text-ink'}`}
                style={{ fontFamily: `"${f}", sans-serif` }}
              >
                {f}
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {/* --- Text Size & Spacing Sheet --- */}
      {panel === 'size' && t && (
        <Sheet title="Text size & spacing" onClose={() => setPanel(null)}>
          <Slider label="Size" value={t.fontSize} min={12} max={220} onChange={(v) => setType({ fontSize: v }, false)} />
          <Slider label="Line spacing" value={t.lineHeight} min={0.8} max={2.2} step={0.05} onChange={(v) => setType({ lineHeight: v }, false)} />
          <Slider label="Letter spacing" value={t.letterSpacing} min={-4} max={24} step={0.5} onChange={(v) => setType({ letterSpacing: v }, false)} />
          <div className="py-2">
            <div className="text-[12px] font-semibold text-ink-3 mb-2">Capitals</div>
            <Seg
              value={t.uppercase ? 'on' : 'off'}
              onChange={(v) => setType({ uppercase: v === 'on' })}
              options={[{ value: 'off', label: 'Aa' }, { value: 'on', label: 'AA' }]}
            />
          </div>
          <div className="py-2">
            <div className="text-[12px] font-semibold text-ink-3 mb-2">If the text is too long</div>
            <Seg
              value={t.autoFit ? 'fit' : 'keep'}
              onChange={(v) => setWith({ autoFit: v === 'fit' })}
              options={[{ value: 'fit', label: 'Shrink to fit' }, { value: 'keep', label: 'Keep size' }]}
            />
          </div>
        </Sheet>
      )}

      {/* --- Text Colour Sheet --- */}
      {panel === 'colour' && t && (
        <Sheet title="Text colour" onClose={() => setPanel(null)}>
          <ColorPicker value={t.color} onChange={(c) => setWith({ color: c })} />
          <div className="mt-5">
            <div className="text-[12px] font-semibold text-ink-3 mb-2">Highlight behind text</div>
            <Seg
              value={t.highlight ? 'on' : 'off'}
              onChange={(v) => setWith({ highlight: v === 'on' ? { color: '#D4FF3F', padX: 18, padY: 8, radius: 6 } : undefined })}
              options={[{ value: 'off', label: 'None' }, { value: 'on', label: 'Highlight' }]}
            />
            {t.highlight && (
              <div className="mt-3">
                <ColorPicker value={t.highlight.color} onChange={(c) => set({ highlight: { ...t.highlight!, color: c } })} />
              </div>
            )}
          </div>
        </Sheet>
      )}

      {/* --- Image Photo Replacement Sheet --- */}
      {panel === 'photo' && img && (
        <Sheet title="Picture" onClose={() => setPanel(null)}>
          <UploadButton
            label={img.src ? 'Replace picture' : 'Upload a picture'}
            onFile={(src) => { snapshot(); set({ src }); setPanel(null); }}
          />
          {img.src && (
            <button onClick={() => setWith({ src: null })} className="mt-2 w-full h-12 rounded-2xl bg-canvasbg text-[14px] font-bold text-ink-2">
              Remove picture
            </button>
          )}
          <div className="mt-5">
            <div className="text-[12px] font-semibold text-ink-3 mb-2">Frame shape</div>
            <Seg
              value={img.circle ? 'circle' : img.radius > 0 ? 'round' : 'square'}
              onChange={(v) => setWith(v === 'circle' ? { circle: true } : { circle: false, radius: v === 'round' ? 40 : 0 })}
              options={[{ value: 'square', label: 'Square' }, { value: 'round', label: 'Rounded' }, { value: 'circle', label: 'Circle' }]}
            />
          </div>

          {/* The renderer has supported a border (img.ring) since before this
              rebuild, but nothing ever exposed it in the UI — wiring it up. */}
          <div className="mt-5">
            <div className="text-[12px] font-semibold text-ink-3 mb-2">Border</div>
            <Slider
              label="Width"
              value={img.ring?.width || 0}
              min={0}
              max={24}
              step={1}
              suffix="px"
              onChange={(v) => set({ ring: { width: v, color: img.ring?.color || '#FFFFFF' } })}
            />
            {(img.ring?.width || 0) > 0 && (
              <div className="mt-3">
                <ColorPicker value={img.ring?.color || '#FFFFFF'} onChange={(c) => setWith({ ring: { width: img.ring?.width || 0, color: c } })} />
              </div>
            )}
          </div>
        </Sheet>
      )}

      {/* --- Image Quick Crop fallback Sheet --- */}
      {panel === 'crop' && img && (
        <Sheet title="Position inside the frame" onClose={() => setPanel(null)}>
          <div className="mb-4">
            <button
              onClick={() => { setPanel(null); onCropImage?.(img.id); }}
              className="w-full h-12 rounded-2xl bg-brand text-white font-bold text-[14px] flex items-center justify-center gap-2 active:bg-brand-dark"
            >
              <Crop size={18} />
              <span>Open Interactive Crop & Pan</span>
            </button>
          </div>
          <Slider label="Zoom" value={img.zoom} min={1} max={3} step={0.02} onChange={(v) => set({ zoom: v })} />
          <Slider label="Move sideways" value={img.offsetX} min={-50} max={50} onChange={(v) => set({ offsetX: v })} />
          <Slider label="Move up / down" value={img.offsetY} min={-50} max={50} onChange={(v) => set({ offsetY: v })} />
          <div className="py-2">
            <Seg
              value={img.fit}
              onChange={(v) => setWith({ fit: v })}
              options={[{ value: 'cover', label: 'Fill frame' }, { value: 'contain', label: 'Fit whole photo' }]}
            />
          </div>
        </Sheet>
      )}

      {/* --- Image Adjustments Sheet (blur/brightness/contrast/saturation/grayscale/overlay) --- */}
      {panel === 'adjust' && img && (
        <Sheet title="Adjust" onClose={() => setPanel(null)}>
          <Slider label="Blur" value={img.adjust.blur} min={0} max={20} step={0.5} onChange={(v) => setWith({ adjust: { ...img.adjust, blur: v } })} suffix="px" />
          <Slider label="Brightness" value={img.adjust.brightness} min={40} max={180} onChange={(v) => setWith({ adjust: { ...img.adjust, brightness: v } })} suffix="%" />
          <Slider label="Contrast" value={img.adjust.contrast} min={40} max={180} onChange={(v) => setWith({ adjust: { ...img.adjust, contrast: v } })} suffix="%" />
          <Slider label="Saturation" value={img.adjust.saturate} min={0} max={200} onChange={(v) => setWith({ adjust: { ...img.adjust, saturate: v } })} suffix="%" />
          <Slider label="Black & white" value={img.adjust.grayscale} min={0} max={100} onChange={(v) => setWith({ adjust: { ...img.adjust, grayscale: v } })} suffix="%" />
          <div className="mt-4">
            <div className="text-[12px] font-semibold text-ink-3 mb-2">Color tint (overlay)</div>
            <ColorPicker value={img.adjust.overlayColor} onChange={(c) => setWith({ adjust: { ...img.adjust, overlayColor: c } })} />
            <Slider label="Tint strength" value={img.adjust.overlayOpacity} min={0} max={0.8} step={0.02} onChange={(v) => setWith({ adjust: { ...img.adjust, overlayOpacity: v } })} />
          </div>
          <button
            onClick={() => setWith({ adjust: { blur: 0, brightness: 100, contrast: 100, saturate: 100, grayscale: 0, overlayColor: img.adjust.overlayColor, overlayOpacity: 0 } })}
            className="mt-4 w-full h-11 rounded-2xl bg-canvasbg border border-line text-[13px] font-bold text-ink-2"
          >
            Reset to original
          </button>
        </Sheet>
      )}

      {/* --- Image Style presets — one-tap looks built from Adjust values --- */}
      {panel === 'style' && img && (
        <Sheet title="Style" onClose={() => setPanel(null)}>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: 'Original', a: { blur: 0, brightness: 100, contrast: 100, saturate: 100, grayscale: 0, overlayOpacity: 0 } },
              { label: 'Black & White', a: { blur: 0, brightness: 105, contrast: 110, saturate: 0, grayscale: 100, overlayOpacity: 0 } },
              { label: 'High Contrast', a: { blur: 0, brightness: 100, contrast: 150, saturate: 120, grayscale: 0, overlayOpacity: 0 } },
              { label: 'Soft & Muted', a: { blur: 0, brightness: 104, contrast: 92, saturate: 80, grayscale: 0, overlayOpacity: 0 } },
              { label: 'Warm', a: { blur: 0, brightness: 104, contrast: 105, saturate: 115, grayscale: 0, overlayColor: '#FF8A3D', overlayOpacity: 0.14 } },
              { label: 'Cool', a: { blur: 0, brightness: 100, contrast: 105, saturate: 105, grayscale: 0, overlayColor: '#3D7BFF', overlayOpacity: 0.12 } },
              { label: 'Vintage', a: { blur: 0, brightness: 102, contrast: 92, saturate: 65, grayscale: 15, overlayColor: '#C9964B', overlayOpacity: 0.18 } },
              { label: 'Dreamy Blur', a: { blur: 3, brightness: 106, contrast: 95, saturate: 105, grayscale: 0, overlayOpacity: 0 } },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => setWith({ adjust: { ...img.adjust, overlayColor: img.adjust.overlayColor, overlayOpacity: 0, ...p.a } })}
                className="h-14 rounded-2xl bg-canvasbg border border-line text-[13px] font-bold text-ink active:bg-line"
              >
                {p.label}
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {/* --- Shadow & Glow Sheet — available on every element type --- */}
      {panel === 'shadow' && (
        <Sheet title="Shadow, Glow & Blur" onClose={() => setPanel(null)}>
          <div className="mb-4">
            <Slider
              label="Blur this layer"
              value={el.blur || 0}
              min={0} max={20} step={0.5}
              onChange={(v) => set({ blur: v })}
              suffix="px"
            />
          </div>

          <div className="text-[12px] font-semibold text-ink-3 mb-2">Drop shadow</div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <button
              onClick={() => setWith({ shadow: { ...el.shadow, enabled: false } })}
              className={`h-12 rounded-2xl border text-[12.5px] font-bold ${!el.shadow.enabled ? 'bg-ink text-white border-ink' : 'bg-canvasbg border-line text-ink'}`}
            >
              None
            </button>
            <button
              onClick={() => setWith({ shadow: { enabled: true, color: '#F02D63', opacity: 0.3, blur: 24, offsetX: 0, offsetY: 10 } })}
              className={`h-12 rounded-2xl border text-[12.5px] font-bold ${el.shadow.enabled && (el.shadow.offsetX !== 0 || el.shadow.offsetY !== 0) ? 'bg-ink text-white border-ink' : 'bg-canvasbg border-line text-ink'}`}
            >
              Shadow
            </button>
            <button
              onClick={() => setWith({ shadow: { enabled: true, color: '#FFFFFF', opacity: 0.65, blur: 40, offsetX: 0, offsetY: 0 } })}
              className={`h-12 rounded-2xl border text-[12.5px] font-bold ${el.shadow.enabled && el.shadow.offsetX === 0 && el.shadow.offsetY === 0 ? 'bg-ink text-white border-ink' : 'bg-canvasbg border-line text-ink'}`}
            >
              Glow
            </button>
          </div>

          {el.shadow.enabled && (
            <>
              <div className="mb-3">
                <div className="text-[12px] font-semibold text-ink-3 mb-2">Color</div>
                <ColorPicker value={el.shadow.color} onChange={(c) => set({ shadow: { ...el.shadow, color: c } })} />
              </div>
              <Slider label="Opacity" value={el.shadow.opacity} min={0.05} max={1} step={0.02} onChange={(v) => set({ shadow: { ...el.shadow, opacity: v } })} />
              <Slider label="Blur / spread" value={el.shadow.blur} min={0} max={80} onChange={(v) => set({ shadow: { ...el.shadow, blur: v } })} suffix="px" />
              <Slider label="Move sideways" value={el.shadow.offsetX} min={-40} max={40} onChange={(v) => set({ shadow: { ...el.shadow, offsetX: v } })} suffix="px" />
              <Slider label="Move up / down" value={el.shadow.offsetY} min={-40} max={40} onChange={(v) => set({ shadow: { ...el.shadow, offsetY: v } })} suffix="px" />
            </>
          )}
        </Sheet>
      )}

      {/* --- Layer Opacity & Rotation Sheet --- */}
      {panel === 'opacity' && (
        <Sheet title="Transparency & Rotation" onClose={() => setPanel(null)}>
          <Slider label="Layer opacity" value={el.opacity} min={0.05} max={1} step={0.01} onChange={(v) => set({ opacity: v })} />
          <Slider label="Rotation" value={el.rotation} min={-180} max={180} onChange={(v) => set({ rotation: v })} suffix="°" />
        </Sheet>
      )}

      {/* --- Layer Reordering Sheet --- */}
      {panel === 'layer' && (
        <Sheet title="Layers" onClose={() => { setPanel(null); setMultiSelect([]); }}>
          <div className="grid grid-cols-2 gap-2 pb-3">
            {([['front', 'Bring to front'], ['up', 'Bring forward'], ['down', 'Send backward'], ['back', 'Send to back']] as const).map(([d, l]) => (
              <button key={d} onClick={() => reorder(el.id, d)} className="h-12 rounded-2xl bg-canvasbg active:bg-line border border-line text-[13px] font-bold text-ink">
                {l}
              </button>
            ))}
          </div>

          {el.groupId ? (
            <button
              onClick={() => { ungroupElements(el.id); }}
              className="w-full h-11 rounded-2xl bg-canvasbg border border-line text-[13px] font-bold text-ink flex items-center justify-center gap-2 mb-3"
            >
              <Unlink size={15} /> Ungroup this layer
            </button>
          ) : (
            <button
              onClick={() => setMultiSelect((m) => (m.length ? [] : [el.id]))}
              className={`w-full h-11 rounded-2xl border text-[13px] font-bold flex items-center justify-center gap-2 mb-3 ${
                multiSelect.length ? 'bg-brand text-white border-brand' : 'bg-canvasbg border-line text-ink'
              }`}
            >
              <UsersRound size={15} /> {multiSelect.length ? `Selecting ${multiSelect.length} — tap layers below` : 'Select multiple to group'}
            </button>
          )}

          {multiSelect.length >= 2 && (
            <button
              onClick={() => { groupElements(multiSelect); select(multiSelect[0]); setMultiSelect([]); }}
              className="w-full h-11 rounded-2xl bg-brand text-white text-[13px] font-bold flex items-center justify-center gap-2 mb-3 active:bg-brand-dark"
            >
              <Users size={15} /> Group {multiSelect.length} layers
            </button>
          )}

          <div className="text-[12px] font-semibold text-ink-3 mb-2">All Layers</div>
          <div className="flex flex-col gap-1.5 pb-2">
            {[...elements]
              .sort((a, b) => b.z - a.z) // Top to bottom
              .map((q) => {
                const checked = multiSelect.includes(q.id);
                return (
                <div
                  key={q.id}
                  onClick={() => {
                    if (multiSelect.length) {
                      setMultiSelect((m) => (checked ? m.filter((x) => x !== q.id) : [...m, q.id]));
                    } else {
                      select(q.id);
                    }
                  }}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-colors ${
                    checked ? 'bg-brand/10 border-brand' : q.id === el.id ? 'bg-brand/10 border-brand text-brand' : 'bg-canvasbg border-line text-ink'
                  } ${q.hidden ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-3 truncate">
                    {multiSelect.length > 0 && (
                      <span className={`shrink-0 w-5 h-5 rounded-md border-2 grid place-items-center ${checked ? 'bg-brand border-brand text-white' : 'border-line'}`}>
                        {checked && <IcCheck size={12} />}
                      </span>
                    )}
                    <span className="shrink-0 text-ink-3">
                      {q.type === 'text' ? <IcType size={16} /> : q.type === 'image' ? <IcImage size={16} /> : <IcShapes size={16} />}
                    </span>
                    <span className="text-[13px] font-semibold truncate">
                      {q.type === 'text' ? (q as TextElement).text || 'Text' : q.type === 'image' ? 'Image' : (q as ShapeElement).shape}
                    </span>
                    {q.groupId && <UsersRound size={13} className="text-ink-3 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); update(q.id, { hidden: !q.hidden }); }}
                      className={`w-10 h-10 rounded-full grid place-items-center ${q.hidden ? 'text-brand' : 'text-ink-3'}`}
                      title={q.hidden ? 'Show layer' : 'Hide layer'}
                    >
                      {q.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); update(q.id, { locked: !q.locked }); }}
                      className={`w-10 h-10 rounded-full grid place-items-center ${q.locked ? 'text-brand' : 'text-ink-3'}`}
                    >
                      {q.locked ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); reorder(q.id, 'up'); }}
                      className="w-10 h-10 rounded-full grid place-items-center bg-surface active:bg-line text-ink"
                    >
                      <IcUp size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); reorder(q.id, 'down'); }}
                      className="w-10 h-10 rounded-full grid place-items-center bg-surface active:bg-line text-ink rotate-180"
                    >
                      <IcUp size={14} />
                    </button>
                  </div>
                </div>
              );})}
          </div>
        </Sheet>
      )}
      {/* --- Format Sheet (Text) --- */}
      {panel === 'format' && t && (
        <Sheet title="Format" onClose={() => setPanel(null)}>
          <div className="mb-4">
            <div className="text-[12px] font-semibold text-ink-3 mb-2">Text Alignment</div>
            <Seg
              value={t.align}
              onChange={(a) => setWith({ align: a })}
              options={[
                { value: 'left', label: <IcAlignLeft size={18} /> },
                { value: 'center', label: <IcAlignCenter size={18} /> },
                { value: 'right', label: <IcAlignRight size={18} /> },
                { value: 'justify', label: <AlignJustify size={18} /> },
              ]}
            />
          </div>

          <div className="mb-4">
            <div className="text-[12px] font-semibold text-ink-3 mb-2">Vertical anchor (in its box)</div>
            <Seg
              value={t.vAlign}
              onChange={(a) => setWith({ vAlign: a })}
              options={[
                { value: 'top', label: 'Top' },
                { value: 'middle', label: 'Middle' },
                { value: 'bottom', label: 'Bottom' },
              ]}
            />
          </div>

          <div className="mb-4">
            <div className="text-[12px] font-semibold text-ink-3 mb-2">Style</div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setType({ fontWeight: t.fontWeight >= 700 ? 400 : 800 })}
                className={`flex-1 min-w-[54px] h-12 rounded-xl grid place-items-center text-[15px] font-bold border transition-colors ${t.fontWeight >= 700 ? 'bg-ink text-white border-ink' : 'bg-canvasbg text-ink border-line'}`}
              >
                B
              </button>
              <button
                onClick={() => setType({ italic: !t.italic })}
                className={`flex-1 min-w-[54px] h-12 rounded-xl grid place-items-center text-[15px] italic font-serif border transition-colors ${t.italic ? 'bg-ink text-white border-ink' : 'bg-canvasbg text-ink border-line'}`}
              >
                I
              </button>
              <button
                onClick={() => setWith({ underline: !t.underline })}
                className={`flex-1 min-w-[54px] h-12 rounded-xl grid place-items-center text-[15px] underline border transition-colors ${t.underline ? 'bg-ink text-white border-ink' : 'bg-canvasbg text-ink border-line'}`}
              >
                U
              </button>
              <button
                onClick={() => setWith({ strikethrough: !t.strikethrough })}
                className={`flex-1 min-w-[54px] h-12 rounded-xl grid place-items-center text-[15px] line-through border transition-colors ${t.strikethrough ? 'bg-ink text-white border-ink' : 'bg-canvasbg text-ink border-line'}`}
              >
                S
              </button>
              <button
                onClick={() => setType({ uppercase: !t.uppercase })}
                className={`flex-1 min-w-[54px] h-12 rounded-xl grid place-items-center text-[13px] font-bold border transition-colors ${t.uppercase ? 'bg-ink text-white border-ink' : 'bg-canvasbg text-ink border-line'}`}
              >
                AA
              </button>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-[12px] font-semibold text-ink-3 mb-2">List</div>
            <Seg
              value={t.list || 'none'}
              onChange={(v) => setType({ list: v })}
              options={[
                { value: 'none', label: 'None' },
                { value: 'bullet', label: <span className="flex items-center gap-1"><List size={15} /> Bullets</span> },
                { value: 'number', label: <span className="flex items-center gap-1"><ListOrdered size={15} /> Numbers</span> },
              ]}
            />
          </div>

          <div className="mb-4">
            <div className="text-[12px] font-semibold text-ink-3 mb-2">Text position</div>
            <Seg
              value={t.scriptPosition || 'normal'}
              onChange={(v) => setType({ scriptPosition: v })}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'super', label: 'Superscript' },
                { value: 'sub', label: 'Subscript' },
              ]}
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-[13px] font-semibold text-ink">Kerning</span>
            <Seg
              value={t.kerning === false ? 'off' : 'on'}
              onChange={(v) => setWith({ kerning: v === 'on' })}
              options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]}
            />
          </div>
        </Sheet>
      )}

      {/* --- Text Effects Sheet: outline / echo / neon --- */}
      {panel === 'effects' && t && (
        <Sheet title="Effects" onClose={() => setPanel(null)}>
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            {([
              ['none', 'None'], ['outline', 'Outline'], ['echo', 'Echo'], ['neon', 'Neon'],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setWith({ textEffect: { kind: k, color: t.textEffect?.color || (k === 'neon' ? '#39FF88' : '#F02D63'), thickness: t.textEffect?.thickness || (k === 'outline' ? 2 : k === 'neon' ? 6 : 4) } })}
                className={`h-14 rounded-2xl border text-[13.5px] font-bold ${((t.textEffect?.kind || 'none') === k) ? 'bg-ink text-white border-ink' : 'bg-canvasbg border-line text-ink'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {t.textEffect && t.textEffect.kind !== 'none' && (
            <>
              <div className="text-[12px] font-semibold text-ink-3 mb-2">Effect color</div>
              <ColorPicker value={t.textEffect.color} onChange={(c) => set({ textEffect: { ...t.textEffect!, color: c } })} />
              <Slider
                label={t.textEffect.kind === 'outline' ? 'Outline thickness' : t.textEffect.kind === 'neon' ? 'Glow strength' : 'Echo offset'}
                value={t.textEffect.thickness}
                min={1}
                max={t.textEffect.kind === 'neon' ? 20 : 16}
                onChange={(v) => set({ textEffect: { ...t.textEffect!, thickness: v } })}
                suffix="px"
              />
            </>
          )}
        </Sheet>
      )}

      {/* --- Nudge Sheet --- */}
      {panel === 'nudge' && (
        <Sheet title="Nudge" onClose={() => setPanel(null)}>
          <div className="flex flex-col items-center py-4">
            <div className="grid grid-cols-3 grid-rows-3 gap-2 w-48 mx-auto">
              <div />
              <button onClick={() => set({ y: el.y - 1 })} className="h-14 rounded-2xl bg-canvasbg active:bg-line border border-line grid place-items-center text-ink"><Minus size={16} className="rotate-90" /></button>
              <div />
              <button onClick={() => set({ x: el.x - 1 })} className="h-14 rounded-2xl bg-canvasbg active:bg-line border border-line grid place-items-center text-ink"><Minus size={16} /></button>
              <div className="grid place-items-center text-[11px] font-bold text-ink-3">1px</div>
              <button onClick={() => set({ x: el.x + 1 })} className="h-14 rounded-2xl bg-canvasbg active:bg-line border border-line grid place-items-center text-ink"><Minus size={16} /></button>
              <div />
              <button onClick={() => set({ y: el.y + 1 })} className="h-14 rounded-2xl bg-canvasbg active:bg-line border border-line grid place-items-center text-ink"><Minus size={16} className="rotate-90" /></button>
              <div />
            </div>
          </div>
        </Sheet>
      )}

      {/* --- More Options Sheet --- */}
      {panel === 'more' && (
        <Sheet title="More" onClose={() => setPanel(null)}>
          <div className="flex flex-col gap-1.5 pb-2">
            <button onClick={() => { copyElement(el.id); setPanel(null); }} className="h-14 px-4 flex items-center gap-3 text-ink bg-canvasbg rounded-2xl active:bg-line">
              <CopyIcon size={20} className="text-ink-3" />
              <span className="text-[14px] font-semibold">Copy</span>
            </button>
            <button
              onClick={() => { pasteElement(); setPanel(null); }}
              disabled={!clipboardElement}
              className={`h-14 px-4 flex items-center gap-3 rounded-2xl ${clipboardElement ? 'text-ink bg-canvasbg active:bg-line' : 'text-ink-3/40 bg-canvasbg/50'}`}
            >
              <ClipboardPaste size={20} className="text-ink-3" />
              <span className="text-[14px] font-semibold">Paste</span>
            </button>
            <button onClick={() => { duplicate(el.id); setPanel(null); }} className="h-14 px-4 flex items-center gap-3 text-ink bg-canvasbg rounded-2xl active:bg-line">
              <IcCopy size={20} className="text-ink-3" />
              <span className="text-[14px] font-semibold">Duplicate</span>
            </button>
            <button onClick={() => { copyStyle(el.id); setPanel(null); }} className="h-14 px-4 flex items-center gap-3 text-ink bg-canvasbg rounded-2xl active:bg-line">
              <Paintbrush size={20} className="text-ink-3" />
              <span className="text-[14px] font-semibold">Copy style</span>
            </button>
            <button
              onClick={() => { pasteStyle(el.id); setPanel(null); }}
              disabled={!clipboardStyle || clipboardStyle.type !== el.type}
              className={`h-14 px-4 flex items-center gap-3 rounded-2xl ${clipboardStyle && clipboardStyle.type === el.type ? 'text-ink bg-canvasbg active:bg-line' : 'text-ink-3/40 bg-canvasbg/50'}`}
            >
              <Paintbrush size={20} className="text-ink-3 scale-x-[-1]" />
              <span className="text-[14px] font-semibold">Paste style</span>
            </button>
            {el.groupId && (
              <button onClick={() => { ungroupElements(el.id); setPanel(null); }} className="h-14 px-4 flex items-center gap-3 text-ink bg-canvasbg rounded-2xl active:bg-line">
                <Unlink size={20} className="text-ink-3" />
                <span className="text-[14px] font-semibold">Ungroup</span>
              </button>
            )}
            <button onClick={() => { reorder(el.id, 'front'); setPanel(null); }} className="h-14 px-4 flex items-center gap-3 text-ink bg-canvasbg rounded-2xl active:bg-line">
              <IcUp size={20} className="text-ink-3" />
              <span className="text-[14px] font-semibold">Bring to front</span>
            </button>
            <button onClick={() => { reorder(el.id, 'back'); setPanel(null); }} className="h-14 px-4 flex items-center gap-3 text-ink bg-canvasbg rounded-2xl active:bg-line">
              <IcUp size={20} className="text-ink-3 rotate-180" />
              <span className="text-[14px] font-semibold">Send to back</span>
            </button>
            <button onClick={() => { set({ locked: !el.locked }); setPanel(null); }} className="h-14 px-4 flex items-center gap-3 text-ink bg-canvasbg rounded-2xl active:bg-line">
              {el.locked ? <Lock size={20} className="text-ink-3" /> : <Unlock size={20} className="text-ink-3" />}
              <span className="text-[14px] font-semibold">{el.locked ? 'Unlock' : 'Lock'}</span>
            </button>
            <button onClick={handleDownloadSelection} disabled={downloading} className="h-14 px-4 flex items-center gap-3 text-ink bg-canvasbg rounded-2xl active:bg-line">
              <Download size={20} className="text-ink-3" />
              <span className="text-[14px] font-semibold">{downloading ? 'Downloading…' : 'Download this layer'}</span>
            </button>
            <button onClick={() => { remove(el.id); setPanel(null); }} className="h-14 px-4 flex items-center gap-3 text-[#FF8E9E] bg-canvasbg rounded-2xl active:bg-line">
              <IcTrash size={20} />
              <span className="text-[14px] font-semibold">Delete</span>
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}

/** Add new elements — expanded with rich shapes, polygons, and custom templates */
const ALIGN_BUTTONS: { mode: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom'; label: string; Icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { mode: 'left', label: 'Left', Icon: AlignHorizontalJustifyStart },
  { mode: 'centerH', label: 'Center', Icon: AlignHorizontalJustifyCenter },
  { mode: 'right', label: 'Right', Icon: AlignHorizontalJustifyEnd },
  { mode: 'top', label: 'Top', Icon: AlignVerticalJustifyStart },
  { mode: 'centerV', label: 'Middle', Icon: AlignVerticalJustifyCenter },
  { mode: 'bottom', label: 'Bottom', Icon: AlignVerticalJustifyEnd },
];

function BarBtn({ icon, label, onClick, destructive }: { icon: React.ReactNode; label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 min-w-[64px] shrink-0 py-2 rounded-xl active:bg-canvasbg transition-colors ${destructive ? 'text-red-500' : 'text-ink-2'}`}
    >
      {icon}
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}

/** Contextual bar shown instead of ContextBar/the default tabs when 2+
 *  elements are selected on the canvas (marquee, shift-click, long-press). */
export function MultiSelectBar({ ids }: { ids: string[] }) {
  const project = useStore((s) => s.projects.find((p) => p.id === s.currentId));
  const groupElements = useStore((s) => s.groupElements);
  const ungroupElements = useStore((s) => s.ungroupElements);
  const duplicateMany = useStore((s) => s.duplicateMany);
  const delMany = useStore((s) => s.delMany);
  const reorderMany = useStore((s) => s.reorderMany);
  const alignSelection = useStore((s) => s.alignSelection);
  const distributeSelection = useStore((s) => s.distributeSelection);
  const clearSelection = useStore((s) => s.clearSelection);
  const [alignOpen, setAlignOpen] = useState(false);

  // "Ungroup" instead of "Group" only when the selection is exactly one
  // whole permanent group — mirrors the same check on the canvas's own
  // floating toolbar (EditorCanvas.tsx's GroupSelection).
  const members = project?.elements.filter((e) => ids.includes(e.id)) ?? [];
  const groupId = members[0]?.groupId;
  const isWholeGroup =
    !!groupId && members.every((m) => m.groupId === groupId) && (project?.elements.filter((e) => e.groupId === groupId).length ?? 0) === members.length;

  return (
    <div className="border-t border-line bg-surface">
      <div className="flex items-center justify-between px-4 pt-2.5 pb-1">
        <span className="text-[12px] font-bold text-ink-2">{ids.length} selected</span>
        <button onClick={clearSelection} className="text-[12px] font-bold text-brand active:opacity-70">Done</button>
      </div>
      <div className="flex items-center gap-0.5 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 overflow-x-auto no-scrollbar">
        <BarBtn icon={<AlignHorizontalJustifyCenter size={18} />} label="Align" onClick={() => setAlignOpen(true)} />
        <BarBtn
          icon={<Group size={18} />}
          label={isWholeGroup ? 'Ungroup' : 'Group'}
          onClick={() => (isWholeGroup ? (groupId && ungroupElements(members[0].id)) : groupElements(ids))}
        />
        <BarBtn icon={<BringToFront size={18} />} label="Front" onClick={() => reorderMany(ids, 'front')} />
        <BarBtn icon={<SendToBack size={18} />} label="Back" onClick={() => reorderMany(ids, 'back')} />
        <BarBtn icon={<IcCopy size={18} />} label="Duplicate" onClick={() => duplicateMany(ids)} />
        <BarBtn icon={<IcTrash size={18} />} label="Delete" destructive onClick={() => delMany(ids)} />
      </div>

      {alignOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={() => setAlignOpen(false)}>
          <div className="w-full" onClick={(e) => e.stopPropagation()}>
            <Sheet title="Align & distribute" onClose={() => setAlignOpen(false)}>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {ALIGN_BUTTONS.map(({ mode, label, Icon }) => (
                  <button
                    key={mode}
                    onClick={() => { alignSelection(ids, mode); setAlignOpen(false); }}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-canvasbg border border-line active:bg-line/60 transition-colors"
                  >
                    <Icon size={18} className="text-ink-2" />
                    <span className="text-[11px] font-bold text-ink-2">{label}</span>
                  </button>
                ))}
              </div>
              <div className="text-[12px] font-semibold text-ink-3 mt-4 mb-2">
                Distribute spacing {ids.length < 3 && <span className="font-normal">· select 3 or more layers</span>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { axis: 'h' as const, label: 'Horizontally', Icon: AlignHorizontalDistributeCenter },
                  { axis: 'v' as const, label: 'Vertically', Icon: AlignVerticalDistributeCenter },
                ]).map(({ axis, label, Icon }) => (
                  <button
                    key={axis}
                    disabled={ids.length < 3}
                    onClick={() => { distributeSelection(ids, axis); setAlignOpen(false); }}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-canvasbg border border-line active:bg-line/60 transition-colors disabled:opacity-40"
                  >
                    <Icon size={18} className="text-ink-2" />
                    <span className="text-[11px] font-bold text-ink-2">{label}</span>
                  </button>
                ))}
              </div>
            </Sheet>
          </div>
        </div>
      )}
    </div>
  );
}

export function AddSheet({ project, onClose }: { project: any; onClose: () => void }) {
  const add = useStore((s) => s.add);
  const c = project.canvas;
  const maxZ = Math.max(...project.elements.map((e: DesignElement) => e.z), 0) + 1;
  const cx = c.width / 2, cy = c.height / 2;

  const items = [
    {
      icon: <IcType size={22} />, label: 'Heading',
      make: () => text('headline', { x: cx - c.width * 0.4, y: cy - 60, width: c.width * 0.8, height: 140, text: 'Your heading', fontFamily: 'Poppins', fontSize: Math.round(c.width / 16), fontWeight: 700, align: 'center', z: maxZ }),
    },
    {
      icon: <IcType size={18} />, label: 'Body text',
      make: () => text('body', { x: cx - c.width * 0.35, y: cy - 40, width: c.width * 0.7, height: 120, text: 'Write something here', fontSize: Math.round(c.width / 32), align: 'center', z: maxZ }),
    },
    {
      icon: <IcImage size={22} />, label: 'Picture',
      make: () => image('photo', { x: cx - c.width * 0.22, y: cy - c.width * 0.22, width: c.width * 0.44, height: c.width * 0.44, radius: 24, z: maxZ }),
    },
    {
      icon: <Circle size={22} className="text-brand" />, label: 'Circle (1 corner)',
      make: () => shape({ shape: 'circle', x: cx - 130, y: cy - 130, width: 260, height: 260, fill: '#F02D63', fillOpacity: 1, z: maxZ }),
    },
    {
      icon: <Square size={22} className="text-ink" />, label: 'Rectangle / Card',
      make: () => shape({ shape: 'rect', x: cx - 160, y: cy - 110, width: 320, height: 220, fill: '#12131A', radius: 20, z: maxZ }),
    },
    {
      icon: <Triangle size={22} className="text-amber-500" />, label: 'Triangle',
      make: () => shape({ shape: 'triangle', x: cx - 120, y: cy - 120, width: 240, height: 240, fill: '#FFB800', z: maxZ }),
    },
    {
      icon: <Hexagon size={22} className="text-emerald-500" />, label: 'Hexagon / Polygon',
      make: () => shape({ shape: 'hexagon', x: cx - 130, y: cy - 130, width: 260, height: 260, fill: '#10B981', sides: 6, z: maxZ }),
    },
    {
      icon: <Star size={22} className="text-yellow-400" />, label: 'Star',
      make: () => shape({ shape: 'star', x: cx - 120, y: cy - 120, width: 240, height: 240, fill: '#FBBF24', z: maxZ }),
    },
    {
      icon: <Minus size={22} className="text-ink-2" />, label: 'Line / Divider',
      make: () => shape({ shape: 'line', x: cx - 180, y: cy, width: 360, height: 8, strokeWidth: 4, strokeColor: '#12131A', z: maxZ }),
    },
  ];

  return (
    <Sheet title="Add to your design" onClose={onClose}>
      <div className="grid grid-cols-3 gap-2 pb-2">
        {items.map((i) => (
          <button
            key={i.label}
            onClick={() => { add(i.make() as DesignElement); onClose(); }}
            className="h-24 rounded-2xl bg-canvasbg active:bg-line flex flex-col items-center justify-center gap-1.5 text-ink p-2"
          >
            <span className="w-10 h-10 rounded-xl bg-surface grid place-items-center">{i.icon}</span>
            <span className="text-[11px] font-bold text-center leading-tight truncate w-full">{i.label}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
