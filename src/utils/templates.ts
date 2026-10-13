import { Background, CanvasSize, DesignElement, Template, solidBg, imageBg } from '../types';
import { decor, image, shape, stack, text } from './factory';
import { B, F, PART1, identity } from './templatesA';

type Build = Template['build'];

// ===========================================================================
// 9 — Dashed Route
// ===========================================================================
const dashedRoute: Build = (c) => ({
  background: solidBg('#EFEFEF'),
  elements: stack([
    decor('grid', { x: 0, y: 0, width: c.width, height: c.height, color: '#E2E2E2', strokeWidth: 1, name: 'Grid' }),
    decor('dashed-curve', { ...B(c, 8, 11, 72, 20), color: '#1F5FE0', color2: '#12131A', strokeWidth: 2.4, name: 'Dashed route' }),
    text('headline', {
      ...B(c, 22, 37, 56, 7), text: 'we don’t', fontFamily: 'Poppins', fontSize: F(c, 74),
      fontWeight: 700, color: '#2A2E35', name: 'Line 1',
    }),
    shape({
      ...B(c, 17, 44.5, 62, 8), fill: '#1F5FE0', radius: F(c, 10), name: 'Blue box',
      shadow: { enabled: true, color: '#1F5FE0', opacity: 0.25, blur: 26, offsetX: 0, offsetY: 10 },
    }),
    text('headline', {
      ...B(c, 20, 44.5, 56, 8), text: 'create ads', fontFamily: 'Poppins', fontSize: F(c, 74),
      fontWeight: 700, color: '#FFFFFF', vAlign: 'middle', name: 'Line 2',
    }),
    text('subhead', {
      ...B(c, 24, 53.5, 52, 6), text: 'we create brands', fontFamily: 'Poppins', fontSize: F(c, 42),
      fontWeight: 500, color: '#6B7280', name: 'Line 3',
    }),
    decor('hanging-sign', { ...B(c, 57, 60, 32, 10), color: '#1F5FE0', color2: '#12131A', strokeWidth: 2.4 }),
    text('cta', {
      ...B(c, 60, 64.5, 26, 4), text: 'Join Us now', fontFamily: 'Poppins', fontSize: F(c, 30),
      fontWeight: 700, align: 'center', color: '#FFFFFF', rotation: -6, name: 'Sign text',
    }),
    shape({ ...B(c, 6, 87, 22, 4.6), shape: 'pill', fill: '#1F5FE0', radius: 999, name: 'Reach pill' }),
    text('cta', {
      ...B(c, 8, 87, 18, 4.6), text: 'Reach us', fontFamily: 'Poppins', fontSize: F(c, 24),
      fontWeight: 600, color: '#FFFFFF', vAlign: 'middle',
    }),
    text('caption', {
      ...B(c, 6, 93, 50, 3.5), text: 'https://yoursite.com', fontSize: F(c, 19), color: '#4A4A4A',
      name: 'Website',
    }),
    ...identity(c, { x: 6, y: 5, size: 22, avatarSize: 46 }),
  ]),
  profile: { x: 6, y: 5, align: 'left', onDark: false },
});

// ===========================================================================
// 10 — Hello Monday
// ===========================================================================
const helloMonday: Build = (c) => ({
  background: solidBg('#D5121C'),
  elements: stack([
    decor('blob', { ...B(c, -15, 40, 85, 55), color: '#C00E18', name: 'Background blob' }),
    text('headline', {
      ...B(c, 6, 6, 60, 12), text: 'Hello!\nMonday', fontFamily: 'Playfair Display', fontSize: F(c, 78),
      fontWeight: 700, lineHeight: 1.05, color: '#FBEDE6',
    }),
    decor('underline-swash', { ...B(c, 6, 18, 18, 2.5), color: '#F0A79C', strokeWidth: 4 }),
    image('photo', { ...B(c, 16, 24, 68, 58), placeholder: 'phone', radius: F(c, 60), name: 'Phone mockup' }),
    decor('bell', { ...B(c, 3, 42, 18, 15), color: '#F5B92C', color2: '#E23B3B' }),
    shape({ ...B(c, 24, 52, 52, 14), fill: '#FBEDE6', radius: F(c, 28), name: 'Notification card' }),
    text('body', {
      ...B(c, 27, 54, 46, 11), text: 'Hey there! It’s a new week, let’s design and create amazing visuals.',
      fontSize: F(c, 28), lineHeight: 1.4, color: '#1A1A1A', name: 'Message',
    }),
    shape({ ...B(c, 24, 68, 52, 6), fill: '#FBEDE6', radius: F(c, 6), name: 'CTA bar' }),
    text('cta', {
      ...B(c, 25, 68, 50, 6), text: 'Read the caption below.', fontSize: F(c, 28), fontWeight: 600,
      align: 'center', vAlign: 'middle', color: '#1A1A1A',
    }),
    ...identity(c, { x: 66, y: 6, color: '#FFFFFF', size: 24, avatarSize: 58 }),
  ]),
  profile: { x: 66, y: 6, align: 'left', onDark: true },
});

// ===========================================================================
// 11 — Panel Pop
// ===========================================================================
const panelPop: Build = (c) => ({
  background: solidBg('#0F4438'),
  elements: stack([
    decor('stripes', { x: 0, y: 0, width: c.width, height: c.height, color: '#0F4438', color2: '#7CCB3E', name: 'Pattern' }),
    shape({ ...B(c, 8, 7, 84, 86), fill: '#C8E000', name: 'Panel' }),
    text('kicker', {
      ...B(c, 20, 13, 60, 4), text: 'MOTIVATION', fontFamily: 'Poppins', fontSize: F(c, 22),
      fontWeight: 500, letterSpacing: 8, align: 'center', color: '#0F4438', uppercase: true,
    }),
    text('headline', {
      ...B(c, 18, 22, 64, 34), text: 'Never\nGive\nUp', fontFamily: 'Poppins', fontSize: F(c, 96),
      fontWeight: 700, lineHeight: 1.06, align: 'center', color: '#0F4438',
    }),
    ...identity(c, { x: 50, y: 78, align: 'center', color: '#0F4438', size: 26, avatarSize: 56 }),
  ]),
  profile: { x: 50, y: 78, align: 'center', onDark: false },
});

// ===========================================================================
// 12 — Feedback Card
// ===========================================================================
const feedbackCard: Build = (c) => ({
  background: solidBg('#F1F2F4'),
  elements: stack([
    text('caption', {
      ...B(c, 2, 40, 96, 22), text: 'FEEDBACK', fontFamily: 'Archivo Black', fontSize: F(c, 150),
      color: '#D9DCE1', align: 'center', autoFit: false, name: 'Ghost word',
    }),
    decor('heart-bubble', { ...B(c, 37, 26, 26, 12), color: '#E8323C', color2: '#FFFFFF' }),
    shape({
      ...B(c, 15, 36, 70, 24), fill: '#333A45', radius: F(c, 34), name: 'Quote card',
      shadow: { enabled: true, color: '#12131A', opacity: 0.22, blur: 50, offsetX: 0, offsetY: 22 },
    }),
    decor('quote-open', { ...B(c, 19, 39, 8, 5), color: '#FFFFFF' }),
    text('body', {
      ...B(c, 21, 45, 58, 8), text: 'Working with them was effortless — quick edits, real care, and a result we genuinely love.',
      fontSize: F(c, 24), lineHeight: 1.5, align: 'center', color: '#E8EAEE', name: 'Testimonial',
    }),
    text('caption', {
      ...B(c, 21, 53.5, 26, 4), text: 'Happy Client', fontFamily: 'Dancing Script', fontSize: F(c, 30),
      color: '#C6CAD2', name: 'Signature',
    }),
    decor('quote-close', { ...B(c, 70, 52, 8, 5), color: '#FFFFFF' }),
    text('caption', {
      ...B(c, 25, 82, 50, 3.5), text: 'www.yoursite.com', fontSize: F(c, 20), fontWeight: 600,
      align: 'center', letterSpacing: 2, color: '#3A3A3A', name: 'Website',
    }),
    ...identity(c, { x: 50, y: 10, align: 'center', size: 22, avatarSize: 48 }),
  ]),
  profile: { x: 50, y: 10, align: 'center', onDark: false },
});

// ===========================================================================
// 13 — Quote Card
// ===========================================================================
const quoteCard: Build = (c) => ({
  background: solidBg('#0E3B2E'),
  elements: stack([
    decor('ring', { ...B(c, 55, -20, 70, 70), color: '#1A4F3E', strokeWidth: 2, name: 'Arc top' }),
    decor('ring', { ...B(c, -30, 45, 80, 80), color: '#1A4F3E', strokeWidth: 2, name: 'Arc bottom' }),
    decor('quote-open', { ...B(c, 17, 22, 14, 9), color: '#C8E000' }),
    text('headline', {
      ...B(c, 17, 33, 62, 14), text: 'Creativity is nothing but a mind set free.',
      fontFamily: 'Poppins', fontSize: F(c, 44), fontWeight: 600, lineHeight: 1.35, color: '#F2F7F0',
      name: 'Quote',
    }),
    text('caption', {
      ...B(c, 17, 48, 45, 4), text: '• Author Name', fontSize: F(c, 24), color: '#BFD8C6',
      name: 'Attribution',
    }),
    shape({ ...B(c, 10, 82, 80, 7), fill: '#C8E000', radius: F(c, 6), name: 'Footer bar' }),
    text('caption', {
      ...B(c, 13, 82, 40, 7), text: 'Your Studio', fontFamily: 'Poppins', fontSize: F(c, 26),
      fontWeight: 700, color: '#0E3B2E', vAlign: 'middle', name: 'Footer text',
    }),
    ...identity(c, { x: 13, y: 9, color: '#F2F7F0', size: 24, avatarSize: 50 }),
  ]),
  profile: { x: 13, y: 9, align: 'left', onDark: true },
});

// ===========================================================================
// 14 — Fact Slab
// ===========================================================================
const factSlab: Build = (c) => ({
  background: solidBg('#FFFFFF'),
  elements: stack([
    decor('quote-slab', {
      ...B(c, 36, 10, 30, 16), color: '#3A3A3A', name: 'Quote marks top',
      shadow: { enabled: true, color: '#C9C9C9', opacity: 0.9, blur: 0, offsetX: 26, offsetY: 26 },
    }),
    text('headline', {
      ...B(c, 21, 33, 40, 8), text: 'FACT', fontFamily: 'Oswald', fontSize: F(c, 86), fontWeight: 700,
      color: '#3A3A3A', uppercase: true, letterSpacing: 2, name: 'Heading',
    }),
    text('body', {
      ...B(c, 21, 43, 52, 12), text: 'Write the fact, tip or insight you want people to remember here.',
      fontSize: F(c, 30), lineHeight: 1.4, color: '#4A4A4A',
    }),
    decor('quote-slab', { ...B(c, 47, 56, 22, 12), color: '#3A3A3A', rotation: 180, name: 'Quote marks bottom' }),
    ...identity(c, { x: 50, y: 82, align: 'center', color: '#3A3A3A', size: 24, avatarSize: 50 }),
  ]),
  profile: { x: 50, y: 82, align: 'center', onDark: false },
});

// ===========================================================================
// 15 — Night Quote
// ===========================================================================
const nightQuote: Build = (c) => ({
  background: solidBg('#152232'),
  elements: stack([
    decor('squiggle', { ...B(c, -2, 4, 84, 20), color: '#35D24A', strokeWidth: 2.2 }),
    decor('badge-round-text', { ...B(c, 63, 11, 18, 15), color: '#152232', color2: '#35D24A', label: 'YOUR · BRAND · ' }),
    decor('quote-open', { ...B(c, 22, 29, 5, 3.5), color: '#35D24A' }),
    text('headline', {
      ...B(c, 25, 31, 56, 20), text: 'Design adds value faster than it adds costs.',
      fontFamily: 'Poppins', fontSize: F(c, 54), fontWeight: 500, lineHeight: 1.35, color: '#F1F5F4',
      name: 'Quote',
    }),
    decor('quote-close', { ...B(c, 52, 52, 5, 3.5), color: '#35D24A' }),
    text('caption', {
      ...B(c, 25, 62, 45, 4), text: 'Author Name', fontSize: F(c, 24), color: '#7FCF8C',
      name: 'Attribution',
    }),
    shape({ ...B(c, 17, 82, 66, 6), shape: 'pill', fill: '#35D24A', radius: 999, name: 'CTA pill' }),
    text('cta', {
      ...B(c, 20, 82, 60, 6), text: 'Share or save for later', fontFamily: 'Poppins', fontSize: F(c, 26),
      fontWeight: 600, align: 'center', vAlign: 'middle', color: '#10261A',
    }),
    text('caption', {
      ...B(c, 25, 92, 50, 3), text: '© 2 0 2 6', fontSize: F(c, 16), letterSpacing: 4,
      align: 'center', color: '#5D7183', name: 'Copyright',
    }),
    ...identity(c, { x: 20, y: 70, color: '#F1F5F4', size: 22, avatarSize: 46 }),
  ]),
  profile: { x: 20, y: 70, align: 'left', onDark: true },
});

// ===========================================================================
// 16 — Paper Serif
// ===========================================================================
const paperSerif: Build = (c) => ({
  background: solidBg('#EFE9E1'),
  elements: stack([
    text('headline', {
      ...B(c, 20, 32, 60, 7), text: 'There is more', fontFamily: 'Playfair Display', fontSize: F(c, 72),
      fontWeight: 500, align: 'center', color: '#101826', name: 'Line 1',
    }),
    text('headline', {
      ...B(c, 22, 40, 26, 6.6), text: 'to say', fontFamily: 'Playfair Display', fontSize: F(c, 72),
      fontWeight: 500, italic: true, align: 'center', vAlign: 'middle', color: '#F6F2EC',
      name: 'Line 2 (highlighted)', highlight: { color: '#2E6BE6', padX: F(c, 14), padY: F(c, 6), radius: 0 },
    }),
    text('headline', {
      ...B(c, 48, 40, 32, 6.6), text: 'than this,', fontFamily: 'Playfair Display', fontSize: F(c, 72),
      fontWeight: 500, color: '#101826', name: 'Line 3',
    }),
    text('headline', {
      ...B(c, 25, 48, 50, 7), text: 'dear', fontFamily: 'Playfair Display', fontSize: F(c, 72),
      fontWeight: 500, italic: true, align: 'center', color: '#2E6BE6', name: 'Line 4',
    }),
    shape({
      ...B(c, 36, 60, 28, 5), fill: '#EFE9E1', radius: 2, strokeColor: '#101826', strokeWidth: 2,
      name: 'Button outline',
    }),
    text('cta', {
      ...B(c, 37, 60, 26, 5), text: 'Come and see!', fontSize: F(c, 24), align: 'center',
      vAlign: 'middle', color: '#101826',
    }),
    ...identity(c, { x: 50, y: 23, align: 'center', color: '#5A5A5A', size: 20, avatarSize: 40 }),
  ]),
  profile: { x: 50, y: 23, align: 'center', onDark: false },
});

// ===========================================================================
// 17 — Stadium 433 Quote (Ballon d'Or Reference)
// ===========================================================================
const sportsQuote: Build = (c) => ({
  background: imageBg(
    'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1200&auto=format&fit=crop&q=80',
    '#05070D',
    0.15,
    '#000000'
  ),
  elements: stack([
    // Smooth dark gradient overlay at the bottom so text is crisp and punchy
    decor('gradient-scrim', {
      ...B(c, 0, 32, 100, 68),
      color: '#000000',
      color2: '#000000',
      name: 'Bottom Dark Gradient',
    }),
    // Top-left handle replacing the "433" logo
    text('handle', {
      ...B(c, 6, 4.5, 40, 5),
      text: '@yourhandle',
      fontFamily: 'Montserrat',
      fontSize: F(c, 34),
      fontWeight: 900,
      color: '#FFFFFF',
      letterSpacing: 1.5,
      uppercase: true,
      name: 'Corner Handle',
      shadow: { enabled: true, color: '#000000', opacity: 0.6, blur: 10, offsetX: 0, offsetY: 2 },
    }),
    // Centered modern double quote icon
    decor('quote-slab', {
      ...B(c, 47, 52, 6, 3.8),
      color: '#FFFFFF',
      name: 'Quote mark',
      shadow: { enabled: true, color: '#000000', opacity: 0.5, blur: 8, offsetX: 0, offsetY: 2 },
    }),
    // Main Title: Uppercase bold headline
    text('headline', {
      ...B(c, 8, 58, 84, 15),
      text: "BALLON D'OR IS FOR THE BEST PLAYER IN THE WORLD",
      fontFamily: 'Montserrat',
      fontSize: F(c, 52),
      fontWeight: 900,
      align: 'center',
      color: '#FFFFFF',
      lineHeight: 1.15,
      uppercase: true,
      name: 'Main Title',
      shadow: { enabled: true, color: '#000000', opacity: 0.7, blur: 12, offsetX: 0, offsetY: 3 },
    }),
    // Content itself / quote in quotation marks
    text('body', {
      ...B(c, 8, 75, 84, 11),
      text: '“The Ballon d’Or should not go to the winner of the Champions League or the one who scores the most goals.”',
      fontFamily: 'Plus Jakarta Sans',
      fontSize: F(c, 27),
      fontWeight: 400,
      align: 'center',
      lineHeight: 1.45,
      color: '#E5E7EB',
      name: 'Quote Body',
      shadow: { enabled: true, color: '#000000', opacity: 0.6, blur: 10, offsetX: 0, offsetY: 2 },
    }),
    // Person who made that quote in yellow pill
    shape({
      ...B(c, 34, 88, 32, 4.6),
      shape: 'pill',
      fill: '#FACC15',
      radius: 999,
      name: 'Author Pill Background',
      shadow: { enabled: true, color: '#000000', opacity: 0.4, blur: 10, offsetX: 0, offsetY: 3 },
    }),
    text('cta', {
      ...B(c, 34, 88, 32, 4.6),
      text: 'LAMINE YAMAL',
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
  ]),
  profile: { x: 6, y: 4.5, align: 'left', onDark: true },
});

const T = (id: string, name: string, tag: string, build: Build): Template => ({ id, name, tag, build });

export const TEMPLATES: Template[] = [
  T('sports-quote', 'Stadium 433 Quote', 'Sports', sportsQuote),
  T('ribbon-serif', 'Ribbon Serif', 'Editorial', PART1.ribbonSerif),
  T('mascot-point', 'Mascot Point', 'Carousel', PART1.mascotPoint),
  T('stencil-bold', 'Stencil Bold', 'Typography', PART1.stencilBold),
  T('hey-you', 'Hey You', 'Promo', PART1.heyYou),
  T('soft-editorial', 'Soft Editorial', 'Minimal', PART1.softEditorial),
  T('highlighter', 'Highlighter', 'Portfolio', PART1.highlighter),
  T('did-you-know', 'Did You Know', 'Educational', PART1.didYouKnow),
  T('mixed-weight', 'Mixed Weight', 'Creative', PART1.mixedWeight),
  T('dashed-route', 'Dashed Route', 'Agency', dashedRoute),
  T('hello-monday', 'Hello Monday', 'Announcement', helloMonday),
  T('panel-pop', 'Panel Pop', 'Motivation', panelPop),
  T('feedback-card', 'Feedback Card', 'Testimonial', feedbackCard),
  T('quote-card', 'Quote Card', 'Quote', quoteCard),
  T('fact-slab', 'Fact Slab', 'Fact', factSlab),
  T('night-quote', 'Night Quote', 'Quote', nightQuote),
  T('paper-serif', 'Paper Serif', 'Editorial', paperSerif),
];

export const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id);

export function blankDesign(c: CanvasSize): { background: Background; elements: DesignElement[] } {
  return {
    background: solidBg('#FFFFFF'),
    elements: stack([
      text('headline', {
        ...B(c, 10, 42, 80, 14), text: 'Tap to add your message', fontFamily: 'Poppins',
        fontSize: F(c, 56), fontWeight: 700, align: 'center', name: 'Headline',
      }),
      ...identity(c, { x: 50, y: 80, align: 'center', size: 24, avatarSize: 52 }),
    ]),
  };
}
