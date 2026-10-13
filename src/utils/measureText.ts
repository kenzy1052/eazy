import { TextElement } from '../types';
import { baseOf } from '../editor/richText';
import { renderRichIntoElement } from '../editor/richTextDom';

/**
 * Measures how big a text element's box needs to be to exactly contain its
 * current text at its current style. Used any time a typographic property
 * changes (font, weight, italic, size, spacing, case) so the box tracks the
 * text instead of leaving a stale size behind — which is what caused text to
 * visually "shrink" or wrap oddly after bolding/italicising.
 */
export function measureTextBox(
  el: Pick<TextElement, 'text' | 'fontFamily' | 'fontSize' | 'fontWeight' | 'italic' | 'lineHeight' | 'letterSpacing' | 'uppercase' | 'highlight'> &
    Partial<Pick<TextElement, 'runs' | 'color' | 'underline' | 'strikethrough'>>,
  opts: { minWidth?: number; maxWidth?: number } = {}
): { width: number; height: number } {
  const measure = document.createElement('div');
  measure.style.fontFamily = `"${el.fontFamily}", sans-serif`;
  measure.style.fontSize = `${el.fontSize}px`;
  measure.style.fontWeight = String(el.fontWeight);
  measure.style.fontStyle = el.italic ? 'italic' : 'normal';
  measure.style.lineHeight = String(el.lineHeight);
  measure.style.letterSpacing = `${el.letterSpacing}px`;
  measure.style.textTransform = el.uppercase ? 'uppercase' : 'none';
  measure.style.position = 'absolute';
  measure.style.visibility = 'hidden';
  measure.style.pointerEvents = 'none';
  measure.style.whiteSpace = 'pre-wrap';
  measure.style.wordBreak = 'break-word';
  measure.style.padding = el.highlight ? `${el.highlight.padY}px ${el.highlight.padX}px` : '0px';

  if (opts.maxWidth) {
    // Wrap at the box's existing width so height reflects real line count.
    measure.style.width = `${opts.maxWidth}px`;
  } else {
    measure.style.width = 'max-content';
  }

  if (el.runs && el.runs.length > 0) {
    // Mixed sizes/weights change line breaks and line height, so measure the
    // same styled spans the renderer will draw rather than a uniform string.
    renderRichIntoElement(measure, el.text || ' ', el.runs, baseOf({ ...el, color: el.color ?? '#000000' }), { caretPlaceholder: false });
  } else {
    measure.textContent = el.text || ' ';
  }
  document.body.appendChild(measure);
  const bounds = measure.getBoundingClientRect();
  document.body.removeChild(measure);

  const width = Math.max(opts.minWidth ?? 10, Math.round(bounds.width) + 2);
  const height = Math.max(10, Math.round(bounds.height));
  return { width, height };
}
