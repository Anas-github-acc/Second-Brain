export default function FeatureCards() {
  const features = [
    {
      icon: '🔍',
      title: 'Discovery Engine',
      description: 'AI identifies your goal, career paths, hidden tradeoffs, risk tolerance, and family obligations through targeted questions.',
      color: '#6c63ff',
    },
    {
      icon: '🕸️',
      title: 'Scenario Graph (15-100 nodes)',
      description: 'Generates a deep interactive graph of comparison roots, union paths, failure forks, and risk mitigations using an adjacency matrix.',
      color: '#22d3ee',
    },
    {
      icon: '⚡',
      title: 'What-if Expansion Engine',
      description: 'Mark any node and ask a what-if question. The AI adds 2-6 new outcome branches directly to the live canvas.',
      color: '#a78bfa',
    },
  ];
  return (
    <section className="px-4 pb-24 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <div
            key={f.title}
            className="glass p-6 flex flex-col gap-4 transition-all duration-300 hover:scale-[1.02]"
            style={{ animationDelay: `${i * 150}ms` }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: `${f.color}22`, border: `1px solid ${f.color}44` }}>
              {f.icon}
            </div>
            <h3 className="font-semibold text-lg" style={{ color: 'var(--text)' }}>{f.title}</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
