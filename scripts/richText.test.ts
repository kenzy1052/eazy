// Run with: npx tsx scripts/richText.test.ts
// The pure tests need nothing. The DOM tests (render -> read round-trip,
// selection offset mapping) use jsdom if it's installed; otherwise they're
// skipped with a note. To run them: npm i -D jsdom
import {
  parseColorToHex, stripBase, normalizeRuns, applyStyleToRange, getRangeState, computeToggle,
  splitIntoSegments, groupSegmentsByLine, segmentCss, baseOf, adjustRunsForTextChange,
} from '../src/editor/richText';
import {
  renderRichIntoElement, readRichTextFromDom, offsetForPoint, pointForOffset, setSelectionByOffsets,
  getSelectionOffsets, insertTextAtSelection,
} from '../src/editor/richTextDom';
import type { TextRun } from '../src/types';

let passed = 0, failed = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) passed++;
  else { failed++; console.error(`FAIL: ${name}`, extra !== undefined ? JSON.stringify(extra) : ''); }
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const base = baseOf({ fontWeight: 400, italic: false, underline: false, strikethrough: false, fontSize: 40, color: '#111111' });

// ---- colours ----
check('hex6 passthrough upper', parseColorToHex('#ff00aa') === '#FF00AA');
check('hex3 expands', parseColorToHex('#f0a') === '#FF00AA');
check('rgb() parses', parseColorToHex('rgb(240, 45, 99)') === '#F02D63');
check('rgba() parses', parseColorToHex('rgba(0,0,0,0.5)') === '#000000');
check('named colour unknown', parseColorToHex('red') === undefined);

// ---- stripBase ----
check('stripBase drops values equal to base', eq(stripBase({ fontWeight: 400, italic: true }, base), { italic: true }));
check('stripBase compares colours case-insensitively', eq(stripBase({ color: '#111111' }, base), {}));

// ---- normalizeRuns ----
check('merges adjacent identical runs', eq(normalizeRuns([{ start: 0, end: 3, italic: true }, { start: 3, end: 6, italic: true }], 10),
  [{ start: 0, end: 6, italic: true }]));
check('clips runs to text length', eq(normalizeRuns([{ start: 2, end: 99, italic: true }], 5), [{ start: 2, end: 5, italic: true }]));
check('drops empty / out-of-range runs', eq(normalizeRuns([{ start: 4, end: 4, italic: true }, { start: 50, end: 60, italic: true }], 5), []));
check('later run wins on overlap, per property',
  eq(normalizeRuns([{ start: 0, end: 6, fontWeight: 800, color: '#FF0000' }, { start: 3, end: 8, color: '#00FF00' }], 8),
    [{ start: 0, end: 3, fontWeight: 800, color: '#FF0000' }, { start: 3, end: 6, fontWeight: 800, color: '#00FF00' }, { start: 6, end: 8, color: '#00FF00' }]));
check('normalize with base removes no-op runs', eq(normalizeRuns([{ start: 0, end: 4, fontWeight: 400 }], 10, base), []));
check('empty runs stay empty', eq(normalizeRuns(undefined, 10), []));

// ---- applyStyleToRange ----
{
  // "Hello world": bold just "world" (6..11)
  const r = applyStyleToRange(undefined, 11, 6, 11, { fontWeight: 800 }, base);
  check('bold a word -> single run over that word', eq(r, [{ start: 6, end: 11, fontWeight: 800 }]), r);
  // then bold "lo w" (3..7) -> merges with the existing bold into one run 3..11
  const r2 = applyStyleToRange(r, 11, 3, 7, { fontWeight: 800 }, base);
  check('overlapping bold merges', eq(r2, [{ start: 3, end: 11, fontWeight: 800 }]), r2);
  // un-bold the middle (5..8) splits the run in two
  const r3 = applyStyleToRange(r2, 11, 5, 8, { fontWeight: 400 }, base);
  check('un-bold a middle slice splits the run', eq(r3, [{ start: 3, end: 5, fontWeight: 800 }, { start: 8, end: 11, fontWeight: 800 }]), r3);
  // size + opacity on the same word layer onto bold
  const r4 = applyStyleToRange(r3, 11, 8, 11, { fontSize: 80, opacity: 0.5 }, base);
  check('size and opacity combine with existing bold',
    eq(r4, [{ start: 3, end: 5, fontWeight: 800 }, { start: 8, end: 11, fontWeight: 800, fontSize: 80, opacity: 0.5 }]), r4);
  // reversed selection (end < start) behaves the same
  check('reversed range handled', eq(applyStyleToRange(undefined, 11, 11, 6, { italic: true }, base), [{ start: 6, end: 11, italic: true }]));
}

// ---- getRangeState / computeToggle ----
{
  const runs: TextRun[] = [{ start: 0, end: 5, fontWeight: 800, fontSize: 60 }];
  const s1 = getRangeState(runs, 11, 0, 5, base);
  check('fully bold selection reports bold', s1.bold && s1.hasSelection, s1);
  check('uniform size reported', s1.fontSize === 60, s1);
  const s2 = getRangeState(runs, 11, 3, 8, base);
  check('partly bold selection is NOT bold', !s2.bold, s2);
  check('mixed sizes report null', s2.fontSize === null, s2);
  const s3 = getRangeState(runs, 11, 2, 2, base);
  check('collapsed selection falls back to layer values', !s3.hasSelection && s3.fontSize === 40 && !s3.bold, s3);
  check('toggle bold on when not bold', eq(computeToggle('bold', s2), { fontWeight: 800 }));
  check('toggle bold off when fully bold', eq(computeToggle('bold', s1), { fontWeight: 400 }));
  check('toggle italic', eq(computeToggle('italic', s2), { italic: true }));
  // base that is already bold: a bold-by-default layer reports bold
  const boldBase = baseOf({ fontWeight: 700, italic: false, fontSize: 40, color: '#111' });
  check('bold-by-default layer reports bold', getRangeState(undefined, 5, 0, 3, boldBase).bold);
}

// ---- segments ----
{
  const segs = splitIntoSegments('Hello world', [{ start: 6, end: 11, fontWeight: 800 }]);
  check('splitIntoSegments covers full text', segs.map((s) => s.text).join('') === 'Hello world' && segs.length === 2, segs);
  check('no runs -> one plain segment', eq(splitIntoSegments('abc', undefined), [{ text: 'abc', style: {} }]));
  const lines = groupSegmentsByLine(splitIntoSegments('ab\ncd', [{ start: 1, end: 4, italic: true }]));
  check('groupSegmentsByLine splits at newlines keeping styles',
    eq(lines, [[{ text: 'a', style: {} }, { text: 'b', style: { italic: true } }], [{ text: 'c', style: { italic: true } }, { text: 'd', style: {} }]]), lines);
  check('empty lines preserved', groupSegmentsByLine([{ text: 'a\n\nb', style: {} }]).length === 3);
}

// ---- segmentCss ----
{
  const css = segmentCss({ fontWeight: 800, fontSize: 50, opacity: 0.4, italic: true, color: '#FF0000' }, base, { fontScale: 0.5 });
  check('segmentCss maps every property and scales font size',
    css.fontWeight === 800 && css.fontSize === '25px' && css.opacity === 0.4 && css.fontStyle === 'italic' && css.color === '#FF0000', css);
  check('segmentCss omits unset', eq(segmentCss({}, base), {}));
  const ubase = baseOf({ fontWeight: 400, italic: false, underline: true, fontSize: 40, color: '#111' });
  check('effective underline emitted from base when asked', segmentCss({}, ubase, { emitDecoration: true }).textDecorationLine === 'underline');
  check('run can remove base underline', segmentCss({ underline: false }, ubase).textDecorationLine === 'none');
}

// ---- adjustRunsForTextChange ----
{
  const bold: TextRun[] = [{ start: 6, end: 11, fontWeight: 800 }]; // "world" in "Hello world"
  check('insert before a styled word shifts it',
    eq(adjustRunsForTextChange('Hello world', 'Hello there world', bold), [{ start: 12, end: 17, fontWeight: 800 }]));
  check('deleting the styled word removes the run', eq(adjustRunsForTextChange('Hello world', 'Hello', bold), []));
  check('typing at the end of a bold word extends it',
    eq(adjustRunsForTextChange('ab', 'abc', [{ start: 0, end: 2, fontWeight: 800 }]), [{ start: 0, end: 3, fontWeight: 800 }]));
  check('typing inside a bold word keeps it bold',
    eq(adjustRunsForTextChange('abcd', 'abXcd', [{ start: 0, end: 4, fontWeight: 800 }]), [{ start: 0, end: 5, fontWeight: 800 }]));
  check('edit after the styled part leaves it alone',
    eq(adjustRunsForTextChange('Hello world', 'Hello world!', [{ start: 0, end: 5, italic: true }]), [{ start: 0, end: 5, italic: true }]));
  check('deleting text before a styled word shifts it back',
    eq(adjustRunsForTextChange('Hello world', 'world', bold), [{ start: 0, end: 5, fontWeight: 800 }]));
  check('no runs / same text is a no-op', eq(adjustRunsForTextChange('a', 'b', undefined), []) && eq(adjustRunsForTextChange('a', 'a', bold), bold));
}

// ---- DOM tests (jsdom) ----
async function domTests() {
  let JSDOM: any;
  try {
    // @ts-ignore - optional dev dependency
    JSDOM = (await import('jsdom')).JSDOM;
  } catch {
    console.log('(skipping DOM tests — run `npm i -D jsdom` to enable them)');
    return;
  }
  const dom = new JSDOM('<!doctype html><body><div id="root"></div></body>');
  (globalThis as any).document = dom.window.document;
  (globalThis as any).window = dom.window;
  const root = dom.window.document.getElementById('root') as HTMLElement;

  const roundTrip = (text: string, runs: TextRun[]) => {
    renderRichIntoElement(root, text, runs, base);
    return readRichTextFromDom(root, base);
  };

  let rt = roundTrip('Hello world', [{ start: 6, end: 11, fontWeight: 800, color: '#F02D63' }]);
  check('DOM round-trip keeps text', rt.text === 'Hello world', rt);
  check('DOM round-trip keeps runs', eq(rt.runs, [{ start: 6, end: 11, fontWeight: 800, color: '#F02D63' }]), rt);

  rt = roundTrip('ab\ncd', [{ start: 1, end: 4, italic: true, fontSize: 60, opacity: 0.5 }]);
  check('round-trip across a newline', rt.text === 'ab\ncd' && eq(rt.runs, [{ start: 1, end: 4, italic: true, fontSize: 60, opacity: 0.5 }]), rt);

  rt = roundTrip('abc\n', []);
  check('trailing newline survives render->read exactly (placeholder not double counted)', rt.text === 'abc\n', rt);
  // and stays stable on repeated round trips (the "growing newline" bug)
  rt = roundTrip(rt.text, rt.runs);
  rt = roundTrip(rt.text, rt.runs);
  check('trailing newline is stable across repeated round trips', rt.text === 'abc\n', rt);

  rt = roundTrip('a\n\nb', []);
  check('blank line in the middle preserved', rt.text === 'a\n\nb', rt);

  const ubase = baseOf({ fontWeight: 400, italic: false, underline: true, fontSize: 40, color: '#111111' });
  renderRichIntoElement(root, 'underlined base', [], ubase);
  check('base underline does not become a spurious run', readRichTextFromDom(root, ubase).runs.length === 0);

  // offsets <-> DOM points
  renderRichIntoElement(root, 'ab\ncd', [{ start: 1, end: 4, italic: true }], base);
  for (let o = 0; o <= 5; o++) {
    const p = pointForOffset(root, o);
    const back = offsetForPoint(root, p.node, p.offset);
    check(`offset ${o} survives pointForOffset -> offsetForPoint`, back === o, { o, back });
  }

  // selection set/get
  renderRichIntoElement(root, 'Hello world', [], base);
  setSelectionByOffsets(root, 6, 11);
  const sel = getSelectionOffsets(root);
  check('setSelectionByOffsets / getSelectionOffsets agree', !!sel && sel.start === 6 && sel.end === 11, sel);

  // full "bold the selected word" flow in data space, then DOM reflects it
  {
    const { text, runs } = readRichTextFromDom(root, base);
    const s = getSelectionOffsets(root)!;
    const next = applyStyleToRange(runs, text.length, s.start, s.end, computeToggle('bold', getRangeState(runs, text.length, s.start, s.end, base)), base);
    renderRichIntoElement(root, text, next, base);
    setSelectionByOffsets(root, s.start, s.end);
    const again = readRichTextFromDom(root, base);
    check('bold selected word end-to-end', eq(again.runs, [{ start: 6, end: 11, fontWeight: 800 }]), again);
    const s2 = getSelectionOffsets(root);
    check('selection preserved after formatting', !!s2 && s2.start === 6 && s2.end === 11, s2);
    // toggling again removes it
    const st = getRangeState(again.runs, again.text.length, 6, 11, base);
    check('toolbar state says bold', st.bold);
    const off = applyStyleToRange(again.runs, again.text.length, 6, 11, computeToggle('bold', st), base);
    check('toggling bold again clears the run', off.length === 0, off);
  }

  // typing/inserting at the caret keeps the surrounding style
  renderRichIntoElement(root, 'abcd', [{ start: 0, end: 4, fontWeight: 800 }], base);
  setSelectionByOffsets(root, 2, 2);
  insertTextAtSelection(root, 'X');
  let after = readRichTextFromDom(root, base);
  check('inserted text lands at caret', after.text === 'abXcd', after);
  check('inserted text inherits the span style it landed in', eq(after.runs, [{ start: 0, end: 5, fontWeight: 800 }]), after);

  // Enter at the very end creates a visible new line (placeholder) but counts as one \n
  renderRichIntoElement(root, 'abc', [], base);
  setSelectionByOffsets(root, 3, 3);
  insertTextAtSelection(root, '\n');
  after = readRichTextFromDom(root, base);
  check('Enter at end reads as one trailing newline', after.text === 'abc\n', after);
  const lastBr = root.lastChild as HTMLElement;
  check('a caret placeholder <br> was added', lastBr && lastBr.nodeName === 'BR');

  // replacing a selection with pasted multi-line text
  renderRichIntoElement(root, 'one two three', [], base);
  setSelectionByOffsets(root, 4, 7);
  insertTextAtSelection(root, 'A\nB');
  after = readRichTextFromDom(root, base);
  check('paste replaces selection and keeps line break', after.text === 'one A\nB three', after);
}

domTests().then(() => {
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
});
