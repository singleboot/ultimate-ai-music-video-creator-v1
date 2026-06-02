'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function NewProjectModal({ onClose }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const overlayRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleCreate = () => {
    const projectName = name.trim() || 'Untitled Workflow';
    const projectPath = path.trim() || '';
    if (projectPath) {
      try {
        const raw = localStorage.getItem('recent-project-folders');
        const list = raw ? JSON.parse(raw) : [];
        const updated = [projectPath, ...list.filter(x => x !== projectPath)].slice(0, 8);
        localStorage.setItem('recent-project-folders', JSON.stringify(updated));
      } catch {}
    }
    router.push(`/canvas?name=${encodeURIComponent(projectName)}&path=${encodeURIComponent(projectPath)}`);
  };

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          width: 420, maxWidth: '90vw',
          background: 'rgba(15,5,30,0.98)',
          border: '1px solid rgba(176,38,255,0.25)',
          borderRadius: 20,
          padding: 32,
          boxShadow: '0 0 60px rgba(176,38,255,0.15)',
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
          New Project
        </div>
        <div style={{ fontSize: 13, color: '#6b6880', marginBottom: 28 }}>
          Create a new music video workflow.
        </div>

        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#b026ff', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
          Project Name
        </label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Awesome MV"
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          style={{
            width: '100%', padding: '12px 14px', marginBottom: 20,
            borderRadius: 10, border: '1px solid rgba(176,38,255,0.2)',
            background: 'rgba(176,38,255,0.06)',
            color: '#fff', fontSize: 14, outline: 'none',
            fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />

        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#b026ff', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
          Location
        </label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          <input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="F:\MY PROJECTS\my-mv"
            style={{
              flex: 1, padding: '12px 14px',
              borderRadius: 10, border: '1px solid rgba(176,38,255,0.2)',
              background: 'rgba(176,38,255,0.06)',
              color: '#fff', fontSize: 14, outline: 'none',
              fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px', borderRadius: 10, border: '1px solid rgba(176,38,255,0.2)',
              background: 'transparent', color: '#b9b4d0', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            style={{
              padding: '10px 24px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #b026ff, #7c3aed)',
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 0 20px rgba(176,38,255,0.3)',
            }}
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
}
