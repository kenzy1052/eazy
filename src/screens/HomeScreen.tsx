import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { IcPlus, IcSparkle, IcFolder } from '../ui/icons';
import { LiveThumbnail } from '../components/LiveThumbnail';
import { CreateModeModal } from '../components/CreateModeModal';
import { EazyPostLogo } from '../components/EazyPostLogo';
import { Wand2, Sliders, Settings } from 'lucide-react';

interface HomeScreenProps {
  onCreateSimple: () => void;
  onCreateAdvanced: () => void;
  onDesigns: () => void;
  onProfile: () => void;
}

export function HomeScreen({
  onCreateSimple,
  onCreateAdvanced,
  onDesigns,
  onProfile,
}: HomeScreenProps) {
  const [modeModalOpen, setModeModalOpen] = useState(false);
  const projects = useStore((s) => s.projects);
  const open = useStore((s) => s.open);
  const handle = useStore((s) => s.savedHandle);
  const recent = [...projects].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4);

  return (
    <div className="h-full overflow-y-auto bg-canvasbg no-scrollbar">
      {modeModalOpen && (
        <CreateModeModal
          onSelectSimple={() => {
            setModeModalOpen(false);
            onCreateSimple();
          }}
          onSelectAdvanced={() => {
            setModeModalOpen(false);
            onCreateAdvanced();
          }}
          onClose={() => setModeModalOpen(false)}
        />
      )}

      <div className="px-5 pt-[max(1.75rem,env(safe-area-inset-top))] pb-5">
        <div className="flex items-center gap-2 text-brand">
          <EazyPostLogo size={18} />
          <span className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-brand">EazyPost</span>
        </div>
        <h1 className="text-[30px] leading-[1.12] font-extrabold text-ink mt-1.5">
          Make a post<br />people stop for.
        </h1>
        <p className="text-[14px] text-ink-2 mt-2">
          Simple automatic designs or full layer editing.
        </p>
      </div>

      {/* Main Create Post Button */}
      <div className="px-5">
        <button
          onClick={() => setModeModalOpen(true)}
          className="w-full bg-brand text-white rounded-[26px] p-5 flex items-center gap-4 text-left shadow-md hover:bg-brand-dark active:scale-[0.99] transition-all"
        >
          <span className="w-14 h-14 rounded-3xl bg-white/20 grid place-items-center shrink-0">
            <IcPlus size={28} />
          </span>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="block text-[19px] font-extrabold">Create post</span>
              <span className="text-[11px] font-extrabold uppercase bg-white/25 px-2.5 py-0.5 rounded-full text-white">
                Start
              </span>
            </div>
            <span className="block text-[13px] text-white/80 mt-0.5">
              Tap to choose Simple or Advanced mode
            </span>
          </div>
        </button>
      </div>

      <div className="px-5 mt-4 grid grid-cols-2 gap-3">
        <button onClick={onDesigns} className="bg-surface rounded-3xl p-4 text-left active:bg-line/50 border border-line/60">
          <span className="w-10 h-10 rounded-2xl bg-canvasbg grid place-items-center text-ink mb-2.5">
            <IcFolder size={20} />
          </span>
          <span className="block text-[14px] font-bold text-ink">My designs</span>
          <span className="block text-[12px] text-ink-3">{projects.length} saved</span>
        </button>
        <button onClick={onProfile} className="bg-surface rounded-3xl p-4 text-left active:bg-line/50 border border-line/60">
          <span className="w-10 h-10 rounded-2xl bg-canvasbg grid place-items-center text-ink mb-2.5">
            <Settings size={20} />
          </span>
          <span className="block text-[14px] font-bold text-ink">Settings</span>
          <span className="block text-[12px] text-ink-3 truncate">{handle || 'Set your handle'}</span>
        </button>
      </div>

      {recent.length > 0 && (
        <div className="px-5 mt-7 pb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-ink">Pick up where you left off</h2>
            <button onClick={onDesigns} className="text-[13px] font-bold text-brand">All</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {recent.map((p) => (
              <button key={p.id} onClick={() => open(p.id)} className="text-left">
                <div
                  className="rounded-2xl overflow-hidden bg-surface border border-line"
                  style={{ aspectRatio: `${p.canvas.width}/${p.canvas.height}` }}
                >
                  <LiveThumbnail project={p} />
                </div>
                <div className="text-[12px] font-semibold text-ink truncate mt-1.5">{p.name}</div>
                <div className="text-[10.5px] text-ink-3">{p.canvas.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
