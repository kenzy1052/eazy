import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Edit3, Crop, Check, RotateCw, Move, MoreHorizontal, Group } from 'lucide-react';
import { DesignElement, Project, TextElement } from '../types';
import { useStore } from '../store/useStore';
import { BackgroundView, ElementView } from '../render/Render';
import { IcCopy, IcSwap, IcTrash, IcUp } from '../ui/icons';
import { measureTextBox } from '../utils/measureText';
import {
  buildSnapCandidates,
  computeMoveSnap,
  computePinchZoomPan,
  computeResizeTarget,
  computeRotateTarget,
  unionBBox,
  computeGroupResizeTarget,
  applyGroupRotate,
  wrapLocalToCanvasPoint,
  rectsOverlap,
  type SnapCandidates,
  type GroupMember,
  type Rect,
  type Point,
} from './gestureMath';
import {
  baseOf,
  getRangeState,
  normalizeRuns,
  applyStyleToRange,
  type RangeFormatState,
  type RunStyle,
} from './richText';
import {
  getSelectionOffsets,
  insertTextAtSelection,
  readRichTextFromDom,
  renderRichIntoElement,
  setSelectionByOffsets,
} from './richTextDom';

import { renderToJpeg } from '../utils/exporter';

/**
 * Live, uncommitted edits for whichever element(s) are mid-gesture, keyed by
 * element id. Kept out of the Zustand store on purpose — see the note above
 * gestureMath.ts. The store only hears about the change once, when the
 * gesture ends (onPointerUp), as a single updateMany patch.
 */
type Transient = Record<string, Partial<Pick<DesignElement, 'x' | 'y' | 'width' | 'height' | 'rotation'>>>;

const MIN_Z = 0.4;
const MAX_Z = 4;
const SNAP = 14; // canvas px tolerance for centre/edge guides

type Gesture =
  | { kind: 'none' }
  | {
      kind: 'move';
      id: string;
      sx: number;
      sy: number;
      ox: number;
      oy: number;
      siblings: { id: string; ox: number; oy: number }[];
      candidates: SnapCandidates;
      /** True only when this drag started on an already-selected text layer's
       *  body — the signal to enter text edit if the pointer never moves. */
      wasAlreadySelected: boolean;
    }
  | { kind: 'resize'; id: string; handle: string; sx: number; sy: number; b: { x: number; y: number; w: number; h: number }; ratio: number }
  | { kind: 'rotate'; id: string; cx: number; cy: number; start: number; from: number }
  | { kind: 'pan'; sx: number; sy: number; ox: number; oy: number }
  | {
      kind: 'pinch';
      d0: number;
      z0: number;
      /** two-finger midpoint at gesture start, client px */
      mx: number;
      my: number;
      ox: number;
      oy: number;
      /** wrap element's own center, client px — fixed for the gesture */
      wrapCenterX: number;
      wrapCenterY: number;
    }
  | {
      kind: 'group-move';
      /** which member was actually tapped to start the drag — empty string
       *  when started from the group chrome's own move knob, which has no
       *  "collapse to single-select if this turns out to be a bare tap"
       *  behaviour. */
      tapId: string;
      sx: number;
      sy: number;
      base: GroupMember[];
      candidates: SnapCandidates;
    }
  | { kind: 'group-resize'; handle: string; sx: number; sy: number; baseBBox: Rect; base: GroupMember[] }
  | { kind: 'group-rotate'; cx: number; cy: number; start: number; base: GroupMember[]; bboxCenterCanvas: Point }
  | { kind: 'marquee'; sx: number; sy: number; additive: boolean; wrapLeft: number; wrapTop: number };

export interface CanvasHandle {
  zoomBy: (f: number) => void;
  fit: () => void;
  zoom: number;
  focusOn: (id: string) => void;
  startEditText: (id: string) => void;
  commitEdit: () => void;
  getThumbnail: () => Promise<string | null>;
  /** Current selection's formatting while editing text (null when not editing). */
  getTextFormatState: () => RangeFormatState | null;
  /** Applies a style to the selected characters. Returns false if there's no
   *  selection (caller should then style the whole layer instead). */
  applyTextFormat: (patch: RunStyle) => boolean;
}

interface Props {
  project: Project;
  onRequestImage: (id: string) => void;
  onCropImage?: (id: string) => void;
  onEditingChange?: (editing: boolean) => void;
  handleRef?: React.MutableRefObject<CanvasHandle | null>;
}

export function EditorCanvas({
  project,
  onRequestImage,
  onCropImage,
  onEditingChange,
  handleRef,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const editableRef = useRef<HTMLDivElement>(null);

  const selectedId = useStore((s) => s.selectedId);
  const select = useStore((s) => s.select);
  const selectedIds = useStore((s) => s.selectedIds);
  const selectMany = useStore((s) => s.selectMany);
  const toggleSelect = useStore((s) => s.toggleSelect);
  const clearSelection = useStore((s) => s.clearSelection);
  const update = useStore((s) => s.update);
  const updateMany = useStore((s) => s.updateMany);
  const snapshot = useStore((s) => s.snapshot);
  const del = useStore((s) => s.del);
  const delMany = useStore((s) => s.delMany);
  const duplicate = useStore((s) => s.duplicate);
  const duplicateMany = useStore((s) => s.duplicateMany);
  const reorder = useStore((s) => s.reorder);
  const groupElements = useStore((s) => s.groupElements);
  const ungroupElements = useStore((s) => s.ungroupElements);

  const pendingMove = useRef<{ clientX: number; clientY: number } | null>(null);
  const rafId = useRef<number | null>(null);

  const [fitScale, setFitScale] = useState(0.3);
  const [zoom, setZoom] = useState(1); // multiplier on top of fitScale
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [guides, setGuides] = useState<{ x?: number; y?: number }>({});

  const gesture = useRef<Gesture>({ kind: 'none' });
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const moved = useRef(false);

  // Marquee rectangle, in wrap-local client px (mouse-drag on empty canvas
  // only — touch keeps single-finger-drag as pan; touch multi-select is via
  // long-press instead, see longPressTimer below).
  const [marqueeRect, setMarqueeRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressStart = useRef<{ x: number; y: number } | null>(null);
  // Tracks the last tap's target+time for double-tap-to-drill-into-a-group
  // detection (see onPointerDown) — separate from the long-press mechanism.
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);
  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    longPressStart.current = null;
  }, []);

  // Live uncommitted transform for the element(s) currently mid-gesture.
  // Null when nothing is being dragged/resized/rotated. Mirrored into a ref
  // (transientRef) because onPointerUp needs the *just-computed* value
  // synchronously to commit it — reading the state variable there would see
  // last render's value, since setState doesn't apply until the next render.
  const [transient, setTransient] = useState<Transient | null>(null);
  const transientRef = useRef<Transient | null>(null);
  const applyTransient = useCallback((patch: Transient | null) => {
    transientRef.current = patch;
    setTransient(patch);
  }, []);
  // Guards against taking more than one undo snapshot per gesture — we take
  // it lazily, on the first real write, so a tap that never moves doesn't
  // push a no-op entry onto the history stack.
  const historySaved = useRef(false);

  const scale = fitScale * zoom;
  const els = useMemo(() => [...project.elements].sort((a, b) => a.z - b.z), [project.elements]);
  const selected = project.elements.find((e) => e.id === selectedId) || null;
  // Selection chrome must track the live (uncommitted) transform during a
  // gesture, or the handles visibly lag a frame behind the shape they're
  // supposed to surround.
  const displaySelected = selected && transient?.[selected.id] ? { ...selected, ...transient[selected.id] } : selected;

  // Multi-selection: 2+ ids selected together (marquee, shift-click, long-press).
  const selectedElsBase = useMemo(() => els.filter((e) => selectedIds.includes(e.id)), [els, selectedIds]);
  const isGroupSelection = selectedElsBase.length > 1;
  const displayGroupMembers = useMemo(
    () => selectedElsBase.map((e) => (transient?.[e.id] ? { ...e, ...transient[e.id] } : e)),
    [selectedElsBase, transient]
  );
  const displayGroupBBox = isGroupSelection ? unionBBox(displayGroupMembers) : null;
  // The floating toolbar offers "Ungroup" instead of "Group" only when the
  // selection is *exactly* one whole permanent group — not a subset of one,
  // and not an ad-hoc selection that happens to share no groupId.
  const asPermanentGroupId =
    isGroupSelection && selectedElsBase.every((x) => x.groupId && x.groupId === selectedElsBase[0].groupId)
      ? selectedElsBase[0].groupId
      : null;
  const isWholePermanentGroup =
    !!asPermanentGroupId && project.elements.filter((x) => x.groupId === asPermanentGroupId).length === selectedElsBase.length;

  // ---- fit to screen -------------------------------------------------------
  const computeFit = useCallback(() => {
    const w = wrapRef.current;
    if (!w) return;
    const pad = 28;
    const s = Math.min((w.clientWidth - pad) / project.canvas.width, (w.clientHeight - pad) / project.canvas.height);
    setFitScale(s);
  }, [project.canvas]);

  useEffect(() => {
    computeFit();
    const ro = new ResizeObserver(computeFit);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [computeFit]);

  const clampPan = useCallback((p: { x: number; y: number }, z: number) => {
    const w = wrapRef.current;
    if (!w) return p;
    const dispW = project.canvas.width * fitScale * z;
    const dispH = project.canvas.height * fitScale * z;
    const maxX = Math.max(0, (dispW - w.clientWidth) / 2 + 40);
    const maxY = Math.max(0, (dispH - w.clientHeight) / 2 + 40);
    return { x: Math.max(-maxX, Math.min(maxX, p.x)), y: Math.max(-maxY, Math.min(maxY, p.y)) };
  }, [project.canvas, fitScale]);

  const applyZoom = useCallback((next: number, p = pan) => {
    const z = Math.max(MIN_Z, Math.min(MAX_Z, next));
    setZoom(z);
    setPan(clampPan(p, z));
  }, [clampPan, pan]);

  // ---- inline text editing methods -----------------------------------------
  const startEdit = useCallback((id: string) => {
    const el = project.elements.find((x) => x.id === id);
    if (!el || el.type !== 'text') return;
    snapshot();
    setEditingId(id);
    // Re-fit the box height to the current text at the current width before
    // showing the editor, so edit mode never opens on a stale/oversized box
    // (that stale extra height is what read as a blank phantom second line).
    const t = el as TextElement;
    const fit = measureTextBox(t, { maxWidth: t.width });
    if (Math.abs(fit.height - t.height) > 1) {
      update(id, { height: fit.height } as any);
    }
  }, [project.elements, snapshot, update]);

  const commitEdit = useCallback(() => {
    const root = editableRef.current;
    if (editingId && root) {
      const el = project.elements.find((e) => e.id === editingId) as TextElement | undefined;
      if (el) {
        // The editable surface is the source of truth while editing: read the
        // text and any per-character styling back out of it in one go.
        const base = baseOf(el);
        const read = readRichTextFromDom(root, base);
        const cleanText = read.text.replace(/\r\n/g, '\n').trimEnd();
        if (cleanText) {
          const runs = normalizeRuns(read.runs, cleanText.length, base);
          // Measured with the same styled spans the renderer draws, so mixed
          // sizes/weights get the right height.
          const fit = measureTextBox({ ...el, text: cleanText, runs }, { maxWidth: el.width });
          update(editingId, { text: cleanText, runs: runs.length ? runs : undefined, width: el.width, height: Math.max(fit.height, 20), autoFit: false } as any);
        } else {
          update(editingId, { text: 'Text', runs: undefined, autoFit: false } as any);
        }
      }
    }
    setEditingId(null);
  }, [editingId, update, project]);

  /** Keeps the layer's box height tracking the text as you type. */
  const syncHeight = useCallback(() => {
    const root = editableRef.current;
    if (!root || !editingId) return;
    const el = project.elements.find((e) => e.id === editingId);
    if (!el) return;
    const h = Math.max(20, Math.ceil(root.offsetHeight));
    if (Math.abs(h - el.height) > 1) update(editingId, { height: h, autoFit: false } as any);
  }, [editingId, project.elements, update]);
  const syncHeightRef = useRef(syncHeight);
  syncHeightRef.current = syncHeight;

  // Fill the editable surface (text + per-character styling), focus it, put
  // the caret at the end (Canva-style), and make Enter/paste/drop behave. The
  // surface has no React-managed children, so React never fights the browser
  // over its contents while you type.
  useLayoutEffect(() => {
    if (!editingId) return;
    const root = editableRef.current;
    const el = project.elements.find((e) => e.id === editingId) as TextElement | undefined;
    if (!root || !el) return;
    renderRichIntoElement(root, el.text, el.runs, baseOf(el));
    root.focus();
    setSelectionByOffsets(root, el.text.length, el.text.length);

    const onBeforeInput = (e: Event) => {
      const t = (e as InputEvent).inputType;
      // Soft keyboards (esp. Android) send Enter as insertParagraph rather
      // than a key event — turn it into a plain line break so the browser
      // never inserts block elements into our span-only structure.
      if (t === 'insertParagraph' || t === 'insertLineBreak') {
        e.preventDefault();
        insertTextAtSelection(root, '\n');
        syncHeightRef.current();
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      e.preventDefault(); // plain text only — pasted web styling would corrupt the runs
      insertTextAtSelection(root, (e.clipboardData?.getData('text/plain') ?? '').replace(/\r\n/g, '\n'));
      syncHeightRef.current();
    };
    const onDrop = (e: Event) => e.preventDefault();
    root.addEventListener('beforeinput', onBeforeInput);
    root.addEventListener('paste', onPaste);
    root.addEventListener('drop', onDrop);
    return () => {
      root.removeEventListener('beforeinput', onBeforeInput);
      root.removeEventListener('paste', onPaste);
      root.removeEventListener('drop', onDrop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  // Spans in the editor carry their *effective* underline/strike (a child
  // can't cancel a parent's decoration), so when the whole layer's underline
  // or strikethrough is toggled from the edit bar, rebuild the spans against
  // the new base — otherwise nothing would visibly change until you finish.
  const prevBaseRef = useRef<ReturnType<typeof baseOf> | null>(null);
  const editedLayer = editingId ? (project.elements.find((e) => e.id === editingId) as TextElement | undefined) : undefined;
  useLayoutEffect(() => {
    const root = editableRef.current;
    if (!editedLayer || !root) { prevBaseRef.current = null; return; }
    const base = baseOf(editedLayer);
    const prev = prevBaseRef.current;
    if (prev && (prev.underline !== base.underline || prev.strikethrough !== base.strikethrough)) {
      const { text, runs } = readRichTextFromDom(root, prev);
      const sel = getSelectionOffsets(root);
      renderRichIntoElement(root, text, runs, base);
      if (sel) setSelectionByOffsets(root, sel.start, sel.end);
    }
    prevBaseRef.current = base;
  }, [editingId, editedLayer?.underline, editedLayer?.strikethrough]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Applies a style to the selected characters (data space: read -> change runs -> re-render -> restore selection). */
  const applyTextFormat = useCallback((patch: RunStyle): boolean => {
    const root = editableRef.current;
    if (!root || !editingId) return false;
    const el = project.elements.find((e) => e.id === editingId) as TextElement | undefined;
    if (!el) return false;
    const sel = getSelectionOffsets(root);
    if (!sel || sel.start === sel.end) return false;
    const base = baseOf(el);
    const { text, runs } = readRichTextFromDom(root, base);
    const next = applyStyleToRange(runs, text.length, sel.start, sel.end, patch, base);
    renderRichIntoElement(root, text, next, base);
    setSelectionByOffsets(root, sel.start, sel.end);
    syncHeightRef.current();
    return true;
  }, [editingId, project.elements]);

  const getTextFormatState = useCallback((): RangeFormatState | null => {
    const root = editableRef.current;
    if (!root || !editingId) return null;
    const el = project.elements.find((e) => e.id === editingId) as TextElement | undefined;
    if (!el) return null;
    const base = baseOf(el);
    const { text, runs } = readRichTextFromDom(root, base);
    const sel = getSelectionOffsets(root) ?? { start: 0, end: 0 };
    return getRangeState(runs, text.length, sel.start, sel.end, base);
  }, [editingId, project.elements]);

  useEffect(() => {
    if (!handleRef) return;
    handleRef.current = {
      zoom,
      zoomBy: (f) => applyZoom(zoom * f),
      fit: () => { setZoom(1); setPan({ x: 0, y: 0 }); },
      focusOn: (id) => {
        const el = project.elements.find((e) => e.id === id);
        const w = wrapRef.current;
        if (!el || !w) return;
        const target = Math.max(1, Math.min(3, (w.clientWidth * 0.55) / (el.width * fitScale)));
        const cx = el.x + el.width / 2 - project.canvas.width / 2;
        const cy = el.y + el.height / 2 - project.canvas.height / 2;
        setZoom(target);
        setPan(clampPan({ x: -cx * fitScale * target, y: -cy * fitScale * target }, target));
        select(id);
      },
      startEditText: (id) => startEdit(id),
      commitEdit: () => commitEdit(),
      getTextFormatState: () => getTextFormatState(),
      applyTextFormat: (patch) => applyTextFormat(patch),
      getThumbnail: async () => {
        if (!stageRef.current) return null;
        // Temporarily clear scaling for the export
        const node = stageRef.current.firstElementChild as HTMLElement;
        if (!node) return null;
        const oldTransform = node.style.transform;
        node.style.transform = 'scale(1)';
        try {
          const url = await renderToJpeg(node, project.canvas.width, project.canvas.height);
          return url;
        } finally {
          node.style.transform = oldTransform;
        }
      },
    };
  }, [handleRef, zoom, applyZoom, project.elements, fitScale, clampPan, select, project.canvas, startEdit, commitEdit, getTextFormatState, applyTextFormat]);

  useEffect(() => { onEditingChange?.(!!editingId); }, [editingId, onEditingChange]);

  // ---- gestures ------------------------------------------------------------
  const onPointerDown = (e: React.PointerEvent) => {
    const target = e.target as Element;
    if ((target.tagName && target.tagName.toLowerCase() === 'textarea') || target.closest('[data-rich-editor]')) return;

    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const wrapRect = wrapRef.current?.getBoundingClientRect();
      gesture.current = {
        kind: 'pinch',
        d0: Math.hypot(a.x - b.x, a.y - b.y),
        z0: zoom,
        mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2,
        ox: pan.x, oy: pan.y,
        wrapCenterX: wrapRect ? wrapRect.left + wrapRect.width / 2 : (a.x + b.x) / 2,
        wrapCenterY: wrapRect ? wrapRect.top + wrapRect.height / 2 : (a.y + b.y) / 2,
      };
      return;
    }

    // Use closest() rather than reading target.dataset directly — the move
    // and rotate knobs contain an icon, so a tap that lands on the icon
    // itself (not the bare div) was missing the handle and falling through
    // to "tapped empty space", which deselected the layer.
    const handle = target.closest('[data-handle]')?.getAttribute('data-handle') || undefined;

    // --- group (multi-selection) bounding-box handles ---------------------
    if (handle && isGroupSelection && displayGroupBBox) {
      e.stopPropagation();
      historySaved.current = false;
      const base: GroupMember[] = selectedElsBase
        .filter((x) => !x.locked)
        .map((x) => ({ id: x.id, x: x.x, y: x.y, width: x.width, height: x.height, rotation: x.rotation }));
      if (!base.length) return;
      const baseBBox = unionBBox(base);
      if (handle === 'rotate') {
        const r = document.getElementById('group-selection-bbox')?.getBoundingClientRect();
        const cx = r ? r.left + r.width / 2 : e.clientX;
        const cy = r ? r.top + r.height / 2 : e.clientY;
        gesture.current = {
          kind: 'group-rotate', cx, cy,
          start: (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI,
          base,
          bboxCenterCanvas: { x: baseBBox.x + baseBBox.width / 2, y: baseBBox.y + baseBBox.height / 2 },
        };
      } else if (handle === 'move') {
        const others = project.elements.filter((x) => !x.hidden && !selectedIds.includes(x.id));
        gesture.current = {
          kind: 'group-move', tapId: '', sx: e.clientX, sy: e.clientY, base,
          candidates: buildSnapCandidates(project.canvas.width, project.canvas.height, others),
        };
      } else {
        gesture.current = { kind: 'group-resize', handle, sx: e.clientX, sy: e.clientY, baseBBox, base };
      }
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      return;
    }

    // --- single-element handles --------------------------------------------
    if (handle && selected && !isGroupSelection) {
      e.stopPropagation();
      historySaved.current = false; // taken lazily on first real write
      if (handle === 'rotate') {
        const r = (document.getElementById(`el-${selected.id}`) as HTMLElement).getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        gesture.current = {
          kind: 'rotate', id: selected.id, cx, cy,
          start: (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI,
          from: selected.rotation,
        };
      } else if (handle === 'move') {
        const siblings = selected.groupId
          ? project.elements.filter((x) => x.groupId === selected.groupId && x.id !== selected.id).map((x) => ({ id: x.id, ox: x.x, oy: x.y }))
          : [];
        const others = project.elements.filter(
          (x) => !x.hidden && x.id !== selected.id && !(selected.groupId && x.groupId === selected.groupId)
        );
        gesture.current = {
          kind: 'move', id: selected.id, sx: e.clientX, sy: e.clientY, ox: selected.x, oy: selected.y, siblings,
          candidates: buildSnapCandidates(project.canvas.width, project.canvas.height, others),
          wasAlreadySelected: false, // this is the dedicated move knob, not a tap on the body
        };
      } else {
        gesture.current = {
          kind: 'resize', id: selected.id, handle,
          sx: e.clientX, sy: e.clientY,
          b: { x: selected.x, y: selected.y, w: selected.width, h: selected.height },
          ratio: selected.width / Math.max(1, selected.height),
        };
      }
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      return;
    }

    const hitId = target.closest('[data-el]')?.getAttribute('data-el') || null;
    if (hitId) {
      const el = project.elements.find((x) => x.id === hitId);
      const isModified = e.shiftKey || e.ctrlKey || e.metaKey;

      // Shift/ctrl/cmd-click toggles this element in or out of the current
      // multi-selection and doesn't start a drag — a separate, subsequent
      // gesture moves the resulting group.
      if (isModified) {
        if (editingId && editingId !== hitId) commitEdit();
        toggleSelect(hitId);
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
        return;
      }

      // Double-tap on a permanently-grouped element "drills in": selects
      // just that one member (bypassing the whole-group auto-select below)
      // and jumps straight to editing it — text starts editing, an image
      // opens crop. A plain single tap never does this; it selects the
      // group, same as Figma/Canva.
      const now = Date.now();
      const isDoubleTap = lastTapRef.current?.id === hitId && now - lastTapRef.current.time < 350;
      lastTapRef.current = { id: hitId, time: now };
      if (isDoubleTap && el?.groupId) {
        if (editingId && editingId !== hitId) commitEdit();
        select(hitId);
        if (el.type === 'text') startEdit(hitId);
        else if (el.type === 'image') onCropImage?.(hitId);
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
        return;
      }

      // Dragging any member of an existing multi-selection (no modifier
      // held) moves the whole group, the way Figma/Canva-style tools do. A
      // plain tap that never turns into a drag leaves the group selected —
      // for a permanent group, only double-tap (above) drills into a
      // member; for an ad-hoc (marquee/shift-click) selection it collapses
      // to single-select instead (handled in onPointerUp via tapId).
      if (isGroupSelection && selectedIds.includes(hitId)) {
        const base: GroupMember[] = selectedElsBase
          .filter((x) => !x.locked)
          .map((x) => ({ id: x.id, x: x.x, y: x.y, width: x.width, height: x.height, rotation: x.rotation }));
        // Only start a group drag if at least one selected member can
        // actually move — otherwise fall through to the normal single-tap
        // path below, which still selects the tapped (locked) element
        // without starting a gesture, same as a single locked element.
        if (base.length) {
          if (editingId) commitEdit();
          historySaved.current = false;
          const others = project.elements.filter((x) => !x.hidden && !selectedIds.includes(x.id));
          gesture.current = {
            kind: 'group-move', tapId: hitId, sx: e.clientX, sy: e.clientY, base,
            candidates: buildSnapCandidates(project.canvas.width, project.canvas.height, others),
          };
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
          return;
        }
      }

      // A fresh tap on a member of a permanent group that ISN'T already the
      // sole individual selection (i.e., not currently drilled in) selects
      // and, in the same motion, starts dragging the whole group — same
      // one-motion feel as tapping any other element.
      if (el?.groupId && hitId !== selectedId) {
        if (editingId) commitEdit();
        const groupMembers = project.elements.filter((x) => x.groupId === el.groupId && !x.hidden);
        const groupIds = groupMembers.map((x) => x.id);
        selectMany(groupIds);
        const base: GroupMember[] = groupMembers
          .filter((x) => !x.locked)
          .map((x) => ({ id: x.id, x: x.x, y: x.y, width: x.width, height: x.height, rotation: x.rotation }));
        if (base.length) {
          historySaved.current = false;
          const others = project.elements.filter((x) => !x.hidden && !groupIds.includes(x.id));
          gesture.current = {
            kind: 'group-move', tapId: hitId, sx: e.clientX, sy: e.clientY, base,
            candidates: buildSnapCandidates(project.canvas.width, project.canvas.height, others),
          };
        }
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
        return;
      }

      // Everything below is either a plain ungrouped element, or a grouped
      // element that's already individually drilled into (hitId ===
      // selectedId) — both drag just this one element, no siblings.
      if (editingId && editingId !== hitId) commitEdit();
      const wasAlreadySelected = hitId === selectedId && !isGroupSelection;
      select(hitId);

      // Touch: holding still on an element for a beat toggles it into
      // multi-select, instead of requiring a shift key touch doesn't have.
      // Cancelled by any real movement (onPointerMove) or by lifting early.
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        longPressStart.current = { x: e.clientX, y: e.clientY };
        longPressTimer.current = setTimeout(() => {
          longPressTimer.current = null;
          gesture.current = { kind: 'none' };
          toggleSelect(hitId);
        }, 480);
      }

      if (el && !el.locked && editingId !== hitId) {
        historySaved.current = false;
        const others = project.elements.filter((x) => !x.hidden && x.id !== el.id);
        gesture.current = {
          kind: 'move', id: hitId, sx: e.clientX, sy: e.clientY, ox: el.x, oy: el.y, siblings: [],
          candidates: buildSnapCandidates(project.canvas.width, project.canvas.height, others),
          wasAlreadySelected,
        };
      }
    } else {
      if (editingId) commitEdit();
      if (e.pointerType === 'mouse') {
        // Mouse drag on empty canvas marquee-selects; shift makes it additive.
        // (Zoom controls / scroll handle desktop canvas navigation, so this
        // gesture is free for selection rather than pan.)
        if (!e.shiftKey) clearSelection();
        const wrapRect = wrapRef.current?.getBoundingClientRect();
        gesture.current = {
          kind: 'marquee', sx: e.clientX, sy: e.clientY, additive: e.shiftKey,
          wrapLeft: wrapRect?.left ?? 0, wrapTop: wrapRect?.top ?? 0,
        };
      } else {
        // Touch/pen: single-finger drag on empty canvas still pans, as before.
        clearSelection();
        gesture.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y };
      }
    }
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  /** Takes the one undo snapshot for this gesture, the first time (and only
   *  the first time) a gesture actually writes a change. */
  const ensureHistory = useCallback(() => {
    if (!historySaved.current) {
      historySaved.current = true;
      snapshot();
    }
  }, [snapshot]);

  const performMove = useCallback((clientX: number, clientY: number) => {
    const g = gesture.current;
    if (g.kind === 'none') return;

    if (g.kind === 'pan') {
      setPan(clampPan({ x: g.ox + (clientX - g.sx), y: g.oy + (clientY - g.sy) }, zoom));
      return;
    }

    if (g.kind === 'marquee') {
      setMarqueeRect({
        left: Math.min(g.sx, clientX) - g.wrapLeft,
        top: Math.min(g.sy, clientY) - g.wrapTop,
        width: Math.abs(clientX - g.sx),
        height: Math.abs(clientY - g.sy),
      });
      return;
    }

    if (g.kind === 'move') {
      const el = project.elements.find((x) => x.id === g.id);
      if (!el) return;
      const rawX = g.ox + (clientX - g.sx) / scale;
      const rawY = g.oy + (clientY - g.sy) / scale;

      const snapped = computeMoveSnap({ x: rawX, y: rawY, width: el.width, height: el.height }, g.candidates, SNAP);
      setGuides((prev) => (prev.x === snapped.guideX && prev.y === snapped.guideY ? prev : { x: snapped.guideX, y: snapped.guideY }));

      const nx = Math.round(snapped.x), ny = Math.round(snapped.y);
      const patch: Transient = { [g.id]: { x: nx, y: ny } };
      if (g.siblings.length) {
        const dx = snapped.x - g.ox, dy = snapped.y - g.oy;
        for (const sib of g.siblings) {
          patch[sib.id] = { x: Math.round(sib.ox + dx), y: Math.round(sib.oy + dy) };
        }
      }
      ensureHistory();
      applyTransient(patch);
      return;
    }

    if (g.kind === 'resize') {
      const dx = (clientX - g.sx) / scale;
      const dy = (clientY - g.sy) / scale;
      const el = project.elements.find((q) => q.id === g.id);
      const isRatioLocked = el?.lockAspectRatio || (g.handle.length === 2 && (el?.type === 'image' || el?.type === 'decor'));

      const target = computeResizeTarget({
        handle: g.handle,
        base: { x: g.b.x, y: g.b.y, width: g.b.w, height: g.b.h },
        dx, dy,
        lockAspect: !!isRatioLocked,
        ratio: g.ratio,
      });

      if (el?.type === 'text') {
        const fit = measureTextBox({ ...(el as TextElement) }, { maxWidth: Math.round(target.width) });
        target.height = fit.height;
      }

      ensureHistory();
      applyTransient({
        [g.id]: { x: Math.round(target.x), y: Math.round(target.y), width: Math.round(target.width), height: Math.round(target.height) },
      });
      return;
    }

    if (g.kind === 'rotate') {
      const deg = computeRotateTarget({
        centerClientX: g.cx, centerClientY: g.cy,
        startAngleClient: g.start, startRotation: g.from,
        nowClientX: clientX, nowClientY: clientY,
      });
      ensureHistory();
      applyTransient({ [g.id]: { rotation: deg } });
      return;
    }

    if (g.kind === 'group-move') {
      const dx = (clientX - g.sx) / scale;
      const dy = (clientY - g.sy) / scale;
      const bbox = unionBBox(g.base);
      const snapped = computeMoveSnap({ x: bbox.x + dx, y: bbox.y + dy, width: bbox.width, height: bbox.height }, g.candidates, SNAP);
      setGuides((prev) => (prev.x === snapped.guideX && prev.y === snapped.guideY ? prev : { x: snapped.guideX, y: snapped.guideY }));
      const finalDx = snapped.x - bbox.x, finalDy = snapped.y - bbox.y;
      const patch: Transient = {};
      for (const m of g.base) patch[m.id] = { x: Math.round(m.x + finalDx), y: Math.round(m.y + finalDy) };
      ensureHistory();
      applyTransient(patch);
      return;
    }

    if (g.kind === 'group-resize') {
      const dx = (clientX - g.sx) / scale;
      const dy = (clientY - g.sy) / scale;
      const result = computeGroupResizeTarget({ handle: g.handle, baseBBox: g.baseBBox, members: g.base, dx, dy });
      const patch: Transient = {};
      for (const m of result.members) {
        patch[m.id] = { x: Math.round(m.x), y: Math.round(m.y), width: Math.round(m.width), height: Math.round(m.height) };
      }
      ensureHistory();
      applyTransient(patch);
      return;
    }

    if (g.kind === 'group-rotate') {
      const delta = computeRotateTarget({
        centerClientX: g.cx, centerClientY: g.cy,
        startAngleClient: g.start, startRotation: 0,
        nowClientX: clientX, nowClientY: clientY,
      });
      const rotated = applyGroupRotate(g.base, g.bboxCenterCanvas, delta);
      const patch: Transient = {};
      for (const r of rotated) patch[r.id] = { x: Math.round(r.x), y: Math.round(r.y), rotation: r.rotation };
      ensureHistory();
      applyTransient(patch);
    }
  }, [project, scale, zoom, clampPan, ensureHistory, applyTransient]);

  const onPointerMove = (e: React.PointerEvent) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // A long-press-to-multi-select is only valid while the finger stays
    // (roughly) still; real movement means the user meant to drag instead.
    if (longPressTimer.current && longPressStart.current) {
      const d = Math.hypot(e.clientX - longPressStart.current.x, e.clientY - longPressStart.current.y);
      if (d > 8) clearLongPress();
    }

    const g = gesture.current;
    if (g.kind === 'none') return;
    moved.current = true;

    if (g.kind === 'pinch') {
      if (pointers.current.size < 2) return;
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const result = computePinchZoomPan(
        {
          startDistance: g.d0, startZoom: g.z0, startPan: { x: g.ox, y: g.oy },
          startMidpoint: { x: g.mx, y: g.my },
          wrapCenter: { x: g.wrapCenterX, y: g.wrapCenterY },
          minZoom: MIN_Z, maxZoom: MAX_Z,
        },
        d,
        { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      );
      setZoom(result.zoom);
      setPan(clampPan(result.pan, result.zoom));
      return;
    }

    // Schedule RAF update for silky smooth movement without frame drops on low RAM phones
    pendingMove.current = { clientX: e.clientX, clientY: e.clientY };
    if (!rafId.current) {
      rafId.current = requestAnimationFrame(() => {
        rafId.current = null;
        if (pendingMove.current) {
          performMove(pendingMove.current.clientX, pendingMove.current.clientY);
        }
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    clearLongPress();
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    if (pendingMove.current) {
      performMove(pendingMove.current.clientX, pendingMove.current.clientY);
      pendingMove.current = null;
    }
    const g = gesture.current;

    // Marquee resolves to a selection, not a transform commit — handled on
    // its own and returned early.
    if (g.kind === 'marquee') {
      if (marqueeRect && (marqueeRect.width > 4 || marqueeRect.height > 4) && wrapRef.current) {
        const wrapWidth = wrapRef.current.clientWidth, wrapHeight = wrapRef.current.clientHeight;
        const stage = { wrapWidth, wrapHeight, pan, scale, canvasWidth: project.canvas.width, canvasHeight: project.canvas.height };
        const p0 = wrapLocalToCanvasPoint({ x: marqueeRect.left, y: marqueeRect.top }, stage);
        const p1 = wrapLocalToCanvasPoint({ x: marqueeRect.left + marqueeRect.width, y: marqueeRect.top + marqueeRect.height }, stage);
        const marqueeCanvasRect: Rect = {
          x: Math.min(p0.x, p1.x), y: Math.min(p0.y, p1.y),
          width: Math.abs(p1.x - p0.x), height: Math.abs(p1.y - p0.y),
        };
        const hitIds = project.elements.filter((el) => !el.hidden && rectsOverlap(marqueeCanvasRect, el)).map((el) => el.id);
        if (hitIds.length) {
          selectMany(g.additive ? Array.from(new Set([...selectedIds, ...hitIds])) : hitIds);
        }
      }
      setMarqueeRect(null);
      if (pointers.current.size === 0) gesture.current = { kind: 'none' };
      setGuides({});
      return;
    }

    // Commit the gesture's final transform to the store exactly once. Until
    // now everything lived in local `transient` state (see the note above
    // the Transient type) so the drag never touched Zustand or re-rendered
    // element content on every frame. Read transientRef (not the `transient`
    // state variable) here — performMove's last call this same tick may have
    // just called applyTransient, and setState from that hasn't flushed into
    // this closure's `transient` yet, but the ref is already up to date.
    const finalPatch = transientRef.current;
    const isTransformGesture =
      g.kind === 'move' || g.kind === 'resize' || g.kind === 'rotate' ||
      g.kind === 'group-move' || g.kind === 'group-resize' || g.kind === 'group-rotate';
    if (finalPatch && isTransformGesture) {
      updateMany(Object.entries(finalPatch).map(([id, patch]) => ({ id, patch })));
    }
    applyTransient(null);

    // Tap a text layer that was *already* selected (not this same tap's
    // initial select) to start editing it in place — this is the "tap
    // again to edit" flow the README describes. A plain first tap only
    // selects, same as tapping any other element.
    if (!moved.current && g.kind === 'move' && g.wasAlreadySelected) {
      const el = project.elements.find((x) => x.id === g.id);
      if (el?.type === 'text') startEdit(g.id);
    }

    // A bare tap (no drag) on a member of an *ad-hoc* multi-selection
    // (marquee/shift-click) collapses back to selecting just that element.
    // Permanent groups deliberately don't collapse this way — for those,
    // only a double-tap drills into a member (handled in onPointerDown) —
    // a plain tap leaves the whole group selected, matching Figma/Canva.
    if (!moved.current && g.kind === 'group-move' && g.tapId) {
      const tapped = project.elements.find((x) => x.id === g.tapId);
      if (!tapped?.groupId) select(g.tapId);
    }

    if (pointers.current.size === 0) gesture.current = { kind: 'none' };
    setGuides({});
  };

  const editingEl = editingId ? (project.elements.find((e) => e.id === editingId) as TextElement | undefined) : null;

  return (
    <div
      ref={wrapRef}
      className="relative w-full h-full overflow-hidden touch-none select-none bg-canvasbg"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="absolute left-1/2 top-1/2"
        style={{ transform: `translate(-50%,-50%) translate(${pan.x}px, ${pan.y}px)` }}
      >
        <div
          ref={stageRef}
          className="relative bg-white"
          style={{
            width: project.canvas.width * scale,
            height: project.canvas.height * scale,
            boxShadow: '0 8px 40px rgba(18,19,26,.14)',
            borderRadius: 2,
          }}
        >
          <div
            style={{
              width: project.canvas.width,
              height: project.canvas.height,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              position: 'absolute',
              overflow: 'hidden',
            }}
          >
            <BackgroundView bg={project.background} />

            {els.map((el) => {
              if (el.hidden) return null;
              const isEditing = editingId === el.id;
              // Live, uncommitted position/size/rotation for this element if
              // it's the one mid-gesture — everything else renders straight
              // from committed store state and never re-renders during a
              // neighbour's drag (el's own object identity below is passed
              // to ElementView unchanged, so React.memo skips it too).
              const patch = transient?.[el.id];
              const dx = patch?.x ?? el.x;
              const dy = patch?.y ?? el.y;
              const dw = patch?.width ?? el.width;
              const dh = patch?.height ?? el.height;
              const drot = patch?.rotation ?? el.rotation;
              // Thin/small elements (a divider line, a small icon) get an
              // invisible hit-slop so they're easy to grab by touch instead
              // of needing a pixel-perfect tap inside a tiny box.
              const MIN_TOUCH = 34;
              const slopX = Math.max(0, (MIN_TOUCH / scale - dw) / 2);
              const slopY = Math.max(0, (MIN_TOUCH / scale - dh) / 2);
              return (
                <div
                  key={el.id}
                  id={`el-${el.id}`}
                  data-el={el.id}
                  style={{
                    position: 'absolute', left: dx, top: dy, width: dw, height: dh,
                    transform: `rotate(${drot}deg)`, opacity: el.opacity, zIndex: el.z,
                    visibility: isEditing ? 'hidden' : 'visible',
                    pointerEvents: 'auto',
                    cursor: 'move',
                  }}
                >
                  {(slopX > 0 || slopY > 0) && (
                    <div
                      data-el={el.id}
                      style={{
                        position: 'absolute',
                        top: -slopY, bottom: -slopY, left: -slopX, right: -slopX,
                        pointerEvents: 'auto',
                      }}
                    />
                  )}
                  <ElementView el={el} />
                </div>
              );
            })}

            {/* Inline rich-text editor. A contentEditable (not a textarea) because a
                textarea can't show mixed styling — select part of the text, style it,
                and you see it change in place. Contents are managed imperatively. */}
            {editingEl && editingEl.type === 'text' && (
              <div
                style={{
                  position: 'absolute',
                  left: editingEl.x,
                  top: editingEl.y,
                  width: editingEl.width,
                  minHeight: editingEl.height,
                  height: 'auto',
                  transform: `rotate(${editingEl.rotation}deg)`,
                  zIndex: 9998,
                  pointerEvents: 'auto',
                  display: 'flex',
                  alignItems: editingEl.vAlign === 'middle' ? 'center' : editingEl.vAlign === 'bottom' ? 'flex-end' : 'flex-start',
                  justifyContent: editingEl.align === 'center' ? 'center' : editingEl.align === 'right' ? 'flex-end' : 'flex-start',
                  background: editingEl.highlight ? editingEl.highlight.color : 'rgba(255,255,255,0.85)',
                  borderRadius: 6,
                  boxShadow: 'inset 0 0 0 2px #F02D63, 0 4px 20px rgba(240,45,99,0.25)',
                }}
              >
                <div
                  ref={editableRef}
                  data-rich-editor
                  contentEditable
                  suppressContentEditableWarning
                  role="textbox"
                  aria-multiline="true"
                  spellCheck={false}
                  onInput={syncHeight}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') commitEdit();
                    // Enter is handled in the beforeinput listener (inserts a
                    // line break); the checkmark / tapping away finishes editing.
                    e.stopPropagation();
                  }}
                  style={{
                    width: '100%',
                    outline: 'none',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontFamily: `"${editingEl.fontFamily}", sans-serif`,
                    fontSize: `${editingEl.fontSize}px`,
                    fontWeight: editingEl.fontWeight,
                    fontStyle: editingEl.italic ? 'italic' : 'normal',
                    textAlign: editingEl.align,
                    color: editingEl.color,
                    lineHeight: editingEl.lineHeight,
                    letterSpacing: `${editingEl.letterSpacing}px`,
                    textTransform: editingEl.uppercase ? 'uppercase' : 'none',
                    padding: editingEl.highlight ? `${editingEl.highlight.padY}px ${editingEl.highlight.padX}px` : '0px',
                    margin: 0,
                    caretColor: '#F02D63',
                    userSelect: 'text',
                    WebkitUserSelect: 'text',
                  }}
                />
              </div>
            )}

            {guides.x !== undefined && (
              <div style={{ position: 'absolute', left: guides.x, top: 0, bottom: 0, width: 2 / scale, background: '#F02D63', zIndex: 9999 }} />
            )}
            {guides.y !== undefined && (
              <div style={{ position: 'absolute', top: guides.y, left: 0, right: 0, height: 2 / scale, background: '#F02D63', zIndex: 9999 }} />
            )}
          </div>

          {/* Selection chrome with 8 handles and persistent border */}
          {selected && displaySelected && !editingId && !isGroupSelection && (
            <Selection
              el={displaySelected}
              scale={scale}
              onStartEdit={() => startEdit(selected.id)}
              onCrop={() => onCropImage?.(selected.id)}
              onQuick={{ del, duplicate, reorder, replace: onRequestImage }}
            />
          )}

          {/* Multi-selection chrome: axis-aligned bbox (members can have
              different individual rotations, so the box itself never
              rotates), move/resize/rotate-as-a-group handles, quick actions. */}
          {isGroupSelection && displayGroupBBox && !editingId && (
            <GroupSelection
              bbox={displayGroupBBox}
              scale={scale}
              count={selectedElsBase.length}
              isGrouped={isWholePermanentGroup}
              onQuick={{
                group: () => groupElements(selectedIds),
                ungroup: () => { if (asPermanentGroupId) ungroupElements(selectedElsBase[0].id); },
                duplicate: () => duplicateMany(selectedIds),
                del: () => delMany(selectedIds),
              }}
            />
          )}
        </div>
      </div>

      {/* Marquee-select rectangle — wrap-local px, outside the pan/zoom
          transform since it's a screen-space drag gesture, not a canvas one. */}
      {marqueeRect && (
        <div
          className="absolute border-2 border-brand bg-brand/10 rounded-sm"
          style={{ ...marqueeRect, pointerEvents: 'none', zIndex: 10001 }}
        />
      )}

      {zoom !== 1 && (
        <div
          className="absolute left-3 bottom-3 rounded-full bg-ink/80 text-white text-[11px] font-semibold px-2.5 py-1 backdrop-blur-sm"
          style={{ pointerEvents: 'none' }}
        >
          {Math.round(zoom * 100)}%
        </div>
      )}
    </div>
  );
}

function Selection({
  el,
  scale,
  onStartEdit,
  onCrop,
  onQuick,
}: {
  el: DesignElement;
  scale: number;
  onStartEdit: () => void;
  onCrop: () => void;
  onQuick: {
    del: (id: string) => void;
    duplicate: (id: string) => void;
    reorder: (id: string, d: 'front' | 'back' | 'up' | 'down') => void;
    replace: (id: string) => void;
  };
}) {
  const box = { left: el.x * scale, top: el.y * scale, width: el.width * scale, height: el.height * scale };
  // Full 8-handle set for rich Photoshop/Canva style resizing
  const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;

  return (
    <div
      data-selection-id={el.id}
      className="absolute"
      style={{ ...box, transform: `rotate(${el.rotation}deg)`, zIndex: 10000, pointerEvents: 'none' }}
    >
      {/* Selection outline border with data-el so clicking border maintains selection and allows dragging */}
      <div
        data-el={el.id}
        className="absolute inset-0 border-2 border-brand rounded-[3px]"
        style={{ pointerEvents: 'auto', cursor: 'move' }}
      />

      {/* 8 Resizing handles - substantially smaller and clearly distinguished */}
      {handles.map((h) => {
        const isCorner = h.length === 2;
        const isEW = h === 'w' || h === 'e';
        const isNS = h === 'n' || h === 's';

        const style: React.CSSProperties = { position: 'absolute', pointerEvents: 'auto', touchAction: 'none' };
        if (isCorner) {
          if (h.includes('n')) style.top = -5;
          else if (h.includes('s')) style.bottom = -5;
          if (h.includes('w')) style.left = -5;
          else if (h.includes('e')) style.right = -5;
        } else if (isNS) {
          if (h === 'n') style.top = -2.5;
          else style.bottom = -2.5;
          style.left = '50%';
          style.marginLeft = -7;
        } else if (isEW) {
          if (h === 'w') style.left = -2.5;
          else style.right = -2.5;
          style.top = '50%';
          style.marginTop = -7;
        }

        return (
          <div
            key={h}
            data-handle={h}
            className="before:content-[''] before:absolute before:-inset-2.5 before:z-10"
            style={{
              ...style,
              width: isCorner ? 10 : isEW ? 5 : 14,
              height: isCorner ? 10 : isEW ? 14 : 5,
              borderRadius: 999,
              background: '#fff',
              border: '1.5px solid #F02D63',
              boxShadow: '0 1px 3px rgba(18,19,26,.3)',
              cursor: isCorner ? `${h}-resize` : isEW ? 'ew-resize' : 'ns-resize',
            }}
          />
        );
      })}

      {/* Rotate Knob */}
      <div
        data-handle="rotate"
        className="before:content-[''] before:absolute before:-inset-2 before:z-10"
        style={{
          position: 'absolute', bottom: -36, left: '50%', marginLeft: -16,
          width: 22, height: 22, borderRadius: 999, background: '#fff',
          border: '1.5px solid #F02D63', pointerEvents: 'auto', touchAction: 'none',
          display: 'grid', placeItems: 'center', boxShadow: '0 1px 4px rgba(18,19,26,.25)',
          cursor: 'grab',
        }}
      >
        <RotateCw size={12} color="#F02D63" strokeWidth={2.2} />
      </div>

      {/* Move Knob (Crosshair) */}
      <div
        data-handle="move"
        className="before:content-[''] before:absolute before:-inset-2 before:z-10"
        style={{
          position: 'absolute', bottom: -36, left: '50%', marginLeft: 16,
          width: 22, height: 22, borderRadius: 999, background: '#fff',
          border: '1.5px solid #F02D63', pointerEvents: 'auto', touchAction: 'none',
          display: 'grid', placeItems: 'center', boxShadow: '0 1px 4px rgba(18,19,26,.25)',
          cursor: 'move',
        }}
      >
        <Move size={12} color="#F02D63" strokeWidth={2.2} />
      </div>

      {/* Floating Quick Action Bar */}
      <div
        style={{
          position: 'absolute',
          top: -54,
          left: '50%',
          transform: `translateX(-50%) rotate(${-el.rotation}deg)`,
          pointerEvents: 'auto',
        }}
        className="flex items-center gap-1 rounded-full bg-ink text-white px-2 py-1 shadow-xl border border-white/10 backdrop-blur-md"
      >
        {el.type === 'text' && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onStartEdit}
            className="px-2.5 py-1 rounded-full bg-brand text-white text-[12px] font-bold flex items-center gap-1 active:bg-brand-dark"
          >
            <Edit3 size={13} />
            <span>Edit</span>
          </button>
        )}

        {el.type === 'image' && (
          <>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onCrop}
              className="px-2.5 py-1 rounded-full bg-brand text-white text-[12px] font-bold flex items-center gap-1 active:bg-brand-dark"
            >
              <Crop size={13} />
              <span>Crop</span>
            </button>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onQuick.replace(el.id)}
              className="p-1.5 rounded-full active:bg-white/15 text-white/90"
              title="Replace image"
            >
              <IcSwap size={16} />
            </button>
          </>
        )}

        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onQuick.duplicate(el.id)}
          className="p-1.5 rounded-full active:bg-white/15 text-white/90"
          title="Duplicate"
        >
          <IcCopy size={16} />
        </button>

        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onQuick.del(el.id)}
          className="p-1.5 rounded-full active:bg-white/15 text-[#FF8E9E]"
          title="Delete"
        >
          <IcTrash size={16} />
        </button>

        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => {
            // Trigger more menu
            const ev = new CustomEvent('open-more-menu', { detail: { id: el.id } });
            window.dispatchEvent(ev);
          }}
          className="p-1.5 rounded-full active:bg-white/15 text-white/90"
          title="More options"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>
    </div>
  );
}

/**
 * Chrome for a multi-selection (2+ elements). Deliberately simpler than the
 * single-element Selection: the box never rotates as a whole (members can
 * each have a different individual rotation — see gestureMath's
 * applyGroupRotate), and the frame itself ignores pointer events so taps
 * still land on individual members underneath (that's what lets dragging
 * any one member move the whole group — see onPointerDown). The move knob
 * below is the reliable fallback for dragging from an empty gap inside the
 * box.
 */
function GroupSelection({
  bbox, scale, count, isGrouped, onQuick,
}: {
  bbox: Rect;
  scale: number;
  count: number;
  isGrouped: boolean;
  onQuick: { group: () => void; ungroup: () => void; duplicate: () => void; del: () => void };
}) {
  const box = { left: bbox.x * scale, top: bbox.y * scale, width: bbox.width * scale, height: bbox.height * scale };
  const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;

  return (
    <div id="group-selection-bbox" data-selection-id="group" className="absolute" style={{ ...box, zIndex: 10000, pointerEvents: 'none' }}>
      <div className="absolute inset-0 border-2 border-dashed border-brand rounded-[3px]" style={{ pointerEvents: 'none' }} />

      {handles.map((h) => {
        const isCorner = h.length === 2;
        const isEW = h === 'w' || h === 'e';
        const isNS = h === 'n' || h === 's';
        const style: React.CSSProperties = { position: 'absolute', pointerEvents: 'auto', touchAction: 'none' };
        if (isCorner) {
          if (h.includes('n')) style.top = -5;
          else if (h.includes('s')) style.bottom = -5;
          if (h.includes('w')) style.left = -5;
          else if (h.includes('e')) style.right = -5;
        } else if (isNS) {
          if (h === 'n') style.top = -2.5;
          else style.bottom = -2.5;
          style.left = '50%';
          style.marginLeft = -7;
        } else if (isEW) {
          if (h === 'w') style.left = -2.5;
          else style.right = -2.5;
          style.top = '50%';
          style.marginTop = -7;
        }
        return (
          <div
            key={h}
            data-handle={h}
            className="before:content-[''] before:absolute before:-inset-2.5 before:z-10"
            style={{
              ...style,
              width: isCorner ? 10 : isEW ? 5 : 14,
              height: isCorner ? 10 : isEW ? 14 : 5,
              borderRadius: 999,
              background: '#fff',
              border: '1.5px solid #F02D63',
              boxShadow: '0 1px 3px rgba(18,19,26,.3)',
              cursor: isCorner ? `${h}-resize` : isEW ? 'ew-resize' : 'ns-resize',
            }}
          />
        );
      })}

      {/* Rotate knob — rotates every member around the group's shared center */}
      <div
        data-handle="rotate"
        className="before:content-[''] before:absolute before:-inset-2 before:z-10"
        style={{
          position: 'absolute', bottom: -36, left: '50%', marginLeft: -16,
          width: 22, height: 22, borderRadius: 999, background: '#fff',
          border: '1.5px solid #F02D63', pointerEvents: 'auto', touchAction: 'none',
          display: 'grid', placeItems: 'center', boxShadow: '0 1px 4px rgba(18,19,26,.25)',
          cursor: 'grab',
        }}
      >
        <RotateCw size={12} color="#F02D63" strokeWidth={2.2} />
      </div>

      {/* Move knob — always-reliable group drag, for taps that land in a
          gap inside the box rather than on a member. */}
      <div
        data-handle="move"
        className="before:content-[''] before:absolute before:-inset-2 before:z-10"
        style={{
          position: 'absolute', bottom: -36, left: '50%', marginLeft: 16,
          width: 22, height: 22, borderRadius: 999, background: '#fff',
          border: '1.5px solid #F02D63', pointerEvents: 'auto', touchAction: 'none',
          display: 'grid', placeItems: 'center', boxShadow: '0 1px 4px rgba(18,19,26,.25)',
          cursor: 'move',
        }}
      >
        <Move size={12} color="#F02D63" strokeWidth={2.2} />
      </div>

      {/* Floating quick actions */}
      <div
        style={{ position: 'absolute', top: -54, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'auto' }}
        className="flex items-center gap-1 rounded-full bg-ink text-white pl-3 pr-2 py-1 shadow-xl border border-white/10 backdrop-blur-md whitespace-nowrap"
      >
        <span className="text-[12px] font-bold text-white/80 mr-0.5">{count} selected</span>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={isGrouped ? onQuick.ungroup : onQuick.group}
          className="px-2.5 py-1 rounded-full bg-brand text-white text-[12px] font-bold flex items-center gap-1 active:bg-brand-dark"
        >
          <Group size={13} />
          <span>{isGrouped ? 'Ungroup' : 'Group'}</span>
        </button>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onQuick.duplicate}
          className="p-1.5 rounded-full active:bg-white/15 text-white/90"
          title="Duplicate"
        >
          <IcCopy size={16} />
        </button>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onQuick.del}
          className="p-1.5 rounded-full active:bg-white/15 text-[#FF8E9E]"
          title="Delete"
        >
          <IcTrash size={16} />
        </button>
      </div>
    </div>
  );
}
