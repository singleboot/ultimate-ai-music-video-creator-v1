'use client';

import { useState, useEffect } from 'react';
import NewProjectModal from '../components/layout/NewProjectModal';

export default function HomePage() {
  const [ready, setReady] = useState(false);
  const [recentFolders, setRecentFolders] = useState([]);
  const [showNewModal, setShowNewModal] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('recent-project-folders');
      if (raw) {
        setRecentFolders(JSON.parse(raw) || []);
      }
    } catch {}
    setReady(true);
  }, []);

  const handleDelete = (e, pathToRemove) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const raw = localStorage.getItem('recent-project-folders');
      if (raw) {
        const list = JSON.parse(raw).filter((p) => p !== pathToRemove);
        localStorage.setItem('recent-project-folders', JSON.stringify(list));
        setRecentFolders(list);
      }
    } catch {}
  };

  if (!ready) return null;

  return (
    <div style={{
      minHeight: '100vh', background: '#05010d',
      display: 'flex', flexDirection: 'column',
      padding: '40px 20px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: '30%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(176,38,255,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ textAlign: 'center', marginBottom: 48, position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'inline-block', padding: '6px 16px', borderRadius: 20,
          border: '1px solid rgba(176,38,255,0.3)',
          background: 'rgba(176,38,255,0.08)',
          fontSize: 11, fontWeight: 600, color: '#b026ff',
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 24,
        }}>
          Version 3
        </div>
        <h1 style={{
          fontSize: 'clamp(32px, 6vw, 64px)', fontWeight: 800, lineHeight: 1.1,
          letterSpacing: '-0.03em', marginBottom: 16,
          background: 'linear-gradient(135deg, #ffffff 30%, #b026ff 70%, #63d4ff 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          MV Creator v3<br /><span style={{ fontSize: '0.7em', fontWeight: 600 }}>Node Editor</span>
        </h1>
        <p style={{
          fontSize: 'clamp(14px, 2vw, 18px)', color: '#b9b4d0',
          maxWidth: 480, margin: '0 auto', lineHeight: 1.6,
        }}>
          Build AI music video workflows visually. Connect nodes, chain generation steps, and create in minutes.
        </p>
      </div>

      <div style={{
        display: 'flex', gap: 16, marginBottom: 48,
        flexWrap: 'wrap', justifyContent: 'center', position: 'relative', zIndex: 1,
      }}>
        <button
          onClick={() => setShowNewModal(true)}
          style={{
            padding: '14px 36px', borderRadius: 14, border: 'none',
            background: 'linear-gradient(135deg, #b026ff, #7c3aed)',
            color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 0 30px rgba(176,38,255,0.35)',
          }}
        >
          New Workflow
        </button>

        <button
          onClick={() => {
            const folderPath = window.prompt("Enter project folder path:");
            if (folderPath && folderPath.trim()) {
              const pathStr = folderPath.trim();
              try {
                const raw = localStorage.getItem('recent-project-folders');
                const list = raw ? JSON.parse(raw) : [];
                const updated = [pathStr, ...list.filter(x => x !== pathStr)].slice(0, 8);
                localStorage.setItem('recent-project-folders', JSON.stringify(updated));
              } catch {}
              window.location.href = `/canvas?path=${encodeURIComponent(pathStr)}`;
            }
          }}
          style={{
            padding: '14px 36px', borderRadius: 14,
            border: '1px solid rgba(176,38,255,0.4)',
            background: 'rgba(255,255,255,0.04)',
            color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(176,38,255,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
          }}
        >
          Open Folder
        </button>
      </div>

      {/* Recent projects */}
      <div style={{
        width: '100%', maxWidth: 560, margin: '0 auto',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: '#6b6880',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          marginBottom: 14, paddingLeft: 4,
        }}>
          Recent Project Folders
        </div>

        {recentFolders.length === 0 ? (
          <div style={{
            padding: '36px 24px', textAlign: 'center',
            borderRadius: 14, border: '1px solid rgba(176,38,255,0.1)',
            background: 'rgba(15,5,30,0.5)',
          }}>
            <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>{'{ }'}</div>
            <div style={{ color: '#6b6880', fontSize: 13 }}>
              No saved project folders yet. Click <strong>New Workflow</strong> or <strong>Open Folder</strong>.
            </div>
          </div>
        ) : (
          <div style={{
            borderRadius: 16, overflow: 'hidden',
            border: '1px solid rgba(176,38,255,0.15)',
            background: 'rgba(15,5,30,0.6)',
            backdropFilter: 'blur(12px)',
          }}>
            {recentFolders.map((folderPath, i) => (
              <a
                key={folderPath}
                href={`/canvas?path=${encodeURIComponent(folderPath)}`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 20px',
                  borderBottom: i < recentFolders.length - 1 ? '1px solid rgba(176,38,255,0.08)' : 'none',
                  cursor: 'pointer', textDecoration: 'none', color: 'inherit',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(176,38,255,0.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'linear-gradient(135deg, rgba(176,38,255,0.15), rgba(99,212,255,0.08))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, flexShrink: 0,
                  }}>
                    {'\uD83D\uDCC1'}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {folderPath.substring(folderPath.lastIndexOf('\\') + 1) || folderPath.substring(folderPath.lastIndexOf('/') + 1) || folderPath}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b6880', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {folderPath}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(e, folderPath)}
                  style={{
                    padding: '4px 10px', borderRadius: 6, border: 'none',
                    background: 'rgba(255,50,50,0.1)', color: '#ff5050',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'inherit', transition: 'background 0.15s',
                    marginLeft: 12
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,50,50,0.2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,50,50,0.1)'; }}
                >
                  Remove
                </button>
              </a>
            ))}
          </div>
        )}
      </div>

      {showNewModal && <NewProjectModal onClose={() => setShowNewModal(false)} />}
    </div>
  );
}
