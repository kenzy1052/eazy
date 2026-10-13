// Guards the "portable core" the React Native app will share: these files must
// stay free of React and browser globals. Run: npx tsx scripts/check-core-purity.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CORE = [
  'src/types/index.ts',      // the document model
  'src/editor/gestureMath.ts', // move / resize / rotate / zoom / snap / align / distribute / group math
  'src/editor/richText.ts',  // per-character styling model + range math
];

const FORBIDDEN: [RegExp, string][] = [
  [/from\s+['"]react(-dom)?(\/[^'"]*)?['"]/, 'imports React'],
  [/from\s+['"](lucide-react|zustand)[^'"]*['"]/, 'imports a UI/state library'],
  [/\b(document|window|navigator|localStorage|sessionStorage)\s*[.\[]/, 'touches a browser global'],
  [/\b(HTMLElement|HTMLDivElement|Selection|Range|Node)\b(?!\w)(?=\s*[,;)>|=\]}])/, 'references a DOM type'],
];

let bad = 0;
for (const file of CORE) {
  const src = readFileSync(join(process.cwd(), file), 'utf8')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*'))
    .join('\n');
  for (const [re, why] of FORBIDDEN) {
    const m = re.exec(src);
    if (m) { bad++; console.error(`FAIL ${file}: ${why} (… ${m[0]} …)`); }
  }
}
if (bad) process.exit(1);
console.log(`core purity OK — ${CORE.length} portable modules are DOM- and React-free`);
