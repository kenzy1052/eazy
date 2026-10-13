import React, { useMemo, useState } from 'react';
import { DesignElement, Project, ProfileMode } from '../types';
import { useStore } from '../store/useStore';
import { BigButton, ColorPicker, Seg, Sheet, Slider, UploadButton } from './kit';
import { BackgroundCropModal } from './BackgroundCropModal';
import { Crop } from 'lucide-react';
import {
  IcAt, IcAvatar, IcImage, IcPalette, IcType, IcTrash, IcCheck, IcTap,
} from '../ui/icons';

type Target = 'menu' | 'profile' | 'texts' | 'images' | 'background';

/**
 * The beginner path. Everything here is a shortcut to the same elements the
 * canvas edits — pick the thing by name instead of hunting for it with a
 * fingertip.
 */
export function QuickEdit({
  project, onClose, onFocus, onEditText, onReplaceImage,
}: {
  project: Project;
  onClose: () => void;
  onFocus: (id: string) => void;
  onEditText: (id: string) => void;
  onReplaceImage: (id: string) => void;
}) {
  const [view, setView] = useState<Target>('menu');
  const [bgCropOpen, setBgCropOpen] = useState(false);
  const setBackground = useStore((s) => s.setBackground);
  const snapshot = useStore((s) => s.snapshot);

  const texts = useMemo(
    () => project.elements.filter((e) => e.type === 'text' && e.role !== 'handle'),
    [project.elements]
  );
  const images = useMemo(
    () => project.elements.filter((e) => e.type === 'image' && e.role !== 'profile-picture'),
    [project.elements]
  );

  if (view === 'profile') return <ProfileSheet project={project} onClose={onClose} onBack={() => setView('menu')} />;

  if (view === 'texts') {
    return (
      <Sheet title="Which text?" onClose={onClose}>
        <p className="text-[13px] text-ink-3 pb-3">Pick a line to edit. It opens right on the design.</p>
        <div className="space-y-2 pb-2">
          {texts.map((t) => (
            <button
              key={t.id}
              onClick={() => { onClose(); onEditText(t.id); }}
              className="w-full text-left bg-canvasbg rounded-2xl p-3.5 active:bg-line"
            >
              <div className="text-[11px] font-bold text-brand uppercase tracking-wide">{t.name}</div>
              <div className="text-[14px] text-ink line-clamp-2 mt-0.5">{(t as any).text || '—'}</div>
            </button>
          ))}
          {texts.length === 0 && <Empty label="This design has no text yet." />}
        </div>
      </Sheet>
    );
  }

  if (view === 'images') {
    return (
      <Sheet title="Which picture?" onClose={onClose}>
        <div className="space-y-2 pb-2">
          {images.map((im: any) => (
            <div key={im.id}>
            <BigButton
              icon={<IcImage size={20} />}
              label={im.name}
              sub={im.src ? 'Tap to replace' : 'Empty — tap to add a photo'}
              onClick={() => { onClose(); onReplaceImage(im.id); }}
            />
            </div>
          ))}
          {images.length === 0 && <Empty label="This design has no photo slot. You can add one from Add." />}
        </div>
      </Sheet>
    );
  }

  if (view === 'background') {
    return (
      <Sheet title="Background" onClose={onClose}>
        <div className="pb-2">
          {project.background.kind === 'solid' ? (
            <ColorPicker
              value={project.background.color}
              onChange={(c) => { snapshot(); setBackground({ kind: 'solid', color: c }); }}
            />
          ) : (
            <div className="space-y-4 mb-4">
              <button
                onClick={() => setBgCropOpen(true)}
                className="w-full h-12 rounded-2xl bg-brand text-white font-bold text-[14px] flex items-center justify-center gap-2 active:bg-brand-dark"
              >
                <Crop size={18} />
                <span>Open interactive crop & pan</span>
              </button>
              <Slider
                label="Zoom (Background Photo)"
                value={project.background.image.zoom || 1}
                min={1} max={3} step={0.02}
                onChange={(v) => {
                  snapshot();
                  setBackground({ kind: 'image', image: { ...project.background.image, zoom: v } });
                }}
              />
              <Slider
                label="Move sideways"
                value={project.background.image.offsetX || 0}
                min={-50} max={50}
                onChange={(v) => {
                  snapshot();
                  setBackground({ kind: 'image', image: { ...project.background.image, offsetX: v } });
                }}
              />
              <Slider
                label="Move up / down"
                value={project.background.image.offsetY || 0}
                min={-50} max={50}
                onChange={(v) => {
                  snapshot();
                  setBackground({ kind: 'image', image: { ...project.background.image, offsetY: v } });
                }}
              />
              <div className="pt-2 border-t border-line/60">
                <span className="text-[12px] font-bold text-ink block mb-2">Overlay / Dim Background</span>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => {
                      snapshot();
                      setBackground({
                        kind: 'image',
                        adjust: { ...project.background.adjust, overlayColor: '#000000' }
                      });
                    }}
                    className={`flex-1 py-2 rounded-xl text-[12px] font-bold border transition-colors ${
                      (project.background.adjust.overlayColor || '#000000') === '#000000'
                        ? 'bg-ink text-white border-ink'
                        : 'bg-surface text-ink-2 border-line'
                    }`}
                  >
                    ⬛ Black Overlay
                  </button>
                  <button
                    onClick={() => {
                      snapshot();
                      setBackground({
                        kind: 'image',
                        adjust: { ...project.background.adjust, overlayColor: '#FFFFFF' }
                      });
                    }}
                    className={`flex-1 py-2 rounded-xl text-[12px] font-bold border transition-colors ${
                      project.background.adjust.overlayColor === '#FFFFFF'
                        ? 'bg-white text-ink border-ink shadow-xs'
                        : 'bg-surface text-ink-2 border-line'
                    }`}
                  >
                    ⬜ White Overlay
                  </button>
                </div>
                <Slider
                  label={`Dim Opacity (${Math.round((project.background.adjust.overlayOpacity || 0) * 100)}%)`}
                  value={project.background.adjust.overlayOpacity || 0}
                  min={0} max={0.95} step={0.05}
                  onChange={(v) => {
                    snapshot();
                    setBackground({
                      kind: 'image',
                      adjust: { ...project.background.adjust, overlayOpacity: v }
                    });
                  }}
                />
              </div>
            </div>
          )}
          <div className="mt-4">
            <UploadButton
              label="Use a photo instead"
              onFile={(src) => {
                snapshot();
                setBackground({ kind: 'image', image: { ...project.background.image, src } });
              }}
            />
          </div>
          {project.background.kind === 'image' && (
            <button
              onClick={() => { snapshot(); setBackground({ kind: 'solid' }); }}
              className="mt-2 w-full h-12 rounded-2xl bg-canvasbg text-[14px] font-bold text-ink-2 flex items-center justify-center gap-2"
            >
              <IcTrash size={18} /> Remove photo
            </button>
          )}
        </div>

        {bgCropOpen && project.background.kind === 'image' && project.background.image.src && (
          <BackgroundCropModal
            src={project.background.image.src}
            canvas={project.canvas}
            initial={project.background.image}
            onApply={({ zoom, offsetX, offsetY }) => {
              snapshot();
              setBackground({ kind: 'image', image: { ...project.background.image, zoom, offsetX, offsetY } });
            }}
            onClose={() => setBgCropOpen(false)}
          />
        )}
      </Sheet>
    );
  }

  return (
    <Sheet title="Quick Edit" onClose={onClose}>
      <p className="text-[13px] text-ink-3 pb-3 flex items-center gap-2">
        <IcTap size={16} /> Pick what you want to change — no hunting required.
      </p>
      <div className="space-y-2 pb-2">
        <BigButton icon={<IcAvatar size={20} />} label="Profile" sub={profileSub(project)} tone="brand" onClick={() => setView('profile')} />
        <BigButton icon={<IcType size={20} />} label="Text" sub={`${texts.length} editable ${texts.length === 1 ? 'line' : 'lines'}`} onClick={() => setView('texts')} />
        <BigButton icon={<IcImage size={20} />} label="Pictures" sub={images.length ? `${images.length} photo slot${images.length > 1 ? 's' : ''}` : 'No photo in this design'} onClick={() => setView('images')} />
        <BigButton icon={<IcPalette size={20} />} label="Background" sub={project.background.kind === 'image' ? 'Photo' : project.background.color} onClick={() => setView('background')} />
      </div>
    </Sheet>
  );
}

function profileSub(p: Project) {
  if (p.profileMode === 'none') return 'Hidden on this design';
  if (p.profileMode === 'handle-only') return `${p.handle} · handle only`;
  return `${p.handle} · with picture`;
}

function Empty({ label }: { label: string }) {
  return <div className="text-center text-[13px] text-ink-3 py-8">{label}</div>;
}

/** The profile sheet: three identity options, exactly as specified. */
export function ProfileSheet({
  project, onClose, onBack,
}: { project: Project; onClose: () => void; onBack?: () => void }) {
  const setProjectProfileMode = useStore((s) => s.setProjectProfileMode);
  const setProjectHandle = useStore((s) => s.setProjectHandle);
  const setProjectAvatar = useStore((s) => s.setProjectAvatar);
  const [draft, setDraft] = useState(project.handle);

  const modes: { value: ProfileMode; title: string; sub: string }[] = [
    { value: 'picture-and-handle', title: 'Picture + handle', sub: 'Show your photo and @name' },
    { value: 'handle-only', title: 'Handle only', sub: 'Just @yourname, no photo' },
    { value: 'none', title: 'No profile', sub: 'Keep the artwork clean' },
  ];

  const commitHandle = (v: string) => {
    const clean = v.trim();
    setProjectHandle(clean ? (clean.startsWith('@') ? clean : `@${clean}`) : '@yourhandle');
  };

  return (
    <Sheet title="Profile" onClose={onBack || onClose}>
      <div className="pb-2">
        <div className="text-[12px] font-semibold text-ink-3 mb-2">Profile on this Design</div>
        <div className="space-y-2">
          {modes.map((m) => (
            <button
              key={m.value}
              onClick={() => setProjectProfileMode(m.value)}
              className={`w-full flex items-center gap-3 rounded-2xl p-3.5 text-left border-2 transition-colors ${
                project.profileMode === m.value ? 'border-brand bg-brand-soft' : 'border-transparent bg-canvasbg'
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold text-ink">{m.title}</span>
                <span className="block text-[12px] text-ink-3">{m.sub}</span>
              </span>
              {project.profileMode === m.value && (
                <span className="w-6 h-6 rounded-full bg-brand text-white grid place-items-center shrink-0"><IcCheck size={14} /></span>
              )}
            </button>
          ))}
        </div>

        {project.profileMode !== 'none' && (
          <>
            <div className="mt-5">
              <div className="text-[12px] font-semibold text-ink-3 mb-2">Your handle</div>
              <div className="flex items-center gap-2 bg-canvasbg rounded-2xl px-3.5 h-13 py-3">
                <IcAt size={18} className="text-ink-3" />
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => commitHandle(draft)}
                  placeholder="@kenzie.rest"
                  className="flex-1 bg-transparent outline-none text-[15px] font-semibold text-ink"
                />
              </div>
              <p className="text-[11px] text-ink-3 mt-1.5">Updates on the design as you type.</p>
            </div>

            {project.profileMode === 'picture-and-handle' && (
              <div className="mt-5">
                <div className="text-[12px] font-semibold text-ink-3 mb-2">Profile picture</div>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-canvasbg grid place-items-center shrink-0">
                    {project.avatar ? <img src={project.avatar} className="w-full h-full object-cover" /> : <IcAvatar size={26} className="text-ink-3" />}
                  </div>
                  <div className="flex-1 space-y-2">
                    <UploadButton label={project.avatar ? 'Replace picture' : 'Upload picture'} onFile={(src) => setProjectAvatar(src)} />
                    {project.avatar && (
                      <button onClick={() => setProjectAvatar(null)} className="w-full h-11 rounded-2xl bg-canvasbg text-[13px] font-bold text-ink-2 flex items-center justify-center gap-2">
                        <IcTrash size={16} /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}
