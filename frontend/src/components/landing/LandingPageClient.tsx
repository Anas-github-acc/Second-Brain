'use client';
import { useEffect, useState } from 'react';
import Hero from '@/components/landing/Hero';
import DecisionInput from '@/components/landing/DecisionInput';
import PacmanOverlay from '@/components/landing/PacmanOverlay';

/**
 * Layout:
 *  ─ Background (dots + glows) — NEVER moves, always covers full viewport
 *  ─ Hero text  — slides UP by ~28vh after 3 s (no fade, pure translate)
 *  ─ Chatbox    — anchored to bottom, slides UP from below viewport (no fade)
 *
 * After transition both are simultaneously visible:
 *   headers in upper ~30% of screen, chatbox at bottom.
 */
export default function LandingPageClient() {
  const [phase, setPhase] = useState<'hero' | 'chat'>('hero');

  useEffect(() => {
    const t = setTimeout(() => setPhase('chat'), 2000);
    return () => clearTimeout(t);
  }, []);

  const out = phase === 'chat';

  return (
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden', background: '#000000' }}>

      {/* ── STATIC BACKGROUND — never moves ── */}

      {/* Dot grid */}
      <div
        className="dot-bg"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}
      />
      {/* Slow drifting white→off-white overlay */}
      <div
        className="dot-bg-gradient"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}
      />
      {/* Ambient glow — top centre (purple) */}
      <div
        style={{
          position: 'absolute',
          top: '-12%', left: '50%',
          transform: 'translateX(-50%)',
          width: 900, height: 900,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(108,99,255,0.16) 0%, transparent 65%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      {/* Ambient glow — bottom right (cyan) */}
      <div
        style={{
          position: 'absolute',
          bottom: '5%', right: '-8%',
          width: 500, height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,211,238,0.09) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* ── HERO TEXT — flex-centred layer, slides UP on transition ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
          /* Only translateY — no opacity, pure slide */
          transition: 'transform 0.75s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: out ? 'translateY(-8vh)' : 'translateY(0)',
          pointerEvents: out ? 'none' : 'auto',
        }}
      >
        <Hero />
      </div>

      {/* ── CHATBOX — anchored to bottom, slides from below screen ── */}
      <div
        style={{
          position: 'absolute',
          left: 0, right: 0, bottom: 0,
          padding: '0 16px 72px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 2,
          /* Pure translateY — no opacity */
          transition: 'transform 0.75s cubic-bezier(0.2, 0, 0.1, 1)',
          transform: out ? 'translateY(0)' : 'translateY(110%)',
          pointerEvents: out ? 'auto' : 'none',
        }}
      >
        <DecisionInput />
      </div>

      <PacmanOverlay />

    </div>
  );
}
