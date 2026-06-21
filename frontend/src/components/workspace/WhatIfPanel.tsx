'use client';
import { useState } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { useSession } from '@/hooks/useSession';

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  root: { label: 'START', color: '#6c63ff' },
  comparisonRoot: { label: 'PATH', color: '#22d3ee' },
  unionPath: { label: 'UNION', color: '#a78bfa' },
  outcome: { label: 'OUTCOME', color: '#22c55e' },
  failureFork: { label: 'RISK', color: '#ef4444' },
  riskMitigation: { label: 'MITIGATE', color: '#f59e0b' },
  default: { label: 'NODE', color: '#8888aa' },
};

export default function WhatIfPanel() {
  const selectedNode = useSessionStore((s) => s.selectedNode);
  const setSelectedNode = useSessionStore((s) => s.setSelectedNode);
  const isLoading = useSessionStore((s) => s.isLoading);
  const loadingMessage = useSessionStore((s) => s.loadingMessage);
  const scenarioGraph = useSessionStore((s) => s.scenarioGraph);

  const { expandNode } = useSession();
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!selectedNode) return null;

  const cfg = TYPE_CONFIG[selectedNode.type] || TYPE_CONFIG.default;
  const d = selectedNode.data;

  const handleExpand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setError(null);
    try {
      await expandNode(selectedNode.id, query.trim());
      setQuery('');
    } catch (err: any) {
      setError(err?.message || 'Expansion failed. Please try again.');
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 380,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(13,13,20,0.92)',
        borderLeft: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(20px)',
        boxShadow: '-12px 0 40px rgba(0,0,0,0.7)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#f0f0ff', letterSpacing: '0.08em' }}>NODE DETAILS</p>
          <p style={{ fontSize: 10, color: 'var(--muted)' }}>ID: {selectedNode.id}</p>
        </div>
        <button
          onClick={() => setSelectedNode(null)}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)',
            color: 'var(--muted)',
            fontSize: 16,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ×
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Node info card */}
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            background: `${cfg.color}08`,
            border: `1px solid ${cfg.color}30`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
            <span
              style={{
                padding: '2px 7px',
                borderRadius: 4,
                fontSize: 9,
                fontWeight: 700,
                background: `${cfg.color}20`,
                color: cfg.color,
                border: `1px solid ${cfg.color}40`,
                flexShrink: 0,
              }}
            >
              {cfg.label}
            </span>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f0f0ff', lineHeight: 1.3 }}>
              {d.label}
            </h3>
          </div>

          {d.time_estimate && (
            <div style={{ fontSize: 10, color: cfg.color, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>⏱</span>
              <span>{d.time_estimate}</span>
            </div>
          )}

          {d.about && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, marginBottom: 8 }}>
              {d.about}
            </p>
          )}

          {d.how_this_helps_reach_goal && (
            <div
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                background: `${cfg.color}10`,
                border: `1px solid ${cfg.color}20`,
              }}
            >
              <p style={{ fontSize: 10, color: cfg.color, fontWeight: 700, marginBottom: 4 }}>→ GOAL IMPACT</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                {d.how_this_helps_reach_goal}
              </p>
            </div>
          )}
        </div>

        {/* Reddit links */}
        {d.reddit_links && d.reddit_links.length > 0 && (
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', marginBottom: 8 }}>
              COMMUNITY INSIGHTS
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {d.reddit_links.map((rl, i) => (
                <a
                  key={i}
                  href={rl.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 10px',
                    borderRadius: 7,
                    background: 'rgba(255,69,0,0.05)',
                    border: '1px solid rgba(255,69,0,0.15)',
                    textDecoration: 'none',
                    fontSize: 11,
                    color: '#ff6534',
                  }}
                >
                  <span>↗</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {rl.title}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

        {/* What-if expansion */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#f0f0ff', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14 }}>⚡</span>
            What-If Expansion
          </p>
          <p style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 12 }}>
            Ask a what-if question about this node. The AI will expand the graph with 2-6 new branching outcome nodes.
          </p>

          <form onSubmit={handleExpand} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`e.g. What if I fail to get a job in this path after 6 months?`}
              disabled={isLoading}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 9,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(0,0,0,0.25)',
                color: '#f0f0ff',
                fontSize: 11,
                resize: 'none',
                outline: 'none',
                lineHeight: 1.5,
              }}
            />

            {error && <p style={{ fontSize: 10, color: '#ef4444' }}>{error}</p>}

            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              style={{
                padding: '10px 0',
                borderRadius: 9,
                border: 'none',
                background:
                  isLoading || !query.trim()
                    ? 'rgba(255,255,255,0.05)'
                    : 'linear-gradient(135deg, #6c63ff, #a78bfa)',
                color: isLoading || !query.trim() ? '#8888aa' : '#fff',
                fontSize: 12,
                fontWeight: 700,
                cursor: isLoading || !query.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.2s ease',
              }}
            >
              {isLoading ? (
                <>
                  <span
                    style={{
                      width: 13,
                      height: 13,
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      display: 'inline-block',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  {loadingMessage || 'Expanding...'}
                </>
              ) : (
                '⚡ Expand What-If Branch'
              )}
            </button>
          </form>
        </div>

        {/* Graph stats */}
        {scenarioGraph && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, marginBottom: 4 }}>GRAPH STATS</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div>
                <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>{scenarioGraph.node_count}</p>
                <p style={{ fontSize: 9, color: 'var(--muted)' }}>Total Nodes</p>
              </div>
              <div>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#22d3ee' }}>
                  {scenarioGraph.nodes.reduce((acc, n) => acc + (n.children?.length || 0), 0)}
                </p>
                <p style={{ fontSize: 9, color: 'var(--muted)' }}>Edge Connections</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
