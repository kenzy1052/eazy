// Run with: npx tsx scripts/storage.test.ts   (no browser needed)
import { mimeOf, outputTypeFor, fitWithin, planImageProcessing, MAX_IMAGE_SIDE, REENCODE_ABOVE_CHARS } from '../src/utils/imageProcess';
import { createDebouncedStorage, isQuotaError, NEARLY_FULL_CHARS, type StorageLike } from '../src/utils/debouncedStorage';

let passed = 0, failed = 0;
const check = (name: string, cond: boolean, extra?: unknown) => {
  if (cond) passed++; else { failed++; console.error('FAIL:', name, extra !== undefined ? JSON.stringify(extra) : ''); }
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---- image planning ----
check('mimeOf reads the data URL header', mimeOf('data:image/jpeg;base64,AAAA') === 'image/jpeg');
check('mimeOf handles non-data input', mimeOf('https://x/y.png') === null);
check('jpeg/png/webp are re-encodable', outputTypeFor('image/jpeg') === 'image/jpeg' && outputTypeFor('image/png') === 'image/png' && outputTypeFor('image/webp') === 'image/webp');
check('svg and gif are left alone', outputTypeFor('image/svg+xml') === null && outputTypeFor('image/gif') === null);
check('unknown/heic left alone', outputTypeFor('image/heic') === null && outputTypeFor(null) === null);

{
  const f = fitWithin(4000, 3000, 2048);
  check('4000x3000 shrinks to 2048x1536 keeping ratio', f.scaled && f.width === 2048 && f.height === 1536, f);
  const p = fitWithin(3000, 4000, 2048);
  check('portrait photo shrinks by its long side', p.width === 1536 && p.height === 2048, p);
  check('small image is not scaled', !fitWithin(800, 600, 2048).scaled);
  check('exactly at the limit is not scaled', !fitWithin(2048, 1000, 2048).scaled);
  check('never produces a zero dimension', fitWithin(100000, 1, 2048).height >= 1);
}
{
  // A 12MP phone photo as base64 is ~5M chars — the thing that blew the quota.
  const photo = planImageProcessing(5_000_000, 'image/jpeg', 4000, 3000);
  check('a 12MP photo gets resized', photo.action === 'reencode' && photo.width === 2048 && photo.height === 1536 && photo.type === 'image/jpeg', photo);
  check('a small photo is left alone', planImageProcessing(120_000, 'image/jpeg', 1200, 800).action === 'keep');
  check('right-sized but heavy JPEG gets recompressed', planImageProcessing(REENCODE_ABOVE_CHARS + 1, 'image/jpeg', 1800, 1200).action === 'reencode');
  check('right-sized PNG is kept (re-encoding would not help)', planImageProcessing(2_000_000, 'image/png', 1500, 1500).action === 'keep');
  const png = planImageProcessing(3_000_000, 'image/png', 5000, 5000);
  check('oversized PNG shrinks but stays PNG (keeps transparency)', png.action === 'reencode' && png.type === 'image/png', png);
  check('svg is never touched even if huge', planImageProcessing(9_000_000, 'image/svg+xml', 9000, 9000).action === 'keep');
  check('MAX_IMAGE_SIDE still fills a 1080x1920 story at 1:1', MAX_IMAGE_SIDE >= 1920);
}

// ---- storage writer ----
function fakeStorage(limitChars = Infinity) {
  const data = new Map<string, string>();
  const writes: string[] = [];
  const s: StorageLike & { data: Map<string, string>; writes: string[] } = {
    data, writes,
    getItem: (k) => data.get(k) ?? null,
    removeItem: (k) => { data.delete(k); },
    setItem: (k, v) => {
      let total = v.length; data.forEach((val, key) => { if (key !== k) total += val.length; });
      if (total > limitChars) { const e: any = new Error('The quota has been exceeded.'); e.name = 'QuotaExceededError'; e.code = 22; throw e; }
      data.set(k, v); writes.push(v);
    },
  };
  return s;
}

{
  const st = fakeStorage();
  const w = createDebouncedStorage(() => st, {}, 5);
  w.setItem('k', 'a'); w.setItem('k', 'b'); w.setItem('k', 'c');
  check('pending value is readable before it is flushed', w.getItem('k') === 'c');
  check('nothing written yet during the debounce window', st.writes.length === 0);
  w.flush();
  check('rapid writes collapse into one, the latest', st.writes.length === 1 && st.writes[0] === 'c', st.writes);
  check('flushed value is in storage', st.getItem('k') === 'c');
  w.setItem('k', 'x'); w.removeItem('k');
  check('removeItem drops a pending write', st.getItem('k') === null);
}
{
  let full = 0, t = 1000;
  const st = fakeStorage(10);
  const w = createDebouncedStorage(() => st, { onFull: () => full++ }, 5, () => t);
  w.setItem('k', 'x'.repeat(50)); w.flush();
  check('quota error does not throw', true);
  check('quota error notifies the app', full === 1, full);
  check('failed write did not store anything', st.getItem('k') === null);
  w.setItem('k', 'y'.repeat(50)); w.flush();
  check('repeated failures within 10s do not spam', full === 1, full);
  t += 11_000;
  w.setItem('k', 'z'.repeat(50)); w.flush();
  check('notifies again after the cool-down', full === 2, full);
}
{
  let full = 0;
  const bad: StorageLike = { getItem: () => null, removeItem: () => {}, setItem: () => { throw new Error('disk on fire'); } };
  const w = createDebouncedStorage(() => bad, { onFull: () => full++ }, 5);
  w.setItem('k', 'v'); w.flush();
  check('non-quota errors are not reported as "storage full"', full === 0);
  check('isQuotaError recognises Firefox/Safari variants', isQuotaError({ name: 'NS_ERROR_DOM_QUOTA_REACHED' }) && isQuotaError({ code: 22 }) && isQuotaError({ message: 'Quota exceeded' }) && !isQuotaError(new Error('nope')));
}
{
  let near = 0;
  const st = fakeStorage();
  const w = createDebouncedStorage(() => st, { onNearlyFull: () => near++ }, 5);
  w.setItem('k', 'a'.repeat(NEARLY_FULL_CHARS + 1)); w.flush();
  w.setItem('k', 'a'.repeat(NEARLY_FULL_CHARS + 2)); w.flush();
  check('"almost full" warns once per session', near === 1, near);
  const small = createDebouncedStorage(() => fakeStorage(), { onNearlyFull: () => near++ }, 5);
  small.setItem('k', 'tiny'); small.flush();
  check('no warning for normal-sized data', near === 1);
}

// ---- end to end: the REAL store against a too-small storage ----
async function e2e() {
  const g: any = globalThis;
  const tiny = fakeStorage(2000);
  g.localStorage = tiny;
  const { useStore } = await import('../src/store/useStore');
  const { text } = await import('../src/utils/factory');

  const bigText = text('body', { text: 'x'.repeat(5000) });
  useStore.getState().create({
    templateId: 't', canvas: { id: 'c', name: 'c', width: 1080, height: 1080 } as any,
    background: { type: 'solid', color: '#fff' } as any, elements: [bigText], name: 'big',
  });
  await sleep(600); // debounce is 400ms
  const msg = useStore.getState().toast?.message ?? '';
  check('REAL STORE: a rejected save now shows a "Storage is full" message', /storage is full/i.test(msg), msg);
  check('REAL STORE: the rejected save did not silently pretend to succeed', tiny.writes.length === 0);

  // and a normal-sized save is quiet and actually lands
  useStore.setState({ toast: null });
  g.localStorage = fakeStorage(10_000_000);
  useStore.getState().create({
    templateId: 't', canvas: { id: 'c', name: 'c', width: 1080, height: 1080 } as any,
    background: { type: 'solid', color: '#fff' } as any, elements: [text('body', { text: 'hello' })], name: 'small',
  });
  await sleep(600);
  check('REAL STORE: a normal save shows no warning', useStore.getState().toast === null, useStore.getState().toast);
  check('REAL STORE: and is persisted', (g.localStorage as any).writes.length >= 1);
}

e2e().then(() => {
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  process.exit(0);
}).catch((e) => { console.error(e); process.exit(1); });
