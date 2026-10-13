import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import { Background, CanvasSize, CustomTemplate, DesignElement, Project, ProfileMode } from '../types';
import { computeAlign, computeDistribute } from '../editor/gestureMath';
import { adjustRunsForTextChange } from '../editor/richText';
import { createDebouncedStorage } from '../utils/debouncedStorage';

type Snapshot = { background: Background; elements: DesignElement[] };

// Debounced localStorage writer (see utils/debouncedStorage.ts). A rejected
// write now tells the person instead of silently dropping their edits.
const debouncedStorage = createDebouncedStorage(() => localStorage, {
  onFull: () =>
    useStore.getState().showToast('Storage is full — your latest changes may not be saved. Delete old designs or use smaller photos.'),
  onNearlyFull: () =>
    useStore.getState().showToast('Storage is almost full — consider deleting old designs.'),
});

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', debouncedStorage.flush);
  window.addEventListener('pagehide', debouncedStorage.flush);
}

interface State {
  projects: Project[];
  customTemplates: CustomTemplate[];
  currentId: string | null;
  selectedId: string | null;
  /** Ids currently multi-selected on the canvas (marquee, shift-click, long-press).
   *  Kept in sync with selectedId: single-select sets both; 0 or 1 entries
   *  means "not really multi" for any code that only looks at selectedId. */
  selectedIds: string[];
  /** Saved once, reused on every new design. */
  savedHandle: string;
  savedAvatar: string | null;
  savedProfileMode: ProfileMode;
  theme: 'light' | 'dark' | 'system';
  past: Snapshot[];
  future: Snapshot[];

  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  create: (o: { templateId: string; canvas: CanvasSize; background: Background; elements: DesignElement[]; name: string }) => string;
  open: (id: string) => void;
  close: () => void;
  remove: (id: string) => void;
  rename: (id: string, name: string) => void;
  setThumb: (id: string, url: string) => void;

  saveCustomTemplate: (name: string, tag?: string) => string | null;
  deleteCustomTemplate: (id: string) => void;

  current: () => Project | undefined;
  snapshot: () => void;
  undo: () => void;
  redo: () => void;

  select: (id: string | null) => void;
  /** Replaces the whole multi-selection, e.g. after a marquee-drag ends. */
  selectMany: (ids: string[]) => void;
  /** Adds/removes one id from the current multi-selection (shift-click, long-press). */
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  update: (id: string, patch: Partial<DesignElement>) => void;
  updateMany: (patches: { id: string; patch: Partial<DesignElement> }[]) => void;
  add: (el: DesignElement) => void;
  del: (id: string) => void;
  delMany: (ids: string[]) => void;
  duplicate: (id: string) => void;
  duplicateMany: (ids: string[]) => void;
  reorder: (id: string, dir: 'front' | 'back' | 'up' | 'down') => void;
  /** Brings/sends every id in the selection to front/back, preserving their relative order. */
  reorderMany: (ids: string[], dir: 'front' | 'back') => void;
  alignSelection: (ids: string[], mode: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom') => void;
  /** Equal gaps between 3+ selected layers; the two outermost stay put. */
  distributeSelection: (ids: string[], axis: 'h' | 'v') => void;
  /** Transient feedback message (never persisted). `undoable` shows an Undo button. */
  toast: { id: number; message: string; undoable: boolean } | null;
  showToast: (message: string, undoable?: boolean) => void;
  dismissToast: () => void;
  /** Assigns a shared groupId to every id passed in, so they move together. */
  groupElements: (ids: string[]) => void;
  /** Clears groupId from every element that shares this element's group. */
  ungroupElements: (id: string) => void;
  copyElement: (id: string) => void;
  pasteElement: () => void;
  copyStyle: (id: string) => void;
  pasteStyle: (id: string) => void;
  clipboardElement: DesignElement | null;
  clipboardStyle: { type: string; style: any } | null;
  setBackground: (patch: Partial<Background>) => void;
  replaceDesign: (d: Snapshot) => void;

  setProfileMode: (m: ProfileMode) => void;
  setHandle: (h: string) => void;
  setAvatar: (src: string | null) => void;

  setProjectProfileMode: (m: ProfileMode) => void;
  setProjectHandle: (h: string) => void;
  setProjectAvatar: (src: string | null) => void;
}

const patchProjects = (ps: Project[], id: string | null, fn: (p: Project) => Project) =>
  id ? ps.map((p) => (p.id === id ? { ...fn(p), updatedAt: Date.now() } : p)) : ps;

/** Visibility of identity elements follows the chosen profile mode. */
function applyProfile(els: DesignElement[], mode: ProfileMode, handle: string, avatar: string | null): DesignElement[] {
  return els.map((e) => {
    if (e.role === 'profile-picture' && e.type === 'image') {
      return { ...e, src: avatar, hidden: mode !== 'picture-and-handle' };
    }
    if (e.role === 'handle' && e.type === 'text') {
      return { ...e, text: handle || '@yourhandle', hidden: mode === 'none' };
    }
    return e;
  });
}

/**
 * Merges a patch into an element. If the patch rewrites a text layer's text
 * without also supplying `runs` (the rich editor always supplies them), the
 * layer's per-character formatting is carried along rather than left pointing
 * at the wrong characters.
 */
function mergePatch(e: DesignElement, patch: Partial<DesignElement>): DesignElement {
  const merged = { ...e, ...patch } as any;
  const old = e as any;
  if (e.type === 'text' && 'text' in patch && patch.text !== old.text && !('runs' in patch) && old.runs?.length) {
    const runs = adjustRunsForTextChange(old.text, (patch as any).text, old.runs);
    merged.runs = runs.length ? runs : undefined;
  }
  return merged as DesignElement;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      projects: [],
      customTemplates: [],
      currentId: null,
      selectedId: null,
      selectedIds: [],
      toast: null,
      savedHandle: '',
      savedAvatar: null,
      savedProfileMode: 'handle-only',
      theme: 'light',
      past: [],
      future: [],
      clipboardElement: null,
      clipboardStyle: null,

      setTheme: (theme) => set({ theme }),

      saveCustomTemplate: (name: string, tag = 'Custom') => {
        const p = get().current();
        if (!p) return null;
        const newTemplate: CustomTemplate = {
          id: `custom-${uuid()}`,
          name: name.trim() || 'Custom Template',
          tag: tag.trim() || 'Custom',
          canvas: p.canvas,
          background: JSON.parse(JSON.stringify(p.background)),
          elements: JSON.parse(JSON.stringify(p.elements)),
          createdAt: Date.now(),
          thumbnail: p.thumbnail,
        };
        set((s) => ({ customTemplates: [newTemplate, ...s.customTemplates] }));
        return newTemplate.id;
      },

      deleteCustomTemplate: (id: string) => {
        set((s) => ({ customTemplates: s.customTemplates.filter((t) => t.id !== id) }));
      },

      create: ({ templateId, canvas, background, elements, name }) => {
        const id = uuid();
        const { savedHandle, savedAvatar, savedProfileMode } = get();
        const p: Project = {
          id, name, templateId, canvas, background,
          elements: applyProfile(elements, savedProfileMode, savedHandle, savedAvatar),
          profileMode: savedProfileMode,
          handle: savedHandle || '@yourhandle',
          avatar: savedAvatar,
          createdAt: Date.now(), updatedAt: Date.now(),
        };
        set((s) => ({ projects: [...s.projects, p], currentId: id, selectedId: null, selectedIds: [], past: [], future: [] }));
        return id;
      },

      open: (id) => set({ currentId: id, selectedId: null, selectedIds: [], past: [], future: [] }),
      close: () => set({ currentId: null, selectedId: null, selectedIds: [], past: [], future: [] }),
      remove: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id), currentId: s.currentId === id ? null : s.currentId })),
      rename: (id, name) => set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, name } : p)) })),
      setThumb: (id, url) => set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, thumbnail: url } : p)) })),

      current: () => get().projects.find((p) => p.id === get().currentId),

      snapshot: () => {
        const p = get().current();
        if (!p) return;
        set((s) => ({ past: [...s.past, { background: p.background, elements: p.elements }].slice(-80), future: [] }));
      },

      undo: () => {
        const s = get(); const p = s.current();
        if (!p || !s.past.length) return;
        const prev = s.past[s.past.length - 1];
        set({
          projects: patchProjects(s.projects, s.currentId, (x) => ({ ...x, ...prev })),
          past: s.past.slice(0, -1),
          future: [{ background: p.background, elements: p.elements }, ...s.future],
          selectedId: null,
          selectedIds: [],
        });
      },

      redo: () => {
        const s = get(); const p = s.current();
        if (!p || !s.future.length) return;
        const next = s.future[0];
        set({
          projects: patchProjects(s.projects, s.currentId, (x) => ({ ...x, ...next })),
          past: [...s.past, { background: p.background, elements: p.elements }],
          future: s.future.slice(1),
          selectedId: null,
          selectedIds: [],
        });
      },

      select: (id) => set({ selectedId: id, selectedIds: id ? [id] : [] }),

      selectMany: (ids) => set({ selectedIds: ids, selectedId: ids.length ? ids[ids.length - 1] : null }),

      toggleSelect: (id) =>
        set((s) => {
          const next = s.selectedIds.includes(id) ? s.selectedIds.filter((x) => x !== id) : [...s.selectedIds, id];
          return { selectedIds: next, selectedId: next.length ? next[next.length - 1] : null };
        }),

      clearSelection: () => set({ selectedId: null, selectedIds: [] }),

      update: (id, patch) =>
        set((s) => ({
          projects: patchProjects(s.projects, s.currentId, (p) => ({
            ...p, elements: p.elements.map((e) => (e.id === id ? mergePatch(e, patch) : e)),
          })),
        })),

      updateMany: (patches) => {
        if (!patches.length) return;
        const patchMap = new Map(patches.map((p) => [p.id, p.patch]));
        set((s) => ({
          projects: patchProjects(s.projects, s.currentId, (p) => ({
            ...p,
            elements: p.elements.map((e) => {
              const pItem = patchMap.get(e.id);
              return pItem ? mergePatch(e, pItem) : e;
            }),
          })),
        }));
      },

      add: (el) => {
        get().snapshot();
        set((s) => ({
          projects: patchProjects(s.projects, s.currentId, (p) => ({ ...p, elements: [...p.elements, el] })),
          selectedId: el.id,
        }));
      },

      del: (id) => {
        get().snapshot();
        set((s) => ({
          projects: patchProjects(s.projects, s.currentId, (p) => ({ ...p, elements: p.elements.filter((e) => e.id !== id) })),
          selectedId: null,
          selectedIds: [],
        }));
        get().showToast('Layer deleted', true);
      },

      delMany: (ids) => {
        if (!ids.length) return;
        get().snapshot();
        set((s) => ({
          projects: patchProjects(s.projects, s.currentId, (p) => ({ ...p, elements: p.elements.filter((e) => !ids.includes(e.id)) })),
          selectedId: null,
          selectedIds: [],
        }));
        get().showToast(ids.length === 1 ? 'Layer deleted' : `${ids.length} layers deleted`, true);
      },

      duplicate: (id) => {
        get().snapshot();
        set((s) => {
          const p = s.current(); if (!p) return s;
          const src = p.elements.find((e) => e.id === id); if (!src) return s;
          const maxZ = Math.max(...p.elements.map((e) => e.z), 0);
          const copy = { ...src, id: uuid(), x: src.x + 24, y: src.y + 24, z: maxZ + 1 } as DesignElement;
          return {
            projects: patchProjects(s.projects, s.currentId, (x) => ({ ...x, elements: [...x.elements, copy] })),
            selectedId: copy.id,
          };
        });
      },

      duplicateMany: (ids) => {
        if (!ids.length) return;
        get().snapshot();
        set((s) => {
          const p = s.current(); if (!p) return s;
          const maxZ = Math.max(...p.elements.map((e) => e.z), 0);
          const srcs = p.elements.filter((e) => ids.includes(e.id));
          // If the whole selection is exactly one permanent group, the
          // copies should form their own new group too — otherwise (an
          // ad-hoc marquee/shift-click selection, or a partial slice of a
          // group) they come out independent, same as before.
          const srcGroupId = srcs[0]?.groupId;
          const isWholeGroup = !!srcGroupId && srcs.every((s2) => s2.groupId === srcGroupId) && p.elements.filter((e) => e.groupId === srcGroupId).length === srcs.length;
          const newGroupId = isWholeGroup ? uuid() : undefined;
          const copies = srcs.map((src, i) => ({ ...src, id: uuid(), x: src.x + 24, y: src.y + 24, z: maxZ + 1 + i, groupId: newGroupId } as DesignElement));
          return {
            projects: patchProjects(s.projects, s.currentId, (x) => ({ ...x, elements: [...x.elements, ...copies] })),
            selectedIds: copies.map((c) => c.id),
            selectedId: copies.length ? copies[copies.length - 1].id : null,
          };
        });
      },

      reorderMany: (ids, dir) => {
        if (!ids.length) return;
        get().snapshot();
        set((s) => {
          const p = s.current(); if (!p) return s;
          const sorted = [...p.elements].sort((a, b) => a.z - b.z);
          const picked = sorted.filter((e) => ids.includes(e.id));
          const rest = sorted.filter((e) => !ids.includes(e.id));
          const reordered = dir === 'front' ? [...rest, ...picked] : [...picked, ...rest];
          return { projects: patchProjects(s.projects, s.currentId, (x) => ({ ...x, elements: reordered.map((e, i) => ({ ...e, z: i })) })) };
        });
      },

      showToast: (message, undoable = false) => set({ toast: { id: Date.now() + Math.random(), message, undoable } }),
      dismissToast: () => set({ toast: null }),

      distributeSelection: (ids, axis) => {
        const p = get().current();
        if (!p) return;
        const members = p.elements.filter((e) => ids.includes(e.id) && !e.locked).map((e) => ({ id: e.id, x: e.x, y: e.y, width: e.width, height: e.height }));
        if (members.length < 3) return;
        get().snapshot();
        get().updateMany(
          computeDistribute(members, axis).map((pt) => ({
            id: pt.id,
            patch: { ...(pt.x !== undefined ? { x: Math.round(pt.x) } : {}), ...(pt.y !== undefined ? { y: Math.round(pt.y) } : {}) },
          }))
        );
      },

      alignSelection: (ids, mode) => {
        const p = get().current();
        if (!p) return;
        const members = p.elements.filter((e) => ids.includes(e.id)).map((e) => ({ id: e.id, x: e.x, y: e.y, width: e.width, height: e.height }));
        if (members.length < 2) return;
        get().snapshot();
        const patches = computeAlign(members, mode);
        get().updateMany(
          patches.map((pt) => ({
            id: pt.id,
            patch: {
              ...(pt.x !== undefined ? { x: Math.round(pt.x) } : {}),
              ...(pt.y !== undefined ? { y: Math.round(pt.y) } : {}),
            },
          }))
        );
      },

      reorder: (id, dir) => {
        get().snapshot();
        set((s) => {
          const p = s.current(); if (!p) return s;
          const els = [...p.elements].sort((a, b) => a.z - b.z);
          const i = els.findIndex((e) => e.id === id); if (i < 0) return s;
          if (dir === 'up' && i < els.length - 1) { const t = els[i].z; els[i] = { ...els[i], z: els[i + 1].z }; els[i + 1] = { ...els[i + 1], z: t }; }
          else if (dir === 'down' && i > 0) { const t = els[i].z; els[i] = { ...els[i], z: els[i - 1].z }; els[i - 1] = { ...els[i - 1], z: t }; }
          else if (dir === 'front') els[i] = { ...els[i], z: Math.max(...els.map((e) => e.z)) + 1 };
          else if (dir === 'back') els[i] = { ...els[i], z: Math.min(...els.map((e) => e.z)) - 1 };
          return { projects: patchProjects(s.projects, s.currentId, (x) => ({ ...x, elements: els })) };
        });
      },

      setBackground: (patch) =>
        set((s) => ({ projects: patchProjects(s.projects, s.currentId, (p) => ({ ...p, background: { ...p.background, ...patch } })) })),

      groupElements: (ids) => {
        if (ids.length < 2) return;
        get().snapshot();
        const gid = uuid();
        set((s) => ({
          projects: patchProjects(s.projects, s.currentId, (p) => ({
            ...p, elements: p.elements.map((e) => (ids.includes(e.id) ? { ...e, groupId: gid } : e)),
          })),
        }));
        get().showToast(`Grouped ${ids.length} layers`);
      },

      ungroupElements: (id) => {
        get().snapshot();
        set((s) => {
          const p = s.current(); if (!p) return s;
          const target = p.elements.find((e) => e.id === id);
          const gid = target?.groupId;
          if (!gid) return s;
          return {
            projects: patchProjects(s.projects, s.currentId, (x) => ({
              ...x, elements: x.elements.map((e) => (e.groupId === gid ? { ...e, groupId: undefined } : e)),
            })),
          };
        });
        get().showToast('Ungrouped');
      },

      copyElement: (id) => {
        const p = get().current(); if (!p) return;
        const el = p.elements.find((e) => e.id === id); if (!el) return;
        set({ clipboardElement: JSON.parse(JSON.stringify(el)) });
      },

      pasteElement: () => {
        const ce = get().clipboardElement; if (!ce) return;
        get().snapshot();
        set((s) => {
          const p = s.current(); if (!p) return s;
          const maxZ = Math.max(...p.elements.map((e) => e.z), 0);
          const copy = { ...ce, id: uuid(), x: ce.x + 24, y: ce.y + 24, z: maxZ + 1, groupId: undefined } as DesignElement;
          return {
            projects: patchProjects(s.projects, s.currentId, (x) => ({ ...x, elements: [...x.elements, copy] })),
            selectedId: copy.id,
          };
        });
      },

      copyStyle: (id) => {
        const p = get().current(); if (!p) return;
        const el = p.elements.find((e) => e.id === id); if (!el) return;
        const { id: _id, type, x, y, width, height, rotation, z, name, role, groupId, hidden, locked, ...rest } = el as any;
        const style = { ...rest };
        if (type === 'text') { delete style.text; delete style.runs; } // per-character ranges belong to this layer's text
        if (type === 'image') delete style.src;
        set({ clipboardStyle: { type, style } });
      },

      pasteStyle: (id) => {
        const cs = get().clipboardStyle; if (!cs) return;
        const p = get().current(); if (!p) return;
        const el = p.elements.find((e) => e.id === id); if (!el || el.type !== cs.type) return;
        get().snapshot();
        set((s) => ({
          projects: patchProjects(s.projects, s.currentId, (x) => ({
            ...x, elements: x.elements.map((e) => (e.id === id ? ({ ...e, ...cs.style } as DesignElement) : e)),
          })),
        }));
      },

      replaceDesign: (d) => {
        get().snapshot();
        set((s) => ({
          projects: patchProjects(s.projects, s.currentId, (p) => ({
            ...p, background: d.background,
            elements: applyProfile(d.elements, p.profileMode, p.handle, p.avatar),
          })),
          selectedId: null,
          selectedIds: [],
        }));
      },

      setProfileMode: (mode) =>
        set((s) => ({ savedProfileMode: mode })),
      
      setHandle: (h) =>
        set((s) => ({ savedHandle: h })),

      setAvatar: (src) =>
        set((s) => ({ savedAvatar: src })),

      setProjectProfileMode: (mode) => {
        get().snapshot();
        set((s) => ({
          projects: patchProjects(s.projects, s.currentId, (p) => ({
            ...p, profileMode: mode, elements: applyProfile(p.elements, mode, p.handle, p.avatar),
          })),
        }));
      },

      setProjectHandle: (h) =>
        set((s) => ({
          projects: patchProjects(s.projects, s.currentId, (p) => ({
            ...p, handle: h, elements: applyProfile(p.elements, p.profileMode, h, p.avatar),
          })),
        })),

      setProjectAvatar: (src) =>
        set((s) => ({
          projects: patchProjects(s.projects, s.currentId, (p) => ({
            ...p, avatar: src, elements: applyProfile(p.elements, p.profileMode, p.handle, src),
          })),
        })),
    }),
    {
      name: 'ig-post-studio',
      storage: createJSONStorage(() => debouncedStorage),
      partialize: (s) => ({
        projects: s.projects,
        customTemplates: s.customTemplates,
        savedHandle: s.savedHandle,
        savedAvatar: s.savedAvatar,
        savedProfileMode: s.savedProfileMode,
      }),
    }
  )
);
