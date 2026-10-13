import React, { useRef, useState, useEffect } from 'react';
import { BookmarkPlus, Check, Sparkles, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { EditorCanvas, CanvasHandle } from '../editor/EditorCanvas';
import { ContextBar, AddSheet, MultiSelectBar } from '../editor/ContextBar';
import { TextEditBar } from '../editor/TextEditBar';
import { Toast } from '../editor/Toast';
import { readFileAsOptimizedDataUrl } from '../utils/imageProcess';
import { useEditorShortcuts } from '../editor/useEditorShortcuts';
import { QuickEdit, ProfileSheet } from '../editor/QuickEdit';
import { ImageCropModal } from '../editor/ImageCropModal';
import { getTemplate, blankDesign } from '../utils/templates';
import { ImageElement, TextElement } from '../types';
import { StaticDesign } from '../render/Render';
import { renderToJpeg } from '../utils/exporter';
import { ImageSourceModal } from '../components/ImageSourceModal';
import {
  IcBack, IcUndo, IcRedo, IcReset, IcWand, IcPlus, IcAvatar, IcZoomIn, IcZoomOut, IcFit, IcTap,
} from '../ui/icons';

export function EditorScreen({ onBack, onPreview }: { onBack: () => void; onPreview: () => void }) {
  const project = useStore((s) => s.projects.find((p) => p.id === s.currentId));
  const selectedId = useStore((s) => s.selectedId);
  const selectedIds = useStore((s) => s.selectedIds);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const replaceDesign = useStore((s) => s.replaceDesign);
  const update = useStore((s) => s.update);
  const snapshot = useStore((s) => s.snapshot);
  const saveCustomTemplate = useStore((s) => s.saveCustomTemplate);

  const canvasRef = useRef<CanvasHandle | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingImage = useRef<string | null>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const setThumb = useStore((s) => s.setThumb);

  const [sheet, setSheet] = useState<null | 'quick' | 'add' | 'profile'>(null);
  const [editing, setEditing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [hint, setHint] = useState(true);

  useEffect(() => {
    if (hint) {
      const t = setTimeout(() => setHint(false), 7000);
      return () => clearTimeout(t);
    }
  }, [hint]);

  const [cropImageId, setCropImageId] = useState<string | null>(null);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);

  // Desktop shortcuts, but never while a sheet/modal/text editor has the user's attention.
  useEditorShortcuts(!editing && !sheet && !cropImageId && !saveTemplateOpen && !confirmReset);
  const [templateName, setTemplateName] = useState('');
  const [templateTag, setTemplateTag] = useState('Custom');
  const [savedToast, setSavedToast] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);

  if (!project) return null;
  const selected = project.elements.find((e) => e.id === selectedId) || null;
  const cropImg = cropImageId ? (project.elements.find((e) => e.id === cropImageId) as ImageElement | undefined) : null;

  const requestImage = (id: string) => {
    pendingImage.current = id;
    setImageModalOpen(true);
  };

  const onFile = (f: File) => {
    const id = pendingImage.current;
    if (!id) return;
    readFileAsOptimizedDataUrl(f).then((src) => { snapshot(); update(id, { src } as any); }).catch(() => {});
  };

  // So "My designs" and the home screen always show a real preview instead
  // of a blank "Open" placeholder, even if the person never opens Preview.
  const handleBack = async () => {
    try {
      if (canvasRef.current) {
        const url = await canvasRef.current.getThumbnail();
        if (url) setThumb(project.id, url);
      }
    } catch {
      // Best-effort
    }
    onBack();
  };

  const reset = () => {
    const d = project.templateId === 'blank'
      ? blankDesign(project.canvas)
      : getTemplate(project.templateId)?.build(project.canvas);
    if (d) replaceDesign({ background: d.background, elements: d.elements });
    setConfirmReset(false);
  };

  const handleOpenSaveTemplate = () => {
    setTemplateName(project.name || 'My Custom Template');
    setTemplateTag('Custom');
    setSaveTemplateOpen(true);
  };

  const handleConfirmSaveTemplate = () => {
    const id = saveCustomTemplate(templateName, templateTag);
    if (id) {
      setSaveTemplateOpen(false);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 3200);
    }
  };

  return (
    <div className="flex flex-col h-full bg-canvasbg">
      <header className="flex items-center gap-1.5 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] bg-surface border-b border-line shrink-0">
        <button onClick={handleBack} className="w-10 h-10 rounded-full grid place-items-center text-ink"><IcBack size={22} /></button>
        {!editing && (
          <>
            <button onClick={undo} disabled={!canUndo} className={`w-9 h-9 rounded-full grid place-items-center ${canUndo ? 'text-ink' : 'text-line'}`}><IcUndo size={19} /></button>
            <button onClick={redo} disabled={!canRedo} className={`w-9 h-9 rounded-full grid place-items-center ${canRedo ? 'text-ink' : 'text-line'}`}><IcRedo size={19} /></button>
            <button onClick={() => setConfirmReset(true)} title="Reset" className="w-9 h-9 rounded-full grid place-items-center text-ink-2"><IcReset size={18} /></button>
            <div className="w-px h-5 bg-line mx-1" />
            <button onClick={() => canvasRef.current?.zoomBy(1 / 1.35)} title="Zoom Out" className="w-10 h-10 rounded-full grid place-items-center text-ink-2 active:bg-canvasbg"><IcZoomOut size={16} /></button>
            <button onClick={() => canvasRef.current?.fit()} title="Fit to Screen" className="w-10 h-10 rounded-full grid place-items-center text-ink-2 active:bg-canvasbg"><IcFit size={15} /></button>
            <button onClick={() => canvasRef.current?.zoomBy(1.35)} title="Zoom In" className="w-10 h-10 rounded-full grid place-items-center text-ink-2 active:bg-canvasbg"><IcZoomIn size={16} /></button>
          </>
        )}

        <div className="flex-1" />

        {/* Hidden while editing text — the bottom checkmark is the only
            "done" affordance in that mode, so there's never two at once. */}
        {!editing && (
          <>
            <button
              onClick={handleOpenSaveTemplate}
              title="Save as reusable template"
              className="h-9 px-3 rounded-full bg-canvasbg border border-line text-[12.5px] font-bold text-ink flex items-center gap-1.5 active:bg-line"
            >
              <BookmarkPlus size={15} className="text-brand" />
              <span className="hidden sm:inline">Save Template</span>
            </button>

            <button onClick={onPreview} className="h-9 px-4 rounded-full bg-brand text-white text-[13.5px] font-bold active:bg-brand-dark shadow-sm">
              Done
            </button>
          </>
        )}
      </header>

      <div className="flex-1 relative overflow-hidden">
        <EditorCanvas
          project={project}
          handleRef={canvasRef}
          onRequestImage={requestImage}
          onCropImage={(id) => setCropImageId(id)}
          onEditingChange={setEditing}
        />

        {hint && !selected && !editing && (
          <button
            onClick={() => setHint(false)}
            className="absolute left-1/2 -translate-x-1/2 top-3 flex items-center gap-2 rounded-full bg-ink/85 text-white text-[11.5px] font-semibold px-3 py-1.5 shadow-lg backdrop-blur-sm"
          >
            <IcTap size={14} /> {typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches ? 'Tap to select · tap again to edit text · hold to select several' : 'Click to select · click again to edit text · drag empty space to select several'}
          </button>
        )}

        <Toast />

        {/* Saved to Templates Toast */}
        {savedToast && (
          <div className="absolute left-1/2 -translate-x-1/2 top-4 z-[1000] flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 text-white text-[13px] font-bold shadow-xl animate-fade-in">
            <Check size={16} />
            <span>Saved to Available Templates!</span>
          </div>
        )}
      </div>

      {selectedIds.length > 1 && !editing ? (
        <MultiSelectBar ids={selectedIds} />
      ) : selected && !editing ? (
        <ContextBar
          el={selected}
          onEditText={(id) => canvasRef.current?.startEditText(id)}
          onCropImage={(id) => setCropImageId(id)}
        />
      ) : !editing ? (
        <div className="bg-surface border-t border-line flex px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <Tab icon={<IcWand size={22} />} label="Quick Edit" accent onClick={() => setSheet('quick')} />
          <Tab icon={<IcAvatar size={22} />} label="Profile" onClick={() => setSheet('profile')} />
          <Tab icon={<IcPlus size={22} />} label="Add" onClick={() => setSheet('add')} />
        </div>
      ) : (
        <TextEditBar
          handle={canvasRef}
          el={selected && selected.type === 'text' ? (selected as TextElement) : null}
          onDone={() => {
            canvasRef.current?.commitEdit();
            setEditing(false);
          }}
        />
      )}

      {sheet === 'quick' && (
        <QuickEdit
          project={project}
          onClose={() => setSheet(null)}
          onFocus={(id) => canvasRef.current?.focusOn(id)}
          onEditText={(id) => {
            setSheet(null);
            canvasRef.current?.focusOn(id);
            canvasRef.current?.startEditText(id);
          }}
          onReplaceImage={requestImage}
        />
      )}
      {sheet === 'profile' && <ProfileSheet project={project} onClose={() => setSheet(null)} />}
      {sheet === 'add' && <AddSheet project={project} onClose={() => setSheet(null)} />}

      {/* Interactive Crop Modal */}
      {cropImg && (
        <ImageCropModal
          image={cropImg}
          onApply={(patch) => {
            snapshot();
            update(cropImg.id, patch as any);
          }}
          onClose={() => setCropImageId(null)}
        />
      )}

      {/* Save as Reusable Custom Template Modal */}
      {saveTemplateOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center p-5 bg-ink/50 backdrop-blur-sm" onClick={() => setSaveTemplateOpen(false)}>
          <div className="bg-surface rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-line" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-brand/15 text-brand grid place-items-center">
                  <Sparkles size={18} />
                </span>
                <h3 className="text-[16px] font-bold text-ink">Save as Template</h3>
              </div>
              <button onClick={() => setSaveTemplateOpen(false)} className="w-8 h-8 rounded-full bg-canvasbg grid place-items-center text-ink-2">
                <X size={16} />
              </button>
            </div>

            <p className="text-[13px] text-ink-2 mb-4 leading-relaxed">
              Push your layout to the available templates so you can reuse this style across your projects anytime.
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-[12px] font-bold text-ink-3 mb-1.5">Template Name</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Summer Promo, Quote Card"
                  className="w-full h-11 px-3.5 rounded-xl bg-canvasbg border border-line text-ink font-semibold text-[14px] focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-ink-3 mb-1.5">Category Tag</label>
                <div className="flex flex-wrap gap-1.5">
                  {['Custom', 'Promo', 'Quote', 'Editorial', 'Personal', 'Social'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setTemplateTag(tag)}
                      className={`px-3 py-1 rounded-lg text-[12px] font-bold border transition-colors ${
                        templateTag === tag ? 'bg-brand text-white border-brand' : 'bg-canvasbg text-ink border-line'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSaveTemplateOpen(false)}
                className="flex-1 h-11 rounded-xl bg-canvasbg text-[13px] font-bold text-ink"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSaveTemplate}
                disabled={!templateName.trim()}
                className="flex-1 h-11 rounded-xl bg-brand text-white text-[13px] font-bold disabled:opacity-50 active:bg-brand-dark"
              >
                Save to Library
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Start Over Modal */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 grid place-items-center p-8 bg-ink/40" onClick={() => setConfirmReset(false)}>
          <div className="bg-surface rounded-3xl p-5 w-full max-w-xs shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[16px] font-bold text-ink">Start this template over?</h3>
            <p className="text-[13px] text-ink-2 mt-1 mb-4">Your edits to this design will be cleared.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmReset(false)} className="flex-1 h-12 rounded-2xl bg-canvasbg text-[14px] font-bold text-ink">Cancel</button>
              <button onClick={reset} className="flex-1 h-12 rounded-2xl bg-brand text-white text-[14px] font-bold">Start over</button>
            </div>
          </div>
        </div>
      )}

      <ImageSourceModal
        title="Replace Picture"
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        onImageSelected={(dataUrl) => {
          const id = pendingImage.current;
          if (id) {
            snapshot();
            update(id, { src: dataUrl } as any);
          }
        }}
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = ''; }}
      />
    </div>
  );
}

function Tab({ icon, label, onClick, accent }: { icon: React.ReactNode; label: string; onClick: () => void; accent?: boolean }) {
  return (
    <button onClick={onClick} className={`flex-1 flex flex-col items-center gap-1 py-1.5 ${accent ? 'text-brand' : 'text-ink-2'}`}>
      {icon}
      <span className="text-[10.5px] font-semibold">{label}</span>
    </button>
  );
}
