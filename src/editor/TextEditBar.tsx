import React, { useCallback, useEffect, useState } from 'react';
import { Check, Minus, Plus, Bold, Italic, Underline, Strikethrough, Droplet } from 'lucide-react';
import type { TextElement } from '../types';
import { useStore } from '../store/useStore';
import type { CanvasHandle } from './EditorCanvas';
import { computeToggle, type RangeFormatState, type RunStyle } from './richText';

const SWATCHES = [
  '#FFFFFF', '#111111', '#F02D63', '#FF7A00', '#FFC107', '#22C55E',
  '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899', '#9CA3AF', '#7F1D1D',
];

/**
 * Shown while a text layer is being edited. Select some of the text and use
 * these to bold / italicise / resize / recolour / fade just that part. With
 * nothing selected (just a caret), the same buttons style the whole layer.
 *
 * Every button swallows mousedown so tapping it never moves focus out of the
 * text — otherwise the editor would blur, end the edit, and lose the selection.
 */
export function TextEditBar({
  handle,
  el,
  onDone,
}: {
  handle: React.MutableRefObject<CanvasHandle | null>;
  el: TextElement | null;
  onDone: () => void;
}) {
  const update = useStore((s) => s.update);
  const [fmt, setFmt] = useState<RangeFormatState | null>(null);

  const refresh = useCallback(() => setFmt(handle.current?.getTextFormatState() ?? null), [handle]);

  useEffect(() => {
    refresh();
    // The selection changes constantly while editing; keep the buttons' active
    // states in step with it.
    document.addEventListener('selectionchange', refresh);
    return () => document.removeEventListener('selectionchange', refresh);
  }, [refresh, el?.fontWeight, el?.italic, el?.underline, el?.strikethrough, el?.fontSize, el?.color, el?.opacity]);

  if (!el) return null;

  const hasSel = !!fmt?.hasSelection;
  const state: RangeFormatState = fmt ?? {
    hasSelection: false, bold: el.fontWeight >= 600, italic: el.italic, underline: !!el.underline,
    strikethrough: !!el.strikethrough, fontSize: el.fontSize, color: el.color, opacity: el.opacity,
  };

  // Selection -> that range only. No selection -> the whole layer (same fields
  // the regular toolbar edits), so these buttons are never dead.
  const apply = (patch: RunStyle) => {
    if (handle.current?.applyTextFormat(patch)) { refresh(); return; }
    const layer: Partial<TextElement> = {};
    if (patch.fontWeight !== undefined) layer.fontWeight = patch.fontWeight;
    if (patch.italic !== undefined) layer.italic = patch.italic;
    if (patch.underline !== undefined) layer.underline = patch.underline;
    if (patch.strikethrough !== undefined) layer.strikethrough = patch.strikethrough;
    if (patch.fontSize !== undefined) layer.fontSize = patch.fontSize;
    if (patch.color !== undefined) layer.color = patch.color;
    if (patch.opacity !== undefined) layer.opacity = patch.opacity;
    update(el.id, layer as any);
  };

  const curSize = state.fontSize ?? el.fontSize;
  const curOpacity = state.opacity ?? (hasSel ? 1 : el.opacity);
  const stepSize = (f: number) => apply({ fontSize: Math.max(8, Math.min(400, Math.round(curSize * f))) });
  const stepOpacity = (d: number) => apply({ opacity: Math.max(0.1, Math.min(1, Math.round((curOpacity + d) * 10) / 10)) });

  const toggleBtn = (active: boolean) =>
    `shrink-0 w-10 h-10 rounded-xl grid place-items-center border transition-colors ${
      active ? 'bg-ink text-white border-ink' : 'bg-canvasbg text-ink border-line active:bg-line'
    }`;
  const stepBtn = 'shrink-0 w-9 h-10 rounded-xl grid place-items-center bg-canvasbg border border-line text-ink active:bg-line';
  const divider = <span className="shrink-0 w-px h-6 bg-line mx-1" />;

  return (
    <div className="bg-surface border-t border-line pb-[max(0.5rem,env(safe-area-inset-bottom))]" onMouseDown={(e) => e.preventDefault()}>
      <div className="flex items-center justify-between px-4 pt-2 pb-1">
        <span className="text-[11px] font-bold text-ink-3">
          {hasSel ? 'Formatting selected text' : 'Select text to style part of it · or style the whole layer'}
        </span>
        <button
          onClick={onDone}
          className="h-9 px-4 rounded-full bg-brand text-white text-[13px] font-bold flex items-center gap-1.5 active:bg-brand-dark"
        >
          <Check size={16} />
          <span>Done</span>
        </button>
      </div>

      <div className="flex items-center gap-1.5 px-3 pb-1 overflow-x-auto no-scrollbar">
        <button className={toggleBtn(state.bold)} onClick={() => apply(computeToggle('bold', state))} title="Bold"><Bold size={17} /></button>
        <button className={toggleBtn(state.italic)} onClick={() => apply(computeToggle('italic', state))} title="Italic"><Italic size={17} /></button>
        <button className={toggleBtn(state.underline)} onClick={() => apply(computeToggle('underline', state))} title="Underline"><Underline size={17} /></button>
        <button className={toggleBtn(state.strikethrough)} onClick={() => apply(computeToggle('strikethrough', state))} title="Strikethrough"><Strikethrough size={17} /></button>

        {divider}

        <button className={stepBtn} onClick={() => stepSize(0.9)} title="Smaller"><Minus size={15} /></button>
        <span className="shrink-0 min-w-[40px] text-center text-[13px] font-bold text-ink tabular-nums" title="Text size">
          {state.fontSize === null ? '—' : Math.round(curSize)}
        </span>
        <button className={stepBtn} onClick={() => stepSize(1.1)} title="Bigger"><Plus size={15} /></button>

        {divider}

        <Droplet size={15} className="shrink-0 text-ink-3" />
        <button className={stepBtn} onClick={() => stepOpacity(-0.1)} title="More transparent"><Minus size={15} /></button>
        <span className="shrink-0 min-w-[40px] text-center text-[13px] font-bold text-ink tabular-nums" title="Opacity">
          {state.opacity === null ? '—' : `${Math.round(curOpacity * 100)}%`}
        </span>
        <button className={stepBtn} onClick={() => stepOpacity(0.1)} title="More opaque"><Plus size={15} /></button>

        {divider}

        {SWATCHES.map((c) => (
          <button
            key={c}
            onClick={() => apply({ color: c })}
            title={c}
            className={`shrink-0 w-9 h-9 rounded-full border-2 ${
              state.color && state.color.toUpperCase() === c ? 'border-brand' : 'border-line'
            }`}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}
