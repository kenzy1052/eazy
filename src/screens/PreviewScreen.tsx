import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { StaticDesign } from '../render/Render';
import { renderToJpeg, downloadImage, shareImage } from '../utils/exporter';
import { IcBack, IcCheck, IcDownload, IcShare } from '../ui/icons';

export function PreviewScreen({ onBack }: { onBack: () => void }) {
  const project = useStore((s) => s.projects.find((p) => p.id === s.currentId));
  const setThumb = useStore((s) => s.setThumb);
  const exportRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  const [busy, setBusy] = useState(false);
  const [jpeg, setJpeg] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const f = () => { if (wrapRef.current && project) setScale(wrapRef.current.clientWidth / project.canvas.width); };
    f();
    const ro = new ResizeObserver(f);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [project?.canvas]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!project) return null;
  const file = `${project.name.replace(/\s+/g, '-').toLowerCase()}-${project.canvas.width}x${project.canvas.height}.jpg`;

  const make = async () => {
    if (!exportRef.current) return;
    setBusy(true);
    try {
      const url = await renderToJpeg(exportRef.current, project.canvas.width, project.canvas.height);
      setJpeg(url);
      setThumb(project.id, url);
    } catch {
      setToast('Could not create the image — try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-canvasbg">
      <header className="flex items-center gap-2 px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] bg-surface border-b border-line shrink-0">
        <button onClick={onBack} className="w-10 h-10 rounded-full grid place-items-center text-ink"><IcBack size={22} /></button>
        <span className="text-[15px] font-bold text-ink">Preview</span>
        <span className="ml-auto pr-2 text-[11.5px] font-semibold text-ink-3">{project.canvas.width} × {project.canvas.height}</span>
      </header>

      <div className="flex-1 overflow-y-auto p-5 no-scrollbar">
        <p className="text-center text-[12px] font-semibold text-ink-3 mb-4">This is exactly what gets exported — nothing else is added.</p>

        {!jpeg ? (
          <div className="max-w-sm mx-auto rounded-3xl overflow-hidden bg-surface shadow-md">
            <div ref={wrapRef} className="w-full relative" style={{ height: project.canvas.height * scale }}>
              <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute' }}>
                <StaticDesign project={project} />
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-sm mx-auto animate-fade-in">
            <div className="flex items-center gap-2 text-[14px] font-bold text-emerald-500 mb-3 justify-center"><IcCheck size={18} /> Ready to post</div>
            <img src={jpeg} className="w-full rounded-2xl shadow-xl border border-line" alt="Export preview" />
          </div>
        )}
      </div>

      {/* Off-screen full-resolution render used only for export — must never
          be visible alongside the on-screen preview above. */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: 0, height: 0, overflow: 'hidden', opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
        <StaticDesign project={project} innerRef={exportRef} />
      </div>

      <div className="bg-surface border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0">
        {!jpeg ? (
          <button onClick={make} disabled={busy} className="w-full h-14 rounded-2xl bg-brand text-white text-[15px] font-extrabold active:bg-brand-dark disabled:opacity-60">
            {busy ? 'Creating…' : 'Create my post'}
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => { downloadImage(jpeg, file); setToast('Saved to your device.'); }}
              className="flex-1 h-14 rounded-2xl bg-ink text-white text-[14px] font-extrabold flex items-center justify-center gap-2"
            >
              <IcDownload size={19} /> Save
            </button>
            <button
              onClick={async () => {
                const r = await shareImage(jpeg, file, project.name);
                if (r === 'unsupported') setToast('Sharing is not available here — use Save.');
              }}
              className="flex-1 h-14 rounded-2xl bg-brand text-white text-[14px] font-extrabold flex items-center justify-center gap-2"
            >
              <IcShare size={19} /> Share
            </button>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-28 bg-ink text-white text-[13px] font-semibold px-4 py-2.5 rounded-full z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
