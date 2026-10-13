import React from 'react';
import { useStore } from '../store/useStore';
import { IcBack, IcFolder, IcTrash } from '../ui/icons';
import { LiveThumbnail } from '../components/LiveThumbnail';

export function DesignsScreen({ onBack }: { onBack: () => void }) {
  const projects = useStore((s) => s.projects);
  const open = useStore((s) => s.open);
  const remove = useStore((s) => s.remove);
  const list = [...projects].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="h-full bg-canvasbg flex flex-col">
      <header className="flex items-center gap-2 px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] bg-surface border-b border-line shrink-0">
        <button onClick={onBack} className="w-10 h-10 rounded-full grid place-items-center text-ink"><IcBack size={22} /></button>
        <span className="text-[15px] font-bold text-ink">My designs</span>
      </header>

      {list.length === 0 ? (
        <div className="flex-1 grid place-items-center text-ink-3">
          <div className="text-center">
            <IcFolder size={36} className="mx-auto mb-2" />
            <p className="text-[13px]">Nothing saved yet.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-2 gap-x-3 gap-y-4 no-scrollbar">
          {list.map((p) => (
            <div key={p.id}>
              <button
                onClick={() => open(p.id)}
                className="w-full rounded-2xl overflow-hidden bg-surface border border-line"
                style={{ aspectRatio: `${p.canvas.width}/${p.canvas.height}` }}
              >
                <LiveThumbnail project={p} />
              </button>
              <div className="flex items-center gap-1 mt-1.5">
                <span className="flex-1 text-[12.5px] font-semibold text-ink truncate">{p.name}</span>
                <button onClick={() => remove(p.id)} className="p-1 text-ink-3 active:text-brand"><IcTrash size={15} /></button>
              </div>
              <div className="text-[10.5px] text-ink-3">{new Date(p.updatedAt).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
