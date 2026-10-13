import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { IcBack, IcCheck, IcAt, IcAvatar, IcTrash } from '../ui/icons';
import { ProfileMode } from '../types';
import { UploadButton } from '../editor/kit';

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const setProfileMode = useStore((s) => s.setProfileMode);
  const setHandle = useStore((s) => s.setHandle);
  const setAvatar = useStore((s) => s.setAvatar);
  
  const savedProfileMode = useStore((s) => s.savedProfileMode);
  const savedHandle = useStore((s) => s.savedHandle);
  const savedAvatar = useStore((s) => s.savedAvatar);
  
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  
  const [draft, setDraft] = useState(savedHandle);

  const modes: { value: ProfileMode; title: string; sub: string }[] = [
    { value: 'picture-and-handle', title: 'Picture + handle', sub: 'Show your photo and @name' },
    { value: 'handle-only', title: 'Handle only', sub: 'Just @yourname, no photo' },
    { value: 'none', title: 'No profile', sub: 'Keep the artwork clean' },
  ];

  const commitHandle = (v: string) => {
    const clean = v.trim();
    setHandle(clean ? (clean.startsWith('@') ? clean : `@${clean}`) : '@yourhandle');
  };

  return (
    <div className="h-full bg-canvasbg flex flex-col">
      <header className="flex items-center gap-2 px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] bg-surface border-b border-line shrink-0">
        <button onClick={onBack} className="w-10 h-10 rounded-full grid place-items-center text-ink"><IcBack size={22} /></button>
        <span className="text-[15px] font-bold text-ink">Settings</span>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        {/* Theme Settings */}
        <div className="mb-8">
          <h2 className="text-[15px] font-bold text-ink mb-3">App Theme</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 flex flex-col items-center gap-2 rounded-2xl p-4 border-2 transition-colors ${
                theme === 'light' ? 'border-brand bg-brand-soft' : 'border-transparent bg-surface'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-white border border-line" />
              <span className="text-[13px] font-bold text-ink">Light</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 flex flex-col items-center gap-2 rounded-2xl p-4 border-2 transition-colors ${
                theme === 'dark' ? 'border-brand bg-brand-soft' : 'border-transparent bg-surface'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-[#12131A]" />
              <span className="text-[13px] font-bold text-ink">Dark</span>
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`flex-1 flex flex-col items-center gap-2 rounded-2xl p-4 border-2 transition-colors ${
                theme === 'system' ? 'border-brand bg-brand-soft' : 'border-transparent bg-surface'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white to-[#12131A] border border-line" />
              <span className="text-[13px] font-bold text-ink">System</span>
            </button>
          </div>
        </div>

        <h2 className="text-[15px] font-bold text-ink mb-3">Profile on Templates</h2>
        <div className="space-y-2">
          {modes.map((m) => (
            <button
              key={m.value}
              onClick={() => setProfileMode(m.value)}
              className={`w-full flex items-center gap-3 rounded-2xl p-4 text-left border-2 transition-colors ${
                savedProfileMode === m.value ? 'border-brand bg-brand-soft' : 'border-transparent bg-surface'
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold text-ink">{m.title}</span>
                <span className="block text-[12px] text-ink-3">{m.sub}</span>
              </span>
              {savedProfileMode === m.value && (
                <span className="w-6 h-6 rounded-full bg-brand text-white grid place-items-center shrink-0"><IcCheck size={14} /></span>
              )}
            </button>
          ))}
        </div>

        {savedProfileMode !== 'none' && (
          <>
            <div className="mt-6">
              <div className="text-[13px] font-bold text-ink mb-2">Your handle</div>
              <div className="flex items-center gap-2 bg-surface rounded-2xl px-4 h-14 py-3">
                <IcAt size={18} className="text-ink-3" />
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => commitHandle(draft)}
                  placeholder="@kenzie.rest"
                  className="flex-1 bg-transparent outline-none text-[15px] font-semibold text-ink"
                />
              </div>
              <p className="text-[12px] text-ink-3 mt-2 px-1">This will be the default handle for all new designs.</p>
            </div>

            {savedProfileMode === 'picture-and-handle' && (
              <div className="mt-6">
                <div className="text-[13px] font-bold text-ink mb-2">Profile picture</div>
                <div className="flex items-center gap-4 bg-surface p-4 rounded-2xl">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-canvasbg grid place-items-center shrink-0 border border-line">
                    {savedAvatar ? <img src={savedAvatar} className="w-full h-full object-cover" /> : <IcAvatar size={32} className="text-ink-3" />}
                  </div>
                  <div className="flex-1 space-y-2">
                    <UploadButton label={savedAvatar ? 'Replace picture' : 'Upload picture'} onFile={(src) => setAvatar(src)} />
                    {savedAvatar && (
                      <button onClick={() => setAvatar(null)} className="w-full h-11 rounded-2xl bg-canvasbg text-[13px] font-bold text-ink-2 flex items-center justify-center gap-2">
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
    </div>
  );
}
