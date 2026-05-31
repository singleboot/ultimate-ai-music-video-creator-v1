'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

function SavedWorkflowsList() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('mv-workflows');
      if (raw) {
        const parsed = JSON.parse(raw);
        setWorkflows(parsed?.state?.savedWorkflows || []);
      }
    } catch {}
  }, []);

  if (workflows.length === 0) return null;

  return (
    <div style={{ width: '100%', maxWidth: 480, background: 'rgba(15,5,30,0.95)', border: '1px solid rgba(176,38,255,0.2)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(176,38,255,0.15)', fontSize: 12, fontWeight: 700, color: '#b026ff', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Recent Workflows</div>
      {workflows.map((wf) => (
        <div key={wf.id} onClick={() => router.push(`/canvas?load=${wf.id}`)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid rgba(176,38,255,0.08)', cursor: 'pointer' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{wf.name}</div>
            <div style={{ fontSize: 11, color: '#6b6880', marginTop: 2 }}>{new Date(wf.savedAt).toLocaleDateString()} &middot; {wf.nodes?.length || 0} nodes</div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); }} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
        </div>
      ))}
    </div>
  );
}

export default function ClientButtons() {
  const router = useRouter();
  const [showList, setShowList] = useState(false);

  return (
    <>
      <div style={{ display: 'flex', gap: 16, marginBottom: 48, flexWrap: 'wrap', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
        <button onClick={() => router.push('/canvas')} style={{ padding: '14px 36px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #b026ff, #7c3aed)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 30px rgba(176,38,255,0.35)' }}>
          New Workflow
        </button>
        <button onClick={() => setShowList(!showList)} style={{ padding: '14px 36px', borderRadius: 14, border: '1px solid rgba(176,38,255,0.3)', background: 'rgba(15,5,30,0.8)', color: '#b9b4d0', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Open Workflow
        </button>
      </div>
      {showList && <SavedWorkflowsList />}
    </>
  );
}
