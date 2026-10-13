import React, { useState, useRef } from 'react';
import { GeneratedDesign } from '../utils/simpleDesigns';
import { StaticDesign } from '../render/Render';
import { renderToJpeg, downloadImage, downloadBlob } from '../utils/exporter';
import { LiveThumbnail } from './LiveThumbnail';
import JSZip from 'jszip';
import {
  X,
  Download,
  Archive,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
  FileText,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface BatchGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  allDesigns: GeneratedDesign[];
  onShowToast: (msg: string) => void;
}

export function BatchGeneratorModal({
  isOpen,
  onClose,
  allDesigns,
  onShowToast,
}: BatchGeneratorModalProps) {
  // Selected design IDs for batch export (defaults to top 6 curated)
  const [selectedIds, setSelectedIds] = useState<string[]>([
    'swiss-minimal',
    'social-tweet',
    'apple-notes',
    'cyber-neon',
    'pull-quote',
    'obsidian-studio',
  ]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [currentlyRenderingDesign, setCurrentlyRenderingDesign] = useState<GeneratedDesign | null>(null);
  
  const hiddenRenderRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(allDesigns.map((d) => d.id));
  };

  const selectTop6 = () => {
    setSelectedIds([
      'swiss-minimal',
      'social-tweet',
      'apple-notes',
      'cyber-neon',
      'pull-quote',
      'obsidian-studio',
    ]);
  };

  const selectDarkOnly = () => {
    setSelectedIds(
      allDesigns.filter((d) => d.categoryTag === 'dark').map((d) => d.id)
    );
  };

  const clearAll = () => {
    setSelectedIds([]);
  };

  // Batch Export to ZIP
  const handleExportZip = async () => {
    if (selectedIds.length === 0) {
      onShowToast('Please select at least 1 template to export.');
      return;
    }

    const designsToExport = allDesigns.filter((d) => selectedIds.includes(d.id));
    setIsGenerating(true);
    setProgressIndex(0);

    const zip = new JSZip();

    try {
      for (let i = 0; i < designsToExport.length; i++) {
        const design = designsToExport[i];
        setProgressIndex(i + 1);
        setCurrentlyRenderingDesign(design);

        // Allow DOM to update hidden render container
        await new Promise((r) => setTimeout(r, 120));

        if (hiddenRenderRef.current) {
          const dataUrl = await renderToJpeg(
            hiddenRenderRef.current,
            design.project.canvas.width,
            design.project.canvas.height
          );

          // Convert dataURL to base64 content
          const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
          const filename = `${String(i + 1).padStart(2, '0')}-${design.id}.jpg`;
          zip.file(filename, base64Data, { base64: true });
        }
      }

      onShowToast('Packaging ZIP archive...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, 'post-studio-batch.zip');
      onShowToast(`Successfully downloaded ${designsToExport.length} designs in ZIP!`);
      onClose();
    } catch (err) {
      console.error(err);
      onShowToast('Batch export encountered an issue. Try selecting fewer templates.');
    } finally {
      setIsGenerating(false);
      setCurrentlyRenderingDesign(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fade-in">
      <div
        className="w-full max-w-[820px] bg-surface rounded-[32px] border border-line shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-line flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand text-white grid place-items-center shadow-xs">
              <Archive size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-brand">
                  Batch Generator
                </span>
                <span className="text-[11px] font-extrabold bg-brand-soft text-brand px-2 py-0.5 rounded-full">
                  {selectedIds.length} Selected
                </span>
              </div>
              <h2 className="text-[19px] font-extrabold text-ink leading-tight">
                Generate & Export Multiple Templates
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isGenerating}
            className="w-8 h-8 rounded-full bg-canvasbg text-ink-3 hover:text-ink grid place-items-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Selection Filter Bar */}
        <div className="px-5 py-3 bg-canvasbg border-b border-line flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-ink-3 uppercase mr-1">Select:</span>
            <button
              onClick={selectTop6}
              className="text-[11.5px] font-bold px-2.5 py-1 rounded-lg border border-line bg-surface text-ink hover:border-brand transition-colors"
            >
              Top 6 Curated
            </button>
            <button
              onClick={selectDarkOnly}
              className="text-[11.5px] font-bold px-2.5 py-1 rounded-lg border border-line bg-surface text-ink hover:border-brand transition-colors"
            >
              Dark Tech Suite
            </button>
            <button
              onClick={selectAll}
              className="text-[11.5px] font-bold px-2.5 py-1 rounded-lg border border-line bg-surface text-ink hover:border-brand transition-colors"
            >
              Select All (24)
            </button>
            <button
              onClick={clearAll}
              className="text-[11.5px] font-bold px-2.5 py-1 rounded-lg text-ink-3 hover:text-red-500 transition-colors"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Multi-Select Template Grid */}
        <div className="flex-1 overflow-y-auto p-5 no-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {allDesigns.map((design) => {
              const isSelected = selectedIds.includes(design.id);
              return (
                <button
                  key={design.id}
                  onClick={() => toggleSelect(design.id)}
                  className={`text-left rounded-2xl overflow-hidden border-2 transition-all p-2 flex flex-col relative ${
                    isSelected
                      ? 'border-brand bg-brand-soft/40 shadow-xs'
                      : 'border-line bg-surface hover:border-ink/20 opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* Selection Checkbox */}
                  <div className="absolute top-3.5 right-3.5 z-10">
                    <div
                      className={`w-6 h-6 rounded-lg grid place-items-center transition-colors shadow-xs ${
                        isSelected ? 'bg-brand text-white' : 'bg-surface/90 border border-line text-ink-3'
                      }`}
                    >
                      {isSelected ? <Check size={14} strokeWidth={3} /> : null}
                    </div>
                  </div>

                  <div
                    className="w-full rounded-xl overflow-hidden bg-canvasbg mb-2 border border-line/50"
                    style={{
                      aspectRatio: `${design.project.canvas.width}/${design.project.canvas.height}`,
                    }}
                  >
                    <LiveThumbnail project={design.project} />
                  </div>

                  <div className="px-1 pb-1">
                    <span className="block text-[12px] font-bold text-ink truncate leading-tight">
                      {design.name}
                    </span>
                    <span className="block text-[10px] text-ink-3 truncate mt-0.5">
                      {design.styleTag}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Hidden render container for batch capture */}
        {currentlyRenderingDesign && (
          <div
            style={{
              position: 'fixed',
              left: -9999,
              top: -9999,
              width: currentlyRenderingDesign.project.canvas.width,
              height: currentlyRenderingDesign.project.canvas.height,
              pointerEvents: 'none',
            }}
          >
            <div ref={hiddenRenderRef}>
              <StaticDesign project={currentlyRenderingDesign.project} />
            </div>
          </div>
        )}

        {/* Footer Actions & Progress */}
        <div className="p-4 sm:p-5 bg-surface border-t border-line shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="block text-[13px] font-bold text-ink">
              {selectedIds.length} styles selected for batch generation
            </span>
            <span className="block text-[11px] text-ink-3">
              Bundles all chosen designs into a single organized ZIP package.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="flex-1 sm:flex-none px-4 py-3 rounded-xl border border-line bg-canvasbg font-bold text-[13px] text-ink hover:bg-line/40 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExportZip}
              disabled={isGenerating || selectedIds.length === 0}
              className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-brand text-white font-extrabold text-[14px] flex items-center justify-center gap-2 shadow-md hover:bg-brand-dark active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>
                    Generating {progressIndex} of {selectedIds.length}...
                  </span>
                </>
              ) : (
                <>
                  <Archive size={16} />
                  <span>Download ZIP ({selectedIds.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
