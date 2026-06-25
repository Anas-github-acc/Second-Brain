'use client';
import { useEffect, useState, useRef } from 'react';

/** Pure content — no background, no glows. The parent (LandingPageClient) owns those. */
export default function Hero() {
  const [mounted, setMounted] = useState(false);
  const [animWidth, setAnimWidth] = useState(0);
  const rafRef = useRef<number | null>(null);
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const secondMeasureRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setMounted(true);

    const measure = () => {
      if (!h1Ref.current || !secondMeasureRef.current) return 57;
      const total = h1Ref.current.offsetWidth;
      const word  = secondMeasureRef.current.offsetWidth;
      if (total === 0) return 57;
      return ((word + 8) / total) * 100;
    };

    const startDelay = setTimeout(() => {
      const targetPct = measure();
      const duration  = 850;
      const startTime = performance.now();

      const tick = (now: number) => {
        const elapsed = now - startTime;
        const t    = Math.min(elapsed / duration, 1);
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        setAnimWidth(ease * targetPct);
        if (t < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }, 420);

    return () => {
      clearTimeout(startDelay);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const TEXT = 'Second Brain';

  const headingStyle: React.CSSProperties = {
    fontFamily: '"Google Sans Display", "Google Sans", sans-serif',
    fontSize: 'clamp(72px, 11vw, 108px)',
    fontWeight: 400,
    lineHeight: 1,
    letterSpacing: '-1.5px',
    whiteSpace: 'nowrap',
  };

  return (
    /* No background — just the text block */
    <div
      className="flex flex-col items-center"
      style={{
        gap: 0,
        position: 'relative',  /* needed for the hidden measure span */
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.9s ease, transform 0.9s ease',
      }}
    >
      {/* Hidden measurement span */}
      <span
        ref={secondMeasureRef}
        aria-hidden="true"
        style={{
          ...headingStyle,
          position: 'absolute',
          visibility: 'hidden',
          top: 0, left: 0,
          pointerEvents: 'none',
        }}
      >
        Second
      </span>

      {/* H1 — "Second Brain" with left→right reveal */}
      <div style={{ position: 'relative', zIndex: 2, transform: 'rotate(-2deg) translateY(12px)', display: 'inline-block' }}>
        <h1
          ref={h1Ref}
          aria-label={TEXT}
          style={{ ...headingStyle, color: '#ffffff', userSelect: 'none', position: 'relative' }}
        >
          {TEXT}

          {/* White sweep bar */}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '-8px', left: '-4px', bottom: '-8px',
              width: `calc(${animWidth}% + 4px)`,
              background: '#ffffff',
              zIndex: 1,
              borderRadius: '4px',
              pointerEvents: 'none',
            }}
          />

          {/* Black text clipped to bar width */}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 0, left: 0, bottom: 0,
              overflow: 'hidden',
              width: `calc(${animWidth}% + 4px)`,
              zIndex: 2,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ ...headingStyle, color: '#000000', display: 'block' }}>{TEXT}</span>
          </span>
        </h1>
      </div>

      {/* H2 */}
      <h2 style={{
        fontFamily: '"Google Sans Display", "Google Sans", sans-serif',
        fontSize: 'clamp(58px, 9vw, 90px)',
        fontWeight: 400,
        color: '#ffffff',
        whiteSpace: 'nowrap',
        lineHeight: 1,
        letterSpacing: '-1px',
        position: 'relative',
        zIndex: 1,
      }}>
        explore before chose
      </h2>

      {/* Sub-line */}
      <p style={{
        fontFamily: '"Google Sans", sans-serif',
        fontSize: '0.95rem',
        color: 'rgba(255,255,255,0.35)',
        textAlign: 'center',
        maxWidth: 480,
        lineHeight: 1.65,
        marginTop: 28,
        letterSpacing: '0.01em',
      }}>
        Explore your career before your blindly chose your career. We built interactive nodes connected like a graph where you compare major life path and query what-if
      </p>
    </div>
  );
}
