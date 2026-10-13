import React, { useEffect } from 'react';
import { Undo2 } from 'lucide-react';
import { useStore } from '../store/useStore';

/**
 * Brief feedback for things that otherwise just happen silently (a layer
 * vanishing, a group forming). Destructive actions get an Undo button and
 * stay a little longer so there's time to reach it.
 */
export function Toast() {
  const toast = useStore((s) => s.toast);
  const dismiss = useStore((s) => s.dismissToast);
  const undo = useStore((s) => s.undo);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(dismiss, toast.undoable ? 5000 : 2500);
    return () => clearTimeout(t);
  }, [toast?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!toast) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute left-1/2 -translate-x-1/2 bottom-4 z-[900] flex items-center gap-2 rounded-full bg-ink text-white text-[13px] font-semibold pl-4 pr-2 py-1.5 shadow-xl animate-fade-in"
    >
      <span>{toast.message}</span>
      {toast.undoable && (
        <button
          onClick={() => { undo(); dismiss(); }}
          className="h-9 px-3 rounded-full bg-white/15 active:bg-white/25 flex items-center gap-1.5 font-bold"
        >
          <Undo2 size={15} />
          <span>Undo</span>
        </button>
      )}
    </div>
  );
}
