// Plain assert-based tests for src/editor/gestureMath.ts — no browser, no
// test framework. Run with: npx tsx scripts/gestureMath.test.ts
import {
  snapAngle,
  computeRotateTarget,
  buildSnapCandidates,
  computeMoveSnap,
  computeResizeTarget,
  computePinchZoomPan,
  unionBBox,
  computeGroupResizeTarget,
  applyGroupRotate,
  computeAlign,
  wrapLocalToCanvasPoint,
  rectsOverlap,
  computeDistribute,
} from '../src/editor/gestureMath';

let passed = 0;
let failed = 0;

function approx(a: number, b: number, eps = 0.5) {
  return Math.abs(a - b) <= eps;
}

function check(name: string, cond: boolean) {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${name}`);
  }
}

// ---- snapAngle ----
check('snapAngle snaps 43deg to 45', snapAngle(43) === 45);
check('snapAngle snaps 92deg to 90', snapAngle(92) === 90);
check('snapAngle leaves 30deg alone (>4deg from 15/45)', snapAngle(30) === 30);
check('snapAngle snaps -2deg to 0', snapAngle(-2) === 0);
check('snapAngle snaps 179deg to 180', snapAngle(179) === 180);

// ---- computeRotateTarget ----
{
  // Element centered at (100,100). Start drag at 3 o'clock (0deg from center).
  const startAngleClient = 0; // atan2(0, 1) in degrees
  // Drag to 12 o'clock-ish, ~91deg away from start -> should land near 90 and snap.
  const rotated = computeRotateTarget({
    centerClientX: 100,
    centerClientY: 100,
    startAngleClient,
    startRotation: 0,
    nowClientX: 100 + Math.cos((91 * Math.PI) / 180) * 50,
    nowClientY: 100 + Math.sin((91 * Math.PI) / 180) * 50,
  });
  check(`computeRotateTarget snaps near-90deg drag to 90 (got ${rotated})`, rotated === 90);
}

// ---- computeMoveSnap ----
{
  const candidates = buildSnapCandidates(1080, 1080, [{ x: 500, y: 500, width: 200, height: 100 }]);
  // Box nearly centered horizontally (cx should snap to 540)
  const nearCenter = computeMoveSnap({ x: 480 - 5, y: 10, width: 120, height: 40 }, candidates);
  check(
    `computeMoveSnap snaps to canvas horizontal center (guideX=${nearCenter.guideX})`,
    nearCenter.guideX === 540
  );

  // Box left edge close to the other element's right edge (700) -> should snap
  const nearSibling = computeMoveSnap({ x: 705, y: 10, width: 80, height: 40 }, candidates);
  check(
    `computeMoveSnap snaps to a sibling's right edge (x=${nearSibling.x}, guideX=${nearSibling.guideX})`,
    nearSibling.x === 700 && nearSibling.guideX === 700
  );

  // Box far from anything -> no snap, values pass through unchanged
  const farAway = computeMoveSnap({ x: 123, y: 456, width: 30, height: 30 }, candidates);
  check('computeMoveSnap leaves an unsnapped box alone', farAway.x === 123 && farAway.y === 456);
}

// ---- computeResizeTarget ----
{
  // Free resize from the SE corner: width/height grow with dx/dy, x/y unchanged.
  const free = computeResizeTarget({
    handle: 'se',
    base: { x: 10, y: 10, width: 100, height: 50 },
    dx: 20,
    dy: 5,
  });
  check(`free SE resize grows w/h (got ${JSON.stringify(free)})`, free.width === 120 && free.height === 55 && free.x === 10 && free.y === 10);

  // NW corner resize moves x/y as it shrinks/grows
  const nw = computeResizeTarget({
    handle: 'nw',
    base: { x: 10, y: 10, width: 100, height: 50 },
    dx: -10,
    dy: -10,
  });
  check(`NW resize shifts x/y (got ${JSON.stringify(nw)})`, nw.x === 0 && nw.y === 0 && nw.width === 110 && nw.height === 60);

  // Aspect-locked resize from an edge handle keeps the ratio
  const locked = computeResizeTarget({
    handle: 'e',
    base: { x: 0, y: 0, width: 100, height: 50 },
    dx: 50,
    dy: 0,
    lockAspect: true,
    ratio: 2,
  });
  check(`aspect-locked E resize keeps ratio 2 (got ${JSON.stringify(locked)})`, locked.width === 150 && locked.height === 75);

  // Never shrinks below minSize
  const clamped = computeResizeTarget({
    handle: 'e',
    base: { x: 0, y: 0, width: 20, height: 20 },
    dx: -500,
    dy: 0,
  });
  check(`resize respects minSize floor (got width=${clamped.width})`, clamped.width === 16);
}

// ---- computePinchZoomPan ----
{
  const input = {
    startDistance: 100,
    startZoom: 1,
    startPan: { x: 5, y: -10 },
    startMidpoint: { x: 300, y: 400 },
    wrapCenter: { x: 250, y: 350 },
    minZoom: 0.4,
    maxZoom: 4,
  };
  // Double the finger spacing (zoom should double), fingers don't drift.
  const result = computePinchZoomPan(input, 200, { x: 300, y: 400 });
  check(`pinch zoom doubles (got ${result.zoom})`, approx(result.zoom, 2, 0.01));

  // The critical property: the canvas-space point that was under the
  // fingers at the start must still project to the (unmoved) midpoint
  // after zoom changes. Re-derive the projected screen point with the
  // *new* zoom/pan and check it lands back on startMidpoint.
  const stageOffsetX = (input.startMidpoint.x - input.wrapCenter.x - input.startPan.x) / input.startZoom;
  const stageOffsetY = (input.startMidpoint.y - input.wrapCenter.y - input.startPan.y) / input.startZoom;
  const projectedX = input.wrapCenter.x + result.pan.x + stageOffsetX * result.zoom;
  const projectedY = input.wrapCenter.y + result.pan.y + stageOffsetY * result.zoom;
  check(
    `pinch zoom keeps the focal point under the fingers (got ${projectedX.toFixed(2)},${projectedY.toFixed(2)})`,
    approx(projectedX, 300) && approx(projectedY, 400)
  );

  // Same check again but with the fingers also drifting sideways during
  // the pinch (currentMidpoint != startMidpoint) — the focal point should
  // now track the new midpoint instead.
  const drifted = computePinchZoomPan(input, 150, { x: 340, y: 380 });
  const dz = drifted.zoom;
  const projectedX2 = input.wrapCenter.x + drifted.pan.x + stageOffsetX * dz;
  const projectedY2 = input.wrapCenter.y + drifted.pan.y + stageOffsetY * dz;
  check(
    `pinch zoom tracks a drifting midpoint (got ${projectedX2.toFixed(2)},${projectedY2.toFixed(2)})`,
    approx(projectedX2, 340) && approx(projectedY2, 380)
  );

  // Zoom clamps to maxZoom
  const overZoom = computePinchZoomPan(input, 1000, { x: 300, y: 400 });
  check(`pinch zoom clamps to maxZoom (got ${overZoom.zoom})`, overZoom.zoom === 4);
}

// ---- unionBBox ----
{
  const bbox = unionBBox([
    { x: 10, y: 10, width: 20, height: 20 }, // spans to 30,30
    { x: 100, y: 5, width: 10, height: 10 }, // spans to 110,15
  ]);
  check(`unionBBox covers all members (got ${JSON.stringify(bbox)})`, bbox.x === 10 && bbox.y === 5 && bbox.width === 100 && bbox.height === 25);
}

// ---- computeGroupResizeTarget ----
{
  const baseBBox = { x: 0, y: 0, width: 100, height: 50 };
  const members = [
    { id: 'a', x: 0, y: 0, width: 40, height: 50, rotation: 0 },
    { id: 'b', x: 60, y: 0, width: 40, height: 50, rotation: 0 },
  ];
  // Drag the SE handle to double the box width, same height.
  const result = computeGroupResizeTarget({ handle: 'se', baseBBox, members, dx: 100, dy: 0 });
  check(`group resize doubles bbox width (got ${result.bbox.width})`, result.bbox.width === 200);
  const a = result.members.find((m) => m.id === 'a')!;
  const b = result.members.find((m) => m.id === 'b')!;
  check(`group resize scales member widths (a=${a.width}, b=${b.width})`, a.width === 80 && b.width === 80);
  check(`group resize scales member x proportionally to bbox (a.x=${a.x}, b.x=${b.x})`, a.x === 0 && b.x === 120);
}

// ---- applyGroupRotate ----
{
  // Two 20x20 members straddling the origin, centers at (-30,0) and (30,0).
  const members = [
    { id: 'a', x: -40, y: -10, width: 20, height: 20, rotation: 0 },
    { id: 'b', x: 20, y: -10, width: 20, height: 20, rotation: 10 },
  ];
  const rotated = applyGroupRotate(members, { x: 0, y: 0 }, 90);
  const a = rotated.find((m) => m.id === 'a')!;
  const b = rotated.find((m) => m.id === 'b')!;
  // A 90deg rotation should swap roughly onto the y-axis: center (-30,0) -> (0,-30).
  const aCenterX = a.x + 10, aCenterY = a.y + 10;
  check(`group rotate orbits member a onto the y-axis (got ${aCenterX.toFixed(1)},${aCenterY.toFixed(1)})`, approx(aCenterX, 0) && approx(aCenterY, -30));
  check(`group rotate adds delta to each member's own rotation (b.rotation=${b.rotation})`, b.rotation === 100);
}

// ---- computeAlign ----
{
  const members = [
    { id: 'a', x: 0, y: 0, width: 20, height: 10 },
    { id: 'b', x: 50, y: 40, width: 10, height: 30 },
  ];
  const left = computeAlign(members, 'left');
  check(`align left snaps both members to bbox.x=0 (got ${JSON.stringify(left)})`, left.every((m) => m.x === 0));

  const centerV = computeAlign(members, 'centerV');
  // bbox: y in [0,70), height 70. 'a' (h=10) centers at y=(70-10)/2=30. 'b' (h=30) centers at (70-30)/2=20.
  const a = centerV.find((m) => m.id === 'a')!;
  const b = centerV.find((m) => m.id === 'b')!;
  check(`align centerV centers each member in the bbox (a.y=${a.y}, b.y=${b.y})`, a.y === 30 && b.y === 20);
}

// ---- wrapLocalToCanvasPoint ----
{
  const stage = { wrapWidth: 500, wrapHeight: 400, pan: { x: 12, y: -8 }, scale: 0.5, canvasWidth: 1080, canvasHeight: 1080 };
  // Forward-project a known canvas point using the same transform the renderer uses,
  // then check the inverse function recovers it.
  const originX = stage.wrapWidth / 2 + stage.pan.x - (stage.canvasWidth * stage.scale) / 2;
  const originY = stage.wrapHeight / 2 + stage.pan.y - (stage.canvasHeight * stage.scale) / 2;
  const canvasPoint = { x: 300, y: 700 };
  const wrapLocal = { x: originX + canvasPoint.x * stage.scale, y: originY + canvasPoint.y * stage.scale };
  const back = wrapLocalToCanvasPoint(wrapLocal, stage);
  check(`wrapLocalToCanvasPoint inverts the stage transform (got ${back.x.toFixed(1)},${back.y.toFixed(1)})`, approx(back.x, 300) && approx(back.y, 700));
}

// ---- rectsOverlap ----
{
  check('rectsOverlap true for overlapping rects', rectsOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 5, width: 10, height: 10 }));
  check('rectsOverlap false for separated rects', !rectsOverlap({ x: 0, y: 0, width: 10, height: 10 }, { x: 50, y: 50, width: 10, height: 10 }));
  check('rectsOverlap true when one contains the other', rectsOverlap({ x: 0, y: 0, width: 100, height: 100 }, { x: 40, y: 40, width: 5, height: 5 }));
}

// ---- computeDistribute ----
{
  const ms = [
    { id: 'a', x: 0, y: 0, width: 10, height: 10 },
    { id: 'b', x: 15, y: 0, width: 20, height: 10 },   // deliberately unevenly placed
    { id: 'c', x: 100, y: 0, width: 10, height: 10 },
  ];
  const r = computeDistribute(ms, 'h');
  const byId = Object.fromEntries(r.map((m) => [m.id, m.x]));
  // span 0..110, sizes 40 -> 70 of space / 2 gaps = 35 each: a 0..10, b 45..65, c 100..110
  check(`distribute h keeps the outer two fixed (a=${byId.a}, c=${byId.c})`, byId.a === 0 && byId.c === 100);
  check(`distribute h equalises gaps (b.x=${byId.b})`, byId.b === 45);
  check('distribute needs 3+ members', computeDistribute(ms.slice(0, 2), 'h').length === 0);
  const shuffled = computeDistribute([ms[2], ms[0], ms[1]], 'h');
  check('distribute is order independent', shuffled.find((m) => m.id === 'b')?.x === 45);
  const v = computeDistribute(ms.map((m, i) => ({ ...m, x: 0, y: [0, 15, 100][i] })), 'v');
  check('distribute v works on y (heights 10 each, gap 40 -> b.y 50)', v.find((m) => m.id === 'b')?.y === 50);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
