'use client';
import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface ScenarioNodeFlowData {
  label: string;
  about: string;
  how_this_helps_reach_goal: string;
  reddit_links: { title: string; url: string }[];
  is_expanded: boolean;
  time_estimate?: string | null;
  nodeId: string;
  nodeType: string;
  isExpanded: boolean;
}

const TYPE_CONFIG = {
  root: { border: '#6c63ff', bg: '#191733', badge: 'START', badgeColor: '#6c63ff' },
  comparisonRoot: { border: '#22d3ee', bg: '#0f222b', badge: 'PATH', badgeColor: '#22d3ee' },
  unionPath: { border: '#a78bfa', bg: '#1b162c', badge: 'UNION', badgeColor: '#a78bfa' },
  outcome: { border: '#22c55e', bg: '#0f2115', badge: 'OUTCOME', badgeColor: '#22c55e' },
  failureFork: { border: '#ef4444', bg: '#211010', badge: 'RISK', badgeColor: '#ef4444' },
  riskMitigation: { border: '#f59e0b', bg: '#211910', badge: 'MITIGATE', badgeColor: '#f59e0b' },
  default: { border: 'rgba(255,255,255,0.12)', bg: '#141418', badge: 'NODE', badgeColor: '#8888aa' },
};

export default memo(function ScenarioNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as ScenarioNodeFlowData;

  const cfg = TYPE_CONFIG[d.nodeType as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.default;

  // Remove badges for 'NODE', 'PATH', and 'OUTCOME'
  const hasBadge = cfg.badge && cfg.badge !== 'NODE' && cfg.badge !== 'PATH' && cfg.badge !== 'OUTCOME';

  return (
    <div
      style={{
        width: 250,
        height: 60,
        background: cfg.bg,
        border: `1.5px solid ${selected ? '#fff' : cfg.border}`,
        borderRadius: 12,
        boxShadow: selected
          ? `0 0 0 2px ${cfg.border}, 0 8px 32px rgba(0,0,0,0.5)`
          : `0 4px 16px rgba(0,0,0,0.4)`,
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '12px',
        boxSizing: 'border-box',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: cfg.border, border: 'none', width: 8, height: 8 }}
      />

      {hasBadge && (
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.08em',
            padding: '2px 6px',
            borderRadius: 4,
            background: `${cfg.badgeColor}20`,
            color: cfg.badgeColor,
            border: `1px solid ${cfg.badgeColor}40`,
            marginBottom: 6,
            display: 'inline-block',
          }}
        >
          {cfg.badge}
        </span>
      )}

      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#f0f0ff',
          lineHeight: 1.35,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          width: '100%',
        }}
      >
        {d.label}
      </span>

      {d.time_estimate && (
        <div
          style={{
            fontSize: 9,
            color: cfg.badgeColor,
            marginTop: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            justifyContent: 'center',
            width: '100%',
          }}
        >
          <span>⏱</span>
          <span>{d.time_estimate}</span>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: cfg.border, border: 'none', width: 8, height: 8 }}
      />
    </div>
  );
});
