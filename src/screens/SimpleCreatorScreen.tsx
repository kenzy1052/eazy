import React, { useState, useRef, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { CanvasSize, CANVAS_SIZES } from '../types';
import {
  generateAllDesigns,
  SimplePostInput,
  GeneratedDesign,
  DesignCategoryTag,
} from '../utils/simpleDesigns';
import { LiveThumbnail } from '../components/LiveThumbnail';
import { StaticDesign } from '../render/Render';
import { renderToJpeg, downloadImage, shareImage } from '../utils/exporter';
import { StyleTestContainer } from '../components/StyleTestContainer';
import { readFileAsOptimizedDataUrl } from '../utils/imageProcess';
import { BatchGeneratorModal } from '../components/BatchGeneratorModal';
import { ImageSourceModal } from '../components/ImageSourceModal';
import {
  IcBack,
  IcAt,
  IcAvatar,
  IcDownload,
  IcShare,
  IcCheck,
} from '../ui/icons';
import {
  Wand2,
  Sliders,
  Lightbulb,
  Upload,
  Sparkles,
  FolderPlus,
  X,
  Edit3,
  Image as ImageIcon,
  SlidersHorizontal,
  Trash2,
  Check,
  Archive,
  Gauge,
  Palette,
  CheckSquare,
  Eye,
  Layers,
} from 'lucide-react';

interface SimpleCreatorScreenProps {
  onBack: () => void;
  onSwitchToAdvanced: () => void;
  onOpenInEditor: (project: any) => void;
}

const SAMPLE_PRESETS = [
  {
    label: '🏆 Ballon d’Or 433',
    title: "BALLON D'OR IS FOR THE BEST PLAYER IN THE WORLD",
    body: 'The Ballon d’Or should not go to the winner of the Champions League or the one who scores the most goals.',
    category: 'LAMINE YAMAL',
  },
  {
    label: '✨ Focus & Craft',
    title: 'Great work comes from sustained daily momentum.',
    body: 'Show up every single day, build quietly, and let compounding do the heavy lifting. Consistency turns ambition into mastery.',
    category: 'PRODUCTIVITY',
  },
  {
    label: '🌿 Clarity & Depth',
    title: 'Simplicity is the ultimate sophistication.',
    body: 'When you remove what is unnecessary, what remains speaks with power and grace. Focus on one craft and do it well.',
    category: 'MINIMALISM',
  },
  {
    label: '🚀 Growth Mindset',
    title: 'Small daily steps compound into life-changing leaps.',
    body: 'You do not need to figure out everything today. Win the morning, protect your attention, and let steady compounding do the heavy lifting.',
    category: 'GROWTH',
  },
  {
    label: '💡 Creator Lesson',
    title: 'Write clearly. Share generously. Iterate in public.',
    body: 'The strongest personal brands are built on authentic curiosity and practical value. Give away your secrets and your audience will grow.',
    category: 'CREATOR',
  },
  {
    label: '🧠 Daily Reminder',
    title: 'Stop scrolling. Breathe. Reflect.',
    body: 'You do not need to have everything figured out today. Trust your trajectory and take just one honest step forward.',
    category: 'DAILY WISDOM',
  },
];

const CURATED_BG_IMAGES = [
  {
    id: 'stadium-spotlight',
    name: 'Stadium Press',
    url: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1200&auto=format&fit=crop&q=80',
  },
  {
    id: 'mist-mountain',
    name: 'Misty Mountains',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
  },
  {
    id: 'minimal-arch',
    name: 'Minimal Concrete',
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80',
  },
  {
    id: 'golden-sunset',
    name: 'Golden Light',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
  },
  {
    id: 'dark-texture',
    name: 'Dark Mesh',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
  },
  {
    id: 'deep-forest',
    name: 'Pine Forest',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&auto=format&fit=crop&q=80',
  },
  {
    id: 'soft-studio',
    name: 'Soft Studio',
    url: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=1200&auto=format&fit=crop&q=80',
  },
];

const LUXURY_SOLID_BACKGROUNDS = [
  { label: 'Obsidian', color: '#090D16' },
  { label: 'Pure Cream', color: '#FAF6F0' },
  { label: 'Midnight Navy', color: '#0B132B' },
  { label: 'Sage Velvet', color: '#132A20' },
  { label: 'Terracotta', color: '#2B1612' },
  { label: 'Deep Plum', color: '#1F0D24' },
];

const TEXT_COLOR_PALETTES = [
  { label: 'Auto (High Contrast)', value: '', colorClass: 'bg-gradient-to-r from-white to-gray-800' },
  { label: 'Crisp White', value: '#FFFFFF', colorClass: 'bg-white' },
  { label: 'Soft White', value: '#F3F4F6', colorClass: 'bg-gray-100' },
  { label: 'Deep Charcoal', value: '#111827', colorClass: 'bg-gray-900' },
  { label: 'Warm Amber', value: '#FBBF24', colorClass: 'bg-amber-400' },
  { label: 'Mint Green', value: '#34D399', colorClass: 'bg-emerald-400' },
  { label: 'Sky Blue', value: '#38BDF8', colorClass: 'bg-sky-400' },
  { label: 'Rose Pink', value: '#F472B6', colorClass: 'bg-pink-400' },
];

export function SimpleCreatorScreen({
  onBack,
  onSwitchToAdvanced,
  onOpenInEditor,
}: SimpleCreatorScreenProps) {
  const savedHandle = useStore((s) => s.savedHandle);
  const savedAvatar = useStore((s) => s.savedAvatar);
  const create = useStore((s) => s.create);

  // Active view: 'input' | 'results' | 'style-test'
  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'style-test'>('input');
  const [batchModalOpen, setBatchModalOpen] = useState(false);

  const [canvas, setCanvas] = useState<CanvasSize>(CANVAS_SIZES[0]); // Default 1:1 Square
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('');
  const [handle, setHandle] = useState(savedHandle || '@yourhandle');
  const [avatar, setAvatar] = useState<string | null>(savedAvatar);
  const [includeAvatar, setIncludeAvatar] = useState(true);

  // Background Image & Overlay Controls
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [overlayColor, setOverlayColor] = useState<'#000000' | '#FFFFFF'>('#000000');
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.55);
  const [textColor, setTextColor] = useState<string>(''); // empty string = auto contrast
  const [showTuningBar, setShowTuningBar] = useState(true);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalTarget, setImageModalTarget] = useState<'bg' | 'avatar'>('bg');

  const [activeCategory, setActiveCategory] = useState<DesignCategoryTag>('all');
  const [selectedDesign, setSelectedDesign] = useState<GeneratedDesign | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);
  const exportContainerRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFileAsOptimizedDataUrl(file).then((url) => setAvatar(url)).catch(() => {});
  };

  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFileAsOptimizedDataUrl(file)
      .then((url) => { setBgImage(url); showToast('Custom background image applied!'); })
      .catch(() => {});
  };

  const applyPreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    setTitle(preset.title);
    setBody(preset.body);
    setCategory(preset.category);
  };

  // Generate the 24 designs based on current input and background overlay
  const inputData: SimplePostInput = useMemo(() => ({
    title: title.trim() || 'Make a post people stop for.',
    body: body.trim() || 'Create content with clarity and focus. The best ideas are simple, memorable, and visually compelling.',
    category: category.trim() || 'INSIGHT',
    handle: handle.trim() || '@yourhandle',
    avatar: avatar,
    includeAvatar: includeAvatar,
    backgroundImage: bgImage,
    overlayColor: overlayColor,
    overlayOpacity: overlayOpacity,
    textColor: textColor || undefined,
  }), [title, body, category, handle, avatar, includeAvatar, bgImage, overlayColor, overlayOpacity, textColor]);

  const allDesigns = useMemo(() => {
    return generateAllDesigns(inputData, canvas);
  }, [inputData, canvas]);

  const filteredDesigns = useMemo(() => {
    if (activeCategory === 'all') return allDesigns;
    return allDesigns.filter((d) => d.categoryTag === activeCategory);
  }, [allDesigns, activeCategory]);

  const handleGenerate = () => {
    if (!title.trim() && !body.trim()) {
      applyPreset(SAMPLE_PRESETS[0]);
    }
    setActiveTab('results');
  };

  const handleSaveToProjects = (design: GeneratedDesign) => {
    create({
      templateId: design.project.templateId,
      canvas: design.project.canvas,
      background: JSON.parse(JSON.stringify(design.project.background)),
      elements: JSON.parse(JSON.stringify(design.project.elements)),
      name: design.project.name,
    });
    showToast('Saved to "My Designs"!');
  };

  const handleOpenInAdvanced = (design: GeneratedDesign) => {
    onOpenInEditor(design.project);
  };

  const handleDownload = async (design: GeneratedDesign) => {
    if (!exportContainerRef.current) return;
    setIsExporting(true);
    try {
      const url = await renderToJpeg(
        exportContainerRef.current,
        design.project.canvas.width,
        design.project.canvas.height
      );
      const filename = `${design.project.name.replace(/\s+/g, '-').toLowerCase()}.jpg`;
      downloadImage(url, filename);
      showToast('Image downloaded successfully!');
    } catch {
      showToast('Could not download image. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async (design: GeneratedDesign) => {
    if (!exportContainerRef.current) return;
    setIsExporting(true);
    try {
      const url = await renderToJpeg(
        exportContainerRef.current,
        design.project.canvas.width,
        design.project.canvas.height
      );
      const filename = `${design.project.name.replace(/\s+/g, '-').toLowerCase()}.jpg`;
      const res = await shareImage(url, filename, design.project.name);
      if (res === 'shared') showToast('Shared successfully!');
    } catch {
      showToast('Sharing failed or was cancelled.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-canvasbg relative overflow-hidden">
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-ink text-white px-4 py-2.5 rounded-full text-[13px] font-bold shadow-xl flex items-center gap-2 animate-fade-in">
          <IcCheck size={16} className="text-emerald-400" />
          {toast}
        </div>
      )}

      {/* Batch Generator Modal */}
      <BatchGeneratorModal
        isOpen={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        allDesigns={allDesigns}
        onShowToast={showToast}
      />

      {/* Hidden off-screen export container */}
      {selectedDesign && (
        <div
          style={{
            position: 'fixed',
            left: -9999,
            top: -9999,
            width: selectedDesign.project.canvas.width,
            height: selectedDesign.project.canvas.height,
            pointerEvents: 'none',
          }}
        >
          <div ref={exportContainerRef}>
            <StaticDesign project={selectedDesign.project} />
          </div>
        </div>
      )}

      {/* Top Application Header */}
      <header className="px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] bg-surface border-b border-line shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-full bg-canvasbg grid place-items-center text-ink active:bg-line/50"
              title="Go back"
            >
              <IcBack size={20} />
            </button>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand block leading-none">
                Easy Mode
              </span>
              <h1 className="text-[16px] font-extrabold text-ink leading-tight">
                Simple Post Creator
              </h1>
            </div>
          </div>

          {/* Quick Segmented Nav Tabs & Actions */}
          <div className="flex items-center gap-2">
            {/* Batch Exporter Trigger */}
            <button
              onClick={() => setBatchModalOpen(true)}
              className="text-[12px] font-bold text-ink bg-canvasbg hover:bg-line/60 border border-line px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors shadow-xs"
              title="Batch export multiple templates"
            >
              <Archive size={14} className="text-brand" />
              <span className="hidden sm:inline">Batch Generator</span>
              <span className="sm:hidden">Batch</span>
            </button>

            {/* Switch to Advanced Studio */}
            <button
              onClick={onSwitchToAdvanced}
              className="text-[12px] font-bold text-ink-2 bg-canvasbg hover:bg-line/60 border border-line px-2.5 py-1.5 rounded-full flex items-center gap-1.5 transition-colors"
            >
              <Sliders size={13} />
              <span className="hidden md:inline">Advanced Studio</span>
            </button>
          </div>
        </div>

        {/* Segmented Mode Switcher */}
        <div className="flex items-center gap-1.5 mt-3 p-1 bg-canvasbg rounded-xl border border-line">
          <button
            onClick={() => setActiveTab('input')}
            className={`flex-1 py-1.5 rounded-lg text-[12px] font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'input'
                ? 'bg-surface text-ink shadow-xs border border-line/60'
                : 'text-ink-3 hover:text-ink'
            }`}
          >
            <Edit3 size={13} className="shrink-0" />
            <span>Content & Background</span>
          </button>

          <button
            onClick={() => setActiveTab('results')}
            className={`flex-1 py-1.5 rounded-lg text-[12px] font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'results'
                ? 'bg-surface text-ink shadow-xs border border-line/60'
                : 'text-ink-3 hover:text-ink'
            }`}
          >
            <Sparkles size={13} className="text-brand shrink-0" />
            <span>25 Ready Styles</span>
          </button>

          <button
            onClick={() => setActiveTab('style-test')}
            className={`flex-1 py-1.5 rounded-lg text-[12px] font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'style-test'
                ? 'bg-surface text-ink shadow-xs border border-line/60'
                : 'text-ink-3 hover:text-ink'
            }`}
          >
            <Gauge size={13} className="text-amber-500 shrink-0" />
            <span>Style Test Lab</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* TAB 1: CONTENT INPUT & SIMPLE BACKGROUND FORM                             */}
      {/* ========================================================================= */}
      {activeTab === 'input' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
            {/* Quick Inspiration Pills */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11.5px] font-bold uppercase tracking-wide text-ink-3 flex items-center gap-1">
                  <Lightbulb size={13} className="text-amber-500 shrink-0" /> Need ideas? Tap a sample
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {SAMPLE_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => applyPreset(p)}
                    className="shrink-0 text-[12px] font-semibold bg-surface border border-line hover:border-brand/50 text-ink px-3 py-1.5 rounded-full active:bg-brand-soft/50 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Canvas Format Selector */}
            <div className="bg-surface rounded-2xl p-4 border border-line">
              <label className="block text-[12px] font-bold text-ink mb-2">
                Post Size / Aspect Ratio
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {CANVAS_SIZES.map((s) => {
                  const isSelected = canvas.key === s.key;
                  // Proportional preview dimensions
                  const ratio = s.height / s.width;
                  let boxW = 20;
                  let boxH = Math.round(20 * ratio);
                  if (boxH > 28) {
                    boxH = 28;
                    boxW = Math.round(28 / ratio);
                  }
                  return (
                    <button
                      key={s.key}
                      onClick={() => setCanvas(s)}
                      className={`p-2.5 rounded-xl border-2 text-left transition-colors flex items-center gap-2.5 ${
                        isSelected
                          ? 'border-brand bg-brand-soft/60'
                          : 'border-line bg-canvasbg hover:bg-line/40'
                      }`}
                    >
                      <div className="w-6 h-7 grid place-items-center shrink-0">
                        <div
                          className={`rounded-xs border-2 ${
                            isSelected ? 'border-brand bg-brand/30' : 'border-ink-3/70'
                          }`}
                          style={{
                            width: boxW,
                            height: boxH,
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[12.5px] font-bold text-ink truncate">{s.label}</span>
                        <span className="block text-[10px] text-ink-3 truncate">{s.note}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title / Hook Input */}
            <div className="bg-surface rounded-2xl p-4 border border-line">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-bold text-ink">
                  Headline / Title <span className="text-brand">*</span>
                </label>
                <span className="text-[10.5px] text-ink-3">Hook your audience</span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 3 Lessons That Changed How I Work"
                className="w-full bg-canvasbg border border-line rounded-xl px-3.5 py-3 text-[15px] font-bold text-ink placeholder:text-ink-3/70 outline-none focus:border-brand"
              />
            </div>

            {/* Main Message / Body Input */}
            <div className="bg-surface rounded-2xl p-4 border border-line">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-bold text-ink">
                  Main Content / Message <span className="text-brand">*</span>
                </label>
                <span className="text-[10.5px] text-ink-3">Regular body text</span>
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder="Type your main message, thoughts, bullet points, story, or quote here..."
                className="w-full bg-canvasbg border border-line rounded-xl p-3.5 text-[14px] leading-relaxed font-normal text-ink placeholder:text-ink-3/70 outline-none focus:border-brand resize-none"
              />
            </div>

            {/* =================================================================== */}
            {/* SIMPLE EDITOR BACKGROUND CUSTOMIZATION                              */}
            {/* =================================================================== */}
            <div className="bg-surface rounded-2xl p-4 border border-line space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[12px] font-bold text-ink flex items-center gap-1.5">
                    <ImageIcon size={15} className="text-brand" />
                    <span>Simple Editor Background & Photo Overlay</span>
                  </label>
                  <span className="text-[11px] text-ink-3 block">
                    Choose an image or tone with adjustable dimming for clean text contrast
                  </span>
                </div>
                {bgImage && (
                  <button
                    onClick={() => {
                      setBgImage(null);
                      showToast('Reset background to template defaults');
                    }}
                    className="text-[11.5px] font-bold text-red-500 hover:text-red-600 bg-red-50 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Trash2 size={12} />
                    <span>Reset Default</span>
                  </button>
                )}
              </div>

              {/* Upload Custom Image Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setImageModalTarget('bg');
                    setImageModalOpen(true);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-line bg-canvasbg hover:bg-line/40 text-ink font-bold text-[12.5px] flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
                >
                  <Upload size={14} className="text-brand" />
                  <span>Upload Your Own Photo / Image</span>
                </button>
                <input
                  ref={bgImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBgImageUpload}
                  className="hidden"
                />
              </div>

              {/* Curated Presets Scroll */}
              <div>
                <span className="text-[11px] font-bold text-ink-3 uppercase tracking-wide block mb-2">
                  Curated aesthetic photography:
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {CURATED_BG_IMAGES.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => {
                        setBgImage(img.url);
                        showToast(`Applied "${img.name}"`);
                      }}
                      className={`relative rounded-xl overflow-hidden aspect-video border-2 transition-all ${
                        bgImage === img.url
                          ? 'border-brand ring-2 ring-brand/30 scale-[1.02]'
                          : 'border-line hover:border-ink/30'
                      }`}
                    >
                      <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-end p-1">
                        <span className="text-[9px] font-bold text-white truncate drop-shadow-sm">
                          {img.name}
                        </span>
                      </div>
                      {bgImage === img.url && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-brand text-white grid place-items-center shadow-xs">
                          <Check size={10} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* OVERLAY & CONTRAST CONTROLS */}
              {bgImage && (
                <div className="pt-3 border-t border-line/80 space-y-3.5 bg-canvasbg/70 p-3.5 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <span className="text-[11.5px] font-extrabold uppercase tracking-wide text-ink flex items-center gap-1.5">
                      <SlidersHorizontal size={13} className="text-brand" />
                      Overlay & Readability Controls
                    </span>
                    <span className="text-[11px] font-bold text-brand bg-brand-soft px-2 py-0.5 rounded-full">
                      {Math.round(overlayOpacity * 100)}% Dim
                    </span>
                  </div>

                  {/* Black vs White Overlay Toggle */}
                  <div>
                    <span className="text-[11px] font-bold text-ink-2 block mb-1.5">Overlay Tint:</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setOverlayColor('#000000');
                          if (!textColor) setTextColor('#FFFFFF');
                        }}
                        className={`py-2 px-3 rounded-xl text-[12px] font-bold border flex items-center justify-center gap-2 transition-all ${
                          overlayColor === '#000000'
                            ? 'bg-ink text-white border-ink shadow-xs'
                            : 'bg-surface text-ink border-line hover:bg-line/30'
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full bg-black border border-white/40" />
                        <span>Black Overlay (Moody)</span>
                      </button>

                      <button
                        onClick={() => {
                          setOverlayColor('#FFFFFF');
                          if (!textColor) setTextColor('#111827');
                        }}
                        className={`py-2 px-3 rounded-xl text-[12px] font-bold border flex items-center justify-center gap-2 transition-all ${
                          overlayColor === '#FFFFFF'
                            ? 'bg-white text-ink border-ink shadow-xs ring-1 ring-ink/20'
                            : 'bg-surface text-ink border-line hover:bg-line/30'
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full bg-white border border-gray-400" />
                        <span>White Overlay (Light)</span>
                      </button>
                    </div>
                  </div>

                  {/* Opacity Slider */}
                  <div>
                    <div className="flex justify-between items-center text-[11px] font-bold text-ink-2 mb-1">
                      <span>Overlay Dimness</span>
                      <span className="text-ink font-extrabold">{Math.round(overlayOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.15}
                      max={0.85}
                      step={0.05}
                      value={overlayOpacity}
                      onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                      className="w-full accent-brand cursor-pointer h-1.5 bg-line rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] text-ink-3 mt-1">
                      <span>More Photo (15%)</span>
                      <span>Balanced (55%)</span>
                      <span>High Contrast (85%)</span>
                    </div>
                  </div>

                  {/* Text Color Picker */}
                  <div>
                    <span className="text-[11px] font-bold text-ink-2 block mb-1.5">
                      Text Color Override:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {TEXT_COLOR_PALETTES.map((p) => (
                        <button
                          key={p.value}
                          onClick={() => setTextColor(p.value)}
                          className={`h-7 px-2.5 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 transition-all ${
                            textColor === p.value
                              ? 'border-brand ring-2 ring-brand/30 bg-surface shadow-xs text-ink'
                              : 'border-line bg-surface text-ink-2 hover:bg-line/30'
                          }`}
                        >
                          <span className={`w-3 h-3 rounded-full border border-gray-400/40 ${p.colorClass}`} />
                          <span>{p.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Category Tag */}
            <div className="bg-surface rounded-2xl p-4 border border-line">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-bold text-ink">
                  Tag / Category <span className="text-ink-3 font-normal">(Optional)</span>
                </label>
                <span className="text-[10.5px] text-ink-3">e.g. MINDSET, LESSON #1</span>
              </div>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. INSIGHT or LESSON #1"
                className="w-full bg-canvasbg border border-line rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-ink placeholder:text-ink-3/70 outline-none focus:border-brand uppercase"
              />
            </div>

            {/* Handle & Profile Avatar */}
            <div className="bg-surface rounded-2xl p-4 border border-line space-y-3.5">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-bold text-ink">Author & Profile</label>
                <button
                  onClick={() => setIncludeAvatar(!includeAvatar)}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                    includeAvatar
                      ? 'bg-brand/10 border-brand text-brand'
                      : 'bg-canvasbg border-line text-ink-3'
                  }`}
                >
                  {includeAvatar ? 'Avatar: ON' : 'Avatar: OFF'}
                </button>
              </div>

              <div className="flex items-center gap-3">
                {includeAvatar && (
                  <div className="relative group shrink-0">
                    <div className="w-13 h-13 rounded-full overflow-hidden bg-canvasbg border-2 border-line grid place-items-center">
                      {avatar ? (
                        <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <IcAvatar size={24} className="text-ink-3" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setImageModalTarget('avatar');
                        setImageModalOpen(true);
                      }}
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-brand text-white grid place-items-center shadow-xs active:scale-95 transition-transform"
                      title="Upload photo"
                    >
                      <Upload size={11} />
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>
                )}

                <div className="flex-1">
                  <div className="flex items-center gap-2 bg-canvasbg rounded-xl px-3 py-2.5 border border-line">
                    <IcAt size={16} className="text-ink-3" />
                    <input
                      type="text"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      placeholder="@yourhandle"
                      className="flex-1 bg-transparent text-[13.5px] font-semibold text-ink outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom CTA Bar */}
          <div className="p-4 bg-surface border-t border-line shrink-0 flex items-center gap-3">
            <button
              onClick={handleGenerate}
              className="flex-1 h-13 bg-brand text-white rounded-xl flex items-center justify-center gap-2 font-extrabold text-[15px] shadow-md hover:bg-brand-dark active:scale-[0.99] transition-all"
            >
              <Wand2 size={18} />
              <span>Generate {allDesigns.length} Styles</span>
            </button>
            <button
              onClick={() => setBatchModalOpen(true)}
              className="h-13 px-4 bg-canvasbg hover:bg-line/50 border border-line text-ink rounded-xl font-bold text-[13px] flex items-center gap-1.5 transition-colors"
              title="Batch generate & export"
            >
              <Archive size={16} className="text-brand" />
              <span className="hidden sm:inline">Batch ZIP</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: READY STYLES GALLERY                                               */}
      {/* ========================================================================= */}
      {activeTab === 'results' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Filter Bar */}
          <div className="px-4 py-2.5 bg-surface border-b border-line shrink-0 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 shrink-0">
              {[
                { key: 'all', label: `All (${allDesigns.length})` },
                { key: 'minimal', label: 'Minimal' },
                { key: 'social', label: 'Social & Tweet' },
                { key: 'dark', label: 'Dark & Tech' },
                { key: 'bold', label: 'Bold & Punchy' },
                { key: 'pastel', label: 'Pastel' },
                { key: 'vibrant', label: 'Vibrant' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveCategory(tab.key as DesignCategoryTag)}
                  className={`shrink-0 px-3 py-1 rounded-full text-[11.5px] font-bold transition-colors ${
                    activeCategory === tab.key
                      ? 'bg-brand text-white'
                      : 'bg-canvasbg text-ink-2 hover:bg-line/50 border border-line'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setBatchModalOpen(true)}
                className="text-[11.5px] font-bold px-3 py-1 rounded-full bg-brand/10 border border-brand/30 text-brand flex items-center gap-1 hover:bg-brand/20 transition-colors"
              >
                <Archive size={13} />
                <span>Batch Export</span>
              </button>
            </div>
          </div>

          {/* Gallery Grid */}
          <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-8">
              {filteredDesigns.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDesign(d)}
                  className="group text-left bg-surface rounded-2xl overflow-hidden border border-line hover:border-brand/60 shadow-xs hover:shadow-md transition-all active:scale-[0.98] flex flex-col"
                >
                  <div
                    className="w-full overflow-hidden bg-canvasbg relative"
                    style={{ aspectRatio: `${canvas.width}/${canvas.height}` }}
                  >
                    <LiveThumbnail project={d.project} />
                  </div>
                  <div className="p-2.5 flex items-center justify-between">
                    <div className="min-w-0 flex-1 pr-1">
                      <span className="block text-[12px] font-bold text-ink truncate">
                        {d.name}
                      </span>
                      <span className="block text-[10px] text-ink-3 truncate">
                        {d.styleTag}
                      </span>
                    </div>
                    <span className="w-6 h-6 rounded-full bg-brand-soft text-brand grid place-items-center shrink-0 group-hover:bg-brand group-hover:text-white transition-colors">
                      <Sparkles size={12} />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: STYLE TEST CONTAINER LAB                                          */}
      {/* ========================================================================= */}
      {activeTab === 'style-test' && (
        <StyleTestContainer
          currentDesign={selectedDesign || allDesigns[0]}
          allDesigns={allDesigns}
          canvas={canvas}
          title={title || 'Make a post people stop for.'}
          body={body || 'Create content with clarity and focus. The best ideas are simple, memorable, and visually compelling.'}
          onUpdateTitle={setTitle}
          onUpdateBody={setBody}
          onSelectDesign={(d) => setSelectedDesign(d)}
          onSaveToProjects={handleSaveToProjects}
          onDownload={handleDownload}
          onOpenInEditor={handleOpenInAdvanced}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: SINGLE DESIGN PREVIEW & EXPORT ACTIONS                            */}
      {/* ========================================================================= */}
      {selectedDesign && activeTab !== 'style-test' && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div
            className="w-full max-w-[440px] bg-surface rounded-[32px] p-5 border border-line shadow-2xl animate-slide-up flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-line shrink-0">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand">
                  Design Preview
                </span>
                <h3 className="text-[17px] font-extrabold text-ink">{selectedDesign.name}</h3>
              </div>
              <button
                onClick={() => setSelectedDesign(null)}
                className="w-8 h-8 rounded-full bg-canvasbg text-ink-3 hover:text-ink grid place-items-center"
              >
                <X size={18} />
              </button>
            </div>

            {/* Preview Stage */}
            <div className="flex-1 overflow-y-auto py-4 flex items-center justify-center no-scrollbar">
              <div
                className="rounded-2xl overflow-hidden shadow-lg border border-line max-w-[280px] w-full"
                style={{ aspectRatio: `${canvas.width}/${canvas.height}` }}
              >
                <LiveThumbnail project={selectedDesign.project} />
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2.5 pt-2 border-t border-line shrink-0">
              <button
                onClick={() => handleDownload(selectedDesign)}
                disabled={isExporting}
                className="w-full h-12 bg-brand text-white rounded-xl font-extrabold text-[15px] flex items-center justify-center gap-2 shadow-sm hover:bg-brand-dark active:scale-[0.99] transition-all disabled:opacity-50"
              >
                <IcDownload size={18} />
                <span>{isExporting ? 'Generating Image...' : 'Download Image (PNG)'}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleOpenInAdvanced(selectedDesign)}
                  className="h-11 bg-canvasbg hover:bg-line/60 border border-line text-ink rounded-xl font-bold text-[13px] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Sliders size={15} />
                  <span>Open in Editor</span>
                </button>

                <button
                  onClick={() => handleSaveToProjects(selectedDesign)}
                  className="h-11 bg-canvasbg hover:bg-line/60 border border-line text-ink rounded-xl font-bold text-[13px] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <FolderPlus size={15} />
                  <span>Save to Designs</span>
                </button>
              </div>

              <button
                onClick={() => handleShare(selectedDesign)}
                disabled={isExporting}
                className="w-full py-1.5 text-center text-[12px] font-bold text-ink-3 hover:text-ink flex items-center justify-center gap-1"
              >
                <IcShare size={14} />
                <span>Share via mobile...</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Source Selection Modal */}
      <ImageSourceModal
        title={imageModalTarget === 'bg' ? 'Upload Background Image' : 'Upload Profile Avatar'}
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        onImageSelected={(dataUrl) => {
          if (imageModalTarget === 'bg') {
            setBgImage(dataUrl);
            showToast('Custom background image applied!');
          } else {
            setAvatar(dataUrl);
            showToast('Avatar updated!');
          }
        }}
      />
    </div>
  );
}
