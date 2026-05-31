'use client';

import React from 'react';

const SECTIONS = [
  {
    title: 'INPUTS',
    nodes: [
      { type: 'ThemeNode', label: 'Theme', icon: '\uD83C\uDFAD', color: '#ff3bd4' },
      { type: 'GenreNode', label: 'Genre', icon: '\uD83C\uDFB6', color: '#b026ff' },
      { type: 'LanguageNode', label: 'Language', icon: '\uD83C\uDF10', color: '#63d4ff' },
      { type: 'BPMNode', label: 'BPM', icon: '\u2699\uFE0F', color: '#f59e0b' },
      { type: 'DurationNode', label: 'Duration', icon: '\u23F1\uFE0F', color: '#22c55e' },
      { type: 'AudioFileNode', label: 'Audio File', icon: '\uD83C\uDFB5', color: '#ec4899' },
      { type: 'LyricsInputNode', label: 'Lyrics', icon: '\uD83D\uDCDD', color: '#a855f7' },
    ],
  },
  {
    title: 'PROCESSING',
    nodes: [
      { type: 'LyricsGeneratorNode', label: 'Lyrics Generator', icon: '\u270D\uFE0F', color: '#a855f7' },
      { type: 'MusicGeneratorNode', label: 'Music Generator', icon: '\uD83C\uDFB5', color: '#b026ff' },
      { type: 'CoverGeneratorNode', label: 'Cover Generator', icon: '\uD83C\uDFA4', color: '#ec4899' },
      { type: 'TTSGeneratorNode', label: 'TTS Generator', icon: '\uD83D\uDDE3\uFE0F', color: '#06b6d4' },
      { type: 'PromptCreatorNode', label: 'Prompt Creator', icon: '\u2728', color: '#f59e0b' },
      { type: 'VideoGeneratorNode', label: 'Video Generator', icon: '\uD83C\uDFAC', color: '#6366f1' },
      { type: 'ImageGeneratorNode', label: 'Image Generator', icon: '\uD83D\uDDBC\uFE0F', color: '#14b8a6' },
    ],
  },
  {
    title: 'OUTPUTS',
    nodes: [
      { type: 'AudioPlayerNode', label: 'Audio Player', icon: '\u25B6\uFE0F', color: '#b026ff' },
      { type: 'VideoPlayerNode', label: 'Video Player', icon: '\uD83C\uDFAC', color: '#6366f1' },
      { type: 'ImagePreviewNode', label: 'Image Preview', icon: '\uD83D\uDDBC\uFE0F', color: '#14b8a6' },
      { type: 'TextPreviewNode', label: 'Text Preview', icon: '\uD83D\uDCC4', color: '#b9b4d0' },
    ],
  },
];

function DraggableItem({ type, label, icon, color }) {
  const onDragStart = (event) => {
    event.dataTransfer.setData('application/reactflow', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 10,
        border: '1px solid rgba(176,38,255,0.15)',
        background: 'rgba(255,255,255,0.03)',
        cursor: 'grab',
        transition: 'all 0.2s',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `${color}15`;
        e.currentTarget.style.borderColor = `${color}60`;
        e.currentTarget.style.transform = 'translateX(4px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
        e.currentTarget.style.borderColor = 'rgba(176,38,255,0.15)';
        e.currentTarget.style.transform = 'translateX(0)';
      }}
    >
      <div
        style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${color}20`,
          border: `1px solid ${color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{label}</div>
        <div style={{ fontSize: 10, color: '#b9b4d0' }}>Drag to canvas</div>
      </div>
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div
      style={{
        padding: '10px 14px',
        marginBottom: 4,
        background: 'rgba(176,38,255,0.08)',
        border: '1px solid rgba(176,38,255,0.15)',
        borderRadius: 10,
        color: '#b9b4d0',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}
    >
      {title}
    </div>
  );
}

export default function NodeSidebar() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 56,
        left: 0,
        width: 280,
        height: 'calc(100vh - 56px)',
        background: 'rgba(10,3,20,0.92)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(176,38,255,0.2)',
        overflowY: 'auto',
        zIndex: 40,
        padding: '16px 12px 32px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          fontSize: 11, fontWeight: 700, color: '#b026ff',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          padding: '0 14px 12px',
          borderBottom: '1px solid rgba(176,38,255,0.15)',
          marginBottom: 12,
        }}
      >
        Node Library
      </div>
      {SECTIONS.map((section) => (
        <div key={section.title} style={{ marginBottom: 12 }}>
          <SectionHeader title={section.title} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {section.nodes.map((n) => (
              <DraggableItem key={n.type} {...n} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
