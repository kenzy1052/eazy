import React, { useMemo, useState } from 'react';
import { Sparkles, Trash2, Bookmark, Wand2 } from 'lucide-react';
import { CanvasSize, Project } from '../types';
import { TEMPLATES, blankDesign } from '../utils/templates';
import { StaticDesign } from '../render/Render';
import { IcBack, IcPlus } from '../ui/icons';
import { useStore } from '../store/useStore';

const THUMB = 152;

export function TemplateScreen({
  canvas, onBack, onPick, onSwitchToSimple,
}: {
  canvas: CanvasSize;
  onBack: () => void;
  onPick: (templateId: string) => void;
  onSwitchToSimple?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'all' | 'custom' | string>('all');

  const customTemplates = useStore((s) => s.customTemplates);
  const deleteCustomTemplate = useStore((s) => s.deleteCustomTemplate);

  const built = useMemo(() => TEMPLATES.map((t) => ({ t, d: t.build(canvas) })), [canvas]);
  const scale = THUMB / canvas.width;
  const h = canvas.height * scale;

  const mock = (d: any): Project => ({
    id: 'p', name: 'p', templateId: 'p', canvas, background: d.background, elements: d.elements,
    profileMode: 'handle-only', handle: '@yourhandle', avatar: null, createdAt: 0, updatedAt: 0,
  });

  const mockCustom = (ct: any): Project => ({
    id: ct.id,
    name: ct.name,
    templateId: ct.id,
    canvas: ct.canvas || canvas,
    background: ct.background,
    elements: ct.elements,
    profileMode: 'handle-only',
    handle: '@yourhandle',
    avatar: null,
    createdAt: ct.createdAt,
    updatedAt: ct.createdAt,
  });

  const filteredBuilt = useMemo(() => {
    if (activeTab === 'all') return built;
    if (activeTab === 'custom') return [];
    return built.filter(({ t }) => t.tag.toLowerCase().includes(activeTab.toLowerCase()));
  }, [built, activeTab]);

  const showCustomSection = activeTab === 'all' || activeTab === 'custom';

  return (
    <div className="h-full bg-canvasbg flex flex-col">
      <header className="flex items-center justify-between px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="w-10 h-10 rounded-full grid place-items-center text-ink"><IcBack size={22} /></button>
          <span className="text-[13px] font-bold text-ink-3">Step 2 of 2</span>
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

      <div className="px-5 pb-3 shrink-0">
        <h1 className="text-[26px] font-extrabold text-ink leading-tight">Pick a design</h1>
        <p className="text-[13.5px] text-ink-2 mt-1">Every word, colour, shape and photo is yours to change.</p>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'custom', label: `My Templates (${customTemplates.length})`, icon: <Bookmark size={13} /> },
            { id: 'sports', label: 'Sports' },
            { id: 'quote', label: 'Quote' },
            { id: 'fashion', label: 'Fashion' },
            { id: 'editorial', label: 'Editorial' },
            { id: 'promo', label: 'Promo' },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`h-8 px-3.5 rounded-full text-[12px] font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                  active ? 'bg-ink text-white shadow-sm' : 'bg-surface text-ink-2 border border-line'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-10 no-scrollbar">
        {/* User's Custom Templates Section */}
        {showCustomSection && customTemplates.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <Sparkles size={15} className="text-brand" />
                <h2 className="text-[14px] font-bold text-ink">Your Saved Templates</h2>
              </div>
              <span className="text-[11px] font-semibold text-ink-3">{customTemplates.length} saved</span>
            </div>

            <div className="flex flex-col gap-5">
              {customTemplates.map((ct) => {
                const ctCanvas = ct.canvas || canvas;
                // Compute width based on screen size (approx 340px for mobile)
                const containerWidth = 340;
                const ctScale = containerWidth / ctCanvas.width;
                const ctH = ctCanvas.height * ctScale;

                return (
                  <div key={ct.id} className="relative group text-left">
                    <button
                      onClick={() => onPick(ct.id)}
                      className="w-full text-left"
                    >
                      <div
                        className="w-full rounded-3xl overflow-hidden bg-surface border-2 border-brand/30 hover:border-brand transition-colors shadow-sm mx-auto flex items-center justify-center"
                        style={{ height: ctH, maxWidth: containerWidth }}
                      >
                        <div style={{ transform: `scale(${ctScale})`, transformOrigin: 'top left', width: ctCanvas.width, height: ctCanvas.height, pointerEvents: 'none' }}>
                          <StaticDesign project={mockCustom(ct)} />
                        </div>
                      </div>
                      <div className="text-[14px] font-bold text-ink mt-2 truncate max-w-[340px]">{ct.name}</div>
                      <div className="text-[12px] text-brand font-semibold capitalize">{ct.tag || 'Custom'}</div>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete template "${ct.name}"?`)) {
                          deleteCustomTemplate(ct.id);
                        }
                      }}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-ink/75 text-white/90 grid place-items-center hover:bg-red-600 transition-colors shadow-md"
                      title="Delete template"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state when only viewing Custom tab and none saved */}
        {activeTab === 'custom' && customTemplates.length === 0 && (
          <div className="py-12 px-4 text-center rounded-3xl bg-surface border border-line my-4">
            <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand grid place-items-center mx-auto mb-3">
              <Bookmark size={24} />
            </div>
            <h3 className="text-[16px] font-bold text-ink">No custom templates yet</h3>
            <p className="text-[13px] text-ink-2 mt-1.5 max-w-xs mx-auto leading-relaxed">
              When creating or modifying any design in the editor, tap "Save Template" to push your layout to this library and reuse it anytime!
            </p>
          </div>
        )}

        {/* Standard Templates Grid */}
        {activeTab !== 'custom' && (
          <>
            {showCustomSection && customTemplates.length > 0 && (
              <h2 className="text-[14px] font-bold text-ink mb-2.5">Available Templates</h2>
            )}

            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
              <button
                onClick={() => onPick('blank')}
                className="rounded-2xl border-2 border-dashed border-line bg-surface/60 flex flex-col items-center justify-center gap-2 text-ink-3 active:border-brand"
                style={{ height: h }}
              >
                <IcPlus size={26} />
                <span className="text-[13px] font-bold text-ink">Blank Canvas</span>
              </button>

              {filteredBuilt.map(({ t, d }) => (
                <button key={t.id} onClick={() => onPick(t.id)} className="text-left">
                  <div
                    className="rounded-2xl overflow-hidden bg-surface border border-line"
                    style={{ width: THUMB, height: h }}
                  >
                    <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: canvas.width, height: canvas.height, pointerEvents: 'none' }}>
                      <StaticDesign project={mock(d)} />
                    </div>
                  </div>
                  <div className="text-[12.5px] font-bold text-ink mt-1.5">{t.name}</div>
                  <div className="text-[10.5px] text-ink-3">{t.tag}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
