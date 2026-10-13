import { v4 as uuid } from 'uuid';
import {
  DecorElement, DecorKind, DesignElement, ElementRole, ImageElement,
  ShapeElement, TextElement, defaultAdjust, noShadow,
} from '../types';

const base = () => ({
  id: uuid(), rotation: 0, z: 1, hidden: false, locked: false, opacity: 1, shadow: noShadow(), blur: 0,
});

export const text = (role: ElementRole, o: Partial<TextElement> = {}): TextElement => ({
  ...base(),
  type: 'text',
  role,
  name: o.name || roleLabel(role),
  x: 0, y: 0, width: 400, height: 100,
  text: 'Text',
  fontFamily: 'Plus Jakarta Sans',
  fontSize: 40,
  fontWeight: 600,
  italic: false,
  align: 'left',
  vAlign: 'top',
  color: '#12131A',
  lineHeight: 1.2,
  letterSpacing: 0,
  uppercase: false,
  autoFit: false,
  underline: false,
  strikethrough: false,
  kerning: true,
  list: 'none',
  scriptPosition: 'normal',
  textEffect: { kind: 'none', color: '#000000', thickness: 8 },
  ...o,
});

export const image = (role: ElementRole, o: Partial<ImageElement> = {}): ImageElement => ({
  ...base(),
  type: 'image',
  role,
  name: o.name || roleLabel(role),
  x: 0, y: 0, width: 400, height: 400,
  src: null,
  placeholder: role === 'profile-picture' ? 'avatar' : 'photo',
  fit: 'cover',
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  radius: 0,
  circle: role === 'profile-picture',
  ring: { width: 0, color: '#ffffff' },
  adjust: defaultAdjust(),
  ...o,
});

export const shape = (o: Partial<ShapeElement> = {}): ShapeElement => ({
  ...base(),
  type: 'shape',
  role: 'panel',
  name: o.name || 'Shape',
  x: 0, y: 0, width: 200, height: 200,
  shape: o.shape || 'rect',
  fill: o.fill || '#F02D63',
  fillOpacity: o.fillOpacity !== undefined ? o.fillOpacity : 1,
  radius: o.radius || 0,
  strokeColor: o.strokeColor || '#12131A',
  strokeWidth: o.strokeWidth || 0,
  strokeOpacity: o.strokeOpacity !== undefined ? o.strokeOpacity : 1,
  strokeStyle: o.strokeStyle || 'solid',
  sides: o.sides || 5,
  lockAspectRatio: o.lockAspectRatio ?? false,
  ...o,
});

export const decor = (kind: DecorKind, o: Partial<DecorElement> = {}): DecorElement => ({
  ...base(),
  type: 'decor',
  role: 'decor',
  name: o.name || decorLabel(kind),
  x: 0, y: 0, width: 200, height: 200,
  kind,
  color: '#12131A',
  color2: '#FFFFFF',
  strokeWidth: 3,
  ...o,
});

export function roleLabel(role: ElementRole): string {
  switch (role) {
    case 'headline': return 'Headline';
    case 'subhead': return 'Subheading';
    case 'body': return 'Body text';
    case 'kicker': return 'Label';
    case 'caption': return 'Small text';
    case 'cta': return 'Button text';
    case 'handle': return 'Handle';
    case 'profile-picture': return 'Profile picture';
    case 'photo': return 'Photo';
    case 'panel': return 'Shape';
    default: return 'Decoration';
  }
}

function decorLabel(kind: DecorKind): string {
  const map: Partial<Record<DecorKind, string>> = {
    blob: 'Blob', 'quote-open': 'Quote mark', 'quote-close': 'Quote mark',
    'quote-slab': 'Quote marks', squiggle: 'Squiggle', 'dashed-curve': 'Dashed line',
    'arrow-right': 'Arrow', 'arrow-circle': 'Arrow button', grid: 'Grid',
    stripes: 'Pattern', ring: 'Circle outline', 'ring-quarter': 'Arc',
    'badge-round-text': 'Badge', bell: 'Bell', 'heart-bubble': 'Like bubble',
    'pause-dot': 'Dot', 'comment-dot': 'Comment icon', 'corner-frame': 'Frame',
    'underline-swash': 'Underline', 'pointing-hand': 'Pointing hand', 'hanging-sign': 'Sign',
  };
  return map[kind] || 'Decoration';
}

/** Assign stacking order in list order so templates read top-to-bottom. */
export function stack(elements: DesignElement[]): DesignElement[] {
  return elements.map((e, i) => ({ ...e, z: i + 1 }));
}
