'use client';

import React, { useState } from 'react';
import useWorkflowStore from '../../store/workflowStore';

const SECTIONS = [
  {
    title: 'INPUTS',
    nodes: [
      { type: 'ThemeNode', label: 'Theme', icon: '🎭', color: '#ff3bd4' },
      { type: 'GenreNode', label: 'Genre', icon: '🎵', color: '#b026ff' },
      { type: 'LanguageNode', label: 'Language', icon: '🌐', color: '#63d4ff' },
      { type: 'BPMNode', label: 'BPM', icon: '⚙️', color: '#f59e0b' },
      { type: 'DurationNode', label: 'Duration', icon: '⏱️', color: '#22c55e' },
      { type: 'SongSettingsNode', label: 'Song Settings', icon: '📻', color: '#10b981' },
      { type: 'GutsSettingsNode', label: 'Guts Settings', icon: '⚙️', color: '#10b981' },
      { type: 'AudioFileNode', label: 'Audio File', icon: '🎵', color: '#ec4899' },
      { type: 'LyricsInputNode', label: 'Lyrics', icon: '📝', color: '#a855f7' },
      { type: 'StoryConceptNode', label: 'Story Concept', icon: '📝', color: '#f59e0b' },
      { type: 'StyleThemeNode', label: 'Style & Theme', icon: '🎨', color: '#b026ff' },
      { type: 'VisualStylesNode', label: 'Visual Style Presets', icon: '🎨', color: '#ec4899' },
      { type: 'YouTubeAudioNode', label: 'YouTube Audio Source', icon: '🎵', color: '#ef4444' },
      { type: 'SubjectLocationsNode', label: 'Subject & Locations', icon: '📍', color: '#3b82f6' },
    ],
  },
  {
    title: 'PROCESSING',
    nodes: [
      { type: 'LyricsGeneratorNode', label: 'Lyrics Generator', icon: '✍️', color: '#a855f7' },
      { type: 'SmartLyricsNode', label: 'Smart Lyrics Studio', icon: '⚡', color: '#ff3bd4' },
      { type: 'MusicGeneratorNode', label: 'Music Generator', icon: '🎵', color: '#b026ff' },
      { type: 'CoverGeneratorNode', label: 'Cover Generator', icon: '🎤', color: '#ec4899' },
      { type: 'TTSGeneratorNode', label: 'TTS Generator', icon: '🗣️', color: '#06b6d4' },
      { type: 'LLMTextGenNode', label: 'Audio Analyzer', icon: '🔍', color: '#10b981' },
      { type: 'PromptCreatorNode', label: 'Prompt Creator', icon: '✨', color: '#f59e0b' },
      { type: 'BRollPromptCreatorNode', label: 'B-Roll Prompt Creator', icon: '✨', color: '#f472b6' },
      { type: 'BRollVideoCreatorNode', label: 'B-Roll Video Creator', icon: '🎬', color: '#f472b6' },
      { type: 'BRollFocusNode', label: 'B-Roll Focus', icon: '🔍', color: '#f472b6' },
      { type: 'T2VGeneratorNode', label: 'T2V Generator', icon: '🎬', color: '#6366f1' },
      { type: 'I2VGeneratorNode', label: 'I2V Generator', icon: '🖼️', color: '#4f46e5' },
      { type: 'VideoWorkflowSettingsNode', label: 'Video Workflow Settings', icon: '⚙️', color: '#312e81' },
      { type: 'LTXLoRASettingsNode', label: 'LTX LoRA Settings', icon: '🧬', color: '#4c1d95' },
      { type: 'ZImageLoRASettingsNode', label: 'Z-Image LoRA Settings', icon: '🧬', color: '#4c1d95' },
      { type: 'VideoAdvancedSettingsNode', label: 'Video Advanced Settings', icon: '🛠️', color: '#1e1b4b' },
      { type: 'VideoAudioCombinerNode', label: 'Video & Audio Combiner', icon: '🎬', color: '#10b981' },
      { type: 'VideoUpscalerNode', label: 'Video Upscaler', icon: '🚀', color: '#8b5cf6' },
      { type: 'ImageGeneratorNode', label: 'Image Generator', icon: '🖼️', color: '#14b8a6' },
    ],
  },
  {
    title: 'OUTPUTS',
    nodes: [
      { type: 'AudioPlayerNode', label: 'Audio Player', icon: '▶️', color: '#b026ff' },
      { type: 'VideoPlayerNode', label: 'Video Player', icon: '🎬', color: '#6366f1' },
      { type: 'ImagePreviewNode', label: 'Image Preview', icon: '🖼️', color: '#14b8a6' },
      { type: 'TextPreviewNode', label: 'Text Preview', icon: '📄', color: '#b9b4d0' },
      { type: 'DebugJsonNode', label: 'JSON Debugger', icon: '🐞', color: '#e11d48' },
    ],
  },
];

const WORKFLOW_TEMPLATES = [
  {
    name: 'Music Video (Full)',
    desc: 'Genre, lyrics, music, video & preview',
    icon: '\uD83C\uDFAC',
    color: '#b026ff',
    nodes: [
      { type: 'GenreNode', pos: { x: 50, y: 50 } },
      { type: 'ThemeNode', pos: { x: 50, y: 200 } },
      { type: 'LyricsGeneratorNode', pos: { x: 350, y: 80 } },
      { type: 'MusicGeneratorNode', pos: { x: 650, y: 80 } },
      { type: 'PromptCreatorNode', pos: { x: 350, y: 300 } },
      { type: 'VideoGeneratorNode', pos: { x: 650, y: 320 } },
      { type: 'AudioPlayerNode', pos: { x: 950, y: 80 } },
      { type: 'VideoPlayerNode', pos: { x: 950, y: 320 } },
    ],
    edges: [
      { s: 0, sh: 'output-0', t: 2, th: 'input-1' },
      { s: 1, sh: 'output-0', t: 2, th: 'input-0' },
      { s: 2, sh: 'output-0', t: 3, th: 'input-0' },
      { s: 3, sh: 'output-0', t: 6, th: 'input-0' },
      { s: 2, sh: 'output-0', t: 4, th: 'input-0' },
      { s: 1, sh: 'output-0', t: 4, th: 'input-1' },
      { s: 4, sh: 'output-0', t: 5, th: 'input-0' },
      { s: 5, sh: 'output-0', t: 7, th: 'input-0' },
    ],
  },
  {
    name: 'Lyrics to Music',
    desc: 'Input lyrics + generate music',
    icon: '\uD83C\uDFB5',
    color: '#7c3aed',
    nodes: [
      { type: 'GenreNode', pos: { x: 50, y: 20 } },
      { type: 'LyricsInputNode', pos: { x: 50, y: 160 } },
      { type: 'MusicGeneratorNode', pos: { x: 400, y: 80 } },
      { type: 'AudioPlayerNode', pos: { x: 750, y: 80 } },
    ],
    edges: [
      { s: 0, sh: 'output-0', t: 2, th: 'input-1' },
      { s: 1, sh: 'output-0', t: 2, th: 'input-0' },
      { s: 2, sh: 'output-0', t: 3, th: 'input-0' },
    ],
  },
  {
    name: 'Prompt to Video',
    desc: 'Concept prompts + video generation',
    icon: '\u2728',
    color: '#f59e0b',
    nodes: [
      { type: 'ThemeNode', pos: { x: 50, y: 80 } },
      { type: 'PromptCreatorNode', pos: { x: 350, y: 80 } },
      { type: 'VideoGeneratorNode', pos: { x: 650, y: 80 } },
      { type: 'VideoPlayerNode', pos: { x: 950, y: 80 } },
    ],
    edges: [
      { s: 0, sh: 'output-0', t: 1, th: 'input-1' },
      { s: 1, sh: 'output-0', t: 2, th: 'input-0' },
      { s: 2, sh: 'output-0', t: 3, th: 'input-0' },
    ],
  },
  {
    name: 'Audio Cover',
    desc: 'Upload audio, apply style cover',
    icon: '\uD83C\uDFA4',
    color: '#ec4899',
    nodes: [
      { type: 'AudioFileNode', pos: { x: 50, y: 80 } },
      { type: 'GenreNode', pos: { x: 50, y: 240 } },
      { type: 'CoverGeneratorNode', pos: { x: 400, y: 120 } },
      { type: 'AudioPlayerNode', pos: { x: 750, y: 120 } },
    ],
    edges: [
      { s: 0, sh: 'output-0', t: 2, th: 'input-0' },
      { s: 1, sh: 'output-0', t: 2, th: 'input-1' },
      { s: 2, sh: 'output-0', t: 3, th: 'input-0' },
    ],
  },
  {
    name: 'Text to Voiceover',
    desc: 'TTS voiceover from text',
    icon: '\uD83D\uDDE3\uFE0F',
    color: '#06b6d4',
    nodes: [
      { type: 'LanguageNode', pos: { x: 50, y: 80 } },
      { type: 'LyricsInputNode', pos: { x: 50, y: 220 } },
      { type: 'TTSGeneratorNode', pos: { x: 400, y: 120 } },
      { type: 'AudioPlayerNode', pos: { x: 750, y: 120 } },
    ],
    edges: [
      { s: 0, sh: 'output-0', t: 2, th: 'input-1' },
      { s: 1, sh: 'output-0', t: 2, th: 'input-0' },
      { s: 2, sh: 'output-0', t: 3, th: 'input-0' },
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
  const addNode = useWorkflowStore((s) => s.addNode);
  const addEdge = (edge) => useWorkflowStore.getState().onEdgesChange([{ type: 'add', item: edge }]);
  const clearWorkflow = useWorkflowStore((s) => s.clearWorkflow);
  const [searchQuery, setSearchQuery] = useState('');

  const loadTemplate = (tpl) => {
    clearWorkflow();
    const idMap = {};
    tpl.nodes.forEach((n, i) => {
      const id = `tpl_${Date.now()}_${i}`;
      idMap[i] = id;
      addNode({ id, type: n.type, position: { x: n.pos.x, y: n.pos.y }, data: {} });
    });
    // edges after nodes (async, but zustand is sync so microtask)
    setTimeout(() => {
      tpl.edges.forEach((e) => {
        addEdge({
          source: idMap[e.s],
          sourceHandle: e.sh,
          target: idMap[e.t],
          targetHandle: e.th,
          id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: 'smoothstep',
          style: { stroke: '#b026ff', strokeWidth: 2 },
        });
      });
    }, 0);
  };

  const filteredSections = SECTIONS.map((section) => {
    const matched = section.nodes.filter(
      (n) => {
        const sq = searchQuery.toLowerCase();
        const lbl = n.label.toLowerCase();
        const typ = n.type.toLowerCase();
        return lbl.startsWith(sq) || 
               lbl.split(/[\s-]+/).some(word => word.startsWith(sq)) ||
               typ.startsWith(sq) ||
               typ.split(/[\s-]+/).some(word => word.startsWith(sq));
      }
    );
    return { ...section, nodes: matched };
  }).filter((section) => section.nodes.length > 0);

  const filteredTemplates = WORKFLOW_TEMPLATES.filter(
    (tpl) => {
      const sq = searchQuery.toLowerCase();
      const name = tpl.name.toLowerCase();
      const desc = tpl.desc.toLowerCase();
      return name.startsWith(sq) || 
             name.split(/[\s-]+/).some(word => word.startsWith(sq)) ||
             desc.includes(sq); // keep includes for description since it's a long sentence
    }
  );

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

      <div style={{ padding: '0 4px', marginBottom: 12 }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search nodes & templates..."
          style={{
            width: '100%',
            padding: '8px 12px',
            boxSizing: 'border-box',
            borderRadius: 8,
            border: '1px solid rgba(176,38,255,0.2)',
            background: 'rgba(176,38,255,0.06)',
            color: '#fff',
            fontSize: 12,
            outline: 'none',
            fontFamily: 'inherit',
            transition: 'all 0.2s',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'rgba(176,38,255,0.6)';
            e.target.style.background = 'rgba(176,38,255,0.12)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(176,38,255,0.2)';
            e.target.style.background = 'rgba(176,38,255,0.06)';
          }}
        />
      </div>

      {filteredSections.map((section) => (
        <div key={section.title} style={{ marginBottom: 12 }}>
          <SectionHeader title={section.title} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {section.nodes.map((n) => (
              <DraggableItem key={n.type} {...n} />
            ))}
          </div>
        </div>
      ))}

      {/* Workflow Templates */}
      {filteredTemplates.length > 0 && (
        <React.Fragment>
          <div
            style={{
              fontSize: 11, fontWeight: 700, color: '#63d4ff',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: '0 14px 12px',
              borderBottom: '1px solid rgba(99,212,255,0.15)',
              marginBottom: 12,
              marginTop: 20,
            }}
          >
            Workflows
          </div>
          {filteredTemplates.map((tpl, i) => (
            <div
              key={i}
              onClick={() => loadTemplate(tpl)}
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                border: `1px solid ${tpl.color}30`,
                background: `${tpl.color}08`,
                cursor: 'pointer',
                marginBottom: 8,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${tpl.color}15`;
                e.currentTarget.style.borderColor = `${tpl.color}60`;
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `${tpl.color}08`;
                e.currentTarget.style.borderColor = `${tpl.color}30`;
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: `${tpl.color}20`, border: `1px solid ${tpl.color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, flexShrink: 0,
                }}>
                  {tpl.icon}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{tpl.name}</div>
                  <div style={{ fontSize: 10, color: '#b9b4d0', marginTop: 1 }}>{tpl.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </React.Fragment>
      )}
    </div>
  );
}
