'use client';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';

const EXAMPLES = [
  'Tech job at Big MNC vs launching a startup',
  'Software Engineer in India vs relocating to USA',
  'MBA vs Direct work experience',
  'Freelance consulting vs Full-time employment',
  'Switch to product management vs stay as developer',
  'FAANG job vs Series A startup offer',
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
    <section className="flex flex-col items-center gap-6 px-4 pb-16">
      <div
        className="w-full max-w-2xl rounded-2xl p-1"
        style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.4), rgba(34,211,238,0.2))' }}
      >
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)' }}>
          <textarea
            id="decision-input"
            className="w-full resize-none outline-none text-base leading-relaxed"
            style={{ background: 'transparent', color: 'var(--text)', minHeight: 100, caretColor: 'var(--accent)' }}
            placeholder="Describe your career comparison... (e.g. Should I take a Big Tech job or launch my startup?)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
            rows={4}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs" style={{ color: 'var(--muted)' }}>⌘ + Enter to analyze</span>
            <button
              id="analyze-btn"
              onClick={handleSubmit}
              disabled={!text.trim() || loading}
              className="px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center gap-2 disabled:opacity-40"
              style={{ background: loading ? 'rgba(108,99,255,0.3)' : 'linear-gradient(135deg, #6c63ff, #22d3ee)', color: '#fff' }}
            >
              {loading ? (
                <><span className="spinning inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Analyzing...</>
              ) : (
                <>✦ Analyze Career Paths</>
              )}
            </button>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
        <span className="text-xs mr-2" style={{ color: 'var(--muted)', alignSelf: 'center' }}>Try:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            id={`example-${ex.replace(/\s+/g, '-').toLowerCase()}`}
            onClick={() => setText(ex)}
            className="px-3 py-1 rounded-full text-xs transition-all duration-150 hover:scale-105"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--muted)' }}
          >
            {ex}
          </button>
        ))}
      </div>
    </section>
  );
}
