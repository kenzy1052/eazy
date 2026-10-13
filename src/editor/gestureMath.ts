// ---------------------------------------------------------------------------
// Pure gesture math for the editor canvas.
//
// Nothing in this file touches the DOM, React, or Zustand. It only takes
// plain numbers in and returns plain numbers out. That is deliberate:
//
//   1. It's unit-testable without a browser (see gestureMath.test.ts, run
//      with `npx tsx scripts/gestureMath.test.ts`).
//   2. It's the part of the interaction system a future React Native
//      gesture handler can reuse as-is — only the pointer-event plumbing
//      around it differs between web and native.
//
// EditorCanvas.tsx is responsible for turning pointer events into the
// inputs below, applying the outputs to transient (non-committed) render
// state during the gesture, and committing a single patch to the store
// when the gesture ends.
// ---------------------------------------------------------------------------

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

// ---- rotation ---------------------------------------------------------

/**
 * Snaps an angle (in degrees) to the nearest multiple of `increment` when
 * it's within `threshold` degrees of it. Using a 15° increment covers the
 * 15/45/90/180 marks the spec calls out, since they're all multiples of 15.
 */
export function snapAngle(deg: number, increment = 15, threshold = 4): number {
  const nearest = Math.round(deg / increment) * increment;
  return Math.abs(deg - nearest) < threshold ? nearest : Math.round(deg);
}

export function computeRotateTarget(params: {
  centerClientX: number;
  centerClientY: number;
  startAngleClient: number; // atan2 at gesture start, degrees
  startRotation: number; // element rotation at gesture start
  nowClientX: number;
  nowClientY: number;
}): number {
  const now =
    (Math.atan2(params.nowClientY - params.centerClientY, params.nowClientX - params.centerClientX) * 180) /
    Math.PI;
  const raw = params.startRotation + (now - params.startAngleClient);
  return snapAngle(raw);
}

// ---- move + snapping ---------------------------------------------------

export interface SnapCandidates {
  /** x positions worth snapping the moving box's left/centerX/right edge to */
  xs: number[];
  /** y positions worth snapping the moving box's top/centerY/bottom edge to */
  ys: number[];
}

/** Canvas-center, margin, and other-element edge/center candidates. */
export function buildSnapCandidates(
  canvasWidth: number,
  canvasHeight: number,
  others: Rect[],
  marginRatio = 0.06
): SnapCandidates {
  const margin = Math.round(canvasWidth * marginRatio);
  const marginY = Math.round(canvasHeight * marginRatio);
  const xs = [canvasWidth / 2, margin, canvasWidth - margin];
  const ys = [canvasHeight / 2, marginY, canvasHeight - marginY];
  for (const o of others) {
    xs.push(o.x, o.x + o.width, o.x + o.width / 2);
    ys.push(o.y, o.y + o.height, o.y + o.height / 2);
  }
  return { xs, ys };
}

function bestSnap(
  edges: { value: number; offset: number }[],
  candidates: number[],
  threshold: number
): { snapped: number; guide: number } | null {
  let best: { snapped: number; guide: number; dist: number } | null = null;
  for (const edge of edges) {
    for (const c of candidates) {
      const d = Math.abs(edge.value - c);
      if (d < threshold && (!best || d < best.dist)) {
        best = { snapped: c - edge.offset, guide: c, dist: d };
      }
    }
  }
  return best ? { snapped: best.snapped, guide: best.guide } : null;
}

export function computeMoveSnap(
  raw: Rect,
  candidates: SnapCandidates,
  threshold = 14
): { x: number; y: number; guideX?: number; guideY?: number } {
  const xEdges = [
    { value: raw.x, offset: 0 },
    { value: raw.x + raw.width / 2, offset: raw.width / 2 },
    { value: raw.x + raw.width, offset: raw.width },
  ];
  const yEdges = [
    { value: raw.y, offset: 0 },
    { value: raw.y + raw.height / 2, offset: raw.height / 2 },
    { value: raw.y + raw.height, offset: raw.height },
  ];

  const xSnap = bestSnap(xEdges, candidates.xs, threshold);
  const ySnap = bestSnap(yEdges, candidates.ys, threshold);

  return {
    x: xSnap ? xSnap.snapped : raw.x,
    y: ySnap ? ySnap.snapped : raw.y,
    guideX: xSnap?.guide,
    guideY: ySnap?.guide,
  };
}

// ---- resize -------------------------------------------------------------

export function computeResizeTarget(params: {
  handle: string; // 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
  base: Rect;
  dx: number;
  dy: number;
  minSize?: number;
  lockAspect?: boolean;
  ratio?: number; // base.width / base.height, required if lockAspect
}): Rect {
  const { handle, base, dx, dy, lockAspect, ratio } = params;
  const minSize = params.minSize ?? 16;
  let { x, y, width: w, height: h } = base;

  if (handle.includes('e')) w = Math.max(minSize, base.width + dx);
  if (handle.includes('w')) {
    w = Math.max(minSize, base.width - dx);
    x = base.x + base.width - w;
  }
  if (handle.includes('s')) h = Math.max(minSize, base.height + dy);
  if (handle.includes('n')) {
    h = Math.max(minSize, base.height - dy);
    y = base.y + base.height - h;
  }

  if (lockAspect && ratio) {
    if (handle === 'e' || handle === 'w') {
      h = Math.max(minSize, Math.round(w / ratio));
      y = base.y + (base.height - h) / 2;
    } else if (handle === 'n' || handle === 's') {
      w = Math.max(minSize, Math.round(h * ratio));
      x = base.x + (base.width - w) / 2;
    } else {
      h = Math.max(minSize, Math.round(w / ratio));
      if (handle.includes('n')) y = base.y + base.height - h;
    }
  }

  return { x, y, width: w, height: h };
}

// ---- pinch zoom (focal-point preserving) --------------------------------

export interface PinchZoomInput {
  startDistance: number;
  startZoom: number;
  startPan: Point;
  /** two-finger midpoint at gesture start, in client px */
  startMidpoint: Point;
  /** the wrap element's own center, in client px (rect.left + width/2, ...) */
  wrapCenter: Point;
  minZoom: number;
  maxZoom: number;
}

/**
 * Solves for the pan that keeps the same canvas-space point under the
 * fingers as zoom changes, instead of always zooming around the stage's own
 * center. `currentMidpoint` may have drifted from `startMidpoint` (the
 * fingers moved as well as spread), which this also accounts for.
 */
// ---- multi-selection: group resize / rotate / align --------------------

export interface GroupMember extends Rect {
  id: string;
  rotation: number;
}

/** Axis-aligned union of a set of (unrotated) member rects. */
export function unionBBox(members: Rect[]): Rect {
  const xs0 = members.map((m) => m.x);
  const ys0 = members.map((m) => m.y);
  const xs1 = members.map((m) => m.x + m.width);
  const ys1 = members.map((m) => m.y + m.height);
  const x = Math.min(...xs0), y = Math.min(...ys0);
  return { x, y, width: Math.max(...xs1) - x, height: Math.max(...ys1) - y };
}

/**
 * Resizes a multi-selection by treating its bounding box like a single
 * element (reusing computeResizeTarget) and scaling every member
 * proportionally to how the box changed. Rotation of individual members is
 * left untouched — only their position/size scale with the box.
 */
export function computeGroupResizeTarget(params: {
  handle: string;
  baseBBox: Rect;
  members: GroupMember[];
  dx: number;
  dy: number;
  minSize?: number;
}): { bbox: Rect; members: { id: string; x: number; y: number; width: number; height: number }[] } {
  const newBBox = computeResizeTarget({
    handle: params.handle,
    base: params.baseBBox,
    dx: params.dx,
    dy: params.dy,
    minSize: params.minSize ?? 8 * params.members.length,
  });
  const sx = newBBox.width / Math.max(1, params.baseBBox.width);
  const sy = newBBox.height / Math.max(1, params.baseBBox.height);

  return {
    bbox: newBBox,
    members: params.members.map((m) => ({
      id: m.id,
      x: newBBox.x + (m.x - params.baseBBox.x) * sx,
      y: newBBox.y + (m.y - params.baseBBox.y) * sy,
      width: m.width * sx,
      height: m.height * sy,
    })),
  };
}

/**
 * Rotates every member of a multi-selection by the same delta angle around
 * the group's shared center: each member's own rotation increases by delta,
 * and its position orbits the group center by delta too (so the *group*
 * visibly spins, not just each element in place).
 */
export function applyGroupRotate(
  members: GroupMember[],
  bboxCenter: Point,
  deltaDeg: number
): { id: string; x: number; y: number; rotation: number }[] {
  const rad = (deltaDeg * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  return members.map((m) => {
    const cx = m.x + m.width / 2, cy = m.y + m.height / 2;
    const ox = cx - bboxCenter.x, oy = cy - bboxCenter.y;
    const nx = ox * cos - oy * sin + bboxCenter.x;
    const ny = ox * sin + oy * cos + bboxCenter.y;
    return { id: m.id, x: nx - m.width / 2, y: ny - m.height / 2, rotation: m.rotation + deltaDeg };
  });
}

export type AlignMode = 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom';

/** Aligns every member to the group's own bounding box on one axis. */
export function computeAlign(
  members: (Rect & { id: string })[],
  mode: AlignMode
): { id: string; x?: number; y?: number }[] {
  const bbox = unionBBox(members);
  return members.map((m) => {
    switch (mode) {
      case 'left': return { id: m.id, x: bbox.x };
      case 'centerH': return { id: m.id, x: bbox.x + (bbox.width - m.width) / 2 };
      case 'right': return { id: m.id, x: bbox.x + bbox.width - m.width };
      case 'top': return { id: m.id, y: bbox.y };
      case 'centerV': return { id: m.id, y: bbox.y + (bbox.height - m.height) / 2 };
      case 'bottom': return { id: m.id, y: bbox.y + bbox.height - m.height };
    }
  });
}

/**
 * Distributes 3+ members so the *gaps* between neighbouring edges are equal,
 * keeping the two outermost members where they are (what Figma/Canva's
 * "distribute spacing" does). Returns the new x (axis 'h') or y (axis 'v').
 */
export function computeDistribute(
  members: (Rect & { id: string })[],
  axis: 'h' | 'v'
): { id: string; x?: number; y?: number }[] {
  if (members.length < 3) return [];
  const pos = (m: Rect) => (axis === 'h' ? m.x : m.y);
  const size = (m: Rect) => (axis === 'h' ? m.width : m.height);
  const sorted = [...members].sort((a, b) => pos(a) - pos(b));
  const first = sorted[0], last = sorted[sorted.length - 1];
  const span = pos(last) + size(last) - pos(first);
  const gap = (span - sorted.reduce((n, m) => n + size(m), 0)) / (sorted.length - 1);
  let cursor = pos(first);
  return sorted.map((m) => {
    const at = cursor;
    cursor += size(m) + gap;
    return axis === 'h' ? { id: m.id, x: at } : { id: m.id, y: at };
  });
}

// ---- marquee select ------------------------------------------------------

/**
 * Converts a point in "wrap-local" client px (the canvas container's own
 * box, before pan/zoom) into canvas-space px (the same space element x/y
 * live in), using the same stage transform the renderer applies:
 * translate(-50%,-50%) translate(pan) then a canvasWidth*scale-sized box.
 */
export function wrapLocalToCanvasPoint(
  wrapLocal: Point,
  stage: { wrapWidth: number; wrapHeight: number; pan: Point; scale: number; canvasWidth: number; canvasHeight: number }
): Point {
  const originX = stage.wrapWidth / 2 + stage.pan.x - (stage.canvasWidth * stage.scale) / 2;
  const originY = stage.wrapHeight / 2 + stage.pan.y - (stage.canvasHeight * stage.scale) / 2;
  return { x: (wrapLocal.x - originX) / stage.scale, y: (wrapLocal.y - originY) / stage.scale };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return !(a.x > b.x + b.width || a.x + a.width < b.x || a.y > b.y + b.height || a.y + a.height < b.y);
}

export function computePinchZoomPan(
  input: PinchZoomInput,
  currentDistance: number,
  currentMidpoint: Point
): { zoom: number; pan: Point } {
  const rawZoom = input.startZoom * (currentDistance / Math.max(1, input.startDistance));
  const zoom = Math.max(input.minZoom, Math.min(input.maxZoom, rawZoom));

  // Constant (for this gesture) canvas-space offset from the stage's own
  // center that sat under the fingers when the gesture began. Dividing by
  // startZoom alone (not startZoom*fitScale) is intentional: fitScale is a
  // fixed multiplier that cancels out between this line and the one below,
  // so the function doesn't need to know it.
  const stageOffsetX = (input.startMidpoint.x - input.wrapCenter.x - input.startPan.x) / input.startZoom;
  const stageOffsetY = (input.startMidpoint.y - input.wrapCenter.y - input.startPan.y) / input.startZoom;

  return {
    zoom,
    pan: {
      x: currentMidpoint.x - input.wrapCenter.x - stageOffsetX * zoom,
      y: currentMidpoint.y - input.wrapCenter.y - stageOffsetY * zoom,
    },
  };
}
