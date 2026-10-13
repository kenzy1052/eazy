import React, { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { CANVAS_SIZES, CanvasSize, Project } from './types';
import { HomeScreen } from './screens/HomeScreen';
import { SizeScreen } from './screens/SizeScreen';
import { TemplateScreen } from './screens/TemplateScreen';
import { EditorScreen } from './screens/EditorScreen';
import { PreviewScreen } from './screens/PreviewScreen';
import { DesignsScreen } from './screens/DesignsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SimpleCreatorScreen } from './screens/SimpleCreatorScreen';
import { ProfileSheet } from './editor/QuickEdit';
import { TEMPLATES, getTemplate, blankDesign } from './utils/templates';

type Screen = 'home' | 'simple' | 'size' | 'template' | 'editor' | 'preview' | 'designs' | 'settings';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [canvas, setCanvas] = useState<CanvasSize>(CANVAS_SIZES[0]);
  const [profileOpen, setProfileOpen] = useState(false);

  const currentId = useStore((s) => s.currentId);
  const project = useStore((s) => s.projects.find((p) => p.id === s.currentId));
  const create = useStore((s) => s.create);
  const close = useStore((s) => s.close);
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    const applyTheme = () => {
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    
    applyTheme();

    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      media.addEventListener('change', applyTheme);
      return () => media.removeEventListener('change', applyTheme);
    }
  }, [theme]);

  useEffect(() => {
    if (currentId && (screen === 'home' || screen === 'designs')) setScreen('editor');
  }, [currentId]);

  const start = (templateId: string) => {
    if (templateId.startsWith('custom-')) {
      const customTemplates = useStore.getState().customTemplates;
      const ct = customTemplates.find((c) => c.id === templateId);
      if (ct) {
        create({
          templateId: ct.id,
          canvas,
          background: JSON.parse(JSON.stringify(ct.background)),
          elements: JSON.parse(JSON.stringify(ct.elements)),
          name: ct.name,
        });
        setScreen('editor');
        return;
      }
    }
    const d = templateId === 'blank' ? blankDesign(canvas) : getTemplate(templateId)?.build(canvas);
    if (!d) return;
    create({
      templateId, canvas, background: d.background, elements: d.elements,
      name: templateId === 'blank' ? 'Blank design' : TEMPLATES.find((t) => t.id === templateId)!.name,
    });
    setScreen('editor');
  };

  return (
    <div className="h-[100dvh] w-full max-w-[520px] mx-auto bg-canvasbg overflow-hidden">
      {screen === 'home' && (
        <HomeScreen
          onCreateSimple={() => setScreen('simple')}
          onCreateAdvanced={() => setScreen('size')}
          onDesigns={() => setScreen('designs')}
          onProfile={() => setScreen('settings')}
        />
      )}
      {screen === 'simple' && (
        <SimpleCreatorScreen
          onBack={() => setScreen('home')}
          onSwitchToAdvanced={() => setScreen('size')}
          onOpenInEditor={(proj) => {
            create({
              templateId: proj.templateId,
              canvas: proj.canvas,
              background: JSON.parse(JSON.stringify(proj.background)),
              elements: JSON.parse(JSON.stringify(proj.elements)),
              name: proj.name,
            });
            setScreen('editor');
          }}
        />
      )}
      {screen === 'size' && (
        <SizeScreen
          onBack={() => setScreen('home')}
          onPick={(s) => { setCanvas(s); setScreen('template'); }}
          onSwitchToSimple={() => setScreen('simple')}
        />
      )}
      {screen === 'template' && (
        <TemplateScreen
          canvas={canvas}
          onBack={() => setScreen('size')}
          onPick={start}
          onSwitchToSimple={() => setScreen('simple')}
        />
      )}
      {screen === 'editor' && <EditorScreen onBack={() => { close(); setScreen('home'); }} onPreview={() => setScreen('preview')} />}
      {screen === 'preview' && <PreviewScreen onBack={() => setScreen('editor')} />}
      {screen === 'designs' && <DesignsScreen onBack={() => setScreen('home')} />}
      {screen === 'settings' && <SettingsScreen onBack={() => setScreen('home')} />}

      {profileOpen && (
        <ProfileSheet
          project={project || placeholderProject(canvas)}
          onClose={() => setProfileOpen(false)}
        />
      )}
    </div>
  );
}

/** Lets the handle be set from Home before any design exists. */
function placeholderProject(canvas: CanvasSize): Project {
  const s = useStore.getState();
  return {
    id: 'draft', name: 'draft', templateId: 'blank', canvas,
    background: { kind: 'solid', color: '#fff', image: { src: null, zoom: 1, offsetX: 0, offsetY: 0 }, adjust: { blur: 0, brightness: 100, contrast: 100, saturate: 100, grayscale: 0, overlayColor: '#000', overlayOpacity: 0 } },
    elements: [], profileMode: s.savedProfileMode, handle: s.savedHandle || '@yourhandle', avatar: s.savedAvatar,
    createdAt: 0, updatedAt: 0,
  };
}
