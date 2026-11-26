import React from 'react';
import { useApp } from '../../context/AppContext';

export const StickerCelebration: React.FC = () => {
  const { celebration } = useApp();
  if (!celebration) return null;

  return (
    <div
      key={celebration.id}
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 md:bottom-20 z-60 flex justify-center px-4"
    >
      <div className="stiker-muncul flex items-center gap-2.5 bg-[#fffdf7] border-2 border-[#f2b632] rounded-full px-4 py-2 shadow-lg">
        {/* Handcrafted SVG Sun & Star Sticker */}
        <svg viewBox="0 0 44 44" className="w-8 h-8 shrink-0" aria-hidden="true">
          <circle cx="22" cy="22" r="14" fill="#f2b632" />
          <g stroke="#f2b632" strokeWidth="2.8" strokeLinecap="round">
            <line x1="22" y1="2" x2="22" y2="6" />
            <line x1="22" y1="38" x2="22" y2="42" />
            <line x1="2" y1="22" x2="6" y2="22" />
            <line x1="38" y1="22" x2="42" y2="22" />
            <line x1="8" y1="8" x2="11" y2="11" />
            <line x1="33" y1="33" x2="36" y2="36" />
            <line x1="36" y1="8" x2="33" y2="11" />
            <line x1="11" y1="33" x2="8" y2="36" />
          </g>
          <circle cx="17.5" cy="20" r="1.7" fill="#1d2b21" />
          <circle cx="26.5" cy="20" r="1.7" fill="#1d2b21" />
          <path d="M17 25 q5 4.5 10 0" fill="none" stroke="#1d2b21" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="14.5" cy="23.5" r="2" fill="#e58a65" opacity="0.65" />
          <circle cx="29.5" cy="23.5" r="2" fill="#e58a65" opacity="0.65" />
        </svg>

        <span className="font-display font-semibold text-sm text-[#0f4527]">
          {celebration.label}
        </span>

        {/* Handcrafted little leaf sprout */}
        <svg viewBox="0 0 28 28" className="w-6 h-6 shrink-0" aria-hidden="true">
          <path d="M14 23 V12" stroke="#176238" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M14 14 C8 13 6 7 12 6 C15 6 15 11 14 14 Z" fill="#176238" />
          <path d="M14 13 C20 12 22 6 16 5 C13 5 13 10 14 13 Z" fill="#82ba6e" />
        </svg>
      </div>
    </div>
  );
};

interface GuruSpiritBannerProps {
  done: number;
  total: number;
  titleDone?: string;
  titleProgress?: string;
}

export const GuruSpiritBanner: React.FC<GuruSpiritBannerProps> = ({
  done,
  total,
  titleDone = 'MasyaAllah, catatan kelas hari ini sudah lengkap!',
  titleProgress,
}) => {
  if (total <= 0) return null;
  const pct = Math.min(100, Math.round((done / total) * 100));
  const isComplete = done >= total;

  return (
    <div
      className={`mb-5 rounded-[22px] border px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
        isComplete
          ? 'bg-[#dcebd2]/75 border-[#176238]/35'
          : 'bg-[#fffdf7] border-[#d9d5c0]'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Handcrafted Notebook & Pencil Mascot */}
        <svg
          viewBox="0 0 64 64"
          className={`w-12 h-12 shrink-0 ${isComplete ? 'anim-bounce' : 'anim-float'}`}
          aria-hidden="true"
        >
          <rect x="10" y="10" width="38" height="46" rx="8" fill="#dcebd2" stroke="#176238" strokeWidth="2.5" />
          <rect x="15" y="10" width="6" height="46" rx="2" fill="#176238" />
          <circle cx="29" cy="28" r="2.2" fill="#1d2b21" />
          <circle cx="38" cy="28" r="2.2" fill="#1d2b21" />
          <path d="M29 35 q4.5 4 9 0" fill="none" stroke="#1d2b21" strokeWidth="2.2" strokeLinecap="round" />
          {/* Pencil leaning */}
          <g transform="translate(42, 22) rotate(18)">
            <rect x="0" y="0" width="7" height="24" rx="2" fill="#f2b632" stroke="#1d2b21" strokeWidth="1.8" />
            <polygon points="0,24 7,24 3.5,31" fill="#fdeab5" stroke="#1d2b21" strokeWidth="1.5" />
            <circle cx="3.5" cy="30" r="1.2" fill="#1d2b21" />
          </g>
          {isComplete && (
            <path
              d="M52 8 l2 4.5 4.8.6 -3.5 3.3 .9 4.7 -4.2-2.3 -4.2 2.3 .9-4.7 -3.5-3.3 4.8-.6z"
              fill="#f2b632"
              className="anim-sparkle"
            />
          )}
        </svg>

        <div className="min-w-0">
          <p className="font-display font-semibold text-sm sm:text-base text-[#0f4527] m-0">
            {isComplete
              ? titleDone
              : titleProgress || `${done} dari ${total} anak sudah dicatat hari ini`}
          </p>
          <p className="text-xs text-[#55665a] m-0 mt-0.5">
            {isComplete
              ? 'Laporan otomatis rapi tersimpan untuk dibaca Ayah & Bunda di rumah.'
              : 'Setiap catatan kecil membantu Ayah & Bunda menemani tumbuh kembang anak.'}
          </p>
        </div>
      </div>

      <div className="sm:w-44 shrink-0">
        <div className="flex items-center justify-between text-xs font-extrabold text-[#0f4527] mb-1">
          <span>Progres hari ini</span>
          <span className="font-mono-tabular">
            {done}/{total} ({pct}%)
          </span>
        </div>
        <progress max={total} value={done} />
      </div>
    </div>
  );
};
