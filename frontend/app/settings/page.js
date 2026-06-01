'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const API = 'http://127.0.0.1:8000';

export default function SettingsPage() {
  const [workflows, setWorkflows] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const r = await fetch(`${API}/api/workflows`);
      const data = await r.json();
      setWorkflows(data.workflows || []);
    } catch {
      setMsg('Backend not reachable');
    } finally {
      setLoading(false);
    }
  };

  const reload = async () => {
    try {
      const r = await fetch(`${API}/api/workflows/reload`, { method: 'POST' });
      const data = await r.json();
      setWorkflows(data.workflows || []);
      setMsg(`Reloaded ${data.count || 0} workflows`);
    } catch {
      setMsg('Reload failed');
    }
  };

  useEffect(() => { fetchWorkflows(); }, []);

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 24, fontFamily: 'var(--font-inter), sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Link href="/canvas" style={{ color: '#b026ff', textDecoration: 'none', fontSize: 12 }}>{'← Back to Canvas'}</Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Settings</h1>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, color: '#b026ff', margin: 0 }}>Workflows</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={fetchWorkflows} style={btnStyle('#333')}>Refresh</button>
            <button onClick={reload} style={btnStyle('#b026ff')}>Reload from Disk</button>
          </div>
        </div>

        {msg && (
          <div style={{ padding: '6px 10px', borderRadius: 6, background: 'rgba(176,38,255,0.1)', border: '1px solid rgba(176,38,255,0.3)', marginBottom: 12, fontSize: 12, color: '#b9b4d0' }}>
            {msg}
          </div>
        )}

        {loading ? (
          <div style={{ color: '#6b6880', fontSize: 13 }}>Loading...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {workflows.map((wf) => (
              <div key={wf.name} style={cardStyle}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{wf.name}</div>
                  <div style={{ fontSize: 10, color: '#6b6880', marginTop: 2 }}>
                    {wf.filename} • {wf.node_count} nodes
                  </div>
                </div>
                <div style={{ fontSize: 10, color: wf.node_count > 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                  {wf.node_count > 0 ? 'LOADED' : 'EMPTY'}
                </div>
              </div>
            ))}
            {workflows.length === 0 && (
              <div style={{ color: '#6b6880', fontSize: 13 }}>No workflows found</div>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: 32, padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(176,38,255,0.1)' }}>
        <div style={{ fontSize: 11, color: '#6b6880' }}>
          Drop <code style={{ color: '#b026ff', background: 'rgba(176,38,255,0.1)', padding: '1px 4px', borderRadius: 3 }}>.json</code> files into the <code style={{ color: '#b026ff', background: 'rgba(176,38,255,0.1)', padding: '1px 4px', borderRadius: 3 }}>workflows/</code> folder, then click <strong>Reload from Disk</strong>.
        </div>
      </div>
    </div>
  );
}

const cardStyle = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '10px 14px', borderRadius: 8,
  background: 'rgba(15,5,30,0.6)',
  border: '1px solid rgba(176,38,255,0.15)',
};

const btnStyle = (bg) => ({
  padding: '4px 12px', borderRadius: 6, border: 'none',
  background: bg, color: '#fff', fontSize: 11, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
});
