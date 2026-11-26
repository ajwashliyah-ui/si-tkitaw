import React from 'react';

interface AdaptiveMascotSvgProps {
  level: 1 | 2 | 3 | 4;
  className?: string;
}

/**
 * Custom Illustrated Animated SVG (100% inline, zero external URLs, 100% print-ready)
 * Level 4: Trophy & Rocket with confetti/stars (Emerald & Gold)
 * Level 3: Smiling Sun & Blooming Flower with butterfly (Sky Blue & Sun Yellow)
 * Level 2: Green Sprout & Watering Can with falling water drops (Warm Orange & Leaf Green)
 * Level 1: Cute Smiling Seed in Pot with clouds & hearts (Soft Pastel)
 */
export const AdaptiveMascotSvg: React.FC<AdaptiveMascotSvgProps> = ({ level, className = '' }) => {
  if (level === 4) {
    return (
      <svg
        viewBox="0 0 180 140"
        className={`w-36 h-28 ${className}`}
        role="img"
        aria-label="Ilustrasi Piala Bintang Juara"
      >
        <circle cx="90" cy="70" r="54" fill="#D1FAE5" />
        {/* Confetti & Twinkling Stars */}
        <g className="anim-sparkle">
          <path d="M34 38l3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z" fill="#FACC15" />
          <path d="M144 34l2.5 5 5 1-3.5 3.5.8 5-4.8-2.5-4.8 2.5.8-5-3.5-3.5 5-1z" fill="#F59E0B" />
          <circle cx="46" cy="96" r="4" fill="#34D399" />
          <circle cx="138" cy="92" r="4.5" fill="#FBBF24" />
        </g>
        {/* Trophy */}
        <g className="anim-float">
          <path
            d="M62 42h56v24c0 16-12 29-28 29S62 82 62 66V42z"
            fill="#FACC15"
            stroke="#D97706"
            strokeWidth="2.5"
          />
          <path d="M62 48H48c0 14 7 22 14 23" fill="none" stroke="#D97706" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M118 48h14c0 14-7 22-14 23" fill="none" stroke="#D97706" strokeWidth="3.5" strokeLinecap="round" />
          <rect x="84" y="94" width="12" height="16" fill="#F59E0B" stroke="#D97706" strokeWidth="2" />
          <rect x="68" y="109" width="44" height="10" rx="4" fill="#059669" stroke="#065F46" strokeWidth="2" />
          <path d="M90 52l3.4 6.8 7.5 1.1-5.4 5.3 1.3 7.4L90 69l-6.8 3.6 1.3-7.4-5.4-5.3 7.5-1.1z" fill="#FFFFFF" />
        </g>
      </svg>
    );
  }

  if (level === 3) {
    return (
      <svg
        viewBox="0 0 180 140"
        className={`w-36 h-28 ${className}`}
        role="img"
        aria-label="Ilustrasi Matahari Ceria dan Bunga Mekar"
      >
        <circle cx="90" cy="70" r="54" fill="#E0F2FE" />
        {/* Smiling Sun */}
        <g transform="translate(124, 38)">
          <g className="anim-spin-slow">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <line
                key={deg}
                x1="0"
                y1="-22"
                x2="0"
                y2="-17"
                stroke="#F59E0B"
                strokeWidth="2.8"
                strokeLinecap="round"
                transform={`rotate(${deg})`}
              />
            ))}
          </g>
          <circle cx="0" cy="0" r="13" fill="#FACC15" stroke="#D97706" strokeWidth="2" />
          <circle cx="-4" cy="-2" r="1.4" fill="#78350F" />
          <circle cx="4" cy="-2" r="1.4" fill="#78350F" />
          <path d="M-4 3 Q0 7 4 3" fill="none" stroke="#78350F" strokeWidth="1.6" strokeLinecap="round" />
        </g>
        {/* Blooming Flower */}
        <g className="anim-bounce">
          <path d="M74 118V74" stroke="#16A34A" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M74 100 Q58 92 54 102 Q62 108 74 102" fill="#4ADE80" stroke="#15803D" strokeWidth="1.5" />
          <circle cx="74" cy="56" r="10" fill="#F472B6" />
          <circle cx="90" cy="68" r="10" fill="#F472B6" />
          <circle cx="84" cy="84" r="10" fill="#F472B6" />
          <circle cx="64" cy="84" r="10" fill="#F472B6" />
          <circle cx="58" cy="68" r="10" fill="#F472B6" />
          <circle cx="74" cy="70" r="10" fill="#FACC15" stroke="#D97706" strokeWidth="1.8" />
        </g>
        {/* Butterfly */}
        <g transform="translate(42, 42)">
          <g className="anim-float">
            <ellipse cx="-4" cy="0" rx="5" ry="7" fill="#38BDF8" stroke="#0284C7" strokeWidth="1.2" />
            <ellipse cx="4" cy="0" rx="5" ry="7" fill="#38BDF8" stroke="#0284C7" strokeWidth="1.2" />
            <line x1="0" y1="-6" x2="0" y2="6" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
          </g>
        </g>
      </svg>
    );
  }

  if (level === 2) {
    return (
      <svg
        viewBox="0 0 180 140"
        className={`w-36 h-28 ${className}`}
        role="img"
        aria-label="Ilustrasi Tunas Disiram Air"
      >
        <circle cx="90" cy="70" r="54" fill="#FEF3C7" />
        {/* Watering Can */}
        <g transform="translate(42, 26)">
          <g className="anim-float">
            <rect x="8" y="14" width="32" height="24" rx="5" fill="#F97316" stroke="#C2410C" strokeWidth="2" />
            <path d="M40 24l18-10 4 6-18 12z" fill="#FB923C" stroke="#C2410C" strokeWidth="2" />
            <path d="M8 20c-8 0-8 14 0 14" fill="none" stroke="#C2410C" strokeWidth="3" />
          </g>
        </g>
        {/* Falling Water Drops */}
        <g className="anim-water">
          <circle cx="102" cy="58" r="3" fill="#38BDF8" />
          <circle cx="110" cy="66" r="2.8" fill="#0EA5E9" />
          <circle cx="98" cy="72" r="2.5" fill="#38BDF8" />
        </g>
        {/* Green Sprout */}
        <path d="M105 114V78" stroke="#15803D" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M105 84 Q86 70 82 84 Q92 92 105 86" fill="#4ADE80" stroke="#15803D" strokeWidth="2" />
        <path d="M105 80 Q124 66 128 80 Q118 88 105 82" fill="#22C55E" stroke="#15803D" strokeWidth="2" />
        <ellipse cx="105" cy="115" rx="28" ry="6" fill="#D97706" opacity="0.35" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 180 140"
      className={`w-36 h-28 ${className}`}
      role="img"
      aria-label="Ilustrasi Bibit Tersenyum di Dalam Pot"
    >
      <circle cx="90" cy="70" r="54" fill="#FFE4E6" />
      {/* Soft Clouds */}
      <g className="anim-float">
        <path d="M36 42h24a6 6 0 000-12 8 8 0 00-15-2 6 6 0 00-9 14z" fill="#FFFFFF" />
        <path d="M120 48h22a5 5 0 000-10 7 7 0 00-13-2 5 5 0 00-9 12z" fill="#FFFFFF" />
      </g>
      {/* Cute Pot & Smiling Seed */}
      <g className="anim-bounce">
        <path d="M68 82h44l-6 34H74l-6-34z" fill="#FB923C" stroke="#C2410C" strokeWidth="2" />
        <rect x="63" y="76" width="54" height="10" rx="4" fill="#FDBA74" stroke="#C2410C" strokeWidth="2" />
        <path d="M90 76V58" stroke="#16A34A" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M90 62 Q76 52 76 62 Q82 68 90 64" fill="#4ADE80" stroke="#15803D" strokeWidth="1.5" />
        <path d="M90 60 Q104 50 104 60 Q98 66 90 62" fill="#22C55E" stroke="#15803D" strokeWidth="1.5" />
        {/* Smiling Face on Pot */}
        <circle cx="82" cy="96" r="2" fill="#7C2D12" />
        <circle cx="98" cy="96" r="2" fill="#7C2D12" />
        <path d="M85 102 Q90 106 95 102" fill="none" stroke="#7C2D12" strokeWidth="1.8" strokeLinecap="round" />
      </g>
      {/* Floating Heart */}
      <path
        className="anim-sparkle"
        d="M126 68c-2-3-7-2-7 2 0 3 7 8 7 8s7-5 7-8c0-4-5-5-7-2z"
        fill="#FB7185"
      />
    </svg>
  );
};
