import React from 'react';
import { CanvasSize } from '../types';
import { GeneratedDesign } from '../utils/simpleDesigns';
import { LiveThumbnail } from './LiveThumbnail';
import { IcDownload, IcCheck } from '../ui/icons';
import { FolderPlus, Sliders } from 'lucide-react';

// NOTE: this file didn't exist in the project export — SimpleCreatorScreen.tsx
// imported it but the source was missing, which crashed the whole app on
// load. Rebuilt from how it's called at the two use-sites (props below) and
// the tab's label/icon ("Style Test Lab"): a focused, one-design-at-a-time
// view for comparing styles and tweaking copy live, as a companion to the
// grid view on the "Results" tab. If the original had more to it than this,
// easy to extend — this covers the props it's actually given.

interface StyleTestContainerProps {
  currentDesign: GeneratedDesign;
  allDesigns: GeneratedDesign[];
  canvas: CanvasSize;
  title: string;
  body: string;
  onUpdateTitle: (v: string) => void;
  onUpdateBody: (v: string) => void;
  onSelectDesign: (d: GeneratedDesign) => void;
  onSaveToProjects: (d: GeneratedDesign) => void;
  onDownload: (d: GeneratedDesign) => void | Promise<void>;
  onOpenInEditor: (d: GeneratedDesign) => void;
}

export function StyleTestContainer({
  currentDesign,
  allDesigns,
  canvas,
  title,
  body,
  onUpdateTitle,
  onUpdateBody,
  onSelectDesign,
  onSaveToProjects,
  onDownload,
  onOpenInEditor,
}: StyleTestContainerProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 no-scrollbar flex flex-col gap-4">
      {/* Big live preview of the design currently under test */}
      <div className="rounded-2xl overflow-hidden border border-line bg-canvasbg shadow-xs mx-auto w-full max-w-[360px]">
        <div className="w-full" style={{ aspectRatio: `${canvas.width}/${canvas.height}` }}>
          <LiveThumbnail project={currentDesign.project} />
        </div>
      </div>

      <div className="text-center">
        <span className="text-[11px] font-bold text-ink-3">{currentDesign.styleTag}</span>
      </div>

      {/* Live copy editing — updates regenerate allDesigns upstream, so the
          preview above and the strip below reflect edits immediately. */}
      <div className="flex flex-col gap-2.5 bg-surface border border-line rounded-2xl p-3.5">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-ink-3">Title</label>
          <input
            value={title}
            onChange={(e) => onUpdateTitle(e.target.value)}
            placeholder="Make a post people stop for."
            className="w-full mt-1 bg-canvasbg border border-line rounded-xl px-3 py-2 text-[13px] font-semibold text-ink outline-none focus:border-brand/60"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-ink-3">Body</label>
          <textarea
            value={body}
            onChange={(e) => onUpdateBody(e.target.value)}
            placeholder="Create content with clarity and focus."
            rows={3}
            className="w-full mt-1 bg-canvasbg border border-line rounded-xl px-3 py-2 text-[13px] text-ink outline-none resize-none focus:border-brand/60"
          />
        </div>
      </div>

      {/* Style strip — flip through the same generated set from Results,
          without leaving this focused view. */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {allDesigns.map((d) => (
          <button
            key={d.id}
            onClick={() => onSelectDesign(d)}
            className={`shrink-0 w-14 rounded-xl overflow-hidden border-2 transition-colors ${
              d.id === currentDesign.id ? 'border-brand' : 'border-line/60 hover:border-line'
            }`}
            style={{ aspectRatio: `${canvas.width}/${canvas.height}` }}
            title={d.name}
          >
            <LiveThumbnail project={d.project} />
          </button>
        ))}
      </div>

      {/* Actions on the design currently under test */}
      <div className="grid grid-cols-3 gap-2 mt-1">
        <button
          onClick={() => onSaveToProjects(currentDesign)}
          className="flex flex-col items-center gap-1 py-2.5 rounded-2xl bg-canvasbg border border-line active:bg-line/60 transition-colors"
        >
          <FolderPlus size={16} className="text-ink-2" />
          <span className="text-[10px] font-bold text-ink-2">Save</span>
        </button>
        <button
          onClick={() => onDownload(currentDesign)}
          className="flex flex-col items-center gap-1 py-2.5 rounded-2xl bg-canvasbg border border-line active:bg-line/60 transition-colors"
        >
          <IcDownload size={16} />
          <span className="text-[10px] font-bold text-ink-2">Download</span>
        </button>
        <button
          onClick={() => onOpenInEditor(currentDesign)}
          className="flex flex-col items-center gap-1 py-2.5 rounded-2xl bg-brand text-white active:opacity-90 transition-opacity"
        >
          <Sliders size={16} />
          <span className="text-[10px] font-bold">Edit</span>
        </button>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-[11px] text-ink-3 pt-1">
        <IcCheck size={12} />
        <span>{allDesigns.length} styles generated from your current copy</span>
      </div>
    </div>
  );
}
