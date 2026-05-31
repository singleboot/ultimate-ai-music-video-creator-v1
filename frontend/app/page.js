'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

const STORAGE_KEY = 'mv-workflows';

function getSavedWorkflows() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed?.state?.savedWorkflows || parsed?.savedWorkflows || [];
  } catch {
    return [];
  }
}

function deleteSavedWorkflow(id) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const workflows = parsed?.state?.savedWorkflows || parsed?.savedWorkflows || [];
    const next = workflows.filter((w) => w.id !== id);
    if (parsed?.state) {
      parsed.state.savedWorkflows = next;
    } else {
      parsed.savedWorkflows = next;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {}
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

const glowPulse = {
  animate: {
    boxShadow: [
      '0 0 40px rgba(176,38,255,0.15)',
      '0 0 80px rgba(176,38,255,0.25)',
      '0 0 40px rgba(176,38,255,0.15)',
    ],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
  },
};

export default function HomePage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState([]);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    setWorkflows(getSavedWorkflows());
  }, []);

  const handleNew = () => {
    router.push('/canvas');
  };

  const handleOpen = (id) => {
    router.push(`/canvas?load=${id}`);
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Delete "${name}"?`)) {
      deleteSavedWorkflow(id);
      setWorkflows(getSavedWorkflows());
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#05010d',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(176,38,255,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Hero */}
      <motion.div
        custom={0}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        style={{ textAlign: 'center', marginBottom: 48, position: 'relative', zIndex: 1 }}
      >
        <motion.div
          {...glowPulse}
          style={{
            display: 'inline-block',
            padding: '6px 16px',
            borderRadius: 20,
            border: '1px solid rgba(176,38,255,0.3)',
            background: 'rgba(176,38,255,0.08)',
            fontSize: 11,
            fontWeight: 600,
            color: '#b026ff',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: 24,
          }}
        >
          Version 3
        </motion.div>
        <h1
          style={{
            fontSize: 'clamp(32px, 6vw, 64px)',
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            marginBottom: 16,
            background: 'linear-gradient(135deg, #ffffff 30%, #b026ff 70%, #63d4ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          MV Creator v3
          <br />
          <span style={{ fontSize: '0.7em', fontWeight: 600 }}>Node Editor</span>
        </h1>
        <p
          style={{
            fontSize: 'clamp(14px, 2vw, 18px)',
            color: '#b9b4d0',
            maxWidth: 480,
            margin: '0 auto',
            lineHeight: 1.6,
          }}
        >
          Build AI music video workflows visually. Connect nodes, chain generation
          steps, and create in minutes.
        </p>
      </motion.div>

      {/* Actions */}
      <motion.div
        custom={1}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        style={{
          display: 'flex',
          gap: 16,
          marginBottom: 48,
          flexWrap: 'wrap',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <button
          onClick={handleNew}
          style={{
            padding: '14px 36px',
            borderRadius: 14,
            border: 'none',
            background: 'linear-gradient(135deg, #b026ff, #7c3aed)',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            letterSpacing: '0.02em',
            boxShadow: '0 0 30px rgba(176,38,255,0.35)',
            transition: 'all 0.3s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 0 50px rgba(176,38,255,0.5)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 0 30px rgba(176,38,255,0.35)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          New Workflow
        </button>
        <button
          onClick={() => setShowList(!showList)}
          style={{
            padding: '14px 36px',
            borderRadius: 14,
            border: '1px solid rgba(176,38,255,0.3)',
            background: 'rgba(15,5,30,0.8)',
            color: '#b9b4d0',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.3s',
            backdropFilter: 'blur(10px)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(176,38,255,0.6)';
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(176,38,255,0.3)';
            e.currentTarget.style.color = '#b9b4d0';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          Open Workflow
        </button>
      </motion.div>

      {/* Saved workflows list */}
      {showList && (
        <motion.div
          custom={2}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          style={{
            width: '100%',
            maxWidth: 480,
            background: 'rgba(15,5,30,0.95)',
            border: '1px solid rgba(176,38,255,0.2)',
            borderRadius: 16,
            overflow: 'hidden',
            backdropFilter: 'blur(20px)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid rgba(176,38,255,0.15)',
              fontSize: 12,
              fontWeight: 700,
              color: '#b026ff',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Recent Workflows
          </div>
          {workflows.length === 0 ? (
            <div
              style={{
                padding: '32px 20px',
                textAlign: 'center',
                color: '#6b6880',
                fontSize: 13,
              }}
            >
              No saved workflows yet. Create one to get started.
            </div>
          ) : (
            workflows.map((wf) => (
              <div
                key={wf.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px',
                  borderBottom: '1px solid rgba(176,38,255,0.08)',
                  transition: 'background 0.15s',
                  cursor: 'pointer',
                }}
                onClick={() => handleOpen(wf.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(176,38,255,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
                    {wf.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b6880', marginTop: 2 }}>
                    {new Date(wf.savedAt).toLocaleDateString()} &middot;{' '}
                    {wf.nodes?.length || 0} nodes
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(wf.id, wf.name);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'rgba(239,68,68,0.1)',
                    color: '#ef4444',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239,68,68,0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                  }}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </motion.div>
      )}
    </div>
  );
}
