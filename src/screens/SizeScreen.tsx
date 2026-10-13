import React from 'react';
import { CANVAS_SIZES, CanvasSize } from '../types';
import { IcBack, IcSparkle } from '../ui/icons';
import { Wand2 } from 'lucide-react';

export function SizeScreen({
  onBack,
  onPick,
  onSwitchToSimple,
}: {
  onBack: () => void;
  onPick: (s: CanvasSize) => void;
  onSwitchToSimple?: () => void;
}) {
  return (
    <div className="h-full bg-canvasbg flex flex-col">
      <header className="flex items-center justify-between px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="w-10 h-10 rounded-full grid place-items-center text-ink active:bg-line/50">
            <IcBack size={22} />
          </button>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block leading-none">
              Advanced Studio
            </span>
            <span className="text-[13px] font-bold text-ink leading-tight">Step 1 of 2: Canvas Size</span>
          </div>
        </div>

        {onSwitchToSimple && (
          <button
            onClick={onSwitchToSimple}
            className="text-[12px] font-bold text-brand bg-brand-soft hover:bg-brand-soft/80 px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors mr-2"
          >
            <Wand2 size={12} />
            <span>Try Simple</span>
          </button>
        )}
      </header>

      <div className="px-5 pb-4">
        <h1 className="text-[26px] font-extrabold text-ink leading-tight">What shape is your post?</h1>
        <p className="text-[14px] text-ink-2 mt-1.5">Portrait takes up more room in the feed.</p>
      </div>

      <div className="px-5 space-y-3">
        {CANVAS_SIZES.map((s) => {
          const ratio = s.height / s.width;
          const maxBoxW = 54;
          const maxBoxH = 80;
          let w = maxBoxW;
          let h = Math.round(w * ratio);
          if (h > maxBoxH) {
            h = maxBoxH;
            w = Math.round(h / ratio);
          }
          return (
            <button
              key={s.key}
              onClick={() => onPick(s)}
              className="w-full bg-surface rounded-3xl p-4 flex items-center gap-4 text-left active:bg-line/40 border border-line/60 hover:border-brand/40 transition-colors"
            >
              <span className="w-24 h-24 grid place-items-center shrink-0">
                <span className="bg-brand rounded-xl block transition-all" style={{ width: w, height: h }} />
              </span>
              <span>
                <span className="block text-[17px] font-bold text-ink">{s.label}</span>
                <span className="block text-[12.5px] text-ink-3 mt-0.5">{s.note}</span>
              </span>
            </button>
          );
        })}
      </div>

      {onSwitchToSimple && (
        <div className="px-5 mt-5">
          <button
            onClick={onSwitchToSimple}
            className="w-full bg-brand-soft/70 hover:bg-brand-soft border border-brand/30 rounded-2xl p-3.5 flex items-center justify-between text-left active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-brand text-white grid place-items-center shrink-0">
                <Wand2 size={16} />
              </span>
              <div>
                <span className="block text-[13px] font-bold text-ink">Prefer the simple way?</span>
                <span className="block text-[11px] text-ink-2">Just type your text & get 20+ ready designs</span>
              </div>
            </div>
            <span className="text-[12px] font-extrabold text-brand shrink-0">Try Simple →</span>
          </button>
        </div>
      )}
    </div>
  );
}
