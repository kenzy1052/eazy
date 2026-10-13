import { Background, CanvasSize, DesignElement, Template, solidBg } from '../types';
import { decor, image, shape, stack, text } from './factory';

// ---------------------------------------------------------------------------
// Layout helpers. Everything is a percentage of the canvas so one composition
// holds on both 1:1 (1080×1080) and portrait 4×4.8in (1080×1296).
// ---------------------------------------------------------------------------
type C = CanvasSize;
export const X = (c: C, p: number) => Math.round((p / 100) * c.width);
export const Y = (c: C, p: number) => Math.round((p / 100) * c.height);
export const B = (c: C, x: number, y: number, w: number, h: number) => ({
  x: X(c, x), y: Y(c, y), width: X(c, w), height: Y(c, h),
});
export const F = (c: C, px: number) => Math.round(px * (c.width / 1080));

/**
 * Identity block. Every template gets one; the project's `profileMode`
 * decides whether the avatar, just the handle, or neither is shown.
 */
export function identity(
  c: C,
  o: { x: number; y: number; align?: 'left' | 'center'; color?: string; size?: number; avatarSize?: number; stacked?: boolean }
): DesignElement[] {
  const color = o.color || '#12131A';
  const fs = F(c, o.size ?? 26);
  const av = F(c, o.avatarSize ?? 62);
  const px = X(c, o.x);
  const py = Y(c, o.y);
  const hw = X(c, 46);

  if (o.stacked) {
    return [
      image('profile-picture', { x: px - av / 2, y: py, width: av, height: av, circle: true }),
      text('handle', {
        x: px - hw / 2, y: py + av + F(c, 10), width: hw, height: fs * 1.6,
        text: '@yourhandle', fontSize: fs, fontWeight: 600, color, align: 'center',
      }),
    ];
  }
  const avX = o.align === 'center' ? px - (av + F(c, 14) + X(c, 24)) / 2 : px;
  return [
    image('profile-picture', { x: avX, y: py, width: av, height: av, circle: true }),
    text('handle', {
      x: avX + av + F(c, 14), y: py, width: hw, height: av,
      text: '@yourhandle', fontSize: fs, fontWeight: 600, color, vAlign: 'middle',
    }),
  ];
}

type Build = Template['build'];

// ===========================================================================
// 1 — Ribbon Serif
// ===========================================================================
const ribbonSerif: Build = (c) => ({
  background: solidBg('#3A5FC8'),
  elements: stack([
    decor('blob', { ...B(c, -4, 18, 78, 42), color: '#2B4AA8', name: 'Background blob' }),
    shape({ ...B(c, 12, 30, 74, 10.5), fill: '#4E77E8', name: 'Ribbon 1' }),
    text('headline', {
      ...B(c, 14, 30.6, 70, 9.5), text: "Can't forget,", fontFamily: 'Playfair Display',
      fontSize: F(c, 96), fontWeight: 700, color: '#F2EFE8', vAlign: 'middle', name: 'Headline line 1',
    }),
    shape({ ...B(c, 15, 41.5, 68, 10.5), fill: '#4E77E8', name: 'Ribbon 2' }),
    text('subhead', {
      ...B(c, 17, 42.1, 64, 9.5), text: "won't forget", fontFamily: 'Playfair Display',
      fontSize: F(c, 96), italic: true, color: '#F2EFE8', vAlign: 'middle', name: 'Headline line 2',
    }),
    text('body', {
      ...B(c, 22, 55, 56, 12), text: 'What would I do to never forget new vocabulary?',
      fontSize: F(c, 34), fontWeight: 500, lineHeight: 1.35, align: 'center', color: '#EDF1FF',
    }),
    shape({ ...B(c, 45.5, 69, 9, 4), fill: '#4E77E8', radius: 4, name: 'Arrow chip' }),
    decor('arrow-right', { ...B(c, 47, 70.3, 6, 1.6), color: '#FFFFFF', strokeWidth: 6 }),
    text('caption', {
      ...B(c, 5, 92, 22, 3), text: '01  OF  09', fontFamily: 'Space Grotesk', fontSize: F(c, 18),
      fontWeight: 600, letterSpacing: 2, color: '#B9C7F2', name: 'Page number',
    }),
    text('caption', {
      ...B(c, 73, 92, 22, 3), text: 'KEEP READING', fontFamily: 'Space Grotesk', fontSize: F(c, 18),
      fontWeight: 600, letterSpacing: 2, color: '#B9C7F2', align: 'right', name: 'Corner label',
    }),
    ...identity(c, { x: 50, y: 4.5, align: 'center', color: '#E6ECFF', size: 22, avatarSize: 46 }),
  ]),
  profile: { x: 50, y: 4.5, align: 'center', onDark: true },
});

// ===========================================================================
// 2 — Mascot Point
// ===========================================================================
const mascotPoint: Build = (c) => ({
  background: solidBg('#F6F3EE'),
  elements: stack([
    text('headline', {
      ...B(c, 11, 28, 14, 12), text: '1', fontFamily: 'Poppins', fontSize: F(c, 130),
      fontWeight: 700, lineHeight: 1, name: 'Number',
    }),
    text('headline', {
      ...B(c, 22, 29, 60, 13), text: 'Logo first.\nBrand later.', fontFamily: 'Poppins',
      fontSize: F(c, 62), fontWeight: 700, lineHeight: 1.1,
    }),
    text('body', {
      ...B(c, 11, 44, 32, 6), text: 'A good logo can’t fix', fontFamily: 'Poppins',
      fontSize: F(c, 38), fontWeight: 400, color: '#2A2C35',
    }),
    text('cta', {
      ...B(c, 11, 49.5, 36, 5.5), text: 'weak positioning.', fontFamily: 'Poppins', fontSize: F(c, 34),
      fontWeight: 600, color: '#FFFFFF', vAlign: 'middle', name: 'Highlighted phrase',
      highlight: { color: '#20222B', padX: F(c, 22), padY: F(c, 14), radius: F(c, 8) },
    }),
    image('photo', { ...B(c, 44, 40, 48, 44), placeholder: 'product', name: 'Mascot / photo' }),
    shape({ ...B(c, 18, 88, 64, 0.2), fill: '#B9B4AB', name: 'Divider' }),
    decor('arrow-right', { ...B(c, 42, 92, 16, 2), strokeWidth: 4, name: 'Swipe arrow' }),
    ...identity(c, { x: 11, y: 9, size: 28, avatarSize: 54 }),
  ]),
  profile: { x: 11, y: 9, align: 'left', onDark: false },
});

// ===========================================================================
// 3 — Stencil Bold
// ===========================================================================
const stencilBold: Build = (c) => ({
  background: solidBg('#FFFFFF'),
  elements: stack([
    shape({ ...B(c, 88, 0, 12, 22), fill: '#F2F2F2', name: 'Side panel' }),
    text('headline', {
      ...B(c, 11, 22, 72, 7), text: 'DESIGN', fontFamily: 'Oswald', fontSize: F(c, 78),
      fontWeight: 400, uppercase: true, name: 'Line 1',
    }),
    text('headline', {
      ...B(c, 11, 28.5, 72, 7), text: 'THE PERSON', fontFamily: 'Oswald', fontSize: F(c, 78),
      fontWeight: 700, uppercase: true, name: 'Line 2',
    }),
    text('headline', {
      ...B(c, 11, 35, 72, 7), text: 'BEFORE', fontFamily: 'Oswald', fontSize: F(c, 78),
      fontWeight: 400, uppercase: true, name: 'Line 3',
    }),
    text('headline', {
      ...B(c, 11, 41.5, 72, 7), text: 'THE LOGO', fontFamily: 'Oswald', fontSize: F(c, 78),
      fontWeight: 700, uppercase: true, name: 'Line 4',
    }),
    shape({ ...B(c, 11, 52, 52, 7), fill: '#12131A', name: 'Black bar' }),
    text('subhead', {
      ...B(c, 12.5, 52.8, 49, 5.6), text: 'WHEN YOUR BRAND SOUNDS HUMAN,\nPEOPLE LISTEN LONGER.',
      fontFamily: 'Oswald', fontSize: F(c, 27), fontWeight: 500, lineHeight: 1.22, color: '#FFFFFF',
      name: 'Bar text',
    }),
    decor('comment-dot', { ...B(c, 11, 63, 4, 3.2), strokeWidth: 5 }),
    text('body', {
      ...B(c, 11, 67, 40, 6), text: 'Comment the one word\nyour brand would be.',
      fontSize: F(c, 24), lineHeight: 1.35, color: '#3A3A3A', name: 'Prompt',
    }),
    ...identity(c, { x: 11, y: 9, size: 26, avatarSize: 52 }),
  ]),
  profile: { x: 11, y: 9, align: 'left', onDark: false },
});

// ===========================================================================
// 4 — Hey You
// ===========================================================================
const heyYou: Build = (c) => ({
  background: solidBg('#F4F6F4'),
  elements: stack([
    decor('grid', { x: 0, y: 0, width: c.width, height: c.height, color: '#E4E8E4', strokeWidth: 1, name: 'Grid' }),
    decor('blob', { ...B(c, 62, -6, 55, 26), color: '#D8F0DC', name: 'Corner wash' }),
    text('headline', {
      ...B(c, 18, 24, 64, 12), text: 'Hey,', fontFamily: 'Poppins', fontSize: F(c, 150),
      fontWeight: 700, color: '#17A34A', lineHeight: 1, name: 'Headline 1',
    }),
    text('headline', {
      ...B(c, 18, 36, 40, 9), text: 'You.', fontFamily: 'Poppins', fontSize: F(c, 110),
      fontWeight: 700, color: '#17A34A', lineHeight: 1, name: 'Headline 2',
    }),
    decor('pointing-hand', { ...B(c, 40, 36.5, 13, 10), color: '#F5B92C', color2: '#D99A12' }),
    text('subhead', {
      ...B(c, 18, 47.5, 50, 8), text: 'Wanna be a\nGraphic Designer ?', fontFamily: 'Poppins',
      fontSize: F(c, 42), fontWeight: 500, lineHeight: 1.25, color: '#3C4149',
    }),
    shape({
      ...B(c, 26, 56.5, 48, 5.4), shape: 'pill', fill: '#FFFFFF', radius: 999, name: 'CTA pill',
      shadow: { enabled: true, color: '#1F2937', opacity: 0.1, blur: 24, offsetX: 0, offsetY: 8 },
    }),
    text('cta', {
      ...B(c, 27, 56.5, 46, 5.4), text: 'Join our 45 days Course!', fontFamily: 'Poppins',
      fontSize: F(c, 28), fontWeight: 500, align: 'center', vAlign: 'middle', color: '#2A2E36',
    }),
    text('caption', {
      ...B(c, 15, 86, 70, 4), text: 'Your City  |  000-000-0000', fontFamily: 'Poppins',
      fontSize: F(c, 26), align: 'center', color: '#4A4F58', name: 'Contact line',
    }),
    ...identity(c, { x: 50, y: 9, align: 'center', size: 26, avatarSize: 52 }),
  ]),
  profile: { x: 50, y: 9, align: 'center', onDark: false },
});

// ===========================================================================
// 5 — Soft Editorial
// ===========================================================================
const softEditorial: Build = (c) => ({
  background: solidBg('#EFEFEF'),
  elements: stack([
    decor('ring', { ...B(c, 55, -8, 62, 46), color: '#E3E3E3', strokeWidth: 16, name: 'Ring top' }),
    decor('ring', { ...B(c, 8, 72, 78, 56), color: '#E3E3E3', strokeWidth: 16, name: 'Ring bottom' }),
    text('caption', {
      ...B(c, 62, 15.5, 33, 3), text: '01 02 03 04 05 06 07 08', fontFamily: 'Space Grotesk',
      fontSize: F(c, 17), letterSpacing: 1.5, color: '#9C9C9C', align: 'right', name: 'Pagination',
    }),
    text('headline', {
      ...B(c, 13, 37, 60, 13), text: 'Aesthetics only make sense when they serve the purpose.',
      fontSize: F(c, 50), fontWeight: 600, lineHeight: 1.2, color: '#1A1A1A',
    }),
    text('body', {
      ...B(c, 13, 52, 52, 10), text: 'Beauty and purpose go together, but the priority is that the design truly communicates.',
      fontSize: F(c, 30), lineHeight: 1.4, color: '#3E3E3E',
    }),
    shape({ ...B(c, 13, 82, 32, 4.6), shape: 'pill', fill: '#1E1E1E', radius: 999, name: 'Chip' }),
    text('cta', {
      ...B(c, 15, 82, 26, 4.6), text: 'Read the caption', fontSize: F(c, 22), fontWeight: 500,
      color: '#FFFFFF', vAlign: 'middle',
    }),
    decor('arrow-right', { ...B(c, 39.5, 83.6, 4, 1.4), color: '#FFFFFF', strokeWidth: 7 }),
    ...identity(c, { x: 13, y: 15, color: '#3A3A3A', size: 20, avatarSize: 40 }),
  ]),
  profile: { x: 13, y: 15, align: 'left', onDark: false },
});

// ===========================================================================
// 6 — Highlighter
// ===========================================================================
const highlighter: Build = (c) => ({
  background: solidBg('#F2F2F2'),
  elements: stack([
    text('kicker', {
      ...B(c, 11, 5, 40, 6), text: 'Graphic designer /\nPhotographer.', fontSize: F(c, 24),
      lineHeight: 1.35, color: '#2A2A2A', name: 'Top label',
    }),
    text('headline', {
      ...B(c, 11, 31, 60, 6.6), text: 'Portfolio', fontFamily: 'Poppins', fontSize: F(c, 74),
      fontWeight: 700, name: 'Line 1',
    }),
    text('headline', {
      ...B(c, 11, 38.5, 56, 6.4), text: 'social media', fontFamily: 'Poppins', fontSize: F(c, 74),
      fontWeight: 700, vAlign: 'middle', name: 'Line 2 (highlighted)',
      highlight: { color: '#D4FF3F', padX: F(c, 16), padY: F(c, 8), radius: F(c, 4) },
    }),
    text('headline', {
      ...B(c, 11, 45.5, 50, 6.6), text: 'design.', fontFamily: 'Poppins', fontSize: F(c, 74),
      fontWeight: 700, name: 'Line 3',
    }),
    text('body', {
      ...B(c, 11, 54, 60, 8), text: 'This is how my most recent clients’ social media looks.',
      fontSize: F(c, 30), lineHeight: 1.35, color: '#2A2A2A',
    }),
    shape({ ...B(c, 11, 63, 48, 6), shape: 'pill', fill: '#D4FF3F', radius: 999, name: 'CTA pill' }),
    text('cta', {
      ...B(c, 14, 63, 36, 6), text: 'Swipe to keep reading', fontSize: F(c, 26), fontWeight: 600,
      vAlign: 'middle',
    }),
    decor('arrow-circle', { ...B(c, 51, 63.9, 5.6, 4.4), color: '#D4FF3F', color2: '#12131A', strokeWidth: 8 }),
    text('caption', {
      ...B(c, 49, 90, 40, 5), text: 'Portfolio\nLink in bio', fontSize: F(c, 22), fontWeight: 600,
      lineHeight: 1.4, name: 'Footer right',
    }),
    ...identity(c, { x: 11, y: 90, size: 22, avatarSize: 44 }),
  ]),
  profile: { x: 11, y: 90, align: 'left', onDark: false },
});

// ===========================================================================
// 7 — Did You Know
// ===========================================================================
const didYouKnow: Build = (c) => ({
  background: solidBg('#F6F2EA'),
  elements: stack([
    decor('corner-frame', { ...B(c, -2, 22, 104, 56), strokeWidth: 1.4, name: 'Outline frame' }),
    decor('pause-dot', { ...B(c, 9, 28, 10.5, 8.8), color: '#12131A', color2: '#F6F2EA', name: 'Dot left' }),
    decor('pause-dot', { ...B(c, 79, 56, 10.5, 8.8), color: '#12131A', color2: '#F6F2EA', name: 'Dot right' }),
    text('headline', {
      ...B(c, 18, 33, 64, 11), text: 'DID YOU\nKNOW?', fontFamily: 'Poppins', fontSize: F(c, 72),
      fontWeight: 700, lineHeight: 1.1, align: 'center',
    }),
    text('body', {
      ...B(c, 16, 47, 68, 8), text: '65% of people equate the logo with the entire brand.',
      fontFamily: 'Poppins', fontSize: F(c, 34), lineHeight: 1.3, align: 'center', color: '#1E1E1E',
    }),
    shape({ ...B(c, 25, 57, 50, 6), shape: 'pill', fill: '#12131A', radius: 999, name: 'Pill' }),
    text('cta', {
      ...B(c, 26, 57, 48, 6), text: 'But it is a Misconception!', fontFamily: 'Poppins',
      fontSize: F(c, 28), fontWeight: 600, align: 'center', vAlign: 'middle', color: '#FFFFFF',
    }),
    decor('arrow-circle', { ...B(c, 79, 79, 10, 8.4), color: '#C9F53F', color2: '#12131A', strokeWidth: 7 }),
    text('caption', {
      ...B(c, 33, 93, 34, 4), text: '©2026 Your Name\nAll Rights Reserved', fontSize: F(c, 17),
      lineHeight: 1.4, align: 'center', color: '#4A4A4A', name: 'Footer centre',
    }),
    text('caption', {
      ...B(c, 5, 93, 26, 4), text: 'hello@yoursite.com', fontSize: F(c, 17), color: '#4A4A4A',
      name: 'Footer left',
    }),
    ...identity(c, { x: 7, y: 5, size: 24, avatarSize: 52 }),
  ]),
  profile: { x: 7, y: 5, align: 'left', onDark: false },
});

// ===========================================================================
// 8 — Mixed Weight
// ===========================================================================
const mixedWeight: Build = (c) => ({
  background: solidBg('#F7F7F7'),
  elements: stack([
    text('kicker', {
      ...B(c, 5, 14, 22, 4), text: 'Swipe\nLeft', fontSize: F(c, 18), lineHeight: 1.35,
      color: '#8A8A8A', name: 'Corner label left',
    }),
    text('kicker', {
      ...B(c, 74, 14, 21, 4), text: 'AI + Human\nCreativity', fontSize: F(c, 18), lineHeight: 1.35,
      align: 'right', color: '#8A8A8A', name: 'Corner label right',
    }),
    text('kicker', {
      ...B(c, 20, 24, 60, 4), text: '[ AI generated the visual ]', fontSize: F(c, 26),
      fontWeight: 600, align: 'center', name: 'Bracket label',
    }),
    text('headline', {
      ...B(c, 15, 28.5, 52, 7), text: 'Human', fontFamily: 'Poppins', fontSize: F(c, 74),
      fontWeight: 800, name: 'Word 1',
    }),
    text('headline', {
      ...B(c, 42, 29.5, 40, 6), text: 'created', fontFamily: 'Poppins', fontSize: F(c, 52),
      fontWeight: 500, color: '#A8A8A8', name: 'Word 2',
    }),
    text('headline', {
      ...B(c, 19, 35.5, 22, 6), text: 'the', fontFamily: 'Poppins', fontSize: F(c, 52),
      fontWeight: 500, color: '#A8A8A8', name: 'Word 3',
    }),
    text('headline', {
      ...B(c, 29, 34.5, 45, 8), text: 'Story!', fontFamily: 'Poppins', fontSize: F(c, 84),
      fontWeight: 800, color: '#1FAE4D', name: 'Word 4',
    }),
    decor('arrow-circle', { ...B(c, 46, 49, 8, 6.4), color: '#FFFFFF', color2: '#1FAE4D', strokeWidth: 8, rotation: 45 }),
    shape({
      ...B(c, 21, 53, 58, 21), fill: '#EAF6EC', radius: F(c, 44), name: 'Card',
      strokeColor: '#CBE4D2', strokeWidth: 2,
    }),
    text('subhead', {
      ...B(c, 24, 57, 52, 6), text: 'So, think creative', fontFamily: 'Poppins', fontSize: F(c, 42),
      fontWeight: 700, align: 'center', name: 'Card heading',
    }),
    text('body', {
      ...B(c, 25, 63.5, 50, 7), text: 'and keep creating beautiful visuals and meaningful stories.',
      fontFamily: 'Poppins', fontSize: F(c, 27), lineHeight: 1.35, align: 'center', color: '#5A5F66',
      name: 'Card body',
    }),
    text('caption', {
      ...B(c, 30, 92, 40, 3.5), text: '[ Design. Strategy. Storytelling. ]', fontSize: F(c, 20),
      align: 'center', color: '#3A3A3A', name: 'Footer tagline',
    }),
    ...identity(c, { x: 5, y: 4.5, size: 24, avatarSize: 54 }),
  ]),
  profile: { x: 5, y: 4.5, align: 'left', onDark: false },
});

export const PART1 = { ribbonSerif, mascotPoint, stencilBold, heyYou, softEditorial, highlighter, didYouKnow, mixedWeight };
