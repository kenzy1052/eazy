// ---------------------------------------------------------------------------
// Rich text (per-character styling) for text layers.
//
// Design: the document stores plain `text` plus `runs` — non-overlapping
// [start, end) character ranges that override a few style properties (see
// TextRun in types). Everything that *decides* things (merging runs, applying
// bold to a selection, working out whether a selection is currently bold) is
// pure math over that data model, so it's unit-tested without a browser
// (scripts/richText.test.ts).
//
// PORTABLE CORE: this file has no DOM / React dependency (enforced by
// scripts/check-core-purity.ts) so the React Native app can reuse it as-is.
// The browser-only editable-surface code lives in richTextDom.ts.
//
// Formatting is deliberately applied in *data space* (read the surface ->
// change runs -> re-render -> restore selection) rather than with
// document.execCommand, so the values are exactly what the rest of the app
// uses (e.g. bold = 800, same as the whole-layer Bold button) and behaviour
// doesn't vary by platform.
// ---------------------------------------------------------------------------

import type { TextRun } from '../types';

export type RunStyle = Omit<TextRun, 'start' | 'end'>;

/** The text layer's own (whole-layer) values — what a run falls back to. */
export interface RunBase {
  fontWeight: number;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  fontSize: number;
  color: string;
  /** Per-run opacity multiplies the layer's opacity, so its own base is 1. */
  opacity: number;
}

export const BOLD_WEIGHT = 800; // matches the whole-layer Bold button
export const NORMAL_WEIGHT = 400;

const STYLE_KEYS: (keyof RunStyle)[] = [
  'fontWeight', 'italic', 'underline', 'strikethrough', 'fontSize', 'color', 'opacity',
];

export function baseOf(el: {
  fontWeight: number; italic: boolean; underline?: boolean; strikethrough?: boolean; fontSize: number; color: string;
}): RunBase {
  return {
    fontWeight: el.fontWeight,
    italic: !!el.italic,
    underline: !!el.underline,
    strikethrough: !!el.strikethrough,
    fontSize: el.fontSize,
    color: el.color,
    opacity: 1,
  };
}

// ---- colour helpers ------------------------------------------------------

/** '#abc' / '#aabbcc' / 'rgb(a)(r, g, b)' -> '#AABBCC'. Anything else -> undefined. */
export function parseColorToHex(css: string): string | undefined {
  const c = (css || '').trim().toLowerCase();
  const short = /^#([0-9a-f]{3})$/.exec(c);
  if (short) return '#' + short[1].split('').map((x) => x + x).join('').toUpperCase();
  if (/^#[0-9a-f]{6}$/.test(c)) return c.toUpperCase();
  const m = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(c);
  if (m) {
    return '#' + [m[1], m[2], m[3]]
      .map((n) => Math.max(0, Math.min(255, parseInt(n, 10))).toString(16).padStart(2, '0'))
      .join('').toUpperCase();
  }
  return undefined;
}

function sameColor(a?: string, b?: string): boolean {
  if (a === undefined || b === undefined) return a === b;
  return (parseColorToHex(a) ?? a.toLowerCase()) === (parseColorToHex(b) ?? b.toLowerCase());
}

// ---- style helpers -------------------------------------------------------

function cleanStyle(s: Partial<RunStyle>): RunStyle {
  const out: RunStyle = {};
  for (const k of STYLE_KEYS) {
    if (s[k] !== undefined) (out as Record<string, unknown>)[k] = s[k];
  }
  return out;
}

function sameStyle(a: RunStyle, b: RunStyle): boolean {
  return STYLE_KEYS.every((k) => (k === 'color' ? sameColor(a.color, b.color) : a[k] === b[k]));
}

export function hasAnyStyle(s: RunStyle): boolean {
  return STYLE_KEYS.some((k) => s[k] !== undefined);
}

/** Drops any property that just restates the layer's own value. */
export function stripBase(s: RunStyle, base: RunBase): RunStyle {
  const out: RunStyle = { ...s };
  if (out.fontWeight === base.fontWeight) delete out.fontWeight;
  if (out.italic === base.italic) delete out.italic;
  if (out.underline === base.underline) delete out.underline;
  if (out.strikethrough === base.strikethrough) delete out.strikethrough;
  if (out.fontSize === base.fontSize) delete out.fontSize;
  if (out.color !== undefined && sameColor(out.color, base.color)) delete out.color;
  if (out.opacity === base.opacity) delete out.opacity;
  return out;
}

// ---- runs <-> per-character styles --------------------------------------

/** Expands runs to one style object per character (later runs win on overlap). */
export function runsToCharStyles(runs: TextRun[] | undefined, len: number): RunStyle[] {
  const out: RunStyle[] = Array.from({ length: len }, () => ({}));
  for (const r of runs ?? []) {
    const s = Math.max(0, Math.min(len, r.start));
    const e = Math.max(0, Math.min(len, r.end));
    const style = cleanStyle(r);
    for (let i = s; i < e; i++) out[i] = { ...out[i], ...style };
  }
  return out;
}

/** Compresses per-character styles back into the fewest runs (merging neighbours, skipping unstyled). */
export function charStylesToRuns(styles: RunStyle[]): TextRun[] {
  const runs: TextRun[] = [];
  let i = 0;
  while (i < styles.length) {
    if (!hasAnyStyle(styles[i])) { i++; continue; }
    let j = i + 1;
    while (j < styles.length && sameStyle(styles[i], styles[j])) j++;
    runs.push({ start: i, end: j, ...styles[i] });
    i = j;
  }
  return runs;
}

/** Sorts, clips to the text, resolves overlaps, merges identical neighbours, drops no-op runs. */
export function normalizeRuns(runs: TextRun[] | undefined, len: number, base?: RunBase): TextRun[] {
  let styles = runsToCharStyles(runs, len);
  if (base) styles = styles.map((s) => stripBase(s, base));
  return charStylesToRuns(styles);
}

/** Applies `patch` to characters [start, end) and returns the new normalized runs. */
export function applyStyleToRange(
  runs: TextRun[] | undefined,
  len: number,
  start: number,
  end: number,
  patch: RunStyle,
  base?: RunBase
): TextRun[] {
  const styles = runsToCharStyles(runs, len);
  const lo = Math.max(0, Math.min(start, end));
  const hi = Math.min(len, Math.max(start, end));
  const clean = cleanStyle(patch);
  for (let i = lo; i < hi; i++) styles[i] = { ...styles[i], ...clean };
  return charStylesToRuns(base ? styles.map((s) => stripBase(s, base)) : styles);
}

// ---- keeping runs attached to the text when it changes elsewhere ---------

/**
 * When a layer's text is replaced by something that isn't the rich editor
 * (Quick Edit's text box, etc.), carry the formatting along instead of
 * leaving ranges pointing at the wrong characters: find what changed via the
 * common prefix/suffix, keep styling on the untouched head and tail (shifted
 * as needed), and give inserted characters the style of the character before
 * them — i.e. typing inside a bold word stays bold.
 */
export function adjustRunsForTextChange(oldText: string, newText: string, runs: TextRun[] | undefined): TextRun[] {
  if (!runs || runs.length === 0 || oldText === newText) return runs ?? [];
  const oldLen = oldText.length, newLen = newText.length;
  let p = 0;
  while (p < oldLen && p < newLen && oldText[p] === newText[p]) p++;
  let q = 0;
  while (q < oldLen - p && q < newLen - p && oldText[oldLen - 1 - q] === newText[newLen - 1 - q]) q++;

  const old = runsToCharStyles(runs, oldLen);
  const next: RunStyle[] = [];
  for (let i = 0; i < p; i++) next.push(old[i]);
  const inherit: RunStyle = p > 0 ? old[p - 1] : oldLen > 0 ? old[0] : {};
  for (let i = p; i < newLen - q; i++) next.push(inherit);
  for (let j = 0; j < q; j++) next.push(old[oldLen - q + j]);
  return charStylesToRuns(next);
}

// ---- what is the selection currently? (drives the toolbar's active states) --

export interface RangeFormatState {
  /** False when the caret is collapsed — the toolbar then acts on the whole layer. */
  hasSelection: boolean;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  /** null = the selection mixes several values. */
  fontSize: number | null;
  color: string | null;
  opacity: number | null;
}

export function getRangeState(
  runs: TextRun[] | undefined,
  len: number,
  start: number,
  end: number,
  base: RunBase
): RangeFormatState {
  const lo = Math.max(0, Math.min(start, end));
  const hi = Math.min(len, Math.max(start, end));
  if (hi <= lo) {
    return {
      hasSelection: false,
      bold: base.fontWeight >= 600,
      italic: base.italic,
      underline: base.underline,
      strikethrough: base.strikethrough,
      fontSize: base.fontSize,
      color: base.color,
      opacity: base.opacity,
    };
  }
  const styles = runsToCharStyles(runs, len).slice(lo, hi);
  const all = (f: (s: RunStyle) => boolean) => styles.every(f);
  const uniform = <T,>(get: (s: RunStyle) => T): T | null => {
    const first = get(styles[0]);
    return styles.every((s) => get(s) === first) ? first : null;
  };
  return {
    hasSelection: true,
    bold: all((s) => (s.fontWeight ?? base.fontWeight) >= 600),
    italic: all((s) => s.italic ?? base.italic),
    underline: all((s) => s.underline ?? base.underline),
    strikethrough: all((s) => s.strikethrough ?? base.strikethrough),
    fontSize: uniform((s) => s.fontSize ?? base.fontSize),
    color: uniform((s) => (s.color ?? base.color).toUpperCase()),
    opacity: uniform((s) => s.opacity ?? base.opacity),
  };
}

/** Bold/italic/underline/strike behave as toggles: if the whole selection already has it, remove it. */
export function computeToggle(
  kind: 'bold' | 'italic' | 'underline' | 'strikethrough',
  state: Pick<RangeFormatState, 'bold' | 'italic' | 'underline' | 'strikethrough'>
): RunStyle {
  switch (kind) {
    case 'bold': return { fontWeight: state.bold ? NORMAL_WEIGHT : BOLD_WEIGHT };
    case 'italic': return { italic: !state.italic };
    case 'underline': return { underline: !state.underline };
    case 'strikethrough': return { strikethrough: !state.strikethrough };
  }
}

// ---- rendering helpers ---------------------------------------------------

export interface Segment { text: string; style: RunStyle }

/** Splits text at every style change; always covers the full text. */
export function splitIntoSegments(text: string, runs: TextRun[] | undefined): Segment[] {
  if (!runs || runs.length === 0 || text.length === 0) return [{ text, style: {} }];
  const styles = runsToCharStyles(runs, text.length);
  const segs: Segment[] = [];
  let i = 0;
  while (i < text.length) {
    let j = i + 1;
    while (j < text.length && sameStyle(styles[i], styles[j])) j++;
    segs.push({ text: text.slice(i, j), style: styles[i] });
    i = j;
  }
  return segs;
}

/** Same segments, regrouped into lines (for bullet/numbered lists, one <li> per line). */
export function groupSegmentsByLine(segs: Segment[]): Segment[][] {
  const lines: Segment[][] = [[]];
  for (const seg of segs) {
    seg.text.split('\n').forEach((piece, idx) => {
      if (idx > 0) lines.push([]);
      if (piece) lines[lines.length - 1].push({ text: piece, style: seg.style });
    });
  }
  return lines;
}

/**
 * CSS for one segment. `fontScale` carries the layer's auto-fit / superscript
 * scaling into per-run font sizes so they stay proportional. With
 * `emitDecoration` the *effective* underline/strike is always written —
 * necessary because a child element can't cancel a parent's text-decoration,
 * so in rich mode decoration is applied per segment rather than on the parent.
 */
export function segmentCss(
  style: RunStyle,
  base: RunBase,
  opts: { fontScale?: number; emitDecoration?: boolean } = {}
): Record<string, string | number> {
  const css: Record<string, string | number> = {};
  if (style.fontWeight !== undefined) css.fontWeight = style.fontWeight;
  if (style.italic !== undefined) css.fontStyle = style.italic ? 'italic' : 'normal';
  if (style.fontSize !== undefined) css.fontSize = `${style.fontSize * (opts.fontScale ?? 1)}px`;
  if (style.color !== undefined) css.color = style.color;
  if (style.opacity !== undefined && style.opacity !== 1) css.opacity = style.opacity;
  if (opts.emitDecoration || style.underline !== undefined || style.strikethrough !== undefined) {
    const u = style.underline ?? base.underline;
    const s = style.strikethrough ?? base.strikethrough;
    css.textDecorationLine = u && s ? 'underline line-through' : u ? 'underline' : s ? 'line-through' : 'none';
  }
  return css;
}
