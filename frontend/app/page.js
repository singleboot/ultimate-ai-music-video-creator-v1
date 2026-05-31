'use client';

import { useState, useEffect } from 'react';

export default function HomePage() {
  const [ready, setReady] = useState(false);
  const [workflows, setWorkflows] = useState([]);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('mv-workflows');
      if (raw) {
        const parsed = JSON.parse(raw);
        setWorkflows(parsed?.state?.savedWorkflows || []);
      }
    } catch {}
    setReady(true);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#05010d', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(176,38,255,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ textAlign: 'center', marginBottom: 48, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 20, border: '1px solid rgba(176,38,255,0.3)', background: 'rgba(176,38,255,0.08)', fontSize: 11, fontWeight: 600, color: '#b026ff', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 24 }}>Version 3</div>
        <h1 style={{ fontSize: 'clamp(32px, 6vw, 64px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 16, background: 'linear-gradient(135deg, #ffffff 30%, #b026ff 70%, #63d4ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          MV Creator v3<br /><span style={{ fontSize: '0.7em', fontWeight: 600 }}>Node Editor</span>
        </h1>
        <p style={{ fontSize: 'clamp(14px, 2vw, 18px)', color: '#b9b4d0', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
          Build AI music video workflows visually. Connect nodes, chain generation steps, and create in minutes.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 48, flexWrap: 'wrap', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
        <a href="/canvas" style={{ padding: '14px 36px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #b026ff, #7c3aed)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 30px rgba(176,38,255,0.35)', textDecoration: 'none' }}>
          New Workflow
        </a>
        <button onClick={() => setShowList(!showList)} style={{ padding: '14px 36px', borderRadius: 14, border: '1px solid rgba(176,38,255,0.3)', background: 'rgba(15,5,30,0.8)', color: '#b9b4d0', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Open Workflow
        </button>
      </div>

      {showList && (
        <div style={{ width: '100%', maxWidth: 480, background: 'rgba(15,5,30,0.95)', border: '1px solid rgba(176,38,255,0.2)', borderRadius: 16, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(176,38,255,0.15)', fontSize: 12, fontWeight: 700, color: '#b026ff', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Recent Workflows</div>
          {workflows.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: '#6b6880', fontSize: 13 }}>No saved workflows yet. Create one to get started.</div>
          ) : workflows.map((wf) => (
            <a key={wf.id} href={`/canvas?load=${wf.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid rgba(176,38,255,0.08)', cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{wf.name}</div>
                <div style={{ fontSize: 11, color: '#6b6880', marginTop: 2 }}>{new Date(wf.savedAt).toLocaleDateString()} &middot; {wf.nodes?.length || 0} nodes</div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
