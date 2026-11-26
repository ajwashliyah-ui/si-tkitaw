import React from 'react';
import { AnimatePresence, motion, Transition } from 'motion/react';

export const SPRING_CARD: Transition = {
  type: 'spring',
  stiffness: 360,
  damping: 28,
  mass: 0.9,
};

export const SPRING_TAB: Transition = {
  type: 'spring',
  stiffness: 480,
  damping: 32,
  mass: 0.75,
};

interface MotionCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  interactive?: boolean;
  ariaLabelledBy?: string;
}

/**
 * Reusable spring-animated card building on `.kartu` + `.kartu-taktil`
 */
export const MotionCard: React.FC<MotionCardProps> = ({
  children,
  className = '',
  delay = 0,
  interactive = true,
  ariaLabelledBy,
}) => {
  return (
    <motion.section
      aria-labelledby={ariaLabelledBy}
      initial={{ opacity: 0, y: 12, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...SPRING_CARD, delay }}
      className={`kartu ${interactive ? 'kartu-taktil' : ''} ${className}`.trim()}
    >
      {children}
    </motion.section>
  );
};

export interface TabOption<T extends string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
}

interface MotionTabBarProps<T extends string> {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  layoutId: string;
  ariaLabel?: string;
  className?: string;
}

/**
 * Segmented `.tab-bar` with Framer Motion `layoutId` spring pill slide.
 * Preserves `.tab-bar` / `.tab-btn` responsive mobile sizing without clipping.
 */
export function MotionTabBar<T extends string>({
  options,
  value,
  onChange,
  layoutId,
  ariaLabel,
  className = '',
}: MotionTabBarProps<T>) {
  return (
    <div className={`tab-bar ${className}`.trim()} role="tablist" aria-label={ariaLabel}>
      {options.map((opt) => {
        const isActive = opt.id === value;
        return (
          <motion.button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.id)}
            whileTap={{ scale: 0.95 }}
            transition={SPRING_TAB}
            className={`tab-btn tab-spring ${isActive ? 'aktif' : ''}`}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                transition={SPRING_TAB}
                aria-hidden="true"
                className="tab-pill-bg"
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {opt.icon}
              <span>{opt.label}</span>
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

interface MotionTabPanelProps {
  panelKey: string;
  children: React.ReactNode;
  className?: string;
}

export const MotionTabPanel: React.FC<MotionTabPanelProps> = ({
  panelKey,
  children,
  className = '',
}) => {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={panelKey}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
