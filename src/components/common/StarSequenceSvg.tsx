import React, { useId } from 'react';

interface StarSequenceSvgProps {
  stars: number; // 0 to maxStars
  maxStars?: 4 | 5;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  label?: string;
}

export const StarSequenceSvg: React.FC<StarSequenceSvgProps> = ({
  stars,
  maxStars = 4,
  size = 'md',
  animated = true,
  label,
}) => {
  const uid = useId().replace(/:/g, '');
  const dim = size === 'sm' ? 18 : size === 'lg' ? 32 : 24;
  const gapClass = size === 'sm' ? 'gap-1' : size === 'lg' ? 'gap-2' : 'gap-1.5';

  return (
    <div
      className={`inline-flex items-center ${gapClass}`}
      role="img"
      aria-label={label || `${stars} dari ${maxStars} bintang`}
    >
      {Array.from({ length: maxStars }).map((_, idx) => {
        const isActive = idx < stars;
        const gradId = `starGrad-${uid}-${idx}`;
        return (
          <svg
            key={idx}
            width={dim}
            height={dim}
            viewBox="0 0 24 24"
            className={animated && isActive ? 'anim-star-pop' : ''}
            style={animated && isActive ? { animationDelay: `${idx * 90}ms` } : undefined}
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FACC15" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
            </defs>
            <path
              d="M12 2.2l2.92 5.92 6.53.95-4.72 4.6 1.11 6.5L12 17.1l-5.84 3.07 1.11-6.5-4.72-4.6 6.53-.95L12 2.2z"
              fill={isActive ? `url(#${gradId})` : '#E2E8F0'}
              stroke={isActive ? '#D97706' : '#CBD5E1'}
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            {isActive && (
              <path
                d="M9.6 7.4l1.1 2.1M8.2 9.4l1.5-.3"
                stroke="#FFFFFF"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.85"
              />
            )}
          </svg>
        );
      })}
    </div>
  );
};
