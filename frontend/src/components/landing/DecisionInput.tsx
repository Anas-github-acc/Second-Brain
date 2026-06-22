'use client';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';

const EXAMPLES = [
  "I'm in 11th and I have option to give JEE, start a startup or Do some Job.",
  "Should I drop a year to crack NEET or pursue engineering?",
  "MBA from IIM vs 2 years of direct startup experience",
];

export default function DecisionInput() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { initSession } = useSession();

  const handleSubmit = useCallback(async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
      const sessionId = await initSession(text.trim());
      if (sessionId) {
        router.push(`/session/${sessionId}`);
      } else {
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, [text, loading, initSession, router]);

  return (
    <section className="flex flex-col items-center gap-3 w-full" style={{ maxWidth: 780 }}>

      {/* ── Spinning border wrapper (1.5px padding = visible border) ── */}
      <div
        className="chatbox-border-wrap"
        style={{ width: '100%', borderRadius: 20, padding: '1.5px' }}
      >
        {/* ── Inner box: gradient from solid black → transparent ── */}
        <div
          style={{
            borderRadius: 19,
            background: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            /* faint top-edge highlight */
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
            padding: '22px 26px 18px',
          }}
        >
          <textarea
            id="decision-input"
            className="w-full resize-none outline-none leading-relaxed"
            style={{
              background: 'transparent',
              color: 'rgba(240,244,255,0.88)',
              minHeight: 116,
              caretColor: '#7ba7ff',
              fontFamily: '"Google Sans", sans-serif',
              fontSize: '1.12rem',
              letterSpacing: '0.01em',
            }}
            placeholder="Describe your career comparison… e.g. Should I take a Big Tech job or launch my startup?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
            }}
            rows={3}
          />

          <div className="flex items-center justify-between" style={{ marginTop: 12 }}>
            <span style={{
              fontSize: '0.74rem',
              color: 'rgba(255,255,255,0.20)',
              fontFamily: '"Google Sans", sans-serif',
            }}>
              ⌘ + Enter to analyze
            </span>
            <button
              id="analyze-btn"
              onClick={handleSubmit}
              disabled={!text.trim() || loading}
              className="flex items-center gap-2 transition-all duration-200 disabled:opacity-40"
              style={{
                padding: '8px 22px',
                borderRadius: 10,
                background: loading
                  ? 'rgba(108,99,255,0.25)'
                  : 'linear-gradient(135deg, #6c63ff, #22d3ee)',
                color: '#fff',
                fontFamily: '"Google Sans", sans-serif',
                fontSize: '0.9rem',
                fontWeight: 500,
                border: 'none',
                cursor: !text.trim() || loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 0 16px rgba(108,99,255,0.30)',
              }}
            >
              {loading ? (
                <>
                  <span className="spinning inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  Analyzing…
                </>
              ) : (
                <>✦ Analyze Career Paths</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Try pills — no label, white bg on hover, no scale ── */}
      <div className="flex flex-wrap gap-1.5 justify-center w-full">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            id={`example-${ex.slice(0, 20).replace(/\s+/g, '-').toLowerCase()}`}
            onClick={() => setText(ex)}
            className="transition-colors duration-150"
            style={{
              padding: '4px 12px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.09)',
              color: 'rgba(255,255,255,0.38)',
              fontFamily: '"Google Sans", sans-serif',
              fontSize: '0.72rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 260,
              display: 'block',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = 'rgba(255,255,255,0.10)';
              el.style.borderColor = 'rgba(255,255,255,0.18)';
              el.style.color = 'rgba(255,255,255,0.70)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = 'rgba(255,255,255,0.04)';
              el.style.borderColor = 'rgba(255,255,255,0.09)';
              el.style.color = 'rgba(255,255,255,0.38)';
            }}
          >
            {ex}
          </button>
        ))}
      </div>
    </section>
  );
}
