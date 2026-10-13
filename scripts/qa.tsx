import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'fs';
import { CANVAS_SIZES, Project } from '../src/types';
import { TEMPLATES } from '../src/utils/templates';
import { StaticDesign } from '../src/render/Render';

const canvas = CANVAS_SIZES[1]; // portrait 1080x1296
fs.mkdirSync('/home/claude/work/qa', { recursive: true });

for (const t of TEMPLATES) {
  const d = t.build(canvas);
  const p: Project = {
    id: 'x', name: t.name, templateId: t.id, canvas, background: d.background, elements: d.elements,
    profileMode: 'handle-only', handle: '@kenzie.rest', avatar: null, createdAt: 0, updatedAt: 0,
  };
  // hide avatars the way handle-only mode does
  p.elements = p.elements.map((e) => (e.role === 'profile-picture' ? { ...e, hidden: true } : e.role === 'handle' ? { ...e, text: '@kenzie.rest' } : e));
  const html = renderToStaticMarkup(<StaticDesign project={p} />);
  fs.writeFileSync(`/home/claude/work/qa/${t.id}.html`, `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Archivo+Black&family=Oswald:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Lora:ital,wght@0,400;0,600;0,700&family=Montserrat:wght@400;600;700;800&family=Playfair+Display:ital,wght@0,400;0,500;0,700;0,900;1,400;1,500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&family=Caveat:wght@600;700&family=Dancing+Script:wght@600;700&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
<style>body{margin:0}</style></head><body>${html}</body></html>`);
}
console.log('ok');
