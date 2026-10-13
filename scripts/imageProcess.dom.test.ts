// Real-image test of the canvas resize in src/utils/imageProcess.ts.
// Needs two optional dev tools:  npm i -D jsdom canvas   (skips cleanly without them)
// Run: npx tsx scripts/imageProcess.dom.test.ts
let passed = 0, failed = 0;
const check = (name: string, cond: boolean, extra?: unknown) => {
  if (cond) passed++; else { failed++; console.error('FAIL:', name, extra !== undefined ? JSON.stringify(extra) : ''); }
};

async function main() {
  let JSDOM: any, nodeCanvas: any;
  try { JSDOM = (await import('jsdom')).JSDOM; nodeCanvas = await import('canvas'); }
  catch { console.log('(skipping — needs: npm i -D jsdom canvas)'); return; }
  const { createCanvas, loadImage } = nodeCanvas;

  const dom = new JSDOM('<!doctype html><body></body>', { resources: 'usable', pretendToBeVisual: true });
  const g: any = globalThis;
  g.window = dom.window; g.document = dom.window.document; g.Image = dom.window.Image;
  const { downscaleDataUrl } = await import('../src/utils/imageProcess');

  // A "photo": noisy so JPEG can't compress it away, like a real camera image.
  const makePhoto = (w: number, h: number, mime: 'image/jpeg' | 'image/png', transparent = false) => {
    const c = createCanvas(w, h); const ctx = c.getContext('2d');
    if (!transparent) { ctx.fillStyle = '#4488cc'; ctx.fillRect(0, 0, w, h); }
    for (let i = 0; i < 6000; i++) {
      ctx.fillStyle = `rgb(${(Math.random() * 255) | 0},${(Math.random() * 255) | 0},${(Math.random() * 255) | 0})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 20 + Math.random() * 120, 20 + Math.random() * 120);
    }
    return mime === 'image/jpeg' ? c.toDataURL('image/jpeg', 0.95) : c.toDataURL('image/png');
  };
  const dims = async (url: string) => { const i = await loadImage(url); return { w: i.width, h: i.height }; };
  const mime = (u: string) => /^data:([^;,]+)/.exec(u)?.[1];

  // 12MP phone photo
  const photo = makePhoto(4000, 3000, 'image/jpeg');
  const out = await downscaleDataUrl(photo);
  const d = await dims(out);
  console.log(`12MP photo: ${(photo.length / 1e6).toFixed(2)}M chars -> ${(out.length / 1e6).toFixed(2)}M chars  (${d.w}x${d.h})`);
  check('12MP photo is resized to 2048 wide', d.w === 2048 && d.h === 1536, d);
  check('and is a lot smaller', out.length < photo.length * 0.6, { before: photo.length, after: out.length });
  check('output is still a JPEG', mime(out) === 'image/jpeg');
  check('a photo now fits many times over in the ~5M-char quota', out.length < 1_500_000, out.length);

  // portrait
  const portrait = await downscaleDataUrl(makePhoto(3000, 4000, 'image/jpeg'));
  const pd = await dims(portrait);
  check('portrait photo shrinks by its long side', pd.w === 1536 && pd.h === 2048, pd);

  // transparent PNG must stay a PNG with its transparency
  const sticker = makePhoto(3000, 3000, 'image/png', true);
  const sOut = await downscaleDataUrl(sticker);
  const sd = await dims(sOut);
  check('oversized PNG shrinks', sd.w === 2048 && sd.h === 2048, sd);
  check('and stays a PNG', mime(sOut) === 'image/png');
  const probe = createCanvas(sd.w, sd.h).getContext('2d');
  probe.drawImage(await loadImage(sOut), 0, 0);
  let hasTransparent = false;
  const px = probe.getImageData(0, 0, sd.w, sd.h).data;
  for (let i = 3; i < px.length; i += 4 * 997) if (px[i] === 0) { hasTransparent = true; break; }
  check('PNG transparency survived the resize', hasTransparent);

  // small images are untouched (byte for byte)
  const small = makePhoto(800, 600, 'image/jpeg');
  check('small image is returned unchanged', (await downscaleDataUrl(small)) === small);

  // right-sized but heavy JPEG gets recompressed without changing dimensions
  const heavy = makePhoto(1800, 1200, 'image/jpeg');
  const hOut = await downscaleDataUrl(heavy);
  if (heavy.length > 600_000) {
    const hd = await dims(hOut);
    check('heavy right-sized JPEG is recompressed smaller at the same size', hOut.length < heavy.length && hd.w === 1800 && hd.h === 1200, { before: heavy.length, after: hOut.length, hd });
  }

  // things that must be left alone / must never throw
  const svg = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="9000" height="9000"/>').toString('base64');
  check('SVG is untouched', (await downscaleDataUrl(svg)) === svg);
  const corrupt = 'data:image/jpeg;base64,AAAA';
  check('corrupt image returns the original instead of throwing', (await downscaleDataUrl(corrupt)) === corrupt);
  check('non-data input returns as-is', (await downscaleDataUrl('not a data url')) === 'not a data url');
}

main().then(() => { console.log(`\n${passed} passed, ${failed} failed`); process.exit(failed ? 1 : 0); })
  .catch((e) => { console.error(e); process.exit(1); });
