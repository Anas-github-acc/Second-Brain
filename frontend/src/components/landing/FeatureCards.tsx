'use client';
export default function FeatureCards() {
  const features = [
    {
      icon: '🔍',
      title: 'Discovery Engine',
      description: 'AI identifies your goal, career paths, hidden tradeoffs, risk tolerance, and family obligations through targeted questions.',
      color: '#6c63ff',
      accent: 'rgba(108,99,255,0.15)',
      border: 'rgba(108,99,255,0.3)',
    },
    {
      icon: '🕸️',
      title: 'Scenario Graph',
      description: 'Generates a deep interactive graph of comparison roots, union paths, failure forks, and risk mitigations using an adjacency matrix.',
      color: '#22d3ee',
      accent: 'rgba(34,211,238,0.12)',
      border: 'rgba(34,211,238,0.25)',
    },
    {
      icon: '⚡',
      title: 'What-if Engine',
      description: 'Mark any node and ask a what-if question. The AI adds 2–6 new outcome branches directly to the live canvas in real time.',
      color: '#a78bfa',
      accent: 'rgba(167,139,250,0.12)',
      border: 'rgba(167,139,250,0.25)',
    },
  ];

  return (
    <section className="px-4 pb-28 max-w-5xl mx-auto">
      {/* Section label */}
      <div className="flex items-center gap-4 mb-10">
        <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <span
          style={{
            fontFamily: '"Google Sans", sans-serif',
            fontSize: '0.7rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.2)',
          }}
        >
          What you get
        </span>
        <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {features.map((f, i) => (
          <div
            key={f.title}
            className="feature-card relative flex flex-col gap-5 p-6 rounded-2xl overflow-hidden transition-all duration-300 cursor-default"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: `1px solid rgba(255,255,255,0.07)`,
              animationDelay: `${i * 120}ms`,
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.background = f.accent;
              el.style.borderColor = f.border;
              el.style.transform = 'translateY(-4px)';
              el.style.boxShadow = `0 20px 60px ${f.color}18`;
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.background = 'rgba(255,255,255,0.025)';
              el.style.borderColor = 'rgba(255,255,255,0.07)';
              el.style.transform = 'translateY(0)';
              el.style.boxShadow = 'none';
            }}
          >
            {/* Glow dot in corner */}
            <div
              className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none opacity-0 feature-glow"
              style={{ background: `radial-gradient(circle, ${f.color}30 0%, transparent 70%)`, transform: 'translate(30%, -30%)' }}
            />

            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
              style={{ background: f.accent, border: `1px solid ${f.border}` }}
            >
              {f.icon}
            </div>

            <div className="flex flex-col gap-2">
              <h3
                style={{
                  fontFamily: '"Google Sans Display", "Google Sans", sans-serif',
                  fontWeight: 400,
                  fontSize: '1.05rem',
                  color: '#f0f0ff',
                }}
              >
                {f.title}
              </h3>
              <p
                style={{
                  fontFamily: '"Google Sans", sans-serif',
                  fontSize: '0.85rem',
                  lineHeight: 1.65,
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                {f.description}
              </p>
            </div>

            {/* Bottom accent line */}
            <div
              className="absolute bottom-0 left-0 right-0 h-px"
              style={{ background: `linear-gradient(90deg, transparent, ${f.color}40, transparent)` }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
