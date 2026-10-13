// ---------------------------------------------------------------------------
// Core model. Every template is a list of these elements — never a flat image.
// ---------------------------------------------------------------------------

export type CanvasKey = 'square' | 'portrait' | 'three-four' | 'story';

export interface CanvasSize {
  key: CanvasKey;
  label: string;
  note: string;
  width: number;
  height: number;
}

/** Canvas sizes supporting 1:1, 4:5, 3:4, and 9:16 aspect ratios */
export const CANVAS_SIZES: CanvasSize[] = [
  { key: 'square', label: 'Square (1:1)', note: '1:1 · 1080 × 1080', width: 1080, height: 1080 },
  { key: 'portrait', label: 'Portrait (4:5)', note: '4:5 · 1080 × 1296', width: 1080, height: 1296 },
  { key: 'three-four', label: 'Vertical (3:4)', note: '3:4 · 1080 × 1440', width: 1080, height: 1440 },
  { key: 'story', label: 'Story (9:16)', note: '9:16 · 1080 × 1920', width: 1080, height: 1920 },
];

export type ElementType = 'text' | 'image' | 'shape' | 'decor';

/**
 * Semantic role. Drives the Quick Edit menu, profile modes, and friendly
 * labels — the user never sees "element 3", they see "Headline".
 */
export type ElementRole =
  | 'headline'
  | 'subhead'
  | 'body'
  | 'kicker'
  | 'caption'
  | 'cta'
  | 'handle'
  | 'profile-picture'
  | 'photo'
  | 'decor'
  | 'panel';

export interface ShadowStyle {
  enabled: boolean;
  color: string;
  opacity: number;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export const noShadow = (): ShadowStyle => ({
  enabled: false, color: '#000000', opacity: 0.25, blur: 24, offsetX: 0, offsetY: 10,
});

export interface ImageAdjust {
  blur: number;
  brightness: number;
  contrast: number;
  saturate: number;
  grayscale: number;
  overlayColor: string;
  overlayOpacity: number;
}

export const defaultAdjust = (): ImageAdjust => ({
  blur: 0, brightness: 100, contrast: 100, saturate: 100, grayscale: 0,
  overlayColor: '#000000', overlayOpacity: 0,
});

export interface BaseElement {
  id: string;
  type: ElementType;
  role: ElementRole;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  z: number;
  hidden: boolean;
  locked: boolean;
  opacity: number;
  shadow: ShadowStyle;
  lockAspectRatio?: boolean;
  /** Elements that share a groupId move together and can be ungrouped. */
  groupId?: string;
  /** Whole-layer blur in px — available on text and shapes, not just photos. */
  blur?: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  italic: boolean;
  align: 'left' | 'center' | 'right' | 'justify';
  vAlign: 'top' | 'middle' | 'bottom';
  color: string;
  lineHeight: number;
  letterSpacing: number;
  uppercase: boolean;
  autoFit: boolean;
  /** Optional highlight block behind the text (the marker-pen look). */
  highlight?: { color: string; padX: number; padY: number; radius: number };
  underline?: boolean;
  strikethrough?: boolean;
  /** Browser font-kerning as a distinct on/off control from letter-spacing. */
  kerning?: boolean;
  list?: 'none' | 'bullet' | 'number';
  scriptPosition?: 'normal' | 'super' | 'sub';
  /** Outline / echo / neon style text effect, layered on top of shadow. */
  textEffect?: {
    kind: 'none' | 'outline' | 'echo' | 'neon';
    color: string;
    thickness: number;
  };
  /**
   * Per-character style overrides, e.g. "bold just this word". Ranges are
   * [start, end) character offsets into `text`, non-overlapping, sorted by
   * start. Any property left unset on a run falls back to the element's own
   * base field (fontWeight, italic, color, etc.) for that range. Absent or
   * empty means the whole text uses the base styling uniformly, exactly as
   * before this field existed — fully backward compatible with any design
   * saved before rich-text runs were added.
   */
  runs?: TextRun[];
}

export interface TextRun {
  start: number;
  end: number;
  fontWeight?: number;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: number;
  color?: string;
  opacity?: number;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string | null;
  /** Shown inside the empty placeholder so the slot reads as intentional. */
  placeholder: 'photo' | 'avatar' | 'product' | 'phone';
  fit: 'cover' | 'contain';
  zoom: number;
  offsetX: number;
  offsetY: number;
  radius: number;
  circle: boolean;
  ring: { width: number; color: string };
  adjust: ImageAdjust;
}

export type ShapeKind =
  | 'rect'
  | 'circle'
  | 'pill'
  | 'triangle'
  | 'pentagon'
  | 'hexagon'
  | 'octagon'
  | 'star'
  | 'polygon'
  | 'line';

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shape: ShapeKind;
  fill: string;
  fillOpacity: number;
  radius: number;
  strokeColor: string;
  strokeWidth: number;
  strokeOpacity?: number;
  strokeStyle?: 'solid' | 'dashed';
  sides?: number;
  imageFill?: { src: string; zoom: number; offsetX: number; offsetY: number };
}

/** Preset vector ornaments — the blobs, curves and quote marks in the refs. */
export type DecorKind =
  | 'blob'
  | 'quote-open'
  | 'quote-close'
  | 'quote-slab'
  | 'squiggle'
  | 'dashed-curve'
  | 'arrow-right'
  | 'arrow-circle'
  | 'grid'
  | 'stripes'
  | 'ring'
  | 'ring-quarter'
  | 'badge-round-text'
  | 'bell'
  | 'heart-bubble'
  | 'pause-dot'
  | 'comment-dot'
  | 'corner-frame'
  | 'underline-swash'
  | 'pointing-hand'
  | 'hanging-sign'
  | 'push-pin'
  | 'tweet-actions'
  | 'gradient-scrim'
  | 'hanger';

export interface DecorElement extends BaseElement {
  type: 'decor';
  kind: DecorKind;
  color: string;
  color2: string;
  strokeWidth: number;
  label?: string;
}

export type DesignElement = TextElement | ImageElement | ShapeElement | DecorElement;

export type BackgroundKind = 'solid' | 'image';

export interface Background {
  kind: BackgroundKind;
  color: string;
  image: { src: string | null; zoom: number; offsetX: number; offsetY: number };
  adjust: ImageAdjust;
}

export const solidBg = (color: string): Background => ({
  kind: 'solid',
  color,
  image: { src: null, zoom: 1, offsetX: 0, offsetY: 0 },
  adjust: defaultAdjust(),
});

export const imageBg = (
  src: string | null,
  color: string = '#090D16',
  overlayOpacity: number = 0,
  overlayColor: string = '#000000'
): Background => ({
  kind: 'image',
  color,
  image: { src, zoom: 1, offsetX: 0, offsetY: 0 },
  adjust: { ...defaultAdjust(), overlayColor, overlayOpacity },
});

/** How the creator's identity shows up on the artwork. */
export type ProfileMode = 'picture-and-handle' | 'handle-only' | 'none';

export interface Project {
  id: string;
  name: string;
  templateId: string;
  canvas: CanvasSize;
  background: Background;
  elements: DesignElement[];
  profileMode: ProfileMode;
  handle: string;
  avatar: string | null;
  createdAt: number;
  updatedAt: number;
  thumbnail?: string;
}

export interface Template {
  id: string;
  name: string;
  tag: string;
  build: (canvas: CanvasSize) => {
    background: Background;
    elements: DesignElement[];
    /** Where the handle/avatar live in this particular layout. */
    profile: { x: number; y: number; align: 'left' | 'center' | 'right'; onDark: boolean };
  };
}

export interface CustomTemplate {
  id: string;
  name: string;
  tag: string;
  createdAt: number;
  canvas: CanvasSize;
  background: Background;
  elements: DesignElement[];
  thumbnail?: string;
}
