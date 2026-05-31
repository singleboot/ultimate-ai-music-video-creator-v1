'use client';

import React, { useState, useCallback } from 'react';
import BaseNode, { inputBase, selectBase, labelBase } from './BaseNode';

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

const GenreNode = React.memo(function GenreNode({ data, id, selected }) {
  const [open, setOpen] = useState(false);
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

  return (
    <BaseNode title="Genre" color="#b026ff" selected={selected} nodeId={id} data={data} outputHandles={genreOut}>
      <div style={{ position: 'relative' }}>
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
      <select
        value={data.language || 'en'}
        onChange={(e) => data.onUpdate?.(id, { language: e.target.value })}
        style={selectBase}
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>{l.name}</option>
        ))}
      </select>
    </BaseNode>
  );
});

const ThemeNode = React.memo(function ThemeNode({ data, id, selected }) {
  return (
    <BaseNode title="Theme" color="#ff3bd4" selected={selected} nodeId={id} data={data} outputHandles={themeOut}>
      <div style={labelBase}>Theme / Story</div>
      <textarea
        value={data.theme || ''}
        onChange={(e) => data.onUpdate?.(id, { theme: e.target.value })}
        placeholder="Describe the theme or story..."
        rows={5}
        style={{ ...inputBase, resize: 'vertical', minHeight: 100, fontSize: 11, lineHeight: 1.5 }}
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
          display: 'block',
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
        value={data.lyrics || ''}
        onChange={(e) => data.onUpdate?.(id, { lyrics: e.target.value })}
        placeholder="Enter your lyrics..."
        rows={10}
        style={{ ...inputBase, resize: 'vertical', minHeight: 180, lineHeight: 1.6, fontSize: 11 }}
      />
    </BaseNode>
  );
});

export { GenreNode, LanguageNode, ThemeNode, BPMNode, DurationNode, AudioFileNode, LyricsInputNode };
