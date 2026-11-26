import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { AntropometriRecord, Siswa } from '../../types';
import { computeStoryJourney, JourneyStage, StoryPillarId } from '../../utils/storyScene';
import { SPRING_CARD } from '../common/MotionPrimitives';

interface StorySceneGrowthProps {
  student: Siswa;
  latestAntro: AntropometriRecord | null | undefined;
  hasLiterasi: boolean;
  dailyLogsCount: number;
  agamaCount: number;
  kaihDaysCount: number;
  karyaCount: number;
  onNavigateTab: (tab: string) => void;
}

const STAGE_PALETTE: Record<
  JourneyStage,
  {
    skyTop: string;
    skyBottom: string;
    hillBack: string;
    hillFront: string;
    trailDone: string;
    cardTint: string;
  }
> = {
  tunas: {
    skyTop: '#d6ebf5',
    skyBottom: '#fbf6e7',
    hillBack: '#b8d7ac',
    hillFront: '#90bf85',
    trailDone: '#176238',
    cardTint: 'bg-[#fbf6e7]/80',
  },
  bersemi: {
    skyTop: '#bfe4f5',
    skyBottom: '#fff7de',
    hillBack: '#8fc586',
    hillFront: '#5ea165',
    trailDone: '#176238',
    cardTint: 'bg-[#fffdf7]',
  },
  bersinar: {
    skyTop: '#fdeab5',
    skyBottom: '#dcebd2',
    hillBack: '#6db06e',
    hillFront: '#3e8551',
    trailDone: '#f2b632',
    cardTint: 'bg-[#fffdf7]',
  },
};

const STONE_POSITIONS: Record<StoryPillarId, { x: number; y: number }> = {
  fisik: { x: 86, y: 196 },
  literasi: { x: 186, y: 176 },
  keagamaan: { x: 294, y: 196 },
  kaih: { x: 396, y: 174 },
};

export const StorySceneGrowth: React.FC<StorySceneGrowthProps> = ({
  student,
  latestAntro,
  hasLiterasi,
  dailyLogsCount,
  agamaCount,
  kaihDaysCount,
  karyaCount,
  onNavigateTab,
}) => {
  const journey = useMemo(
    () =>
      computeStoryJourney({
        student,
        latestAntro,
        hasLiterasi,
        dailyLogsCount,
        agamaCount,
        kaihDaysCount,
        karyaCount,
      }),
    [student, latestAntro, hasLiterasi, dailyLogsCount, agamaCount, kaihDaysCount, karyaCount]
  );

  const [selectedPillarId, setSelectedPillarId] = useState<StoryPillarId>('kaih');
  const activePillar =
    journey.pillars.find((p) => p.id === selectedPillarId) || journey.pillars[0];
  const palette = STAGE_PALETTE[journey.stage];
  const gradientId = `storySky-${student.siswa_id}-${journey.stage}`;

  return (
    <motion.section
      aria-labelledby="judul-story-scene"
      initial={{ opacity: 0, y: 14, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={SPRING_CARD}
      className="kartu kartu-taktil overflow-hidden space-y-4"
    >
      {/* Clean unboxed editorial header */}
      <div>
        <p className="text-xs font-bold text-[#176238] m-0 tabular-nums">
          {journey.stageLabel} · Indeks tumbuh {journey.progressScore}%
        </p>
        <h2 id="judul-story-scene" className="text-xl text-[#0f4527] mt-0.5 m-0">
          {journey.stageHeadline}
        </h2>
      </div>

      {/* Hand-coded Storybook SVG Landscape */}
      <div className="rounded-[20px] border border-[#d9d5c0] overflow-hidden bg-[#fbf6e7]">
        <svg
          viewBox="0 0 640 245"
          className="block w-full h-auto"
          role="img"
          aria-label={`Ilustrasi perjalanan tumbuh kembang ${student.nama_anak}: ${journey.stageLabel}`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={palette.skyTop} />
              <stop offset="100%" stopColor={palette.skyBottom} />
            </linearGradient>
          </defs>

          {/* Sky backdrop */}
          <rect width="640" height="245" fill={`url(#${gradientId})`} />

          {/* Drifting Storybook Clouds (existing .awan-mengalir keyframe) */}
          <g className="awan-mengalir" opacity={journey.stage === 'tunas' ? 0.92 : 0.85}>
            <path
              d="M62 58 h54 a12 12 0 0 0 0-24 a18 18 0 0 0-34-4 a13 13 0 0 0-20 28 Z"
              fill="#fffdf7"
            />
            <path
              d="M278 46 h48 a10 10 0 0 0 0-20 a15 15 0 0 0-29-3 a11 11 0 0 0-19 23 Z"
              fill="#fffdf7"
            />
          </g>

          {/* Celestial State: Tunas (Calm crescent) vs Bersemi (Morning Sun) vs Bersinar (Radiant Sun & Twinkling Stars) */}
          {journey.stage === 'tunas' && (
            <g transform="translate(552, 54)" className="anim-float">
              <circle cx="0" cy="0" r="24" fill="#fdeab5" opacity="0.5" />
              <path
                d="M6 -16 A17 17 0 1 0 18 10 A13 13 0 1 1 6 -16 Z"
                fill="#f2b632"
              />
            </g>
          )}

          {journey.stage !== 'tunas' && (
            <g transform="translate(556, 52)">
              <g className="anim-spin-slow">
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                  <line
                    key={deg}
                    x1="0"
                    y1="-30"
                    x2="0"
                    y2="-23"
                    stroke="#f2b632"
                    strokeWidth={journey.stage === 'bersinar' ? 3.2 : 2.5}
                    strokeLinecap="round"
                    transform={`rotate(${deg})`}
                  />
                ))}
              </g>
              <circle
                cx="0"
                cy="0"
                r={journey.stage === 'bersinar' ? 19 : 16}
                fill="#f2b632"
                stroke="#d99416"
                strokeWidth="2"
              />
              {/* Friendly storybook sun smile */}
              <circle cx="-5" cy="-2" r="1.6" fill="#0f4527" />
              <circle cx="5" cy="-2" r="1.6" fill="#0f4527" />
              <path
                d="M-5 4 Q0 9 5 4"
                fill="none"
                stroke="#0f4527"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </g>
          )}

          {journey.stage === 'bersinar' && (
            <g>
              <path
                className="bintang-kelip"
                d="M204 38 l3 7 7 1 -5 5 1 7 -6-3 -6 3 1-7 -5-5 7-1 Z"
                fill="#f2b632"
              />
              <path
                className="bintang-kelip"
                style={{ animationDelay: '0.8s' }}
                d="M440 34 l2.5 5.5 5.5 1 -4 4 .8 5.5 -4.8-2.5 -4.8 2.5 .8-5.5 -4-4 5.5-1 Z"
                fill="#176238"
              />
              <circle className="anim-sparkle" cx="378" cy="60" r="3.5" fill="#f2b632" />
            </g>
          )}

          {/* Rolling Storybook Hills */}
          <path
            d="M0 166 Q160 120 350 156 T640 144 L640 245 L0 245 Z"
            fill={palette.hillBack}
          />
          <path
            d="M0 192 Q210 152 430 182 T640 170 L640 245 L0 245 Z"
            fill={palette.hillFront}
          />

          {/* Winding Stepping-Stone Journey Path */}
          <path
            d="M54 206 Q135 168 186 176 T294 196 T396 174 T492 184"
            fill="none"
            stroke="#fffdf7"
            strokeWidth="10"
            strokeLinecap="round"
            opacity="0.65"
          />
          <motion.path
            d="M54 206 Q135 168 186 176 T294 196 T396 174 T492 184"
            fill="none"
            stroke={palette.trailDone}
            strokeWidth="4"
            strokeDasharray="6 6"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: Math.max(0.2, journey.progressScore / 100) }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* Center-Right Living Growth Plant / Garden (state-driven) */}
          {journey.stage === 'tunas' && (
            <g transform="translate(520, 178)">
              {/* Watering droplets nourishing the young sprout */}
              <g className="anim-water" transform="translate(-32, -52)">
                <circle cx="8" cy="4" r="3" fill="#5aa8d6" />
                <circle cx="20" cy="14" r="2.8" fill="#5aa8d6" />
                <circle cx="14" cy="24" r="2.4" fill="#7bc0e6" />
              </g>
              {/* Warm earth mound & young sprout */}
              <ellipse cx="0" cy="18" rx="34" ry="10" fill="#8b5e3c" />
              <g className="bunga-goyang">
                <path d="M0 16 V-18" stroke="#176238" strokeWidth="4.5" strokeLinecap="round" />
                <path
                  d="M0 -8 C-18 -14 -22 -28 -6 -28 C0 -28 0 -16 0 -8 Z"
                  fill="#4da167"
                />
                <path
                  d="M0 -14 C18 -20 22 -34 6 -34 C0 -34 0 -22 0 -14 Z"
                  fill="#78be7d"
                />
              </g>
            </g>
          )}

          {journey.stage === 'bersemi' && (
            <g transform="translate(522, 184)">
              {/* Young tree trunk & canopy */}
              <path d="M0 12 V-44" stroke="#7d5233" strokeWidth="7" strokeLinecap="round" />
              <path d="M0 -16 L-18 -30" stroke="#7d5233" strokeWidth="4" strokeLinecap="round" />
              <path d="M0 -24 L18 -38" stroke="#7d5233" strokeWidth="4" strokeLinecap="round" />
              <circle cx="-18" cy="-42" r="20" fill="#3e8551" />
              <circle cx="18" cy="-46" r="19" fill="#4da167" />
              <circle cx="0" cy="-60" r="24" fill="#176238" />
              {/* Two blooming swaying flowers */}
              <g transform="translate(-44, 12)" className="bunga-goyang">
                <path d="M0 6 V-12" stroke="#176238" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="0" cy="-16" r="5.5" fill="#f8dcd6" />
                <circle cx="0" cy="-16" r="2.4" fill="#f2b632" />
              </g>
              <g transform="translate(46, 8)" className="bunga-goyang" style={{ animationDelay: '0.9s' }}>
                <path d="M0 6 V-14" stroke="#176238" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="0" cy="-18" r="6" fill="#fdeab5" />
                <circle cx="0" cy="-18" r="2.6" fill="#d99416" />
              </g>
              {/* Fluttering butterfly */}
              <g transform="translate(-48, -76)" className="anim-float">
                <ellipse cx="-4.5" cy="0" rx="5" ry="7" fill="#f2b632" />
                <ellipse cx="4.5" cy="0" rx="5" ry="7" fill="#f2b632" />
                <line x1="0" y1="-6" x2="0" y2="6" stroke="#1d2b21" strokeWidth="2" strokeLinecap="round" />
              </g>
            </g>
          )}

          {journey.stage === 'bersinar' && (
            <g transform="translate(524, 184)">
              {/* Lush flourishing tree */}
              <path d="M0 14 V-56" stroke="#6c4529" strokeWidth="9" strokeLinecap="round" />
              <path d="M0 -22 L-24 -38" stroke="#6c4529" strokeWidth="5" strokeLinecap="round" />
              <path d="M0 -30 L24 -44" stroke="#6c4529" strokeWidth="5" strokeLinecap="round" />
              <circle cx="-26" cy="-54" r="24" fill="#2d7a47" />
              <circle cx="26" cy="-56" r="24" fill="#3e8551" />
              <circle cx="0" cy="-76" r="30" fill="#176238" />
              <circle cx="-12" cy="-56" r="22" fill="#227041" />
              {/* Golden fruits / blossoms inside canopy */}
              <circle cx="-20" cy="-64" r="4.5" fill="#f2b632" className="anim-sparkle" />
              <circle cx="16" cy="-68" r="4.5" fill="#f2b632" className="anim-sparkle" />
              <circle cx="2" cy="-84" r="5" fill="#fdeab5" className="anim-sparkle" />
              {/* Cheerful songbird perched */}
              <g transform="translate(36, -68)" className="anim-bounce">
                <ellipse cx="0" cy="0" rx="8" ry="6" fill="#fffdf7" />
                <circle cx="6" cy="-4" r="4.5" fill="#fffdf7" />
                <polygon points="10,-5 14,-3 10,-1" fill="#f2b632" />
                <circle cx="7" cy="-5" r="1" fill="#1d2b21" />
              </g>
              {/* Swaying garden flowers */}
              {[-52, -28, 34, 58].map((fx, idx) => (
                <g
                  key={fx}
                  transform={`translate(${fx}, ${12 - (idx % 2) * 4})`}
                  className="bunga-goyang"
                  style={{ animationDelay: `${idx * 0.45}s` }}
                >
                  <path d="M0 8 V-14" stroke="#0f4527" strokeWidth="2.5" strokeLinecap="round" />
                  <circle
                    cx="0"
                    cy="-18"
                    r="6"
                    fill={idx % 2 === 0 ? '#fdeab5' : '#f8dcd6'}
                  />
                  <circle cx="0" cy="-18" r="2.5" fill="#f2b632" />
                </g>
              ))}
              {/* Twin floating butterflies */}
              <g transform="translate(-58, -90)" className="anim-float">
                <ellipse cx="-4.5" cy="0" rx="5" ry="7" fill="#fffdf7" stroke="#f2b632" strokeWidth="1.2" />
                <ellipse cx="4.5" cy="0" rx="5" ry="7" fill="#fffdf7" stroke="#f2b632" strokeWidth="1.2" />
                <line x1="0" y1="-6" x2="0" y2="6" stroke="#0f4527" strokeWidth="2" strokeLinecap="round" />
              </g>
            </g>
          )}

          {/* 4 Interactive Milestone Stepping Stones */}
          {journey.pillars.map((pillar) => {
            const pos = STONE_POSITIONS[pillar.id];
            const isSelected = pillar.id === activePillar.id;
            return (
              <g
                key={pillar.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => setSelectedPillarId(pillar.id)}
                role="button"
                tabIndex={0}
                aria-label={`${pillar.label}: ${pillar.statusText}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedPillarId(pillar.id);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                {isSelected && (
                  <circle
                    cx="0"
                    cy="0"
                    r="23"
                    fill="none"
                    stroke="#f2b632"
                    strokeWidth="3"
                  />
                )}
                <circle
                  cx="0"
                  cy="0"
                  r="17"
                  fill={pillar.active ? '#176238' : '#fffdf7'}
                  stroke={isSelected ? '#0f4527' : '#d9d5c0'}
                  strokeWidth="2.5"
                />
                <text
                  x="0"
                  y="5"
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="800"
                  fontFamily="Fredoka, sans-serif"
                  fill={pillar.active ? '#fffdf7' : '#55665a'}
                >
                  {pillar.step}
                </text>
                <text
                  x="0"
                  y="32"
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fontFamily="Nunito Sans, sans-serif"
                  fill="#0f4527"
                >
                  {pillar.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Interactive Milestone Selector Tabs + Animated Spring Detail Panel */}
      <div className="space-y-3">
        <div className="tab-bar" role="tablist" aria-label="Pilih pilar perjalanan belajar anak">
          {journey.pillars.map((pillar) => {
            const isSelected = pillar.id === activePillar.id;
            return (
              <motion.button
                key={pillar.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedPillarId(pillar.id)}
                className={`tab-btn tab-spring ${isSelected ? 'aktif' : ''}`}
              >
                {isSelected && (
                  <motion.span
                    layoutId="ortu-story-pillar-pill"
                    transition={{ type: 'spring', stiffness: 480, damping: 32 }}
                    aria-hidden="true"
                    className="tab-pill-bg"
                  />
                )}
                <span className="relative z-10 tabular-nums">
                  {pillar.step}.{' '}
                  <span className="sm:hidden">
                    {pillar.id === 'fisik'
                      ? 'Fisik'
                      : pillar.id === 'literasi'
                      ? 'Literasi'
                      : pillar.id === 'keagamaan'
                      ? 'Agama'
                      : '7 KAIH'}
                  </span>
                  <span className="hidden sm:inline">{pillar.label}</span>
                </span>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activePillar.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={`rounded-[16px] border border-[#d9d5c0] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${palette.cardTint}`}
          >
            <div className="space-y-1">
              <p className="text-xs font-extrabold text-[#176238] m-0">
                {activePillar.label} · {activePillar.statusText}
              </p>
              <p className="text-sm text-[#1d2b21] m-0">{activePillar.detailText}</p>
              <p className="text-xs text-[#55665a] m-0">{journey.stageNarrative}</p>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab(activePillar.targetTab)}
              className="tbl kecil pegas-tekan shrink-0"
            >
              <span>{activePillar.ctaLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.section>
  );
};
