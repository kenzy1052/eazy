import { v4 as uuid } from 'uuid';
import { Background, CanvasSize, DesignElement, Project, solidBg, defaultAdjust } from '../types';
import { decor, image, shape, stack, text } from './factory';
import { B, F, X, Y } from './templatesA';

export interface SimplePostInput {
  title: string;
  body: string;
  category?: string;
  handle: string;
  avatar?: string | null;
  includeAvatar?: boolean;
  // Background photo & overlay options
  backgroundImage?: string | null;
  overlayColor?: string; // '#000000' or '#FFFFFF' or custom
  overlayOpacity?: number; // 0.0 to 1.0 (default ~0.55)
  textColor?: string; // custom or smart contrast
}

export type DesignCategoryTag = 'all' | 'minimal' | 'dark' | 'social' | 'bold' | 'pastel' | 'vibrant';

export interface GeneratedDesign {
  id: string;
  name: string;
  styleTag: string;
  categoryTag: DesignCategoryTag;
  project: Project;
}

/**
 * Proportional font and box calculations with generous vertical height
 * and balanced 11% side margins (never stretching edge-to-edge).
 */
function calcTypo(c: CanvasSize, titleLen: number, bodyLen: number) {
  // Title font sizing
  let titleF = 50;
  let titleH = 14;
  if (titleLen <= 24) {
    titleF = 56;
    titleH = 13;
  } else if (titleLen <= 55) {
    titleF = 46;
    titleH = 16;
  } else {
    titleF = 38;
    titleH = 19;
  }

  // Body font sizing: generous container height prevents premature autoFit shrinking.
  // 14 words or 50 words both get comfortable, well-balanced sizing.
  let bodyF = 34;
  let bodyH = 46;
  if (bodyLen <= 90) {
    bodyF = 38;
    bodyH = 42;
  } else if (bodyLen <= 220) {
    bodyF = 33;
    bodyH = 46;
  } else {
    bodyF = 29;
    bodyH = 50;
  }

  return {
    titleSize: F(c, titleF),
    titleHeight: Y(c, titleH),
    bodySize: F(c, bodyF),
    bodyHeight: Y(c, bodyH),
  };
}

function makeProject(
  id: string,
  name: string,
  c: CanvasSize,
  bg: Background,
  elements: DesignElement[],
  input: SimplePostInput
): Project {
  return {
    id: `simple-${id}-${uuid().slice(0, 8)}`,
    name: `${name} - ${input.title.slice(0, 24).trim() || 'Post'}`,
    templateId: `simple-${id}`,
    canvas: c,
    background: bg,
    elements: stack(elements),
    profileMode: input.includeAvatar !== false && input.avatar ? 'picture-and-handle' : 'handle-only',
    handle: input.handle || '@yourhandle',
    avatar: input.avatar || null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function footerIdentity(
  c: CanvasSize,
  x: number,
  y: number,
  input: SimplePostInput,
  color: string = '#12131A',
  subColor: string = '#6B7280'
): DesignElement[] {
  const avSize = F(c, 56);
  const px = X(c, x);
  const py = Y(c, y);
  const hasAv = input.includeAvatar !== false && Boolean(input.avatar);
  const els: DesignElement[] = [];

  if (hasAv) {
    els.push(
      image('profile-picture', {
        x: px,
        y: py,
        width: avSize,
        height: avSize,
        circle: true,
        src: input.avatar || null,
        name: 'Avatar',
      })
    );
  }

  const hX = hasAv ? px + avSize + F(c, 14) : px;
  els.push(
    text('handle', {
      x: hX,
      y: hasAv ? py + F(c, 12) : py,
      width: X(c, 60),
      height: F(c, 32),
      text: input.handle || '@yourhandle',
      fontFamily: 'Plus Jakarta Sans',
      fontSize: F(c, 24),
      fontWeight: 600,
      color,
      vAlign: 'middle',
      align: 'left',
      name: 'Handle',
    })
  );

  return els;
}

// =============================================================================
// 24 DISTINCT DESIGN GENERATORS (WITH IMAGE OVERLAY + REGULAR BODY FONT)
// =============================================================================

export function generateAllDesigns(input: SimplePostInput, canvas: CanvasSize): GeneratedDesign[] {
  const c = canvas;
  const title = input.title.trim() || 'Make a post people stop for.';
  const body = input.body.trim() || 'Create content with clarity and focus. The best ideas are simple, memorable, and visually compelling.';
  const category = (input.category || 'INSIGHT').toUpperCase();
  const typo = calcTypo(c, title.length, body.length);

  // Background Image & Overlay logic
  const hasBgImg = Boolean(input.backgroundImage);
  const overlayCol = input.overlayColor || '#000000';
  const overlayOp = input.overlayOpacity !== undefined ? input.overlayOpacity : 0.55;
  const isLightOverlay = overlayCol.toUpperCase() === '#FFFFFF';

  // Smart text colors ensuring 100% legibility
  const defaultTextCol = input.textColor
    ? input.textColor
    : hasBgImg
    ? isLightOverlay
      ? '#111827'
      : '#FFFFFF'
    : null;

  const defaultSubTextCol = input.textColor
    ? input.textColor
    : hasBgImg
    ? isLightOverlay
      ? '#374151'
      : '#F3F4F6'
    : null;

  function buildBg(fallbackSolid: string): Background {
    if (hasBgImg && input.backgroundImage) {
      return {
        kind: 'image',
        color: isLightOverlay ? '#FFFFFF' : '#000000',
        image: { src: input.backgroundImage, zoom: 1, offsetX: 0, offsetY: 0 },
        adjust: {
          ...defaultAdjust(),
          overlayColor: overlayCol,
          overlayOpacity: overlayOp,
        },
      };
    }
    return solidBg(fallbackSolid);
  }

  // Standard safe margins: 11% left, 78% width (11% right margin)
  const MX = 11;
  const CW = 78;

  const list: GeneratedDesign[] = [];

  const sportsBg: Background = hasBgImg && input.backgroundImage
    ? buildBg('#05070D')
    : {
        kind: 'image',
        color: '#05070D',
        image: {
          src: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1200&auto=format&fit=crop&q=80',
          zoom: 1,
          offsetX: 0,
          offsetY: 0,
        },
        adjust: {
          ...defaultAdjust(),
          overlayColor: '#000000',
          overlayOpacity: 0.15,
        },
      };

  // 1. Stadium 433 Quote (Ballon d'Or Reference)
  list.push({
    id: 'sports-quote',
    name: 'Stadium 433 Quote',
    styleTag: 'Sports Quote',
    categoryTag: 'bold',
    project: makeProject('sports-quote', 'Stadium 433 Quote', c, sportsBg, [
      decor('gradient-scrim', {
        ...B(c, 0, 32, 100, 68),
        color: '#000000',
        color2: '#000000',
        name: 'Bottom Dark Gradient',
      }),
      // Top-left handle replacing the "433" logo
      text('handle', {
        ...B(c, 6, 4.5, 42, 5),
        text: input.handle || '@yourhandle',
        fontFamily: 'Montserrat',
        fontSize: F(c, 34),
        fontWeight: 900,
        color: '#FFFFFF',
        letterSpacing: 1.5,
        uppercase: true,
        name: 'Corner Handle',
        shadow: { enabled: true, color: '#000000', opacity: 0.6, blur: 8, offsetX: 0, offsetY: 2 },
      }),
      // Centered modern double quote icon
      decor('quote-slab', {
        ...B(c, 47, 51, 6, 3.8),
        color: '#FFFFFF',
        name: 'Quote mark',
        shadow: { enabled: true, color: '#000000', opacity: 0.5, blur: 8, offsetX: 0, offsetY: 2 },
      }),
      // Uppercase bold headline
      text('headline', {
        ...B(c, 6, 56, 88, typo.titleHeight),
        text: title.toUpperCase(),
        fontFamily: 'Montserrat',
        fontSize: Math.min(F(c, 48), typo.titleSize),
        fontWeight: 900,
        align: 'center',
        color: '#FFFFFF',
        lineHeight: 1.15,
        uppercase: true,
        name: 'Main Title',
        shadow: { enabled: true, color: '#000000', opacity: 0.7, blur: 12, offsetX: 0, offsetY: 3 },
      }),
      // Body quote
      text('body', {
        ...B(c, 8, 58 + Math.round((typo.titleHeight / c.height) * 100), 84, typo.bodyHeight),
        text: body.startsWith('“') || body.startsWith('"') ? body : `“${body}”`,
        fontFamily: 'Plus Jakarta Sans',
        fontSize: Math.min(F(c, 27), typo.bodySize),
        fontWeight: 400,
        align: 'center',
        lineHeight: 1.45,
        color: '#E5E7EB',
        name: 'Quote Body',
        shadow: { enabled: true, color: '#000000', opacity: 0.6, blur: 10, offsetX: 0, offsetY: 2 },
      }),
      // Person who made that quote in yellow pill at bottom center
      shape({
        ...B(c, 33, 88, 34, 4.6),
        shape: 'pill',
        fill: '#FACC15',
        radius: 999,
        name: 'Author Pill Background',
        shadow: { enabled: true, color: '#000000', opacity: 0.4, blur: 10, offsetX: 0, offsetY: 3 },
      }),
      text('cta', {
        ...B(c, 33, 88, 34, 4.6),
        text: (input.category || 'LAMINE YAMAL').toUpperCase(),
        fontFamily: 'Montserrat',
        fontSize: F(c, 21),
        fontWeight: 900,
        align: 'center',
        vAlign: 'middle',
        color: '#000000',
        uppercase: true,
        letterSpacing: 2,
        name: 'Author Name',
      }),
    ], input),
  });

  // 1. Swiss Minimalist (Monochrome)
  list.push({
    id: 'swiss-mono',
    name: 'Swiss Minimalist',
    styleTag: 'High Contrast',
    categoryTag: 'minimal',
    project: makeProject('swiss-mono', 'Swiss Minimalist', c, buildBg('#0D0E12'), [
      shape({ ...B(c, MX, 9, 18, 3.8), fill: isLightOverlay ? '#111827' : '#FFFFFF', radius: F(c, 4), name: 'Tag badge' }),
      text('kicker', {
        ...B(c, MX, 9, 18, 3.8), text: category, fontFamily: 'Space Grotesk', fontSize: F(c, 16),
        fontWeight: 700, color: isLightOverlay ? '#FFFFFF' : '#0D0E12', align: 'center', vAlign: 'middle', uppercase: true,
      }),
      text('headline', {
        ...B(c, MX, 17, CW, typo.titleHeight), text: title, fontFamily: 'Space Grotesk',
        fontSize: typo.titleSize, fontWeight: 700, color: defaultTextCol || '#FFFFFF', lineHeight: 1.18, align: 'left',
      }),
      shape({ ...B(c, MX, 19 + Math.round((typo.titleHeight / c.height) * 100), CW, 0.3), fill: isLightOverlay ? '#CBD5E1' : '#374151', name: 'Divider' }),
      text('body', {
        ...B(c, MX, 23 + Math.round((typo.titleHeight / c.height) * 100), CW, typo.bodyHeight), text: body,
        fontFamily: 'Inter', fontSize: typo.bodySize, fontWeight: 400, color: defaultSubTextCol || '#E5E7EB', lineHeight: 1.58, align: 'left',
      }),
      ...footerIdentity(c, MX, 85, input, defaultTextCol || '#FFFFFF', isLightOverlay ? '#4B5563' : '#9CA3AF'),
    ], input),
  });

  // 2. Editorial Serif (Warm Classic)
  list.push({
    id: 'editorial-serif',
    name: 'Editorial Serif',
    styleTag: 'Warm Classic',
    categoryTag: 'minimal',
    project: makeProject('editorial-serif', 'Editorial Serif', c, buildBg('#FAF7F2'), [
      text('kicker', {
        ...B(c, MX, 10, CW, 3.5), text: `// ${category}`, fontFamily: 'Plus Jakarta Sans',
        fontSize: F(c, 18), fontWeight: 700, color: isLightOverlay ? '#6B7280' : hasBgImg ? '#D1D5DB' : '#8C827A', align: 'left', letterSpacing: 2,
      }),
      text('headline', {
        ...B(c, MX, 16, CW, typo.titleHeight), text: `“${title}”`, fontFamily: 'Playfair Display',
        fontSize: Math.round(typo.titleSize * 1.05), fontWeight: 700, italic: true, color: defaultTextCol || '#1F1A17',
        align: 'left', lineHeight: 1.2,
      }),
      shape({ ...B(c, MX, 19 + Math.round((typo.titleHeight / c.height) * 100), 18, 0.4), fill: hasBgImg ? '#E2E8F0' : '#D9D0C7', name: 'Rule' }),
      text('body', {
        ...B(c, MX, 23 + Math.round((typo.titleHeight / c.height) * 100), CW, typo.bodyHeight), text: body,
        fontFamily: 'Lora', fontSize: typo.bodySize, fontWeight: 400, color: defaultSubTextCol || '#37302A',
        align: 'left', lineHeight: 1.62,
      }),
      ...footerIdentity(c, MX, 85, input, defaultTextCol || '#1F1A17', isLightOverlay ? '#4B5563' : '#9CA3AF'),
    ], input),
  });

  // 3. Social Tweet Card (Viral Post)
  list.push({
    id: 'social-tweet',
    name: 'Modern Tweet Card',
    styleTag: 'Social Feed',
    categoryTag: 'social',
    project: makeProject('social-tweet', 'Modern Tweet Card', c, buildBg('#0B0F17'), [
      shape({
        ...B(c, 8, 10, 84, 80),
        fill: hasBgImg ? (isLightOverlay ? '#FFFFFF' : '#0F172A') : '#141C2B',
        fillOpacity: hasBgImg ? 0.92 : 1,
        radius: F(c, 28), name: 'Tweet Card',
        strokeColor: hasBgImg ? (isLightOverlay ? '#E2E8F0' : '#334155') : '#243248', strokeWidth: 1.5,
      }),
      // Perfectly circular avatar with clean border
      image('profile-picture', {
        x: X(c, 13), y: Y(c, 14.2), width: F(c, 58), height: F(c, 58),
        circle: true,
        ring: { width: 1.5, color: isLightOverlay && hasBgImg ? '#CBD5E1' : '#334155' },
        src: input.avatar || null,
        name: 'Card Avatar',
      }),
      text('headline', {
        x: X(c, 13) + F(c, 68), y: Y(c, 14.4), width: X(c, 44), height: F(c, 28),
        text: input.handle ? input.handle.replace('@', '') : 'Creator',
        fontFamily: 'Plus Jakarta Sans', fontSize: F(c, 24), fontWeight: 700,
        color: isLightOverlay && hasBgImg ? '#0F172A' : '#F8FAFC', align: 'left',
      }),
      text('handle', {
        x: X(c, 13) + F(c, 68), y: Y(c, 14.4) + F(c, 28), width: X(c, 44), height: F(c, 24),
        text: input.handle || '@yourhandle',
        fontFamily: 'Plus Jakarta Sans', fontSize: F(c, 19), fontWeight: 400,
        color: isLightOverlay && hasBgImg ? '#64748B' : '#94A3B8', align: 'left',
      }),
      shape({ ...B(c, 74, 15.5, 14, 3.5), fill: '#1D9BF0', radius: F(c, 999), name: 'Follow pill' }),
      text('caption', {
        ...B(c, 74, 15.5, 14, 3.5), text: 'Follow', fontFamily: 'Plus Jakarta Sans', fontSize: F(c, 15),
        fontWeight: 700, color: '#FFFFFF', align: 'center', vAlign: 'middle',
      }),
      text('headline', {
        ...B(c, 13, 25.5, 74, typo.titleHeight), text: title, fontFamily: 'Plus Jakarta Sans',
        fontSize: Math.round(typo.titleSize * 0.9), fontWeight: 700,
        color: isLightOverlay && hasBgImg ? '#0F172A' : '#FFFFFF', lineHeight: 1.25, align: 'left',
      }),
      text('body', {
        ...B(c, 13, 29 + Math.round((typo.titleHeight / c.height) * 100), 74, typo.bodyHeight), text: body,
        fontFamily: 'Plus Jakarta Sans', fontSize: typo.bodySize, fontWeight: 400,
        color: isLightOverlay && hasBgImg ? '#334155' : '#E2E8F0', lineHeight: 1.58, align: 'left',
      }),
      shape({ ...B(c, 13, 77.5, 74, 0.2), fill: isLightOverlay && hasBgImg ? '#E2E8F0' : '#243248', name: 'Tweet rule' }),
      // Authentic Twitter/X vector action row with reply, retweet, heart, bookmark, share (No emojis!)
      decor('tweet-actions', {
        ...B(c, 13, 80, 74, 3.8),
        color: isLightOverlay && hasBgImg ? '#64748B' : '#94A3B8',
        name: 'Tweet Action Metrics',
      }),
    ], input),
  });

  // 4. Sunset Dusk Glow (Seamless Modern Dusk Palette)
  list.push({
    id: 'sunset-glow',
    name: 'Sunset Glow',
    styleTag: 'Dusk Ambient',
    categoryTag: 'vibrant',
    project: makeProject('sunset-glow', 'Sunset Glow', c, buildBg('#1E0B2B'), [
      shape({
        ...B(c, 7, 7, 86, 86),
        fill: '#FFFFFF',
        fillOpacity: 0.08,
        radius: F(c, 28),
        strokeColor: 'rgba(255,255,255,0.18)',
        strokeWidth: 1.5,
        name: 'Frosted Dusk Card',
      }),
      shape({ ...B(c, MX, 12, 22, 3.8), fill: '#F97316', radius: 999, name: 'Warm Sunset pill' }),
      text('kicker', {
        ...B(c, MX, 12, 22, 3.8), text: `✦ ${category}`, fontFamily: 'Plus Jakarta Sans',
        fontSize: F(c, 16), fontWeight: 700, color: '#FFFFFF', align: 'center', vAlign: 'middle',
      }),
      text('headline', {
        ...B(c, MX, 19, CW, typo.titleHeight), text: title, fontFamily: 'Poppins',
        fontSize: typo.titleSize, fontWeight: 700, color: defaultTextCol || '#FFF1F2', lineHeight: 1.18, align: 'left',
      }),
      text('body', {
        ...B(c, MX, 23 + Math.round((typo.titleHeight / c.height) * 100), CW, typo.bodyHeight), text: body,
        fontFamily: 'Plus Jakarta Sans', fontSize: typo.bodySize, fontWeight: 400, color: defaultSubTextCol || '#FED7AA', lineHeight: 1.58, align: 'left',
      }),
      ...footerIdentity(c, MX, 83, input, defaultTextCol || '#FFF1F2', '#FB923C'),
    ], input),
  });

  // 5. Apple Notes App / Memo Pad (NO DATE)
  list.push({
    id: 'apple-notes',
    name: 'Apple Notes Memo',
    styleTag: 'Notepad',
    categoryTag: 'minimal',
    project: makeProject('apple-notes', 'Apple Notes Memo', c, buildBg('#FEFDF8'), [
      shape({
        ...B(c, 7, 7, 86, 86),
        fill: hasBgImg ? (isLightOverlay ? '#FFFFFF' : '#1C1917') : '#FFFFFF',
        fillOpacity: hasBgImg ? 0.92 : 1,
        radius: F(c, 24),
        strokeColor: hasBgImg ? (isLightOverlay ? '#E7E5E4' : '#44403C') : '#EFECE6', strokeWidth: 1,
      }),
      text('caption', {
        ...B(c, 12, 11, 40, 3), text: '‹ Notes', fontFamily: 'Plus Jakarta Sans',
        fontSize: F(c, 22), fontWeight: 600, color: '#D97706', align: 'left',
      }),
      text('caption', {
        ...B(c, 52, 11, 37, 3), text: category, fontFamily: 'Plus Jakarta Sans',
        fontSize: F(c, 16), fontWeight: 600, color: '#A8A29E', align: 'right', uppercase: true,
      }),
      shape({ ...B(c, 12, 15.5, 76, 0.3), fill: '#F5EBE0', name: 'Note rule' }),
      text('headline', {
        ...B(c, 12, 19, 76, typo.titleHeight), text: title, fontFamily: 'Plus Jakarta Sans',
        fontSize: typo.titleSize, fontWeight: 700,
        color: isLightOverlay || !hasBgImg ? '#1C1917' : '#F5F5F4', lineHeight: 1.2, align: 'left',
      }),
      text('body', {
        ...B(c, 12, 23 + Math.round((typo.titleHeight / c.height) * 100), 76, typo.bodyHeight), text: body,
        fontFamily: 'Plus Jakarta Sans', fontSize: typo.bodySize, fontWeight: 400,
        color: isLightOverlay || !hasBgImg ? '#44403C' : '#D6D3D1', lineHeight: 1.6, align: 'left',
      }),
      ...footerIdentity(c, 12, 83, input, isLightOverlay || !hasBgImg ? '#78716C' : '#A8A29E', '#A8A29E'),
    ], input),
  });

  // 6. Cyber Slate & Neon Mint
  list.push({
    id: 'cyber-neon',
    name: 'Cyber Neon Mint',
    styleTag: 'High Tech',
    categoryTag: 'dark',
    project: makeProject('cyber-neon', 'Cyber Neon Mint', c, buildBg('#080B11'), [
      ...(!hasBgImg ? [
        decor('grid', { x: 0, y: 0, width: c.width, height: c.height, color: '#111827', strokeWidth: 1 }),
      ] : []),
      text('kicker', {
        ...B(c, MX, 10, CW, 3.5), text: `// ${category}`, fontFamily: 'JetBrains Mono',
        fontSize: F(c, 20), fontWeight: 600, color: '#10B981', letterSpacing: 1, align: 'left',
      }),
      text('headline', {
        ...B(c, MX, 17, CW, typo.titleHeight), text: title, fontFamily: 'Space Grotesk',
        fontSize: typo.titleSize, fontWeight: 700, color: defaultTextCol || '#FFFFFF', lineHeight: 1.18, align: 'left',
      }),
      shape({ ...B(c, MX, 20 + Math.round((typo.titleHeight / c.height) * 100), 22, 0.6), fill: '#10B981' }),
      text('body', {
        ...B(c, MX, 24 + Math.round((typo.titleHeight / c.height) * 100), CW, typo.bodyHeight), text: body,
        fontFamily: 'Inter', fontSize: typo.bodySize, fontWeight: 400, color: defaultSubTextCol || '#CBD5E1', lineHeight: 1.58, align: 'left',
      }),
      ...footerIdentity(c, MX, 85, input, '#34D399', '#94A3B8'),
    ], input),
  });

  // 7. Substack Reader (Elegant Editorial Publication - Replaces Highlighter Pop)
  list.push({
    id: 'substack-reader',
    name: 'Substack Editorial',
    styleTag: 'Longform Essay',
    categoryTag: 'minimal',
    project: makeProject('substack-reader', 'Substack Editorial', c, buildBg('#FCFBF7'), [
      shape({
        ...B(c, 7, 7, 86, 86),
        fill: hasBgImg ? (isLightOverlay ? '#FFFFFF' : '#1C1917') : '#FFFFFF',
        fillOpacity: hasBgImg ? 0.94 : 1,
        radius: F(c, 24),
        strokeColor: hasBgImg ? (isLightOverlay ? '#E7E5E4' : '#292524') : '#E7E5E4',
        strokeWidth: 1,
        name: 'Publication Paper',
      }),
      shape({ ...B(c, 12, 12, 28, 3.6), fill: '#F5F5F4', radius: 999 }),
      text('kicker', {
        ...B(c, 12, 12, 28, 3.6), text: `✦ ${category} · ESSAY`, fontFamily: 'Plus Jakarta Sans',
        fontSize: F(c, 15), fontWeight: 700, color: '#44403C', align: 'center', vAlign: 'middle',
      }),
      text('headline', {
        ...B(c, 12, 19, 76, typo.titleHeight), text: title, fontFamily: 'Playfair Display',
        fontSize: typo.titleSize, fontWeight: 700,
        color: isLightOverlay || !hasBgImg ? '#1C1917' : '#F5F5F4', lineHeight: 1.2, align: 'left',
      }),
      shape({ ...B(c, 12, 22.5 + Math.round((typo.titleHeight / c.height) * 100), 76, 0.2), fill: '#E7E5E4', name: 'Divider' }),
      text('body', {
        ...B(c, 12, 26 + Math.round((typo.titleHeight / c.height) * 100), 76, typo.bodyHeight), text: body,
        fontFamily: 'Lora', fontSize: typo.bodySize, fontWeight: 400,
        color: isLightOverlay || !hasBgImg ? '#44403C' : '#D6D3D1', lineHeight: 1.62, align: 'left',
      }),
      ...footerIdentity(c, 12, 82, input, isLightOverlay || !hasBgImg ? '#1C1917' : '#F5F5F4', '#78716C'),
    ], input),
  });

  // 8. LinkedIn Executive Card
  list.push({
    id: 'linkedin-insight',
    name: 'Corporate Insight',
    styleTag: 'Executive Card',
    categoryTag: 'social',
    project: makeProject('linkedin-insight', 'Corporate Insight', c, buildBg('#0A121E'), [
      shape({
        ...B(c, 7, 9, 86, 82),
        fill: hasBgImg ? (isLightOverlay ? '#FFFFFF' : '#0F1C2E') : '#101C2E',
        fillOpacity: hasBgImg ? 0.9 : 1,
        radius: F(c, 28),
        strokeColor: isLightOverlay && hasBgImg ? '#BAE6FD' : '#1E3A5F', strokeWidth: 1.5,
      }),
      shape({ ...B(c, 12, 14, 28, 4), fill: '#1E3A5F', radius: 999 }),
      text('kicker', {
        ...B(c, 12, 14, 28, 4), text: `KEY TAKEAWAY`, fontFamily: 'Plus Jakarta Sans',
        fontSize: F(c, 16), fontWeight: 700, color: '#38BDF8', align: 'center', vAlign: 'middle',
      }),
      text('headline', {
        ...B(c, 12, 23, 76, typo.titleHeight), text: title, fontFamily: 'Poppins',
        fontSize: typo.titleSize, fontWeight: 700,
        color: isLightOverlay && hasBgImg ? '#0F172A' : '#F0F9FF', lineHeight: 1.2, align: 'left',
      }),
      shape({ ...B(c, 12, 26 + Math.round((typo.titleHeight / c.height) * 100), 76, 0.2), fill: '#1E3A5F' }),
      text('body', {
        ...B(c, 12, 29 + Math.round((typo.titleHeight / c.height) * 100), 76, typo.bodyHeight), text: body,
        fontFamily: 'Inter', fontSize: typo.bodySize, fontWeight: 400,
        color: isLightOverlay && hasBgImg ? '#334155' : '#BAE6FD', lineHeight: 1.58, align: 'left',
      }),
      ...footerIdentity(c, 12, 80, input, isLightOverlay && hasBgImg ? '#0F172A' : '#F0F9FF', '#7DD3FC'),
    ], input),
  });

  // 9. Haute Editorial Pull-Quote (Replaces Giant Quote)
  list.push({
    id: 'editorial-pullquote',
    name: 'Editorial Pull-Quote',
    styleTag: 'Haute Monograph',
    categoryTag: 'minimal',
    project: makeProject('editorial-pullquote', 'Editorial Pull-Quote', c, buildBg('#111318'), [
      // Sophisticated top border accent line
      shape({ ...B(c, MX, 11, CW, 0.3), fill: isLightOverlay ? '#CBD5E1' : '#4B5563', name: 'Top Rule' }),
      text('kicker', {
        ...B(c, MX, 13, CW, 3.2), text: `— ${category} —`, fontFamily: 'Cinzel',
        fontSize: F(c, 16), fontWeight: 600, color: isLightOverlay ? '#6B7280' : '#9CA3AF', align: 'center', letterSpacing: 3,
      }),
      text('headline', {
        ...B(c, MX, 19, CW, typo.titleHeight), text: `“${title}”`, fontFamily: 'Playfair Display',
        fontSize: Math.round(typo.titleSize * 1.08), fontWeight: 700, italic: true,
        color: defaultTextCol || '#F8FAFC', lineHeight: 1.22, align: 'center',
      }),
      shape({ ...B(c, 44, 22 + Math.round((typo.titleHeight / c.height) * 100), 12, 0.4), fill: isLightOverlay ? '#94A3B8' : '#6B7280', name: 'Center Flourish' }),
      text('body', {
        ...B(c, MX, 26 + Math.round((typo.titleHeight / c.height) * 100), CW, typo.bodyHeight), text: body,
        fontFamily: 'Lora', fontSize: typo.bodySize, fontWeight: 400,
        color: defaultSubTextCol || '#CBD5E1', lineHeight: 1.62, align: 'center',
      }),
      shape({ ...B(c, MX, 80, CW, 0.3), fill: isLightOverlay ? '#CBD5E1' : '#4B5563', name: 'Bottom Rule' }),
      ...footerIdentity(c, MX, 84, input, defaultTextCol || '#F8FAFC', isLightOverlay ? '#4B5563' : '#94A3B8'),
    ], input),
  });

  // 10. Modern Bento Box Frame
  list.push({
    id: 'bento-frame',
    name: 'Modern Bento Frame',
    styleTag: 'Clean Framed',
    categoryTag: 'minimal',
    project: makeProject('bento-frame', 'Modern Bento Frame', c, buildBg('#E2E8F0'), [
      shape({
        ...B(c, 7, 7, 86, 86),
        fill: hasBgImg ? (isLightOverlay ? '#FFFFFF' : '#0F172A') : '#FFFFFF',
        fillOpacity: hasBgImg ? 0.9 : 1,
        radius: F(c, 32),
        strokeColor: hasBgImg ? (isLightOverlay ? '#CBD5E1' : '#334155') : '#CBD5E1', strokeWidth: 1,
      }),
      shape({ ...B(c, 12, 12, 22, 3.8), fill: isLightOverlay && hasBgImg ? '#F1F5F9' : '#F1F5F9', radius: 999 }),
      text('kicker', {
        ...B(c, 12, 12, 22, 3.8), text: category, fontFamily: 'Plus Jakarta Sans',
        fontSize: F(c, 17), fontWeight: 700, color: '#475569', align: 'center', vAlign: 'middle',
      }),
      text('headline', {
        ...B(c, 12, 19, 76, typo.titleHeight), text: title, fontFamily: 'Space Grotesk',
        fontSize: typo.titleSize, fontWeight: 700,
        color: isLightOverlay || !hasBgImg ? '#0F172A' : '#F8FAFC', lineHeight: 1.18, align: 'left',
      }),
      text('body', {
        ...B(c, 12, 23 + Math.round((typo.titleHeight / c.height) * 100), 76, typo.bodyHeight), text: body,
        fontFamily: 'Plus Jakarta Sans', fontSize: typo.bodySize, fontWeight: 400,
        color: isLightOverlay || !hasBgImg ? '#334155' : '#CBD5E1', lineHeight: 1.6, align: 'left',
      }),
      ...footerIdentity(c, 12, 82, input, isLightOverlay || !hasBgImg ? '#0F172A' : '#F8FAFC', '#64748B'),
    ], input),
  });

  // 11. Coffee & Warm Earthy
  list.push({
    id: 'coffee-latte',
    name: 'Coffee & Latte',
    styleTag: 'Warm Earthy',
    categoryTag: 'pastel',
    project: makeProject('coffee-latte', 'Coffee & Latte', c, buildBg('#EFE8E1'), [
      shape({
        ...B(c, 7, 7, 86, 86),
        fill: hasBgImg ? (isLightOverlay ? '#FAF7F2' : '#2A1F18') : '#FAF7F2',
        fillOpacity: hasBgImg ? 0.92 : 1,
        radius: F(c, 24),
      }),
      text('kicker', {
        ...B(c, 12, 12, 76, 3.5), text: `✦ ${category}`, fontFamily: 'Plus Jakarta Sans',
        fontSize: F(c, 18), fontWeight: 600, color: '#967D6D', align: 'left', letterSpacing: 2,
      }),
      text('headline', {
        ...B(c, 12, 18, 76, typo.titleHeight), text: title, fontFamily: 'Cormorant Garamond',
        fontSize: Math.round(typo.titleSize * 1.1), fontWeight: 700,
        color: isLightOverlay || !hasBgImg ? '#2E221B' : '#FAF5F0', align: 'left', lineHeight: 1.18,
      }),
      shape({ ...B(c, 12, 21 + Math.round((typo.titleHeight / c.height) * 100), 16, 0.4), fill: '#D3C3B5' }),
      text('body', {
        ...B(c, 12, 25 + Math.round((typo.titleHeight / c.height) * 100), 76, typo.bodyHeight), text: body,
        fontFamily: 'Lora', fontSize: typo.bodySize, fontWeight: 400,
        color: isLightOverlay || !hasBgImg ? '#57463E' : '#E8DDD5', align: 'left', lineHeight: 1.62,
      }),
      ...footerIdentity(c, 12, 82, input, isLightOverlay || !hasBgImg ? '#2E221B' : '#FAF5F0', '#967D6D'),
    ], input),
  });

  // 12. Obsidian Studio (Ultra-Modern Dark - Replaces Retro Newspaper)
  list.push({
    id: 'obsidian-studio',
    name: 'Obsidian Studio',
    styleTag: 'Linear Dark',
    categoryTag: 'dark',
    project: makeProject('obsidian-studio', 'Obsidian Studio', c, buildBg('#090D16'), [
      shape({
        ...B(c, 7, 7, 86, 86),
        fill: hasBgImg ? (isLightOverlay ? '#FFFFFF' : '#0F172A') : '#0F172A',
        fillOpacity: hasBgImg ? 0.92 : 1,
        radius: F(c, 24),
        strokeColor: isLightOverlay && hasBgImg ? '#E2E8F0' : '#1E293B',
        strokeWidth: 1.5,
        name: 'Obsidian Card',
      }),
      shape({ ...B(c, 12, 12, 32, 3.8), fill: isLightOverlay && hasBgImg ? '#F1F5F9' : '#1E293B', radius: 999 }),
      text('kicker', {
        ...B(c, 12, 12, 32, 3.8), text: `● ${category.toLowerCase()}.md`, fontFamily: 'JetBrains Mono',
        fontSize: F(c, 15), fontWeight: 600, color: isLightOverlay && hasBgImg ? '#0284C7' : '#38BDF8', align: 'center', vAlign: 'middle',
      }),
      text('headline', {
        ...B(c, 12, 19, 76, typo.titleHeight), text: title, fontFamily: 'Space Grotesk',
        fontSize: typo.titleSize, fontWeight: 700,
        color: isLightOverlay && hasBgImg ? '#0F172A' : '#F8FAFC', lineHeight: 1.18, align: 'left',
      }),
      shape({ ...B(c, 12, 23 + Math.round((typo.titleHeight / c.height) * 100), 76, 0.2), fill: isLightOverlay && hasBgImg ? '#E2E8F0' : '#1E293B' }),
      text('body', {
        ...B(c, 12, 27 + Math.round((typo.titleHeight / c.height) * 100), 76, typo.bodyHeight), text: body,
        fontFamily: 'Inter', fontSize: typo.bodySize, fontWeight: 400,
        color: isLightOverlay && hasBgImg ? '#334155' : '#94A3B8', lineHeight: 1.6, align: 'left',
      }),
      ...footerIdentity(c, 12, 82, input, isLightOverlay && hasBgImg ? '#0F172A' : '#F8FAFC', isLightOverlay && hasBgImg ? '#64748B' : '#64748B'),
    ], input),
  });

  // 13. Pastel Lavender
  list.push({
    id: 'pastel-lavender',
    name: 'Pastel Lavender',
    styleTag: 'Aesthetic Soft',
    categoryTag: 'pastel',
    project: makeProject('pastel-lavender', 'Pastel Lavender', c, buildBg('#EDE9FE'), [
      shape({
        ...B(c, 7, 7, 86, 86),
        fill: hasBgImg ? (isLightOverlay ? '#FFFFFF' : '#2E1065') : '#FFFFFF',
        fillOpacity: hasBgImg ? 0.9 : 1,
        radius: F(c, 32),
      }),
      shape({ ...B(c, 12, 12, 22, 3.8), fill: '#F5F3FF', radius: 999 }),
      text('kicker', {
        ...B(c, 12, 12, 22, 3.8), text: `🌸 ${category}`, fontFamily: 'Plus Jakarta Sans',
        fontSize: F(c, 17), fontWeight: 700, color: '#7C3AED', align: 'center', vAlign: 'middle',
      }),
      text('headline', {
        ...B(c, 12, 19, 76, typo.titleHeight), text: title, fontFamily: 'Poppins',
        fontSize: typo.titleSize, fontWeight: 700,
        color: isLightOverlay || !hasBgImg ? '#4C1D95' : '#F5F3FF', lineHeight: 1.2, align: 'left',
      }),
      text('body', {
        ...B(c, 12, 23 + Math.round((typo.titleHeight / c.height) * 100), 76, typo.bodyHeight), text: body,
        fontFamily: 'Plus Jakarta Sans', fontSize: typo.bodySize, fontWeight: 400,
        color: isLightOverlay || !hasBgImg ? '#5B21B6' : '#DDD6FE', lineHeight: 1.6, align: 'left',
      }),
      ...footerIdentity(c, 12, 82, input, isLightOverlay || !hasBgImg ? '#4C1D95' : '#F5F3FF', '#8B5CF6'),
    ], input),
  });

  // 14. Terminal & Monospace Console
  list.push({
    id: 'terminal-console',
    name: 'Terminal Console',
    styleTag: 'Monospace Code',
    categoryTag: 'dark',
    project: makeProject('terminal-console', 'Terminal Console', c, buildBg('#0D1117'), [
      shape({
        ...B(c, 7, 7, 86, 86),
        fill: hasBgImg ? '#161B22' : '#161B22',
        fillOpacity: hasBgImg ? 0.92 : 1,
        radius: F(c, 20),
        strokeColor: '#30363D', strokeWidth: 1.5,
      }),
      shape({ ...B(c, 11, 10.5, 2.4, 2), fill: '#EF4444', radius: 999 }),
      shape({ ...B(c, 14.5, 10.5, 2.4, 2), fill: '#F59E0B', radius: 999 }),
      shape({ ...B(c, 18, 10.5, 2.4, 2), fill: '#10B981', radius: 999 }),
      text('caption', {
        ...B(c, 24, 10.2, 50, 2.6), text: `~/thoughts/${category.toLowerCase()}.sh`,
        fontFamily: 'JetBrains Mono', fontSize: F(c, 18), fontWeight: 400, color: '#8B949E', align: 'left',
      }),
      shape({ ...B(c, 7, 14.5, 86, 0.2), fill: '#30363D' }),
      text('headline', {
        ...B(c, 11, 19, 78, typo.titleHeight), text: `> ${title}`, fontFamily: 'JetBrains Mono',
        fontSize: Math.round(typo.titleSize * 0.9), fontWeight: 700, color: '#58A6FF', lineHeight: 1.25, align: 'left',
      }),
      text('body', {
        ...B(c, 11, 23 + Math.round((typo.titleHeight / c.height) * 100), 78, typo.bodyHeight), text: body,
        fontFamily: 'JetBrains Mono', fontSize: Math.round(typo.bodySize * 0.92), fontWeight: 400, color: '#C9D1D9', lineHeight: 1.58, align: 'left',
      }),
      ...footerIdentity(c, 11, 82, input, '#58A6FF', '#8B949E'),
    ], input),
  });

  // 15. Two-Tone Color Split
  list.push({
    id: 'two-tone-blue',
    name: 'Two-Tone Royal',
    styleTag: 'Color Split',
    categoryTag: 'bold',
    project: makeProject('two-tone-blue', 'Two-Tone Royal', c, buildBg('#FFFFFF'), [
      ...(!hasBgImg ? [
        shape({ ...B(c, 0, 0, 100, 36), fill: '#1D4ED8', name: 'Top Color Block' }),
      ] : []),
      text('kicker', {
        ...B(c, MX, 6, CW, 3.5), text: category, fontFamily: 'Plus Jakarta Sans',
        fontSize: F(c, 18), fontWeight: 700, color: hasBgImg ? (isLightOverlay ? '#1D4ED8' : '#93C5FD') : '#93C5FD', uppercase: true, align: 'left',
      }),
      text('headline', {
        ...B(c, MX, 11, CW, 22), text: title, fontFamily: 'Space Grotesk',
        fontSize: Math.round(typo.titleSize * 0.95), fontWeight: 700,
        color: hasBgImg ? defaultTextCol || (isLightOverlay ? '#111827' : '#FFFFFF') : '#FFFFFF', lineHeight: 1.18, align: 'left',
      }),
      text('body', {
        ...B(c, MX, 40, CW, typo.bodyHeight), text: body, fontFamily: 'Plus Jakarta Sans',
        fontSize: typo.bodySize, fontWeight: 400,
        color: defaultSubTextCol || (isLightOverlay || !hasBgImg ? '#1E293B' : '#E2E8F0'), lineHeight: 1.6, align: 'left',
      }),
      ...footerIdentity(c, MX, 85, input, '#1D4ED8', '#64748B'),
    ], input),
  });

  // 16. Cyberpunk Neon Magenta
  list.push({
    id: 'neon-magenta',
    name: 'Neon Cyber Glow',
    styleTag: 'Electric Glow',
    categoryTag: 'dark',
    project: makeProject('neon-magenta', 'Neon Cyber Glow', c, buildBg('#0A0518'), [
      shape({
        ...B(c, 7, 7, 86, 86),
        fill: '#160B30', fillOpacity: hasBgImg ? 0.88 : 1,
        radius: F(c, 28), strokeColor: '#EC4899', strokeWidth: 1.8,
      }),
      text('kicker', {
        ...B(c, 12, 12, 76, 3.5), text: `⚡ ${category}`, fontFamily: 'Space Grotesk',
        fontSize: F(c, 18), fontWeight: 700, color: '#F472B6', letterSpacing: 1, align: 'left',
      }),
      text('headline', {
        ...B(c, 12, 19, 76, typo.titleHeight), text: title, fontFamily: 'Montserrat',
        fontSize: typo.titleSize, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.18, align: 'left',
      }),
      text('body', {
        ...B(c, 12, 23 + Math.round((typo.titleHeight / c.height) * 100), 76, typo.bodyHeight), text: body,
        fontFamily: 'Inter', fontSize: typo.bodySize, fontWeight: 400, color: '#F5D0FE', lineHeight: 1.58, align: 'left',
      }),
      ...footerIdentity(c, 12, 82, input, '#F472B6', '#A855F7'),
    ], input),
  });

  // 17. Botanical Forest Sage
  list.push({
    id: 'forest-sage',
    name: 'Forest & Sage',
    styleTag: 'Organic Earthy',
    categoryTag: 'pastel',
    project: makeProject('forest-sage', 'Forest & Sage', c, buildBg('#11221A'), [
      shape({
        ...B(c, 7, 7, 86, 86),
        fill: '#1B3529', fillOpacity: hasBgImg ? 0.88 : 1,
        radius: F(c, 24),
      }),
      text('kicker', {
        ...B(c, 12, 12, 76, 3.5), text: `🌿 ${category}`, fontFamily: 'Plus Jakarta Sans',
        fontSize: F(c, 18), fontWeight: 600, color: '#A7F3D0', letterSpacing: 2, align: 'left',
      }),
      text('headline', {
        ...B(c, 12, 19, 76, typo.titleHeight), text: title, fontFamily: 'Playfair Display',
        fontSize: typo.titleSize, fontWeight: 700, color: '#ECFDF5', lineHeight: 1.2, align: 'left',
      }),
      shape({ ...B(c, 12, 23 + Math.round((typo.titleHeight / c.height) * 100), 20, 0.4), fill: '#34D399' }),
      text('body', {
        ...B(c, 12, 27 + Math.round((typo.titleHeight / c.height) * 100), 76, typo.bodyHeight), text: body,
        fontFamily: 'Lora', fontSize: typo.bodySize, fontWeight: 400, color: '#D1FAE5', lineHeight: 1.62, align: 'left',
      }),
      ...footerIdentity(c, 12, 82, input, '#A7F3D0', '#6EE7B7'),
    ], input),
  });

  // 18. Canary Sticky Note (With Tangible Push-Pin)
  list.push({
    id: 'sticky-note',
    name: 'Canary Sticky Note',
    styleTag: 'Desk Memo',
    categoryTag: 'bold',
    project: makeProject('sticky-note', 'Canary Sticky Note', c, buildBg('#D1D5DB'), [
      shape({
        ...B(c, 8, 8, 84, 84), fill: '#FEF08A', radius: F(c, 12), rotation: -1,
        shadow: { enabled: true, color: '#0F172A', opacity: 0.28, blur: 28, offsetX: 4, offsetY: 14 },
        name: 'Sticky Note Paper',
      }),
      // Authentic 3D red push-pin pinning the note to the surface
      decor('push-pin', { ...B(c, 46.5, 4, 7, 8.5), color: '#DC2626', name: 'Red Push Pin' }),
      text('kicker', {
        ...B(c, 13, 14, 74, 3.5), text: category, fontFamily: 'Plus Jakarta Sans',
        fontSize: F(c, 17), fontWeight: 700, color: '#854D0E', uppercase: true, align: 'left',
      }),
      text('headline', {
        ...B(c, 13, 20, 74, typo.titleHeight), text: title, fontFamily: 'Plus Jakarta Sans',
        fontSize: typo.titleSize, fontWeight: 700, color: '#1C1917', lineHeight: 1.2, align: 'left',
      }),
      text('body', {
        ...B(c, 13, 24 + Math.round((typo.titleHeight / c.height) * 100), 74, typo.bodyHeight), text: body,
        fontFamily: 'Plus Jakarta Sans', fontSize: typo.bodySize, fontWeight: 400, color: '#44403C', lineHeight: 1.6, align: 'left',
      }),
      ...footerIdentity(c, 13, 80, input, '#713F12', '#A16207'),
    ], input),
  });

  // 19. Citrus Tangerine
  list.push({
    id: 'citrus-tangerine',
    name: 'Citrus Tangerine',
    styleTag: 'High Energy',
    categoryTag: 'vibrant',
    project: makeProject('citrus-tangerine', 'Citrus Tangerine', c, buildBg('#EA580C'), [
      shape({ ...B(c, MX, 9, 22, 4), fill: '#12131A', radius: 999 }),
      text('kicker', {
        ...B(c, MX, 9, 22, 4), text: category, fontFamily: 'Plus Jakarta Sans',
        fontSize: F(c, 17), fontWeight: 700, color: '#FED7AA', align: 'center', vAlign: 'middle', uppercase: true,
      }),
      text('headline', {
        ...B(c, MX, 18, CW, typo.titleHeight), text: title, fontFamily: 'Montserrat',
        fontSize: typo.titleSize, fontWeight: 800, color: defaultTextCol || '#FFFFFF', lineHeight: 1.15, align: 'left',
      }),
      text('body', {
        ...B(c, MX, 22 + Math.round((typo.titleHeight / c.height) * 100), CW, typo.bodyHeight), text: body,
        fontFamily: 'Plus Jakarta Sans', fontSize: typo.bodySize, fontWeight: 400, color: defaultSubTextCol || '#FFEDD5', lineHeight: 1.58, align: 'left',
      }),
      ...footerIdentity(c, MX, 85, input, defaultTextCol || '#FFFFFF', '#FFEDD5'),
    ], input),
  });

  // 20. Ocean Deep Teal
  list.push({
    id: 'ocean-teal',
    name: 'Ocean Deep Teal',
    styleTag: 'Deep Sea',
    categoryTag: 'vibrant',
    project: makeProject('ocean-teal', 'Ocean Deep Teal', c, buildBg('#0F353C'), [
      shape({ ...B(c, MX, 9, 22, 3.8), fill: '#115E59', radius: 999 }),
      text('kicker', {
        ...B(c, MX, 9, 22, 3.8), text: `🌊 ${category}`, fontFamily: 'Plus Jakarta Sans',
        fontSize: F(c, 16), fontWeight: 700, color: '#2DD4BF', align: 'center', vAlign: 'middle',
      }),
      text('headline', {
        ...B(c, MX, 18, CW, typo.titleHeight), text: title, fontFamily: 'Space Grotesk',
        fontSize: typo.titleSize, fontWeight: 700, color: defaultTextCol || '#F0FDFA', lineHeight: 1.18, align: 'left',
      }),
      text('body', {
        ...B(c, MX, 22 + Math.round((typo.titleHeight / c.height) * 100), CW, typo.bodyHeight), text: body,
        fontFamily: 'Inter', fontSize: typo.bodySize, fontWeight: 400, color: defaultSubTextCol || '#CCFBF1', lineHeight: 1.58, align: 'left',
      }),
      ...footerIdentity(c, MX, 85, input, defaultTextCol || '#2DD4BF', '#99F6E4'),
    ], input),
  });

  // 21. Spotlight Inverted Card
  list.push({
    id: 'spotlight-mono',
    name: 'Spotlight Inverted',
    styleTag: 'Floating Card',
    categoryTag: 'minimal',
    project: makeProject('spotlight-mono', 'Spotlight Inverted', c, buildBg('#050507'), [
      shape({
        ...B(c, 7, 9, 86, 82),
        fill: hasBgImg ? (isLightOverlay ? '#FFFFFF' : '#111827') : '#FFFFFF',
        fillOpacity: hasBgImg ? 0.92 : 1,
        radius: F(c, 32),
        shadow: { enabled: true, color: '#000000', opacity: 0.5, blur: 40, offsetX: 0, offsetY: 20 },
      }),
      text('kicker', {
        ...B(c, 12, 14, 76, 3.5), text: category, fontFamily: 'Space Grotesk',
        fontSize: F(c, 17), fontWeight: 700, color: isLightOverlay || !hasBgImg ? '#6B7280' : '#9CA3AF', uppercase: true, align: 'left',
      }),
      text('headline', {
        ...B(c, 12, 20, 76, typo.titleHeight), text: title, fontFamily: 'Playfair Display',
        fontSize: typo.titleSize, fontWeight: 700,
        color: isLightOverlay || !hasBgImg ? '#111827' : '#F9FAFB', lineHeight: 1.2, align: 'left',
      }),
      text('body', {
        ...B(c, 12, 24 + Math.round((typo.titleHeight / c.height) * 100), 76, typo.bodyHeight), text: body,
        fontFamily: 'Plus Jakarta Sans', fontSize: typo.bodySize, fontWeight: 400,
        color: isLightOverlay || !hasBgImg ? '#374151' : '#D1D5DB', lineHeight: 1.6, align: 'left',
      }),
      ...footerIdentity(c, 12, 80, input, isLightOverlay || !hasBgImg ? '#111827' : '#F9FAFB', '#6B7280'),
    ], input),
  });

  // 22. Luxury Gold Rim (Flawless Dual-Frame Nested Gold Border)
  list.push({
    id: 'luxury-gradient',
    name: 'Luxury Gold Rim',
    styleTag: 'Premium Dark',
    categoryTag: 'dark',
    project: makeProject('luxury-gradient', 'Luxury Gold Rim', c, buildBg('#07080B'), [
      // Master outer obsidian card with rich gold border
      shape({
        ...B(c, 6, 6, 88, 88),
        fill: hasBgImg ? '#0B0D13' : '#0B0D13',
        fillOpacity: hasBgImg ? 0.92 : 1,
        radius: F(c, 22),
        strokeColor: '#D97706',
        strokeWidth: 1.5,
        name: 'Luxury Outer Frame',
      }),
      // Mathematically nested inner hairline border (outer 22 - 2% distance = inner 14)
      shape({
        ...B(c, 8, 8, 84, 84),
        fill: 'none',
        radius: F(c, 14),
        strokeColor: '#FBBF24',
        strokeWidth: 0.8,
        strokeOpacity: 0.45,
        name: 'Inner Gold Hairline',
      }),
      text('kicker', {
        ...B(c, 13, 13, 74, 3.5), text: `✦ ${category}`, fontFamily: 'Cinzel',
        fontSize: F(c, 16), fontWeight: 700, color: '#FBBF24', letterSpacing: 3, align: 'left',
      }),
      text('headline', {
        ...B(c, 13, 19, 74, typo.titleHeight), text: title, fontFamily: 'Playfair Display',
        fontSize: typo.titleSize, fontWeight: 700, color: '#FFFBEB', lineHeight: 1.2, align: 'left',
      }),
      text('body', {
        ...B(c, 13, 24 + Math.round((typo.titleHeight / c.height) * 100), 74, typo.bodyHeight), text: body,
        fontFamily: 'Lora', fontSize: typo.bodySize, fontWeight: 400, color: '#E5E7EB', lineHeight: 1.62, align: 'left',
      }),
      ...footerIdentity(c, 13, 81, input, '#FBBF24', '#A8A29E'),
    ], input),
  });

  // 23. Carousel Hook / Swipe Guide
  list.push({
    id: 'carousel-hook',
    name: 'Carousel Swipe Hook',
    styleTag: 'Swipe Guide',
    categoryTag: 'social',
    project: makeProject('carousel-hook', 'Carousel Swipe Hook', c, buildBg('#F8FAFC'), [
      shape({ ...B(c, MX, 9, 30, 4.2), fill: isLightOverlay && hasBgImg ? '#0F172A' : '#0F172A', radius: 999 }),
      text('kicker', {
        ...B(c, MX, 9, 30, 4.2), text: 'SWIPE TO READ →', fontFamily: 'Plus Jakarta Sans',
        fontSize: F(c, 17), fontWeight: 700, color: '#FFFFFF', align: 'center', vAlign: 'middle',
      }),
      text('headline', {
        ...B(c, MX, 18, CW, typo.titleHeight), text: title, fontFamily: 'Space Grotesk',
        fontSize: Math.round(typo.titleSize * 1.05), fontWeight: 700,
        color: defaultTextCol || (isLightOverlay || !hasBgImg ? '#0F172A' : '#FFFFFF'), lineHeight: 1.18, align: 'left',
      }),
      shape({ ...B(c, MX, 21 + Math.round((typo.titleHeight / c.height) * 100), CW, 0.3), fill: '#CBD5E1' }),
      text('body', {
        ...B(c, MX, 25 + Math.round((typo.titleHeight / c.height) * 100), CW, typo.bodyHeight), text: body,
        fontFamily: 'Plus Jakarta Sans', fontSize: typo.bodySize, fontWeight: 400,
        color: defaultSubTextCol || (isLightOverlay || !hasBgImg ? '#334155' : '#E2E8F0'), lineHeight: 1.6, align: 'left',
      }),
      text('caption', {
        ...B(c, MX, 79, CW, 3), text: '●  ○  ○  ○  ○', fontFamily: 'Plus Jakarta Sans',
        fontSize: F(c, 24), fontWeight: 700, color: defaultTextCol || (isLightOverlay || !hasBgImg ? '#0F172A' : '#FFFFFF'), align: 'left',
      }),
      ...footerIdentity(c, MX, 85, input, defaultTextCol || (isLightOverlay || !hasBgImg ? '#0F172A' : '#FFFFFF'), '#64748B'),
    ], input),
  });

  // 24. Crimson Ruby Punch
  list.push({
    id: 'crimson-punch',
    name: 'Crimson Ruby',
    styleTag: 'High Contrast',
    categoryTag: 'bold',
    project: makeProject('crimson-punch', 'Crimson Ruby', c, buildBg('#991B1B'), [
      ...(!hasBgImg ? [
        decor('blob', { ...B(c, 30, 40, 80, 60), color: '#7F1D1D', opacity: 0.9, name: 'Dark Red Blob' }),
      ] : []),
      text('kicker', {
        ...B(c, MX, 10, CW, 3.5), text: `// ${category}`, fontFamily: 'Plus Jakarta Sans',
        fontSize: F(c, 18), fontWeight: 700, color: '#FECACA', uppercase: true, align: 'left',
      }),
      text('headline', {
        ...B(c, MX, 17, CW, typo.titleHeight), text: title, fontFamily: 'Montserrat',
        fontSize: typo.titleSize, fontWeight: 800, color: defaultTextCol || '#FFFFFF', lineHeight: 1.15, align: 'left',
      }),
      text('body', {
        ...B(c, MX, 22 + Math.round((typo.titleHeight / c.height) * 100), CW, typo.bodyHeight), text: body,
        fontFamily: 'Plus Jakarta Sans', fontSize: typo.bodySize, fontWeight: 400, color: defaultSubTextCol || '#FEE2E2', lineHeight: 1.58, align: 'left',
      }),
      ...footerIdentity(c, MX, 85, input, defaultTextCol || '#FFFFFF', '#FCA5A5'),
    ], input),
  });

  return list;
}
