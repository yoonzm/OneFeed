import { useEffect, useRef, type HTMLAttributes } from 'react';

const DEFAULT_COLORS = ['#1769e0', '#69a8ff', '#9fc6ff'];
const BAND_HALF = 17;
const SWEEP_START = -BAND_HALF;
const SWEEP_END = 100 + BAND_HALF;

const sweepEase = (progress: number) => (
  progress < 0.5
    ? 4 * progress ** 3
    : 1 - (-2 * progress + 2) ** 3 / 2
);

/** Build the moving color band while keeping revealed text on the theme foreground. */
function buildGradient(position: number, colors: string[], textColor: string) {
  const bandStart = position - BAND_HALF;
  const bandEnd = position + BAND_HALF;

  if (bandStart >= 100) {
    return `linear-gradient(90deg, ${textColor}, ${textColor})`;
  }

  const parts: string[] = [];
  if (bandStart > 0) {
    parts.push(`${textColor} 0%`, `${textColor} ${bandStart.toFixed(2)}%`);
  }

  colors.forEach((color, index) => {
    const percentage = colors.length === 1
      ? position
      : bandStart + (index / (colors.length - 1)) * BAND_HALF * 2;
    parts.push(`${color} ${percentage.toFixed(2)}%`);
  });

  if (bandEnd < 100) {
    parts.push(`transparent ${bandEnd.toFixed(2)}%`, 'transparent 100%');
  }

  return `linear-gradient(90deg, ${parts.join(', ')})`;
}

interface DiaTextRevealProps extends Omit<
  HTMLAttributes<HTMLSpanElement>,
  'children' | 'color' | 'style'
> {
  text: string;
  colors?: string[];
  textColor?: string;
  duration?: number;
  delay?: number;
}

/** Magic UI's Dia Text Reveal, trimmed to the single-label variant used by OneFeed headers. */
export function DiaTextReveal({
  text,
  colors = DEFAULT_COLORS,
  textColor = 'var(--color-onefeed-ink, var(--ink, #172033))',
  duration = 1.5,
  delay = 0,
  className,
  ...props
}: DiaTextRevealProps) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const palette = colors.length > 0 ? colors : DEFAULT_COLORS;
  const reduceMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const initialPosition = reduceMotion ? SWEEP_END : SWEEP_START;

  useEffect(() => {
    const element = spanRef.current;
    if (!element) return undefined;

    const setPosition = (position: number) => {
      element.style.backgroundImage = buildGradient(position, palette, textColor);
    };
    if (
      reduceMotion
      || duration <= 0
      || typeof window.requestAnimationFrame !== 'function'
    ) {
      setPosition(SWEEP_END);
      return undefined;
    }

    let animationFrame: number | undefined;
    let startTime: number | undefined;
    const durationMs = duration * 1000;

    const renderFrame = (timestamp: number) => {
      startTime ??= timestamp;
      const progress = Math.min((timestamp - startTime) / durationMs, 1);
      const position = SWEEP_START
        + (SWEEP_END - SWEEP_START) * sweepEase(progress);
      setPosition(position);
      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(renderFrame);
      }
    };

    const delayTimer = window.setTimeout(() => {
      animationFrame = window.requestAnimationFrame(renderFrame);
    }, Math.max(delay, 0) * 1000);

    return () => {
      window.clearTimeout(delayTimer);
      if (animationFrame !== undefined) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [delay, duration, palette, reduceMotion, textColor]);

  return (
    <span
      ref={spanRef}
      className={className}
      style={{
        color: 'transparent',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        backgroundImage: buildGradient(initialPosition, palette, textColor),
        backgroundSize: '100% 100%',
      }}
      {...props}
    >
      {text}
    </span>
  );
}
