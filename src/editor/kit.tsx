import React, { useState } from 'react';
import { IcClose } from '../ui/icons';
import { ImageSourceModal } from '../components/ImageSourceModal';

export function Sheet({
  title, onClose, children, footer,
}: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="relative bg-surface flex flex-col border-t border-line" style={{ maxHeight: '45vh' }}>
      <div className="flex items-center justify-between px-5 pt-3 pb-2 shrink-0">
        <h3 className="text-[14px] font-bold text-ink">{title}</h3>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-canvasbg grid place-items-center text-ink active:bg-line transition-colors">
          <IcClose size={18} />
        </button>
      </div>
      <div className="overflow-y-auto px-5 pb-5 no-scrollbar flex-1">{children}</div>
      {footer && <div className="px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 border-t border-line shrink-0">{footer}</div>}
    </div>
  );
}

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-3">
      <div className="text-[12px] font-semibold text-ink-3 mb-2">{label}</div>
      {children}
    </div>
  );
}

export function Slider({
  label, value, min, max, step = 1, onChange, suffix = '',
}: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="py-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] font-semibold text-ink-3">{label}</span>
        <span className="text-[12px] font-semibold text-ink tabular-nums">{Math.round(value * 100) / 100}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full" />
    </div>
  );
}

const SWATCHES = [
  '#12131A', '#FFFFFF', '#F02D63', '#2E6BE6', '#17A34A', '#C8E000', '#D4FF3F', '#F5B92C',
  '#E8323C', '#0E3B2E', '#152232', '#3A5FC8', '#EFE9E1', '#F6F2EA', '#D7D9DE', '#8A8A8A',
];

export function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="grid grid-cols-8 gap-2">
        {SWATCHES.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`aspect-square rounded-full border ${value.toUpperCase() === c ? 'ring-2 ring-brand ring-offset-2' : 'border-line'}`}
            style={{ background: c }}
          />
        ))}
      </div>
      <label className="mt-3 flex items-center gap-3 bg-canvasbg rounded-2xl p-2.5">
        <input type="color" value={value.startsWith('#') ? value : '#000000'} onChange={(e) => onChange(e.target.value)} className="w-9 h-9 rounded-xl border-none bg-transparent" />
        <span className="text-[13px] font-semibold text-ink-2">Custom colour</span>
        <span className="ml-auto text-[12px] text-ink-3 uppercase">{value}</span>
      </label>
    </div>
  );
}

export function Seg<T extends string>({
  value, onChange, options,
}: { value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[] }) {
  return (
    <div className="flex gap-1 bg-canvasbg rounded-2xl p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 h-10 rounded-xl grid place-items-center text-[13px] font-semibold transition-colors ${
            value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-ink-3'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function BigButton({
  icon, label, sub, onClick, tone = 'plain',
}: { icon: React.ReactNode; label: string; sub?: string; onClick: () => void; tone?: 'plain' | 'brand' }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3.5 rounded-2xl p-3.5 text-left transition-colors ${
        tone === 'brand' ? 'bg-brand-soft' : 'bg-canvasbg active:bg-line'
      }`}
    >
      <span className={`w-11 h-11 rounded-2xl grid place-items-center shrink-0 ${tone === 'brand' ? 'bg-brand text-white' : 'bg-surface text-ink'}`}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-bold text-ink truncate">{label}</span>
        {sub && <span className="block text-[12px] text-ink-3 truncate">{sub}</span>}
      </span>
    </button>
  );
}

export function UploadButton({
  label, onFile, className = '',
}: { label: string; onFile: (dataUrl: string) => void; className?: string }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={`flex items-center justify-center gap-2 h-12 rounded-2xl bg-ink text-white text-[14px] font-bold cursor-pointer active:opacity-90 transition-opacity ${className}`}
      >
        {label}
      </button>

      <ImageSourceModal
        title={label}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onImageSelected={onFile}
      />
    </>
  );
}
