'use client';
import { useEffect, useState } from 'react';

export default function Hero() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section className="relative flex flex-col items-center justify-center pt-24 pb-8 px-4 overflow-hidden">
      <div
        className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6c63ff 0%, transparent 70%)', filter: 'blur(60px)' }}
      />
      <div
        className="absolute top-[200px] right-[-100px] w-[400px] h-[400px] rounded-full opacity-10 pointer-events-none float"
        style={{ background: 'radial-gradient(circle, #22d3ee 0%, transparent 70%)', filter: 'blur(60px)' }}
      />
      <div className={`flex flex-col items-center gap-6 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div
          className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium"
          style={{ background: 'rgba(108, 99, 255, 0.15)', border: '1px solid rgba(108, 99, 255, 0.4)', color: '#a78bfa' }}
        >
          <span className="w-2 h-2 rounded-full bg-[#6c63ff] inline-block" />
          AI-Powered Career Path Intelligence
        </div>
        <h1 className="text-5xl md:text-7xl font-bold text-center leading-tight max-w-4xl">
          <span className="gradient-text">Career Path</span>
          <br />
          <span style={{ color: 'var(--text)' }}>Scenario Simulator</span>
        </h1>
        <p className="text-center max-w-xl text-lg leading-relaxed" style={{ color: 'var(--muted)' }}>
          Compare major life & career decisions. Our AI builds a rich interactive scenario graph
          showing every possible path, outcome, risk, and hidden tradeoff — instantly.
        </p>
        <div className="flex gap-8 mt-2">
          {[
            { value: '15-100', label: 'Graph Nodes' },
            { value: '3-Pass', label: 'LLM Pipeline' },
            { value: 'What-if', label: 'Expansion Engine' },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center">
              <span className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{stat.value}</span>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
