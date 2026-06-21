'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { useSessionStore } from '@/store/sessionStore';
import DiscoveryPanel from '@/components/workspace/DiscoveryPanel';
import ScenarioCanvas from '@/components/workspace/ScenarioCanvas';
import WhatIfPanel from '@/components/workspace/WhatIfPanel';

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const { loadSession } = useSession();
  const session = useSessionStore((s) => s.session);
  const id = params?.id as string;

  useEffect(() => {
    if (!id) {
      router.push('/');
      return;
    }
    if (!session || session.session_id !== id) {
      loadSession(id).then((s) => {
        if (!s) router.push('/');
      });
    }
  }, [id, session, loadSession, router]);

  if (!session) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '3px solid rgba(108,99,255,0.2)',
            borderTopColor: '#6c63ff',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Loading session...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Sidebar: back button + header + discovery panel */}
      <div
        style={{
          width: 400,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Top bar */}
        <div
          style={{
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface)',
            flexShrink: 0,
          }}
        >
          <button
            id="back-btn"
            onClick={() => router.push('/')}
            style={{
              padding: '4px 10px',
              borderRadius: 7,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--muted)',
              fontSize: 11,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ← Back
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: 12,
                color: 'var(--text)',
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {session.raw_prompt}
            </p>
            <p style={{ fontSize: 10, color: 'var(--muted)' }}>
              Session #{session.session_id.slice(0, 8)}
            </p>
          </div>
          <div
            style={{
              padding: '3px 8px',
              borderRadius: 20,
              fontSize: 10,
              background:
                session.status === 'complete'
                  ? 'rgba(34,197,94,0.1)'
                  : 'rgba(108,99,255,0.1)',
              color:
                session.status === 'complete' ? '#22c55e' : 'var(--accent)',
              border: `1px solid ${
                session.status === 'complete'
                  ? 'rgba(34,197,94,0.3)'
                  : 'rgba(108,99,255,0.3)'
              }`,
              flexShrink: 0,
            }}
          >
            {session.status === 'complete'
              ? '✓ Complete'
              : session.status === 'generating'
              ? '⟳ Generating'
              : '● Discovery'}
          </div>
        </div>

        {/* Discovery panel */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <DiscoveryPanel />
        </div>
      </div>

      {/* Main canvas area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <ScenarioCanvas />
        <WhatIfPanel />
      </div>
    </div>
  );
}
