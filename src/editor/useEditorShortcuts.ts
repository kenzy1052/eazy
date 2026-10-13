import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

/**
 * Desktop keyboard shortcuts for the canvas. Reads the store directly at
 * keypress time (no stale closures) and stays out of the way whenever a text
 * field, the text editor, or a sheet/modal has the user's attention (`enabled`).
 *
 *   Delete/Backspace  delete selection      Ctrl/Cmd+Z, Shift+Z, Y   undo / redo
 *   Ctrl/Cmd+D        duplicate             Ctrl/Cmd+C, V            copy / paste a layer
 *   Ctrl/Cmd+A        select all            Ctrl/Cmd+G, Shift+G      group / ungroup
 *   Arrow keys        nudge 1px (Shift 10)  Escape                   deselect
 */
export function useEditorShortcuts(enabled: boolean) {
  const lastNudge = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      if (e.altKey) return;

      const st = useStore.getState();
      const project = st.current();
      if (!project) return;

      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const ids = st.selectedIds.length ? st.selectedIds : st.selectedId ? [st.selectedId] : [];
      const movable = project.elements.filter((el) => ids.includes(el.id) && !el.locked);

      if (mod && key === 'z') { e.preventDefault(); e.shiftKey ? st.redo() : st.undo(); return; }
      if (mod && key === 'y') { e.preventDefault(); st.redo(); return; }

      if (mod && key === 'a') {
        e.preventDefault();
        st.selectMany(project.elements.filter((el) => !el.hidden && !el.locked).map((el) => el.id));
        return;
      }
      if (mod && key === 'd') {
        e.preventDefault();
        if (ids.length === 1) st.duplicate(ids[0]);
        else if (ids.length > 1) st.duplicateMany(ids);
        return;
      }
      if (mod && key === 'c') { if (ids.length === 1) st.copyElement(ids[0]); return; }
      if (mod && key === 'v') { if (st.clipboardElement) { e.preventDefault(); st.pasteElement(); } return; }
      if (mod && key === 'g') {
        e.preventDefault();
        if (e.shiftKey) { if (ids.length) st.ungroupElements(ids[0]); }
        else if (ids.length > 1) st.groupElements(ids);
        return;
      }
      if (mod) return;

      if (key === 'escape') { if (ids.length) st.clearSelection(); return; }

      if (key === 'delete' || key === 'backspace') {
        if (!movable.length) return;
        e.preventDefault();
        if (movable.length === 1) st.del(movable[0].id);
        else st.delMany(movable.map((el) => el.id));
        return;
      }

      const arrows: Record<string, [number, number]> = {
        arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1],
      };
      if (arrows[key] && movable.length) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const [dx, dy] = arrows[key];
        // One undo step per burst of key presses, not one per press.
        const now = Date.now();
        if (now - lastNudge.current > 800) st.snapshot();
        lastNudge.current = now;
        st.updateMany(movable.map((el) => ({ id: el.id, patch: { x: el.x + dx * step, y: el.y + dy * step } })));
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}
