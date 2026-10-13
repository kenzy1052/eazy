// ---------------------------------------------------------------------------
// Browser-only half of the rich-text editor: building the contentEditable
// surface from text + runs, reading it back, and mapping DOM selection points
// to character offsets. All the *decisions* live in richText.ts (portable).
// React Native will replace this file with its own text-input layer.
// ---------------------------------------------------------------------------

import type { TextRun } from '../types';
import {
  BOLD_WEIGHT,
  charStylesToRuns,
  parseColorToHex,
  segmentCss,
  splitIntoSegments,
  stripBase,
  type RunBase,
  type RunStyle,
} from './richText';

// ===========================================================================
// DOM helpers — browser only (never called from the pure tests above).
//
// The editable surface contains only <span>s (each holding text nodes and
// <br>s) and no React-managed children, so React never fights the browser
// over it. Rule used throughout: a <br> counts as exactly one "\n", and a
// <br> that is the very last node is just the caret placeholder browsers need
// to show an empty last line — it is not counted.
// ===========================================================================

function styleOfElement(el: HTMLElement): RunStyle {
  const s: RunStyle = {};
  const tag = el.nodeName;
  if (tag === 'B' || tag === 'STRONG') s.fontWeight = BOLD_WEIGHT;
  if (tag === 'I' || tag === 'EM') s.italic = true;
  if (tag === 'U') s.underline = true;
  if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') s.strikethrough = true;
  const st = el.style;
  if (st) {
    if (st.fontWeight) {
      const w = st.fontWeight === 'bold' ? 700 : st.fontWeight === 'normal' ? 400 : parseInt(st.fontWeight, 10);
      if (!isNaN(w)) s.fontWeight = w;
    }
    if (st.fontStyle) s.italic = st.fontStyle === 'italic' || st.fontStyle === 'oblique';
    const deco = st.textDecorationLine || st.textDecoration;
    if (deco) {
      s.underline = deco.includes('underline');
      s.strikethrough = deco.includes('line-through');
    }
    if (st.fontSize && st.fontSize.endsWith('px')) {
      const px = parseFloat(st.fontSize);
      if (!isNaN(px)) s.fontSize = px;
    }
    if (st.color) {
      const hex = parseColorToHex(st.color);
      if (hex) s.color = hex;
    }
    if (st.opacity) {
      const o = parseFloat(st.opacity);
      if (!isNaN(o)) s.opacity = o;
    }
  }
  return s;
}

/** Last text-or-<br> node in document order, ignoring empty text nodes (Range.insertNode leaves some behind). */
function lastMeaningfulNode(root: Node): Node | null {
  for (let i = root.childNodes.length - 1; i >= 0; i--) {
    const c = root.childNodes[i];
    if (c.nodeType === 3) {
      if ((c.nodeValue || '') !== '') return c;
      continue;
    }
    if (c.nodeName === 'BR') return c;
    const r = lastMeaningfulNode(c);
    if (r) return r;
  }
  return null;
}

function hasContentAfter(node: Node): boolean {
  for (let s = node.nextSibling; s; s = s.nextSibling) {
    if (!(s.nodeType === 3 && (s.nodeValue || '') === '')) return true;
  }
  return false;
}

/** Reads text + runs back out of an editable surface (runs are stripped of anything equal to `base`). */
export function readRichTextFromDom(root: HTMLElement, base: RunBase): { text: string; runs: TextRun[] } {
  let text = '';
  const styles: RunStyle[] = [];
  const push = (t: string, style: RunStyle) => {
    for (let i = 0; i < t.length; i++) styles.push(style);
    text += t;
  };
  const placeholder = (() => {
    const last = lastMeaningfulNode(root);
    return last && last.nodeName === 'BR' ? last : null;
  })();

  const walk = (node: Node, inherited: RunStyle) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === 3) {
        push(child.nodeValue || '', inherited);
      } else if (child.nodeName === 'BR') {
        if (child !== placeholder) push('\n', inherited);
      } else if (child.nodeType === 1) {
        const el = child as HTMLElement;
        // Defensive: if a browser still inserts block elements, treat them as line breaks.
        if ((el.nodeName === 'DIV' || el.nodeName === 'P') && text.length > 0 && !text.endsWith('\n')) {
          push('\n', inherited);
        }
        walk(el, { ...inherited, ...styleOfElement(el) });
      }
    });
  };
  walk(root, {});

  return { text, runs: charStylesToRuns(styles.map((s) => stripBase(s, base))) };
}

/** Replaces the surface's contents with spans built from text + runs. */
export function renderRichIntoElement(
  root: HTMLElement,
  text: string,
  runs: TextRun[] | undefined,
  base: RunBase,
  opts: { caretPlaceholder?: boolean } = {}
): void {
  const doc = root.ownerDocument;
  root.textContent = '';
  for (const seg of splitIntoSegments(text, runs)) {
    if (seg.text.length === 0) continue;
    const span = doc.createElement('span');
    Object.assign(span.style, segmentCss(seg.style, base, { emitDecoration: true }));
    seg.text.split('\n').forEach((piece, i) => {
      if (i > 0) span.appendChild(doc.createElement('br'));
      if (piece) span.appendChild(doc.createTextNode(piece));
    });
    root.appendChild(span);
  }
  if (opts.caretPlaceholder !== false && text.endsWith('\n')) root.appendChild(doc.createElement('br'));
}

function textLengthOf(node: Node): number {
  if (node.nodeType === 3) return (node.nodeValue || '').length;
  if (node.nodeName === 'BR') return 1;
  let n = 0;
  node.childNodes.forEach((c) => { n += textLengthOf(c); });
  return n;
}

/** DOM selection point (container, offset) -> character offset in the surface's text. */
export function offsetForPoint(root: HTMLElement, container: Node, offset: number): number {
  let pos = 0;
  const walk = (node: Node): boolean => {
    if (node === container) {
      if (node.nodeType === 3) { pos += offset; return true; }
      for (let i = 0; i < offset && i < node.childNodes.length; i++) pos += textLengthOf(node.childNodes[i]);
      return true;
    }
    if (node.nodeType === 3) { pos += (node.nodeValue || '').length; return false; }
    if (node.nodeName === 'BR') { pos += 1; return false; }
    for (let i = 0; i < node.childNodes.length; i++) if (walk(node.childNodes[i])) return true;
    return false;
  };
  walk(root);
  return pos;
}

/** Character offset -> DOM selection point (inverse of offsetForPoint). */
export function pointForOffset(root: HTMLElement, target: number): { node: Node; offset: number } {
  let pos = 0;
  let result: { node: Node; offset: number } | null = null;
  const walk = (node: Node): boolean => {
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i];
      if (child.nodeType === 3) {
        const len = (child.nodeValue || '').length;
        if (target <= pos + len) { result = { node: child, offset: target - pos }; return true; }
        pos += len;
      } else if (child.nodeName === 'BR') {
        if (target === pos) { result = { node, offset: i }; return true; }
        pos += 1;
        if (target === pos) { result = { node, offset: i + 1 }; return true; }
      } else if (walk(child)) {
        return true;
      }
    }
    return false;
  };
  if (!walk(root)) result = { node: root, offset: root.childNodes.length };
  return result!;
}

export function setSelectionByOffsets(root: HTMLElement, start: number, end: number): void {
  const doc = root.ownerDocument;
  const win = doc.defaultView;
  const sel = win?.getSelection();
  if (!sel) return;
  const a = pointForOffset(root, start);
  const b = pointForOffset(root, end);
  const range = doc.createRange();
  range.setStart(a.node, a.offset);
  range.setEnd(b.node, b.offset);
  sel.removeAllRanges();
  sel.addRange(range);
}

/** Current selection as [start, end] character offsets, or null if it isn't inside `root`. */
export function getSelectionOffsets(root: HTMLElement): { start: number; end: number } | null {
  const sel = root.ownerDocument.defaultView?.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const r = sel.getRangeAt(0);
  if (!root.contains(r.startContainer) || !root.contains(r.endContainer)) return null;
  const a = offsetForPoint(root, r.startContainer, r.startOffset);
  const b = offsetForPoint(root, r.endContainer, r.endOffset);
  return { start: Math.min(a, b), end: Math.max(a, b) };
}

/** Inserts plain text (with \n as line breaks) at the caret, replacing any selection. */
export function insertTextAtSelection(root: HTMLElement, text: string): void {
  const doc = root.ownerDocument;
  const sel = doc.defaultView?.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer)) return;
  range.deleteContents();
  const frag = doc.createDocumentFragment();
  text.split('\n').forEach((piece, i) => {
    if (i > 0) frag.appendChild(doc.createElement('br'));
    if (piece) frag.appendChild(doc.createTextNode(piece));
  });
  const last = frag.lastChild;
  if (!last) return;
  range.insertNode(frag);
  // Caret placeholder: a line break that ends the content needs one more <br>
  // after it, or the browser won't draw the new empty line.
  if (last.nodeName === 'BR') {
    let n: Node | null = last;
    let isLast = true;
    while (n && n !== root) {
      if (hasContentAfter(n)) { isLast = false; break; }
      n = n.parentNode;
    }
    if (isLast) root.appendChild(doc.createElement('br'));
  }
  const after = doc.createRange();
  after.setStartAfter(last);
  after.collapse(true);
  sel.removeAllRanges();
  sel.addRange(after);
}
