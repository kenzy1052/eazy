import React from 'react';
import { IcSparkle, IcShapes, IcCheck } from '../ui/icons';
import { ArrowRight, Wand2, Sliders, X } from 'lucide-react';
import { EazyPostLogo } from './EazyPostLogo';

interface CreateModeModalProps {
  onSelectSimple: () => void;
  onSelectAdvanced: () => void;
  onClose: () => void;
}

export function CreateModeModal({ onSelectSimple, onSelectAdvanced, onClose }: CreateModeModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div
        className="w-full max-w-[480px] bg-surface rounded-t-[32px] sm:rounded-[32px] p-6 border border-line shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-line">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <EazyPostLogo size={14} />
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand">EazyPost Studio</span>
            </div>
            <h2 className="text-[20px] font-extrabold text-ink">How do you want to create?</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-canvasbg text-ink-3 hover:text-ink grid place-items-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3.5 mt-5">
          {/* Simple Mode Option */}
          <button
            onClick={onSelectSimple}
            className="w-full bg-gradient-to-br from-brand-soft/80 to-brand-soft/30 hover:from-brand-soft border-2 border-brand/40 hover:border-brand rounded-2xl p-4.5 text-left transition-all group active:scale-[0.99] relative overflow-hidden"
          >
            <div className="absolute top-3.5 right-3.5 bg-brand text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wide flex items-center gap-1 shadow-xs">
              <IcSparkle size={12} /> Easy & Fast
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-brand text-white grid place-items-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <Wand2 size={24} />
              </div>
              <div className="flex-1 pr-16">
                <span className="block text-[17px] font-extrabold text-ink">
                  Simple Creator
                </span>
                <span className="block text-[12.5px] text-ink-2 mt-1 leading-snug">
                  Just enter your title, text & handle. Instantly generates <strong>25 ready-to-post designs</strong> for you to pick.
                </span>

                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-md">
                    <IcCheck size={12} /> No design skills needed
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-ink-2 bg-canvasbg px-2 py-0.5 rounded-md">
                    25 instant styles
                  </span>
                </div>
              </div>
            </div>
          </button>

          {/* Advanced Mode Option */}
          <button
            onClick={onSelectAdvanced}
            className="w-full bg-canvasbg hover:bg-line/40 border-2 border-line hover:border-ink/20 rounded-2xl p-4.5 text-left transition-all group active:scale-[0.99]"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-surface border border-line text-ink grid place-items-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <Sliders size={22} className="text-ink" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="block text-[17px] font-extrabold text-ink">
                    Advanced Studio
                  </span>
                  <span className="text-[11px] font-bold text-ink-3 bg-surface border border-line px-2 py-0.5 rounded-md">
                    Full Control
                  </span>
                </div>
                <span className="block text-[12.5px] text-ink-2 mt-1 leading-snug">
                  Pick a canvas size, select a starting template or blank canvas, and design freely with drag-and-drop layer tools.
                </span>

                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-3 bg-surface px-2 py-0.5 rounded-md border border-line">
                    Layer selection
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-3 bg-surface px-2 py-0.5 rounded-md border border-line">
                    Blank canvas
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-3 bg-surface px-2 py-0.5 rounded-md border border-line">
                    Custom typography
                  </span>
                </div>
              </div>
            </div>
          </button>
        </div>

        <div className="mt-5 pt-3 text-center">
          <p className="text-[12px] text-ink-3">
            You can always switch between simple and advanced anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
