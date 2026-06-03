'use client';

import React, { useState, useCallback } from 'react';
import BaseNode, { inputBase, selectBase, labelBase, Select } from './BaseNode';
import NodeSpinner from './spinners';
import useWorkflowStore from '../../store/workflowStore';

const GENRES = [
  'Pop', 'Rock', 'Hip Hop', 'R&B', 'Electronic', 'EDM', 'House',
  'Techno', 'Trance', 'Dubstep', 'Drum & Bass', 'Jazz', 'Blues',
  'Classical', 'Country', 'Folk', 'Metal', 'Punk', 'Reggae', 'Latin',
  'Bollywood', 'Indie', 'Alternative', 'Ambient', 'Lo-fi', 'Synthwave',
  'Disco', 'Funk', 'Soul', 'Gospel', 'Afrobeats', 'K-Pop',
  'Indian Pop', 'Carnatic', 'Qawwali', 'Ghazal', 'Sufi', 'Thumri',
  'Bhangra', 'Cinematic', 'Orchestral', 'Trap', 'Rap',
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'ur', name: 'Urdu' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ml', name: 'Malayalam' },
];

const genreOut = [{ id: 'output-0', label: 'genre', icon: '\uD83C\uDFB6' }];
const langOut = [{ id: 'output-0', label: 'language', icon: '\uD83C\uDF10' }];
const themeOut = [{ id: 'output-0', label: 'theme', icon: '\uD83C\uDFAD' }];
const bpmOut = [{ id: 'output-0', label: 'bpm', icon: '\u2699\uFE0F' }];
const durOut = [{ id: 'output-0', label: 'duration', icon: '\u23F1\uFE0F' }];
const audioFileOut = [
  { id: 'output-0', label: 'audio', icon: '\uD83C\uDFB5' },
  { id: 'output-1', label: 'file', icon: '\uD83D\uDCC1' },
];
const lyricsOut = [{ id: 'output-0', label: 'lyrics', icon: '\uD83D\uDCDD' }];
const songSettingsOut = [{ id: 'output-0', label: 'song settings', icon: '\uD83D\uDCFB' }];

const ALL_SCALES = [
  'C major', 'C# major', 'D major', 'D# major', 'E major', 'F major',
  'F# major', 'G major', 'G# major', 'A major', 'A# major', 'B major',
  'A minor', 'A# minor', 'B minor', 'C minor', 'C# minor', 'D minor',
  'D# minor', 'E minor', 'F minor', 'F# minor', 'G minor', 'G# minor',
];

const TIMESIGS = [
  { value: '2', label: '2/4' },
  { value: '3', label: '3/4' },
  { value: '4', label: '4/4' },
  { value: '6', label: '6/8' },
];

const SongSettingsNode = React.memo(function SongSettingsNode({ data, id, selected }) {
  const d = data;
  const ss = d.songSettings || {};
  const update = (patch) => {
    const next = { ...(d.songSettings || {}), ...patch };
    d.onUpdate?.(id, { songSettings: next });
  };
  return (
    <BaseNode title="Song Settings" color="#10b981" selected={selected} nodeId={id} data={data} outputHandles={songSettingsOut}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minHeight: 0 }}>
        <div style={labelBase}>BPM</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="range"
            min={60} max={180}
            value={ss.bpm ?? 120}
            onChange={(e) => update({ bpm: Number(e.target.value) })}
            style={{ flex: 1, accentColor: '#10b981' }}
          />
          <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, minWidth: 32, textAlign: 'right', color: '#10b981' }}>
            {ss.bpm ?? 120}
          </span>
        </div>

        <div style={labelBase}>Duration (s)</div>
        <input
          type="number"
          min={10} max={300}
          value={ss.duration ?? 30}
          onChange={(e) => update({ duration: Number(e.target.value) })}
          style={inputBase}
        />

        <div style={labelBase}>Language</div>
        <Select
          value={ss.language || 'en'}
          onChange={(e) => update({ language: e.target.value })}
          options={LANGUAGES.map((l) => ({ value: l.code, label: l.name }))}
        />

        <div style={labelBase}>Time Signature</div>
        <Select
          value={ss.timeSignature || '4'}
          onChange={(e) => update({ timeSignature: e.target.value })}
          options={TIMESIGS}
        />

        <div style={labelBase}>Key / Scale</div>
        <Select
          value={ss.keyscale || ''}
          onChange={(e) => update({ keyscale: e.target.value })}
          options={[{ value: '', label: 'Auto (ComfyUI default)' }, ...ALL_SCALES.map((s) => ({ value: s, label: s }))]}
        />
      </div>
    </BaseNode>
  );
});

const GenreNode = React.memo(function GenreNode({ data, id, selected }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const selectedGenres = data.genre || [];

  const toggle = useCallback(
    (g) => {
      const next = selectedGenres.includes(g)
        ? selectedGenres.filter((x) => x !== g)
        : [...selectedGenres, g];
      data.onUpdate?.(id, { genre: next });
    },
    [selectedGenres, data, id]
  );

  const addCustom = () => {
    const trimmed = custom.trim();
    if (!trimmed) return;
    if (!selectedGenres.includes(trimmed)) {
      data.onUpdate?.(id, { genre: [...selectedGenres, trimmed] });
    }
    setCustom('');
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } };

  return (
    <BaseNode title="Genre" color="#b026ff" selected={selected} nodeId={id} data={data} outputHandles={genreOut}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
        <div style={labelBase}>Genre / Style</div>
        <button
          onClick={() => setOpen(!open)}
          style={{
            ...inputBase,
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            minHeight: 36,
            alignItems: 'center',
          }}
        >
          {selectedGenres.length === 0 ? (
            <span style={{ color: '#6b6880' }}>Select genres...</span>
          ) : (
            selectedGenres.map((g) => (
              <span
                key={g}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: '#b026ff30',
                  border: '1px solid #b026ff60',
                  fontSize: 11,
                  color: '#fff',
                }}
              >
                {g}
                <span
                  onClick={(e) => { e.stopPropagation(); toggle(g); }}
                  style={{ cursor: 'pointer', opacity: 0.7, fontSize: 13 }}
                >
                  x
                </span>
              </span>
            ))
          )}
        </button>
        <div style={{ display: 'flex', gap: 4 }}>
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="+ custom genre..."
            style={{ ...inputBase, flex: 1, fontSize: 10, padding: '3px 6px' }}
          />
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={addCustom}
            style={{ padding: '2px 8px', borderRadius: 4, border: 'none', background: '#b026ff', color: '#fff', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
          >
            Add
          </button>
        </div>
        {open && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0, right: 0, zIndex: 50,
              marginTop: 4,
              background: 'rgba(15,5,30,0.98)',
              border: '1px solid rgba(176,38,255,0.3)',
              borderRadius: 10,
              padding: 6,
              maxHeight: 200,
              overflowY: 'auto',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 4,
            }}
          >
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => toggle(g)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: `1px solid ${selectedGenres.includes(g) ? '#b026ff' : 'rgba(176,38,255,0.2)'}`,
                  background: selectedGenres.includes(g) ? '#b026ff30' : 'rgba(255,255,255,0.05)',
                  color: selectedGenres.includes(g) ? '#fff' : '#b9b4d0',
                  fontSize: 11,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </div>
    </BaseNode>
  );
});

const LanguageNode = React.memo(function LanguageNode({ data, id, selected }) {
  return (
    <BaseNode title="Language" color="#63d4ff" selected={selected} nodeId={id} data={data} outputHandles={langOut}>
      <div style={labelBase}>Language</div>
      <Select
        value={data.language || 'en'}
        onChange={(e) => data.onUpdate?.(id, { language: e.target.value })}
        options={LANGUAGES.map((l) => ({ value: l.code, label: l.name }))}
      />
    </BaseNode>
  );
});

const ThemeNode = React.memo(function ThemeNode({ data, id, selected }) {
  return (
    <BaseNode title="Theme" color="#ff3bd4" selected={selected} nodeId={id} data={data} outputHandles={themeOut}>
      <div style={labelBase}>Theme / Story</div>
      <textarea
        className="nodrag"
        value={data.theme || ''}
        onChange={(e) => data.onUpdate?.(id, { theme: e.target.value })}
        placeholder="Describe the theme or story..."
        style={{ ...inputBase, resize: 'none', flex: 1, minHeight: 0, fontSize: 11, lineHeight: 1.5, userSelect: 'text', WebkitUserSelect: 'text' }}
      />
    </BaseNode>
  );
});

const BPMNode = React.memo(function BPMNode({ data, id, selected }) {
  const bpm = data.bpm ?? 120;
  return (
    <BaseNode title="BPM" color="#f59e0b" selected={selected} nodeId={id} data={data} outputHandles={bpmOut}>
      <div style={labelBase}>Tempo (BPM)</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          type="range"
          min={60} max={200}
          value={bpm}
          onChange={(e) => data.onUpdate?.(id, { bpm: Number(e.target.value) })}
          style={{ flex: 1, accentColor: '#b026ff' }}
        />
        <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, minWidth: 36, textAlign: 'right', color: '#f59e0b' }}>
          {bpm}
        </span>
      </div>
    </BaseNode>
  );
});

const DurationNode = React.memo(function DurationNode({ data, id, selected }) {
  return (
    <BaseNode title="Duration" color="#22c55e" selected={selected} nodeId={id} data={data} outputHandles={durOut}>
      <div style={labelBase}>Duration (seconds)</div>
      <input
        type="number"
        min={1} max={600}
        value={data.duration ?? 30}
        onChange={(e) => data.onUpdate?.(id, { duration: Number(e.target.value) })}
        style={inputBase}
      />
    </BaseNode>
  );
});

const AudioFileNode = React.memo(function AudioFileNode({ data, id, selected }) {
  const handleFile = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      data.onUpdate?.(id, { audioFileName: file.name, audioUrl: url, audioFile: file, duration: data.duration ?? 0 });
    },
    [data, id]
  );

  return (
    <BaseNode title="Audio File" color="#ec4899" selected={selected} nodeId={id} data={data} outputHandles={audioFileOut}>
      <div style={labelBase}>Upload Audio</div>
      <label
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          flex: 1,
          minHeight: 0,
          padding: '16px 10px',
          borderRadius: 10,
          border: '2px dashed rgba(176,38,255,0.3)',
          background: 'rgba(255,255,255,0.03)',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'border-color 0.2s',
        }}
      >
        <input type="file" accept="audio/*" onChange={handleFile} style={{ display: 'none' }} />
        {data.audioFileName ? (
          <div>
            <div style={{ color: '#22c55e', fontSize: 12, fontWeight: 600 }}>{data.audioFileName}</div>
            <div style={{ color: '#b9b4d0', fontSize: 10, marginTop: 4 }}>Click to change</div>
          </div>
        ) : (
          <div>
            <div style={{ color: '#b026ff', fontSize: 20, marginBottom: 4 }}>{'\u2601'}</div>
            <div style={{ color: '#b9b4d0', fontSize: 11 }}>Drop audio or click to browse</div>
          </div>
        )}
      </label>
    </BaseNode>
  );
});

const LyricsInputNode = React.memo(function LyricsInputNode({ data, id, selected }) {
  return (
    <BaseNode title="Lyrics Input" color="#a855f7" selected={selected} nodeId={id} data={data} outputHandles={lyricsOut}>
      <div style={labelBase}>Lyrics</div>
      <textarea
        className="nodrag"
        value={data.lyrics || ''}
        onChange={(e) => data.onUpdate?.(id, { lyrics: e.target.value })}
        placeholder="[Verse]
Your lyrics here..."

        style={{ ...inputBase, resize: 'none', flex: 1, minHeight: 0, lineHeight: 1.6, fontSize: 11, whiteSpace: 'pre-wrap', fontFamily: 'monospace', userSelect: 'text', WebkitUserSelect: 'text' }}
      />
    </BaseNode>
  );
});

const API = 'http://127.0.0.1:8000';
const storyOut = [{ id: 'output-0', label: 'story_concept', icon: '📝' }];
const styleOut = [{ id: 'output-0', label: 'theme_style', icon: '🎨' }];
const scenesOut = [{ id: 'output-0', label: 'subject_scenes', icon: '📍' }];
const genericInput = [{ id: 'input-0', label: 'context', icon: '🔗' }];

function getConnectedInputText(nodeId) {
  const state = useWorkflowStore.getState();
  const incoming = state.edges.find((e) => e.target === nodeId);
  if (!incoming) return '';
  const srcNode = state.nodes.find((n) => n.id === incoming.source);
  if (!srcNode) return '';
  const d = srcNode.data || {};
  return d.story_concept || d.theme_style || d.subject_scenes || d.story || d.theme || d.lyrics || d.text || '';
}

const StoryConceptNode = React.memo(function StoryConceptNode({ data, id, selected }) {
  const [enhancing, setEnhancing] = useState(false);
  const [error, setError] = useState('');

  const handleEnhance = async () => {
    const currentVal = data.story_concept || data.story || '';
    const contextVal = getConnectedInputText(id);
    if (!currentVal.trim() && !contextVal.trim()) return;
    setEnhancing(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/generate/enhance-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: currentVal, type: 'story_concept', context: contextVal, max_length: data.maxLength ?? 1024 }),
      });
      if (!res.ok) throw new Error('Enhance failed');
      const json = await res.json();
      data.onUpdate?.(id, { story_concept: json.enhanced, story: json.enhanced });
    } catch (err) {
      setError(err.message);
    } finally {
      setEnhancing(false);
    }
  };

  return (
    <BaseNode title="Story Concept Input" color="#f59e0b" selected={selected} nodeId={id} data={data} inputHandles={genericInput} outputHandles={storyOut}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minHeight: 0, height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <div style={labelBase}>Story Concept</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 9, color: '#a09bb5' }}>Max L:</span>
            <select
              value={data.maxLength ?? 1024}
              onPointerDown={(e) => e.stopPropagation()}
              onChange={(e) => data.onUpdate?.(id, { maxLength: Number(e.target.value) })}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(245,158,11,0.2)',
                color: '#fff',
                fontSize: 9,
                borderRadius: 4,
                outline: 'none',
                padding: '2px 4px',
                cursor: 'pointer',
              }}
            >
              <option style={{ background: '#1c152a' }} value={64}>64</option>
              <option style={{ background: '#1c152a' }} value={128}>128</option>
              <option style={{ background: '#1c152a' }} value={256}>256</option>
              <option style={{ background: '#1c152a' }} value={512}>512</option>
              <option style={{ background: '#1c152a' }} value={1024}>1024</option>
              <option style={{ background: '#1c152a' }} value={2048}>2048</option>
            </select>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleEnhance}
              disabled={enhancing}
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                border: '1px solid rgba(245,158,11,0.4)',
                background: 'rgba(245,158,11,0.1)',
                color: '#f59e0b',
                fontSize: '10px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {enhancing ? 'Enhancing...' : '🪄 Enhance'}
            </button>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          <textarea
            className="nodrag"
            value={data.story_concept || data.story || ''}
            onChange={(e) => data.onUpdate?.(id, { story_concept: e.target.value, story: e.target.value })}
            placeholder="Write a simple story concept here (e.g. 'A futuristic city where rain glows green'...) then click Enhance."
            style={{ ...inputBase, resize: 'none', width: '100%', height: '100%', minHeight: 120, lineHeight: 1.5, fontSize: 11, userSelect: 'text', WebkitUserSelect: 'text' }}
          />
          {enhancing && <NodeSpinner variant="prompt" />}
        </div>
        {error && (
          <div style={{ fontSize: 9, color: '#ef4444', marginTop: 2 }}>{error}</div>
        )}
      </div>
    </BaseNode>
  );
});

const StyleThemeNode = React.memo(function StyleThemeNode({ data, id, selected }) {
  const [enhancing, setEnhancing] = useState(false);
  const [error, setError] = useState('');

  const handleEnhance = async () => {
    const currentVal = data.theme_style || data.theme || '';
    const contextVal = getConnectedInputText(id);
    if (!currentVal.trim() && !contextVal.trim()) return;
    setEnhancing(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/generate/enhance-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: currentVal, type: 'theme_style', context: contextVal, max_length: data.maxLength ?? 1024 }),
      });
      if (!res.ok) throw new Error('Enhance failed');
      const json = await res.json();
      data.onUpdate?.(id, { theme_style: json.enhanced, theme: json.enhanced });
    } catch (err) {
      setError(err.message);
    } finally {
      setEnhancing(false);
    }
  };

  return (
    <BaseNode title="Style & Theme Input" color="#b026ff" selected={selected} nodeId={id} data={data} inputHandles={genericInput} outputHandles={styleOut}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minHeight: 0, height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <div style={labelBase}>Style & Theme</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 9, color: '#a09bb5' }}>Max L:</span>
            <select
              value={data.maxLength ?? 1024}
              onPointerDown={(e) => e.stopPropagation()}
              onChange={(e) => data.onUpdate?.(id, { maxLength: Number(e.target.value) })}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(176,38,255,0.2)',
                color: '#fff',
                fontSize: 9,
                borderRadius: 4,
                outline: 'none',
                padding: '2px 4px',
                cursor: 'pointer',
              }}
            >
              <option style={{ background: '#1c152a' }} value={64}>64</option>
              <option style={{ background: '#1c152a' }} value={128}>128</option>
              <option style={{ background: '#1c152a' }} value={256}>256</option>
              <option style={{ background: '#1c152a' }} value={512}>512</option>
              <option style={{ background: '#1c152a' }} value={1024}>1024</option>
              <option style={{ background: '#1c152a' }} value={2048}>2048</option>
            </select>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleEnhance}
              disabled={enhancing}
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                border: '1px solid rgba(176,38,255,0.4)',
                background: 'rgba(176,38,255,0.1)',
                color: '#a855f7',
                fontSize: '10px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {enhancing ? 'Enhancing...' : '🪄 Enhance'}
            </button>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          <textarea
            className="nodrag"
            value={data.theme_style || data.theme || ''}
            onChange={(e) => data.onUpdate?.(id, { theme_style: e.target.value, theme: e.target.value })}
            placeholder="Style, color grading, visual theme, lighting, cinematic features..."
            style={{ ...inputBase, resize: 'none', width: '100%', height: '100%', minHeight: 120, lineHeight: 1.5, fontSize: 11, userSelect: 'text', WebkitUserSelect: 'text' }}
          />
          {enhancing && <NodeSpinner variant="prompt" />}
        </div>
        {error && (
          <div style={{ fontSize: 9, color: '#ef4444', marginTop: 2 }}>{error}</div>
        )}
      </div>
    </BaseNode>
  );
});

const SubjectLocationsNode = React.memo(function SubjectLocationsNode({ data, id, selected }) {
  const [enhancing, setEnhancing] = useState(false);
  const [error, setError] = useState('');

  const handleEnhance = async () => {
    const currentVal = data.subject_scenes || '';
    const contextVal = getConnectedInputText(id);
    if (!currentVal.trim() && !contextVal.trim()) return;
    setEnhancing(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/generate/enhance-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: currentVal, type: 'subject_scenes', context: contextVal, max_length: data.maxLength ?? 1024 }),
      });
      if (!res.ok) throw new Error('Enhance failed');
      const json = await res.json();
      data.onUpdate?.(id, { subject_scenes: json.enhanced });
    } catch (err) {
      setError(err.message);
    } finally {
      setEnhancing(false);
    }
  };

  return (
    <BaseNode title="Subject & Locations Input" color="#3b82f6" selected={selected} nodeId={id} data={data} inputHandles={genericInput} outputHandles={scenesOut}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minHeight: 0, height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <div style={labelBase}>Subject & Locations</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 9, color: '#a09bb5' }}>Max L:</span>
            <select
              value={data.maxLength ?? 1024}
              onPointerDown={(e) => e.stopPropagation()}
              onChange={(e) => data.onUpdate?.(id, { maxLength: Number(e.target.value) })}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(59,130,246,0.2)',
                color: '#fff',
                fontSize: 9,
                borderRadius: 4,
                outline: 'none',
                padding: '2px 4px',
                cursor: 'pointer',
              }}
            >
              <option style={{ background: '#1c152a' }} value={64}>64</option>
              <option style={{ background: '#1c152a' }} value={128}>128</option>
              <option style={{ background: '#1c152a' }} value={256}>256</option>
              <option style={{ background: '#1c152a' }} value={512}>512</option>
              <option style={{ background: '#1c152a' }} value={1024}>1024</option>
              <option style={{ background: '#1c152a' }} value={2048}>2048</option>
            </select>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleEnhance}
              disabled={enhancing}
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                border: '1px solid rgba(59,130,246,0.4)',
                background: 'rgba(59,130,246,0.1)',
                color: '#3b82f6',
                fontSize: '10px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {enhancing ? 'Enhancing...' : '🪄 Enhance'}
            </button>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          <textarea
            className="nodrag"
            value={data.subject_scenes || ''}
            onChange={(e) => data.onUpdate?.(id, { subject_scenes: e.target.value })}
            placeholder="Describe subjects and settings: character appearance, key details, environments...\n\nFor duets/chorus, define subjects by speaker:\n[Male] a man with...\n[Female] a woman with...\n[Duet] a man and a woman...\n[Chorus] a group of..."
            style={{ ...inputBase, resize: 'none', width: '100%', height: '100%', minHeight: 120, lineHeight: 1.5, fontSize: 11, userSelect: 'text', WebkitUserSelect: 'text' }}
          />
          {enhancing && <NodeSpinner variant="prompt" />}
        </div>
        {error && (
          <div style={{ fontSize: 9, color: '#ef4444', marginTop: 2 }}>{error}</div>
        )}
      </div>
    </BaseNode>
  );
});

const gutsSettingsOut = [{ id: 'output-0', label: 'guts settings', icon: '⚙️' }];

const DURATION_PRESETS = [
  { value: 'varied_no_repeat', label: 'varied_no_repeat' },
  { value: 'impact_weighted', label: 'impact_weighted' },
  { value: 'back_to_back_clustered', label: 'back_to_back_clustered' },
  { value: 'no_repeat', label: 'no_repeat' },
];

const LLM_MODELS = [
  { value: 'supergemma4-26b-uncensored-fast-v2-Q4_K_M.gguf', label: 'SuperGemma4 Uncensored Q4' },
  { value: 'gemma-2-27b-it.Q4_K_M.gguf', label: 'Gemma 2 27B IT Q4' },
  { value: 'Llama-3-8B-Instruct.Q4_K_M.gguf', label: 'Llama 3 8B Instruct Q4' },
];

const WHISPER_LANGUAGES = [
  { value: 'english', label: 'english' },
  { value: 'spanish', label: 'spanish' },
  { value: 'french', label: 'french' },
  { value: 'german', label: 'german' },
  { value: 'italian', label: 'italian' },
  { value: 'japanese', label: 'japanese' },
  { value: 'chinese', label: 'chinese' },
  { value: 'hindi', label: 'hindi' },
  { value: 'auto', label: 'auto' },
];

const descStyle = {
  fontSize: '8px',
  color: '#a09bb5',
  marginTop: '2px',
  marginBottom: '6px',
  lineHeight: '1.25',
  opacity: 0.85,
};

const GutsSettingsNode = React.memo(function GutsSettingsNode({ data, id, selected }) {
  const d = data;
  const gs = d.gutsSettings || {};
  const update = (patch) => {
    const next = { ...(d.gutsSettings || {}), ...patch };
    d.onUpdate?.(id, { gutsSettings: next });
  };

  React.useEffect(() => {
    const defaults = {
      fps: 24,
      minDuration: 4,
      maxDuration: 10,
      bias: 0.7,
      durationPreset: 'varied_no_repeat',
      whisperLanguage: 'auto',
      useSrt: 'ON',
      llmModel: 'supergemma4-26b-uncensored-fast-v2-Q4_K_M.gguf',
    };
    let needsUpdate = false;
    const patch = {};
    for (const [key, val] of Object.entries(defaults)) {
      if (gs[key] === undefined) {
        patch[key] = val;
        needsUpdate = true;
      }
    }
    if (needsUpdate) {
      update(patch);
    }
  }, [id]);

  return (
    <BaseNode title="Guts Settings" color="#10b981" selected={selected} nodeId={id} data={data} outputHandles={gutsSettingsOut}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minHeight: 0, width: '100%', minWidth: 200 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ flex: 1 }}>
            <div style={labelBase}>FPS</div>
            <input
              type="number"
              value={gs.fps ?? 24}
              onChange={(e) => update({ fps: Number(e.target.value) })}
              style={inputBase}
            />
            <div style={descStyle}>Frames per second used by the subgraph timing/video logic. Set this to the same FPS in the Part 2 workflow.</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={labelBase}>Min Duration</div>
            <input
              type="number"
              value={gs.minDuration ?? 4}
              onChange={(e) => update({ minDuration: Number(e.target.value) })}
              style={inputBase}
            />
            <div style={descStyle}>Minimum length of scene.</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ flex: 1 }}>
            <div style={labelBase}>Max Duration</div>
            <input
              type="number"
              value={gs.maxDuration ?? 10}
              onChange={(e) => update({ maxDuration: Number(e.target.value) })}
              style={inputBase}
            />
            <div style={descStyle}>Maximum length of scene.</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={labelBase}>Bias</div>
            <input
              type="number"
              step={0.1}
              value={gs.bias ?? 0.7}
              onChange={(e) => update({ bias: Number(e.target.value) })}
              style={inputBase}
            />
            <div style={descStyle}>Controls how strongly beat impact affects scene cuts. Lower values are more even/random; higher values favor stronger beats and downbeats more.</div>
          </div>
        </div>

        <div style={labelBase}>Duration Preset</div>
        <Select
          value={gs.durationPreset || 'varied_no_repeat'}
          onChange={(e) => update({ durationPreset: e.target.value })}
          options={DURATION_PRESETS}
        />
        <div style={descStyle}>impact_weighted follows strongest beats. varied_no_repeat avoids similar scene lengths back-to-back. clustered_no_repeat keeps lengths closer together while still avoiding repeats.</div>

        <div style={labelBase}>Whisper Language</div>
        <Select
          value={gs.whisperLanguage || 'auto'}
          onChange={(e) => update({ whisperLanguage: e.target.value })}
          options={WHISPER_LANGUAGES}
        />
        <div style={descStyle}>Language hint for Whisper transcription. Use auto to let Whisper detect it, or pick the song language for more consistent lyric timing.</div>

        <div style={labelBase}>Use SRT Durations</div>
        <Select
          value={gs.useSrt || 'ON'}
          onChange={(e) => update({ useSrt: e.target.value })}
          options={[{ value: 'ON', label: 'ON' }, { value: 'OFF', label: 'OFF' }]}
        />
        <div style={descStyle}>ON uses the SRT/beat timing for scene lengths. OFF uses one fixed scene duration instead.</div>

        <div style={labelBase}>LLM Model</div>
        <Select
          value={gs.llmModel || 'supergemma4-26b-uncensored-fast-v2-Q4_K_M.gguf'}
          onChange={(e) => update({ llmModel: e.target.value })}
          options={LLM_MODELS}
        />
        <div style={descStyle}>Model used by the Part 1 prompt creator LLM.</div>
      </div>
    </BaseNode>
  );
});

export { GenreNode, LanguageNode, ThemeNode, BPMNode, DurationNode, AudioFileNode, LyricsInputNode, SongSettingsNode, StoryConceptNode, StyleThemeNode, SubjectLocationsNode, GutsSettingsNode };

