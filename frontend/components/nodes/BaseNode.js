'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import useWorkflowStore from '../../store/workflowStore';

export default function BaseNode({
  children,
  title = 'Node',
  color = '#b026ff',
  isRunning = false,
  selected = false,
  hasInput = false,
  hasOutput = true,
  inputCount = 1,
  outputCount = 1,
  inputHandles,
  outputHandles,
  style: overrideStyle = {},
  nodeId = null,
  data = {},
}) {
  const [hovered, setHovered] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const useLabeled = !!(inputHandles || outputHandles);
  const startPos = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const resizeNodeCentered = useWorkflowStore((s) => s.resizeNodeCentered);
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === nodeId));

  const collapsed = data.collapsed !== undefined ? !!data.collapsed : localCollapsed;

  const toggleCollapse = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    if (nodeId && data.onUpdate) {
      data.onUpdate(nodeId, { collapsed: !collapsed });
    } else {
      setLocalCollapsed(!collapsed);
    }
  }, [nodeId, data, collapsed]);

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const nodeEl = e.currentTarget.parentElement;
    if (!nodeEl) return;
    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      w: nodeEl.offsetWidth,
      h: nodeEl.offsetHeight,
    };
    setResizing(true);
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!resizing) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    const newW = Math.max(150, startPos.current.w + dx);
    const newH = Math.max(60, startPos.current.h + dy);
    resizeNodeCentered(nodeId, newW, newH);
  }, [resizing, nodeId, resizeNodeCentered]);

  const handlePointerUp = useCallback(() => {
    setResizing(false);
  }, []);

  useEffect(() => {
    if (!resizing) return;
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [resizing, handlePointerMove, handlePointerUp]);

  const nodeW = node?.width || undefined;
  const nodeH = collapsed ? 36 : (node?.height || undefined);

  const inCount = inputHandles?.length || 0;
  const outCount = outputHandles?.length || 0;

  return (
    <div
      data-nodeid={nodeId}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'rgba(15,5,30,0.95)',
        border: `1px solid ${selected ? color : isRunning ? color : 'rgba(176,38,255,0.2)'}`,
        borderRadius: 10,
        color: '#fff',
        minWidth: 150,
        fontFamily: 'inherit',
        boxShadow: selected
          ? `0 0 16px ${color}35, 0 2px 8px rgba(0,0,0,0.4)`
          : isRunning ? `0 0 12px ${color}25` : '0 2px 8px rgba(0,0,0,0.4)',
        transition: resizing ? 'none' : 'border-color 0.2s, box-shadow 0.2s',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        ...overrideStyle,
        width: nodeW ?? overrideStyle.width,
        height: nodeH ?? overrideStyle.height,
      }}
    >
      <div
        style={{
          padding: '5px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          position: 'relative',
          minHeight: 26,
        }}
      >
        <div
          style={{
            width: 5, height: 5, borderRadius: '50%',
            background: isRunning ? color : '#4ade80',
            flexShrink: 0,
          }}
        />
        <button
          onClick={toggleCollapse}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            width: 14, height: 14, borderRadius: 3,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#b9b4d0',
            fontSize: 8, fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0, outline: 'none', transition: 'all 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#b9b4d0'; }}
          title={collapsed ? "Expand Node" : "Collapse Node"}
        >
          {collapsed ? "▶" : "▼"}
        </button>
        <span style={{ fontSize: 11, fontWeight: 600, flex: 1, lineHeight: 1.3, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </span>
        {(selected || hovered) && nodeId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setShowHelp(!showHelp);
              }}
              style={{
                width: 14, height: 14, borderRadius: '50%',
                background: showHelp ? color : 'rgba(255,255,255,0.08)',
                border: `1px solid ${showHelp ? color : 'rgba(255,255,255,0.2)'}`,
                color: showHelp ? '#fff' : '#b9b4d0',
                fontSize: 9, fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0, outline: 'none', transition: 'all 0.15s',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (!showHelp) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.color = '#fff';
                }
              }}
              onMouseLeave={(e) => {
                if (!showHelp) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = '#b9b4d0';
                }
              }}
              title={`How to use ${title}`}
            >
              ?
            </button>
            <div
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                data.onDelete?.(nodeId);
              }}
              style={{
                width: 16, height: 16, borderRadius: 3,
                background: 'rgba(239,68,68,0.12)',
                color: '#ef4444',
                fontSize: 9, fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
                transition: 'background 0.15s',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }}
            >
              x
            </div>
          </div>
        )}
      </div>

      {showHelp && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 30, left: 10, right: 10,
            zIndex: 1000,
            background: 'rgba(10,3,20,0.98)',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${color}60`,
            borderRadius: 8,
            padding: '10px 12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.8), 0 0 16px rgba(176,38,255,0.15)',
            maxHeight: 280,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: color }}>
              💡 {title} Guide
            </span>
            <button
              onClick={() => setShowHelp(false)}
              style={{
                background: 'transparent', border: 'none', color: '#b9b4d0',
                fontSize: 14, cursor: 'pointer', padding: '0 4px', lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
          <div style={{ fontSize: 9.5, lineHeight: 1.4, color: '#e0dce6', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(HELP_PROCEDURES[title] || [
              'Configure the input parameters inside this node.',
              'Connect its output handle to down-stream generator nodes to build the pipeline.',
            ]).map((step, idx) => (
              <div key={idx}>
                <strong>Step {idx + 1}:</strong> {step}
              </div>
            ))}
          </div>
        </div>
      )}

      {!collapsed && (
        <div style={{
          padding: `0 ${outCount > 0 ? '22' : '8'}px 8px ${inCount > 0 ? '22' : '8'}px`,
          flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        }}>
          {children}
        </div>
      )}

      {!collapsed && (selected || hovered) && (
        <div
          onPointerDown={handlePointerDown}
          style={{
            position: 'absolute',
            bottom: 0, right: 0,
            width: 16, height: 16,
            cursor: 'nwse-resize',
            zIndex: 20,
            touchAction: 'none',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" style={{ position: 'absolute', bottom: 2, right: 2 }}>
            <line x1="12" y1="4" x2="12" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="12" y1="12" x2="4" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="9" y1="7" x2="9" y2="9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="9" y1="9" x2="7" y2="9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      )}

      {useLabeled && inputHandles
        ? inputHandles.map((h, i) => {
            const y = collapsed ? 13 : (28 + 20 * i);
            return (
              <React.Fragment key={h.id}>
                <Handle
                  type="target"
                  position={Position.Left}
                  id={h.id}
                  title={h.label}
                  isConnectableStart={true}
                  style={{
                    background: color,
                    width: 20, height: 20,
                    border: '2px solid rgba(15,5,30,0.95)',
                    top: y, opacity: 0.4,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: -10, top: y - 10,
                    width: 20, height: 20,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 3,
                    pointerEvents: 'none',
                    fontSize: 11,
                    lineHeight: 1,
                  }}
                >
                  {h.icon}
                </div>
              </React.Fragment>
            );
          })
        : hasInput && !useLabeled &&
          Array.from({ length: inputCount }).map((_, i) => (
            <Handle
              key={`in-${i}`}
              type="target"
              position={Position.Top}
              id={`input-${i}`}
              style={{
                background: '#b026ff',
                width: 6, height: 6,
                border: '2px solid rgba(15,5,30,0.95)',
                top: -3,
                left: inputCount === 1 ? '50%' : `${((i + 1) / (inputCount + 1)) * 100}%`,
              }}
            />
          ))}

      {useLabeled && outputHandles
        ? outputHandles.map((h, i) => {
            const y = collapsed ? 13 : (h.y ?? (28 + 20 * i));
            return (
              <React.Fragment key={h.id}>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={h.id}
                  title={h.label}
                  isConnectableStart={true}
                  style={{
                    background: '#63d4ff',
                    width: 20, height: 20,
                    border: '2px solid rgba(15,5,30,0.95)',
                    top: y, opacity: 0.4,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    right: -10, top: y - 10,
                    width: 20, height: 20,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 3,
                    pointerEvents: 'none',
                    fontSize: 11,
                    lineHeight: 1,
                  }}
                >
                  {h.icon}
                </div>
              </React.Fragment>
            );
          })
        : hasOutput && !useLabeled &&
          Array.from({ length: outputCount }).map((_, i) => (
            <Handle
              key={`out-${i}`}
              type="source"
              position={Position.Bottom}
              id={`output-${i}`}
              style={{
                background: '#63d4ff',
                width: 6, height: 6,
                border: '2px solid rgba(15,5,30,0.95)',
                bottom: -3,
                left: outputCount === 1 ? '50%' : `${((i + 1) / (outputCount + 1)) * 100}%`,
              }}
            />
          ))}
    </div>
  );
}

const inputBase = {
  width: '100%',
  padding: '4px 6px',
  borderRadius: 6,
  border: '1px solid rgba(176,38,255,0.15)',
  background: 'rgba(255,255,255,0.04)',
  color: '#fff',
  fontSize: 10,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};

const selectBase = {
  ...inputBase,
  appearance: 'none',
  cursor: 'pointer',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='%23b9b4d0' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 6px center',
  paddingRight: 20,
};

const labelBase = {
  display: 'block',
  fontSize: 9,
  fontWeight: 500,
  color: '#b9b4d0',
  marginBottom: 2,
};

const btnBase = {
  width: '100%',
  padding: '3px 6px',
  borderRadius: 4,
  border: 'none',
  background: '#b026ff',
  color: '#fff',
  fontSize: 9,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'background 0.15s, opacity 0.15s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
};

function Select({ value, onChange, options, style }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const filtered = options.filter(opt =>
    (opt.label || opt.value || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          ...inputBase,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 4,
          paddingRight: 6,
          userSelect: 'none',
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 10 }}>
          {options.find((o) => o.value === value)?.label || value}
        </span>
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#b9b4d0" strokeWidth="2" style={{ flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0, right: 0,
            zIndex: 100,
            marginTop: 2,
            borderRadius: 6,
            border: '1px solid rgba(176,38,255,0.3)',
            background: '#1a0a2e',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {options.length > 4 && (
            <div style={{ padding: 4, borderBottom: '1px solid rgba(176,38,255,0.15)' }} onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
                style={{
                  width: '100%',
                  padding: '2px 4px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(176,38,255,0.2)',
                  borderRadius: 4,
                  color: '#fff',
                  fontSize: 9.5,
                  outline: 'none',
                }}
              />
            </div>
          )}
          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '6px 8px', fontSize: 10, color: '#6b6880', textAlign: 'center' }}>No results</div>
            ) : (
              filtered.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => { setOpen(false); onChange?.({ target: { value: opt.value } }); }}
                  style={{
                    padding: '5px 8px',
                    fontSize: 10,
                    color: opt.value === value ? '#b026ff' : '#e0dce6',
                    cursor: 'pointer',
                    background: opt.value === value ? 'rgba(176,38,255,0.1)' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(176,38,255,0.15)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = opt.value === value ? 'rgba(176,38,255,0.1)' : 'transparent'; }}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const HELP_PROCEDURES = {
  'Genre': [
    'Select a musical genre from the drop-down menu (e.g., Pop, Techno, Bhangra).',
    'This node sets the global style of the generated music.',
    'Connect the output to a Song Settings or Music Generator node.'
  ],
  'Language': [
    'Select the language for the vocals/lyrics (e.g., English, Hindi, Bengali).',
    'Connect its output to a Lyrics Input or Lyrics Generator node to enforce language.'
  ],
  'Theme': [
    'Choose a visual theme and art direction template for the music video.',
    'Connect its output to downstream settings or the Video Generator to style your frames.'
  ],
  'BPM': [
    'Specify the pacing of the track (Beats Per Minute) using the input range/number.',
    'Sets the synchronization speed for frames and cuts.',
    'Connect to Song Settings or Prompt Creator nodes.'
  ],
  'Duration': [
    'Define the video and audio duration length in seconds.',
    'Guides the timeline generator in trimming generation steps.',
    'Connect to Song Settings or Prompt Creator nodes.'
  ],
  'Audio File': [
    'Upload a local custom MP3/WAV audio track.',
    'Outputs both the raw audio stream and file reference path.',
    'Connect to the Music Generator or Video Generator as the soundtrack.'
  ],
  'Lyrics Input': [
    'Directly type or paste custom song lyrics into the text editor.',
    'Connect its output to the Music Generator to synthesize vocals matching the lyrics.'
  ],
  'Song Settings': [
    'A unified hub that combines Genre, Scale, Key, BPM, and Time Signature settings.',
    'Outputs a single structured configuration connection.',
    'Connect this to the Music Generator to define composition parameters.'
  ],
  'Story Concept Input': [
    'Type a visual narrative concept outline (e.g., "A futuristic road trip").',
    'Click "🪄 Enhance" to automatically expand the story using LLM context.',
    'Connect to Style & Theme Input node to establish sequence.'
  ],
  'Style & Theme Input': [
    'Describe visual details, colors, camera lens, and color grading preferences.',
    'Click "🪄 Enhance" to build out a detailed style prompt.',
    'Connect downstream to Subject & Locations Input.'
  ],
  'Subject & Locations Input': [
    'Describe the characters, clothing, environments, and scene locations.',
    'Click "🪄 Enhance" to expand detailed visuals for ComfyUI.',
    'Connect the output to the Prompt Creator Node.'
  ],
  'Guts Settings': [
    'Fine-tune video rendering parameters like FPS, Cut Rules, and LLM temperature/max tokens.',
    'Connect the settings configuration to the Prompt Creator node.'
  ],
  'Lyrics Generator': [
    'Construct AI song lyrics using text prompts and language rules.',
    'Input keyword guidance or themes, then click "Generate".',
    'Outputs the final structured lyrics text.'
  ],
  'Smart Lyrics Studio': [
    'Generate creative lyrics with transformations (Parody, Bhajan, Love, etc.).',
    'Select input type (Theme/YouTube), pick transformation, choose languages.',
    'Click "Generate" to create lyrics, edit the result, then connect output to Music Generator.'
  ],
  'Music Generator': [
    'Generates the audio track.',
    'Connect inputs: Song Settings (configuration), Lyrics Input/Generator (vocal reference), and optionally an Audio File.',
    'Click "Generate" to synthesize the final mixed audio track.'
  ],
  'Cover Generator': [
    'Generates single-frame album art/cover designs.',
    'Provide visual prompt inputs and settings, then click "Generate".'
  ],
  'TTS Generator': [
    'Convert text to spoken-word audio files.',
    'Select a speaker voice, enter script text, and click "Generate".',
    'Useful for audio narration/overdubs.'
  ],
  'LLM Text Gen': [
    'A general-purpose LLM execution sandbox.',
    'Input prompts or rules to generate customized visual/text outputs.'
  ],
  'Prompt Creator': [
    'Compiles visual sequence prompts from chained override inputs.',
    'Connect Story Concept, Style & Theme, Subject & Locations, and Guts Settings.',
    'Click "Generate Prompts" to structure the video timeline.'
  ],
  'Video Generator': [
    'Generates the final video using timed prompt scripts.',
    'Connect the Prompt Creator\'s compiled prompt track and the Music Generator\'s audio.',
    'Click "Generate Video" to trigger ComfyUI frame-by-frame rendering.'
  ],
  'Image Generator': [
    'Generate individual standalone image assets.',
    'Enter target visual prompts and run to output PNG/JPG assets.'
  ],
  'Audio Player': [
    'A node for previewing sound outputs.',
    'Connect any audio source (Music Generator, TTS, or Audio File) to playback.'
  ],
  'Video Player': [
    'A node for previewing final video outputs.',
    'Connect the Video Generator\'s output to play and download the music video.'
  ]
};

export { inputBase, selectBase, labelBase, btnBase, Select };
