// Integration test: mounts the shortcuts hook in jsdom, fires real keydown
// events, and checks what the store does. Needs jsdom (npm i -D jsdom);
// skips with a note otherwise.   Run: npx tsx scripts/shortcuts.test.tsx
let passed = 0, failed = 0;
const check = (name: string, cond: boolean, extra?: unknown) => {
  if (cond) passed++; else { failed++; console.error('FAIL:', name, extra !== undefined ? JSON.stringify(extra) : ''); }
};

async function main() {
  let JSDOM: any;
  try { JSDOM = (await import('jsdom')).JSDOM; } catch { console.log('(skipping — run `npm i -D jsdom` to enable)'); return; }
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { url: 'http://localhost/', pretendToBeVisual: true });
  const g: any = globalThis;
  g.window = dom.window; g.document = dom.window.document; g.localStorage = dom.window.localStorage;
  g.KeyboardEvent = dom.window.KeyboardEvent; g.HTMLElement = dom.window.HTMLElement;
  g.IS_REACT_ACT_ENVIRONMENT = true;

  const React = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { act } = await import('react');
  const { useStore } = await import('../src/store/useStore');
  const { useEditorShortcuts } = await import('../src/editor/useEditorShortcuts');
  const { shape } = await import('../src/utils/factory');

  function Harness({ enabled }: { enabled: boolean }) { useEditorShortcuts(enabled); return null; }
  const root = createRoot(document.getElementById('app')!);
  const mount = async (enabled: boolean) => { await act(async () => { root.render(React.createElement(Harness, { enabled })); }); };

  const mk = (x: number, w: number) => shape({ x, y: 50, width: w, height: 20 });
  const els = [mk(0, 10), mk(15, 20), mk(100, 10)];
  const st = () => useStore.getState();
  const reset = () => {
    useStore.setState({ projects: [], currentId: null, selectedId: null, selectedIds: [], past: [], future: [], toast: null });
    st().create({ templateId: 't', canvas: { id: 'c', name: 'c', width: 1080, height: 1080 } as any, background: { type: 'solid', color: '#fff' } as any, elements: els.map((e) => ({ ...e })), name: 'test' });
  };
  const elements = () => st().current()!.elements;
  const press = async (key: string, opts: Record<string, unknown> = {}) => {
    await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts })); });
  };

  await mount(true);

  // --- delete + toast + undo ---
  reset();
  const [a, b, c] = elements().map((e) => e.id);
  st().select(a);
  await press('Delete');
  check('Delete removes the selected layer', elements().length === 2 && !elements().some((e) => e.id === a));
  check('delete shows an undoable toast', !!st().toast && st().toast!.undoable && /deleted/i.test(st().toast!.message), st().toast);
  st().undo();
  check('Undo (what the toast button calls) brings the layer back', elements().length === 3);

  // --- ctrl+z / ctrl+shift+z ---
  reset();
  st().select(elements()[0].id);
  await press('Delete');
  await press('z', { ctrlKey: true });
  check('Ctrl+Z undoes', elements().length === 3);
  await press('z', { ctrlKey: true, shiftKey: true });
  check('Ctrl+Shift+Z redoes', elements().length === 2);

  // --- select all, multi delete ---
  reset();
  await press('a', { ctrlKey: true });
  check('Ctrl+A selects every layer', st().selectedIds.length === 3);
  await press('Delete');
  check('Delete removes the whole multi-selection', elements().length === 0);
  check('multi-delete toast says how many', /3 layers deleted/.test(st().toast?.message ?? ''), st().toast);

  // --- locked layers are protected ---
  reset();
  st().update(elements()[0].id, { locked: true } as any);
  st().select(elements()[0].id);
  await press('Delete');
  check('Delete ignores locked layers', elements().length === 3);
  await press('ArrowRight');
  check('arrow keys ignore locked layers', elements()[0].x === 0);

  // --- nudge, and bursts coalesce into one undo step ---
  reset();
  const id0 = elements()[0].id;
  st().select(id0);
  const pastBefore = st().past.length;
  await press('ArrowRight'); await press('ArrowRight'); await press('ArrowRight', { shiftKey: true });
  check('arrows nudge 1px, Shift+arrow 10px', elements().find((e) => e.id === id0)!.x === 12, elements()[0].x);
  check('a burst of nudges is ONE undo step', st().past.length === pastBefore + 1, { before: pastBefore, after: st().past.length });
  await press('ArrowDown');
  check('ArrowDown nudges y', elements().find((e) => e.id === id0)!.y === 51);

  // --- duplicate / group / ungroup ---
  reset();
  st().select(elements()[0].id);
  await press('d', { ctrlKey: true });
  check('Ctrl+D duplicates', elements().length === 4);
  reset();
  st().selectMany(elements().slice(0, 2).map((e) => e.id));
  await press('g', { ctrlKey: true });
  const gid = elements()[0].groupId;
  check('Ctrl+G groups the multi-selection', !!gid && elements()[1].groupId === gid && !elements()[2].groupId);
  check('grouping shows feedback', /Grouped 2/.test(st().toast?.message ?? ''));
  await press('g', { ctrlKey: true, shiftKey: true });
  check('Ctrl+Shift+G ungroups', !elements()[0].groupId);

  // --- escape ---
  st().select(elements()[0].id);
  await press('Escape');
  check('Escape deselects', st().selectedIds.length === 0 && st().selectedId === null);

  // --- copy / paste ---
  reset();
  st().select(elements()[0].id);
  await press('c', { ctrlKey: true });
  await press('v', { ctrlKey: true });
  check('Ctrl+C then Ctrl+V pastes a copy', elements().length === 4);

  // --- stays out of the way ---
  reset();
  st().select(elements()[0].id);
  const input = document.createElement('input'); document.body.appendChild(input);
  await act(async () => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true })); });
  check('shortcuts ignore keys typed into inputs', elements().length === 3);
  await mount(false);
  await press('Delete');
  check('shortcuts are inert when disabled (sheet/modal/text editing open)', elements().length === 3);
  await mount(true);

  // --- distribute through the store ---
  reset();
  st().distributeSelection(elements().map((e) => e.id), 'h');
  const xs = elements().map((e) => e.x).sort((p, q) => p - q);
  // widths 10,20,10 over span 0..110 -> gaps (110-40)/2 = 35: x = 0, 45, 100
  check('distributeSelection equalises horizontal gaps', xs[0] === 0 && xs[1] === 45 && xs[2] === 100, xs);
  st().undo();
  check('distribute is a single undo step', elements().map((e) => e.x).sort((p, q) => p - q)[1] === 15);
  reset();
  st().distributeSelection(elements().slice(0, 2).map((e) => e.id), 'h');
  check('distribute does nothing with fewer than 3 layers', elements()[1].x === 15);

  // --- hidden layers aren't selected by select-all ---
  reset();
  st().update(elements()[1].id, { hidden: true } as any);
  await press('a', { ctrlKey: true });
  check('Select all skips hidden layers', st().selectedIds.length === 2);

  await act(async () => { root.unmount(); });
}

main().then(() => {
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}).catch((e) => { console.error(e); process.exit(1); });
