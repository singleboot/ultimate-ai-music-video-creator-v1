'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position, useUpdateNodeInternals } from '@xyflow/react';
import BaseNode, { inputBase, labelBase, btnBase, Select } from './BaseNode';
import { generateLyrics, generateText2Audio, generateAudioCover, generateTTS, generatePrompts, generateVideo, generateLLMAudioAnalysis, combineVideoAudio, fetchLoras, resolveUrl } from '../../lib/api';
import NodeSpinner from './spinners';
import useWorkflowStore from '../../store/workflowStore';

const API = 'http://127.0.0.1:8000';

function WorkflowSelector({ category, selectedWorkflow, onSelect }) {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const res = await fetch(`${API}/api/workflows/category/${category}`);
        const data = await res.json();
        setWorkflows(data.workflows || []);
        if (!selectedWorkflow && data.default) {
          onSelect(data.default);
        }
      } catch (err) {
        console.error('Failed to fetch workflows:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkflows();
  }, [category]);

  if (loading) {
    return <div style={labelBase}>Loading workflows...</div>;
  }

  if (workflows.length === 0) {
    return <div style={labelBase}>No workflows available</div>;
  }

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={labelBase}>Workflow</div>
      <select
        value={selectedWorkflow || ''}
        onChange={(e) => onSelect(e.target.value)}
        style={{
          ...inputBase,
          cursor: 'pointer',
        }}
      >
        {workflows.map((wf) => (
          <option key={wf.name} value={wf.name}>
            {wf.display_name || wf.name} {wf.default ? '(Default)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

function getConnectedInputs(nodeId) {
  const state = useWorkflowStore.getState();
  const incoming = state.edges.filter((e) => e.target === nodeId);
  const map = {};
  for (const n of state.nodes) map[n.id] = n;
  const targetNode = map[nodeId];
  const targetType = targetNode ? targetNode.type : '';
  const inputs = {};
  for (const edge of incoming) {
    const src = map[edge.source];
    if (!src) continue;
    const srcData = src.data || {};
    if (src.type === 'LLMTextGenNode') {
      inputs._analyzer = { ...srcData };
    }
    // If upstream node generated an audio file, assign it for the analyzer/downstream
    if (srcData.audioUrl) {
      inputs.audioFileName = srcData.audioUrl;
      inputs.audioUrl = srcData.audioUrl;
    }
    
    // Route inputs based on target handle for PromptCreatorNode
    if (targetType === 'PromptCreatorNode') {
      const handle = edge.targetHandle;
      if (handle === 'input-1') {
        inputs.story_concept = srcData.story_concept || srcData.story || srcData.text || '';
      } else if (handle === 'input-2') {
        inputs.theme_style = srcData.theme_style || srcData.theme || srcData.text || '';
      } else if (handle === 'input-3') {
        inputs.subject_scenes = srcData.subject_scenes || srcData.subject || srcData.text || '';
      } else if (handle === 'input-4') {
        if (srcData.gutsSettings && typeof srcData.gutsSettings === 'object') {
          inputs._gutsSettings = { ...srcData.gutsSettings };
          Object.assign(inputs, srcData.gutsSettings);
        } else {
          Object.assign(inputs, srcData);
        }
      } else if (handle === 'input-5') {
        inputs.lyrics = srcData.lyrics || srcData.text || '';
      } else {
        Object.assign(inputs, srcData);
      }
    } else {
      Object.assign(inputs, srcData);
    }

    // Flatten songSettings bundle so downstream nodes see individual keys
    if (srcData.songSettings && typeof srcData.songSettings === 'object') {
      inputs._songSettings = { ...srcData.songSettings };
      Object.assign(inputs, srcData.songSettings);
    }
    // Flatten gutsSettings bundle so PromptCreatorNode sees individual keys
    if (srcData.gutsSettings && typeof srcData.gutsSettings === 'object') {
      inputs._gutsSettings = { ...srcData.gutsSettings };
      Object.assign(inputs, srcData.gutsSettings);
    }
    // Flatten ltxLoraSettings bundle
    if (srcData.ltxLoraSettings && typeof srcData.ltxLoraSettings === 'object') {
      inputs._ltxLoraSettings = { ...srcData.ltxLoraSettings };
      Object.assign(inputs, srcData.ltxLoraSettings);
    }
    // Flatten zImageLoraSettings bundle
    if (srcData.zImageLoraSettings && typeof srcData.zImageLoraSettings === 'object') {
      inputs._zImageLoraSettings = { ...srcData.zImageLoraSettings };
      Object.assign(inputs, srcData.zImageLoraSettings);
    }
  }
  return inputs;
}

const STRUCTURES = [
  'Verse-Chorus',
  'Verse-Chorus-Bridge',
  'Intro-Verse-Chorus-Verse-Chorus-Bridge-Outro',
  'ABAB',
  'Through-composed',
  'Free-form',
];

const VOICE_PRESETS = [
  { id: 'male_deep', name: 'Deep Voice' },
  { id: 'female_warm', name: 'Warm Voice' },
  { id: 'male_british', name: 'British Narrator' },
  { id: 'female_american', name: 'American Presenter' },
  { id: 'male_bbc', name: 'BBC Announcer' },
  { id: 'female_soft', name: 'Soft Voice' },
];

const lyricsInputs = [
  { id: 'input-0', label: 'theme', icon: '\uD83C\uDFAD' },
  { id: 'input-1', label: 'genre', icon: '\uD83C\uDFB6' },
  { id: 'input-2', label: 'settings', icon: '\uD83D\uDCFB' },
];
const lyricsOut = [{ id: 'output-0', label: 'lyrics', icon: '\uD83D\uDCDD' }];

const musicInputs = [
  { id: 'input-0', label: 'params', icon: '\u2699\uFE0F' },
  { id: 'input-1', label: 'instruments', icon: '\uD83C\uDFB6' },
  { id: 'input-2', label: 'settings', icon: '\uD83D\uDCFB' },
];
const musicOut = [
  { id: 'output-0', label: 'audio', icon: '\uD83C\uDFB5' },
];

const coverInputs = [
  { id: 'input-0', label: 'audio', icon: '\uD83C\uDFB5' },
  { id: 'input-1', label: 'genre', icon: '\uD83C\uDFB6' },
  { id: 'input-2', label: 'bpm', icon: '\u2699\uFE0F' },
];
const coverOut = [{ id: 'output-0', label: 'audio', icon: '\uD83C\uDFB5' }];

const ttsInputs = [
  { id: 'input-0', label: 'text', icon: '\uD83D\uDCDD' },
  { id: 'input-1', label: 'language', icon: '\uD83C\uDF10' },
  { id: 'input-2', label: 'voice', icon: '\uD83C\uDFA4' },
];
const ttsOut = [{ id: 'output-0', label: 'audio', icon: '\uD83C\uDFB5' }];

const llmTextGenInputs = [
  { id: 'input-0', label: 'audio', icon: '\uD83C\uDFB5' },
];
const llmTextGenOut = [{ id: 'output-0', label: 'text', icon: '\uD83D\uDCDD' }];

const promptInputs = [
  { id: 'input-0', label: 'params', icon: '⚙️' },
  { id: 'input-1', label: 'story_concept', icon: '📝' },
  { id: 'input-2', label: 'theme_style', icon: '🎨' },
  { id: 'input-3', label: 'subject_scenes', icon: '📍' },
  { id: 'input-4', label: 'guts_settings', icon: '⚙️' },
  { id: 'input-5', label: 'lyrics', icon: '📝' },
];
const promptOut = [{ id: 'output-0', label: 'prompts', icon: '\u2728' }];

const videoInputs = [
  { id: 'input-0', label: 'prompts', icon: '\u2728' },
  { id: 'input-1', label: 'image', icon: '\uD83D\uDDBC\uFE0F' },
];
const videoOut = [{ id: 'output-0', label: 'video', icon: '\uD83C\uDFAC' }];

const t2vOut = [
  { id: 'output-0', label: 'video', icon: '\uD83C\uDFAC' },
  { id: 'output-1', label: 'combiner', icon: '🔗' },
];

const i2vOut = [
  { id: 'output-0', label: 'video', icon: '\uD83C\uDFAC' },
  { id: 'output-1', label: 'image', icon: '\uD83D\uDDBC\uFE0F' },
  { id: 'output-2', label: 'combiner', icon: '🔗' },
];

const combinerInputs = [
  { id: 'input-0', label: 'video', icon: '\uD83C\uDFAC' },
  { id: 'input-1', label: 'audio', icon: '\uD83C\uDFB5' },
];
const combinerOut = [{ id: 'output-0', label: 'combined', icon: '\uD83C\uDFAC' }];

const t2vInputs = [
  { id: 'input-0', label: 'prompts', icon: '✨' },
  { id: 'input-1', label: 'settings', icon: '⚙️' },
  { id: 'input-2', label: 'ltx_lora', icon: '🧬' },
  { id: 'input-3', label: 'advanced', icon: '🛠️' },
];

const i2vInputs = [
  { id: 'input-0', label: 'prompts', icon: '✨' },
  { id: 'input-1', label: 'image', icon: '🖼️' },
  { id: 'input-2', label: 'settings', icon: '⚙️' },
  { id: 'input-3', label: 'ltx_lora', icon: '🧬' },
  { id: 'input-4', label: 'z_image_lora', icon: '🧬' },
  { id: 'input-5', label: 'advanced', icon: '🛠️' },
];

const videoWorkflowSettingsOut = [{ id: 'output-0', label: 'settings', icon: '⚙️' }];
const ltxLoRASettingsOut = [{ id: 'output-0', label: 'ltx_lora', icon: '🧬' }];
const zImageLoRASettingsOut = [{ id: 'output-0', label: 'z_image_lora', icon: '🧬' }];
const videoAdvancedSettingsOut = [{ id: 'output-0', label: 'advanced', icon: '🛠️' }];

const imageInputs = [
  { id: 'input-0', label: 'prompts', icon: '\u2728' },
  { id: 'input-1', label: 'params', icon: '\u2699\uFE0F' },
];
const imageOut = [{ id: 'output-0', label: 'image', icon: '\uD83D\uDDBC\uFE0F' }];

const outputAreaBase = {
  position: 'relative', flex: 1, minHeight: 0, overflowY: 'auto',
  fontSize: 10, color: '#b9b4d0', padding: 6,
  borderRadius: 8, background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(176,38,255,0.1)',
  lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  userSelect: 'text', WebkitUserSelect: 'text',
};

const outputContainerBase = {
  position: 'relative', flex: 1, minHeight: 0, borderRadius: 8, overflow: 'hidden',
  display: 'flex', flexDirection: 'column',
};

const LyricsGeneratorNode = React.memo(function LyricsGeneratorNode({ data, id, selected }) {
  const [loading, setLoading] = useState(false);
  const [clicked, setClicked] = useState(false);
  const cancelled = useRef(false);
  const d = useRef(data);
  d.current = data;

  const handleGenerate = async () => {
    cancelled.current = false;
    setClicked(true);
    setLoading(true);
    useWorkflowStore.getState().updateNodeData(id, { isRunning: true, error: undefined, debug: 'starting...' });
    try {
      const inputs = getConnectedInputs(id);
      useWorkflowStore.getState().updateNodeData(id, { debug: 'calling Ollama...' });
      const res = await generateLyrics({
        theme: inputs.theme || d.current.theme || '',
        structure: d.current.structure || 'Verse-Chorus',
        genre: inputs.genre || (Array.isArray(d.current.genre) ? d.current.genre.join(', ') : d.current.genre) || '',
        language: inputs.language || d.current.language || 'en',
        duration: inputs.duration || d.current.duration || 30,
        seed: Math.floor(Math.random() * 999999),
      });
      if (cancelled.current) return;
      const usedGenre = inputs.genre || d.current.genre || '';
      const usedDuration = inputs.duration || d.current.duration || 30;
      const usedLanguage = inputs.language || d.current.language || 'en';
      useWorkflowStore.getState().updateNodeData(id, { lyrics: res.lyrics || '', genre: Array.isArray(usedGenre) ? usedGenre.join(', ') : usedGenre, duration: usedDuration, language: usedLanguage, isRunning: false, error: undefined, debug: undefined });
    } catch (err) {
      if (cancelled.current) return;
      useWorkflowStore.getState().updateNodeData(id, { error: 'Error: ' + err.message, isRunning: false, debug: 'failed: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    cancelled.current = true;
    setLoading(false);
    useWorkflowStore.getState().updateNodeData(id, { isRunning: false });
  };

  return (
    <BaseNode title="Lyrics Generator" color="#a855f7" isRunning={loading} selected={selected} nodeId={id} data={data} inputHandles={lyricsInputs} outputHandles={lyricsOut}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
        <div style={labelBase}>Structure</div>
        <Select
          value={data.structure || 'Verse-Chorus'}
          onChange={(e) => useWorkflowStore.getState().updateNodeData(id, { structure: e.target.value })}
          options={STRUCTURES.map((s) => ({ value: s, label: s }))}
        />
        {clicked && !data.lyrics && !loading && (
          <div style={{ fontSize: 9, color: '#fbbf24', padding: 4 }}>clicked! fetching from Ollama...</div>
        )}
        {data.lyrics && !loading && (
          <div style={{ flex: 1, minHeight: 0, borderRadius: 8 }}>
            <textarea
              className="nodrag"
              value={data.lyrics}
              onChange={(e) => useWorkflowStore.getState().updateNodeData(id, { lyrics: e.target.value })}
              style={{
                ...inputBase,
                resize: 'none', width: '100%', height: '100%',
                fontSize: 10, lineHeight: 1.6,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                fontFamily: 'monospace',
                borderRadius: 8, boxSizing: 'border-box',
                userSelect: 'text', WebkitUserSelect: 'text',
              }}
            />
          </div>
        )}
        {data.debug && !loading && (
          <div style={{ fontSize: 9, color: '#93c5fd', padding: 4 }}>{data.debug}</div>
        )}
        {(data.error) && !loading && (
            <div className="nodrag" style={{ fontSize: 9, color: '#ef4444', padding: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word', userSelect: 'text', WebkitUserSelect: 'text' }}>{data.error}</div>
        )}
        {!data.lyrics && !data.debug && !data.error && !loading && clicked && (
          <div style={{ fontSize: 9, color: '#fbbf24', padding: 4 }}>API returned empty result</div>
        )}
        {loading && (
          <div style={{ flex: 1, minHeight: 0, position: 'relative', borderRadius: 8 }}>
            <NodeSpinner variant="lyrics" />
          </div>
        )}
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexShrink: 0 }}>
          {loading ? (
            <button
              onClick={handleCancel}
              style={{ padding: '2px 7px', borderRadius: 4, border: 'none', background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              style={{ padding: '2px 7px', borderRadius: 4, border: 'none', background: '#a855f7', color: '#fff', fontSize: 9, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Generate
            </button>
          )}
          {data.lyrics && !loading && (
            <>
              <button
                onClick={handleGenerate}
                style={{ padding: '2px 7px', borderRadius: 4, border: 'none', background: '#a855f7', color: '#fff', fontSize: 9, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Regen
              </button>
              <button
                onClick={() => { useWorkflowStore.getState().updateNodeData(id, { lyrics: '' }); }}
                style={{ padding: '2px 7px', borderRadius: 4, border: 'none', background: 'rgba(239,68,68,0.6)', color: '#fff', fontSize: 9, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Clear
              </button>
            </>
          )}
        </div>
      </div>
    </BaseNode>
  );
});

const MusicGeneratorNode = React.memo(function MusicGeneratorNode({ data, id, selected }) {
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [progress, setProgress] = useState(0);
  const cancelled = useRef(false);
  const d = useRef(data);
  d.current = data;
  const progressRef = useRef(null);
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, updateNodeInternals, d.current.audioUrl, d.current.error, loading, showAdvanced]);

  const startProgress = () => {
    setProgress(0);
    const startTime = Date.now();
    const estDuration = (d.current.steps ?? 30) * 1500;
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(95, Math.round((elapsed / estDuration) * 100));
      setProgress(pct);
    }, 300);
  };

  const stopProgress = () => {
    if (progressRef.current) clearInterval(progressRef.current);
    setProgress(100);
    setTimeout(() => setProgress(0), 800);
  };

  const handleGenerate = async () => {
    cancelled.current = false;
    setLoading(true);
    startProgress();
    useWorkflowStore.getState().updateNodeData(id, { isRunning: true, error: undefined });
    try {
      const inputs = getConnectedInputs(id);
      const ss = inputs._songSettings || {};
      // Detect if analyzer is connected (has genre/instruments/bpm from LLM)
      const analyzerConnected = !!(inputs.genre || inputs.instruments || inputs.bpm || inputs.keyscale);
      const lyrics = inputs.lyrics || d.current.lyrics || '';
      
      let genreString = '';
      let bpm = 120;
      let keyscale = '';
      
      if (inputs._analyzer) {
        // If Analyzer Node is connected, format as: (genre from song settings) : (text from song analyzer)
        const baseGenre = ss.genre || d.current.genre || 'pop';
        const analyzerDesc = inputs._analyzer.text || '';
        genreString = baseGenre;
        if (analyzerDesc) {
          genreString += ` : ${analyzerDesc}`;
        }
        // Extended analyzer variables override others
        bpm = inputs._analyzer.bpm || ss.bpm || d.current.bpm || 120;
        keyscale = inputs._analyzer.keyscale || ss.keyscale || d.current.keyscale || '';
      } else {
        // If not using analyzer, use genre, bpm, and keyscale from song settings / node data
        genreString = ss.genre || d.current.genre || '';
        bpm = ss.bpm || d.current.bpm || 120;
        keyscale = ss.keyscale || d.current.keyscale || '';
      }
      
      const duration = ss.duration || d.current.duration || 30;
      const language = ss.language || d.current.language || 'en';
      const timeSignature = ss.timeSignature || d.current.timeSignature || '4';
      const res = await generateText2Audio({
        workflow: d.current.workflow || 'ace_text2music_v2',
        lyrics,
        genre: genreString,
        bpm,
        keyscale,
        duration,
        language,
        time_signature: String(timeSignature).split('/')[0],
        cfg_scale: d.current.cfgScale ?? 2,
        temperature: d.current.temperature ?? 0.85,
        steps: d.current.steps ?? 8,
        top_p: d.current.topP ?? 0.9,
        top_k: Math.min(100, d.current.topK ?? 0),
        sampling_shift: d.current.samplingShift ?? 3,
      });
      if (cancelled.current) return;
      useWorkflowStore.getState().updateNodeData(id, { audioUrl: res.audio_url || res.url || '', promptId: res.prompt_id || res.job_id || '', isRunning: false, error: undefined });
    } catch (err) {
      if (cancelled.current) return;
      useWorkflowStore.getState().updateNodeData(id, { error: err.message, isRunning: false });
    } finally {
      stopProgress();
      setLoading(false);
    }
  };

  const handleCancel = () => {
    cancelled.current = true;
    setLoading(false);
    stopProgress();
    useWorkflowStore.getState().updateNodeData(id, { isRunning: false });
  };

  const handleDebug = async () => {
    const inputs = getConnectedInputs(id);
    const ss = inputs._songSettings || {};
    
    let genreString = '';
    let bpm = 120;
    let keyscale = '';
    
    if (inputs._analyzer) {
      // If Analyzer Node is connected, format as: (genre from song settings) : (text from song analyzer)
      const baseGenre = ss.genre || d.current.genre || 'pop';
      const analyzerDesc = inputs._analyzer.text || '';
      genreString = baseGenre;
      if (analyzerDesc) {
        genreString += ` : ${analyzerDesc}`;
      }
      // Extended analyzer variables override others
      bpm = inputs._analyzer.bpm || ss.bpm || d.current.bpm || 120;
      keyscale = inputs._analyzer.keyscale || ss.keyscale || d.current.keyscale || '';
    } else {
      // If not using analyzer, use genre, bpm, and keyscale from song settings / node data
      genreString = ss.genre || d.current.genre || '';
      bpm = ss.bpm || d.current.bpm || 120;
      keyscale = ss.keyscale || d.current.keyscale || '';
    }
    
    const params = {
      lyrics: inputs.lyrics || d.current.lyrics || '',
      genre: genreString,
      bpm,
      keyscale,
      duration: ss.duration || d.current.duration || 30,
      language: ss.language || d.current.language || 'en',
      time_signature: ss.timeSignature || d.current.timeSignature || '4',
      cfg_scale: d.current.cfgScale ?? 2,
      temperature: d.current.temperature ?? 0.85,
      steps: d.current.steps ?? 8,
      top_p: d.current.topP ?? 0.9,
      top_k: Math.min(100, d.current.topK ?? 0),
      sampling_shift: d.current.samplingShift ?? 3,
    };
    try {
      const r = await fetch(`${API}/api/debug/inject/ace_text2music_v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params }),
      });
      const data = await r.json();
      useWorkflowStore.getState().updateNodeData(id, { debugJson: JSON.stringify(data, null, 2) });
    } catch (e) {
      useWorkflowStore.getState().updateNodeData(id, { debugJson: 'Debug error: ' + e.message });
    }
  };

  return (
    <BaseNode title="Music Generator" color="#b026ff" isRunning={loading} selected={selected} nodeId={id} data={data} inputHandles={musicInputs} outputHandles={musicOut}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
        {showAdvanced && (
          <>
            <div style={labelBase}>CFG Scale</div>
            <input type="number" step={0.5} value={d.current.cfgScale ?? 2} onChange={(e) => useWorkflowStore.getState().updateNodeData(id, { cfgScale: Number(e.target.value) })} style={inputBase} />
            <div style={labelBase}>Temperature</div>
            <input type="number" step={0.1} min={0} max={2} value={d.current.temperature ?? 0.85} onChange={(e) => useWorkflowStore.getState().updateNodeData(id, { temperature: Number(e.target.value) })} style={inputBase} />
            <div style={labelBase}>Steps</div>
            <input type="number" min={1} max={100} value={d.current.steps ?? 8} onChange={(e) => useWorkflowStore.getState().updateNodeData(id, { steps: Number(e.target.value) })} style={inputBase} />
          </>
        )}
        <div style={outputContainerBase}>
          {d.current.audioUrl && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
              <audio controls preload="metadata" style={{ width: '100%', height: 28 }} src={resolveUrl(d.current.audioUrl, useWorkflowStore.getState().projectPath)} />
              
              {!d.current.approved ? (
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    useWorkflowStore.getState().updateNodeData(id, { approved: true });
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 'bold',
                    fontSize: '11px',
                    cursor: 'pointer',
                    boxShadow: '0 0 10px rgba(16,185,129,0.4)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Approve Audio
                </button>
              ) : (
                <div
                  className="nodrag"
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(176, 38, 255, 0.1)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(176, 38, 255, 0.2)',
                    fontSize: '11px',
                    color: '#e9d5ff',
                    lineHeight: '1.4',
                    boxShadow: '0 4px 12px rgba(176, 38, 255, 0.15)'
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: '#f3e8ff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: '#10b981' }}>✓</span> Approved & Ready!
                  </div>
                  <div style={{ fontSize: '10.5px' }}>
                    Next steps: Connect the <strong style={{ color: '#b026ff' }}>audio</strong> output handle of this node to either:
                    <ul style={{ margin: '4px 0 0 12px', padding: 0 }}>
                      <li>The <strong style={{ color: '#ec4899' }}>audio</strong> input handle of the <strong>Prompt Creator</strong> node to sync prompts with BPM.</li>
                      <li>The <strong style={{ color: '#3b82f6' }}>audio</strong> input handle of the <strong>Video Generator</strong> node to embed the track.</li>
                    </ul>
                  </div>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      useWorkflowStore.getState().updateNodeData(id, { approved: false });
                    }}
                    style={{
                      marginTop: '8px',
                      background: 'transparent',
                      border: 'none',
                      color: '#c084fc',
                      fontSize: '9px',
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline'
                    }}
                  >
                    Reset Approval
                  </button>
                </div>
              )}
            </div>
          )}
          {d.current.error && !loading && (
            <div className="nodrag" style={{ fontSize: 9, color: '#ef4444', padding: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word', userSelect: 'text', WebkitUserSelect: 'text' }}>{d.current.error}</div>
          )}
          {loading && (
            <>
              <NodeSpinner variant="music" />
              <div style={{ position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#b026ff', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                {progress}%
              </div>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0, gap: 6, padding: '4px 0' }}>
          <button onPointerDown={(e) => e.stopPropagation()} onClick={handleDebug} title="Inspect what will be sent to ComfyUI" style={{ ...btnBase, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', color: '#f59e0b', marginTop: 0, width: 'auto', padding: '3px 8px', fontSize: 8 }}>Inspect</button>
          <div style={{ position: 'relative', width: 20, height: 20, marginRight: -22, flexShrink: 0 }}>
            <Handle type="source" position={Position.Right} id="output-1" title="debug" isConnectableStart={true} style={{ position: 'absolute', right: -10, top: 0, width: 20, height: 20, background: '#63d4ff', border: '2px solid rgba(15,5,30,0.95)', transform: 'none', opacity: 0.4 }} />
            <div style={{ position: 'absolute', right: -10, top: 0, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3, pointerEvents: 'none', fontSize: 11, lineHeight: 1 }}>{'\uD83D\uDC1B'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <WorkflowGear nodeId={id} currentWf={d.current.workflow} defaultWf="ace_text2music_v2" category="text-to-audio" />
          <button onPointerDown={(e) => e.stopPropagation()} onClick={loading ? handleCancel : handleGenerate} style={{ ...btnBase, background: loading ? '#ef4444' : '#b026ff', marginTop: 0, width: 'auto', padding: '3px 8px' }}>
            {loading ? 'Cancel' : 'Generate'}
          </button>
        </div>
      </div>
    </BaseNode>
  );
});

const CoverGeneratorNode = React.memo(function CoverGeneratorNode({ data, id, selected }) {
  const [loading, setLoading] = useState(false);
  const cancelled = useRef(false);
  const d = useRef(data);
  d.current = data;

  const handleGenerate = async () => {
    cancelled.current = false;
    setLoading(true);
    useWorkflowStore.getState().updateNodeData(id, { isRunning: true, error: undefined });
    try {
      const inputs = getConnectedInputs(id);
      const res = await generateAudioCover({
        workflow: d.current.workflow || 'ace_audio_cover',
        audio_file: inputs.audioFileName || d.current.audioFileName || '',
        genre: inputs.genre || (Array.isArray(d.current.genre) ? d.current.genre.join(', ') : d.current.genre) || '',
        bpm: inputs.bpm || d.current.bpm || 120,
      });
      if (cancelled.current) return;
      useWorkflowStore.getState().updateNodeData(id, { audioUrl: res.audio_url || res.url || '', promptId: res.prompt_id || res.job_id || '', isRunning: false, error: undefined });
    } catch (err) {
      if (cancelled.current) return;
      useWorkflowStore.getState().updateNodeData(id, { error: err.message, isRunning: false });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    cancelled.current = true;
    setLoading(false);
    useWorkflowStore.getState().updateNodeData(id, { isRunning: false });
  };

  return (
    <BaseNode title="Cover Generator" color="#ec4899" isRunning={loading} selected={selected} nodeId={id} data={data} inputHandles={coverInputs} outputHandles={coverOut}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
        <div style={outputContainerBase}>
          {d.current.audioUrl && !loading && (
            <audio controls preload="metadata" style={{ width: '100%', height: 28 }} src={resolveUrl(d.current.audioUrl, useWorkflowStore.getState().projectPath)} />
          )}
          {d.current.error && !loading && (
            <div className="nodrag" style={{ fontSize: 9, color: '#ef4444', padding: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word', userSelect: 'text', WebkitUserSelect: 'text' }}>{d.current.error}</div>
          )}
          {loading && <NodeSpinner variant="cover" />}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <WorkflowGear nodeId={id} currentWf={d.current.workflow} defaultWf="ace_audio_cover" category="cover-audio" />
          <button onPointerDown={(e) => e.stopPropagation()} onClick={loading ? handleCancel : handleGenerate} style={{ ...btnBase, background: loading ? '#ef4444' : '#ec4899', marginTop: 0, width: 'auto', padding: '3px 8px' }}>
            {loading ? 'Cancel' : 'Generate Cover'}
          </button>
        </div>
      </div>
    </BaseNode>
  );
});

const TTSGeneratorNode = React.memo(function TTSGeneratorNode({ data, id, selected }) {
  const [loading, setLoading] = useState(false);
  const cancelled = useRef(false);
  const d = useRef(data);
  d.current = data;

  const handleGenerate = async () => {
    cancelled.current = false;
    setLoading(true);
    useWorkflowStore.getState().updateNodeData(id, { isRunning: true, error: undefined });
    try {
      const inputs = getConnectedInputs(id);
      const res = await generateTTS({
        text: inputs.text || d.current.text || '',
        language: inputs.language || d.current.language || 'en',
        voice: inputs.voice || d.current.voice || 'female_warm',
      });
      if (cancelled.current) return;
      useWorkflowStore.getState().updateNodeData(id, { audioUrl: res.audio_url || res.url || '', promptId: res.prompt_id || res.job_id || '', isRunning: false, error: undefined });
    } catch (err) {
      if (cancelled.current) return;
      useWorkflowStore.getState().updateNodeData(id, { error: err.message, isRunning: false });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    cancelled.current = true;
    setLoading(false);
    useWorkflowStore.getState().updateNodeData(id, { isRunning: false });
  };

  return (
    <BaseNode title="TTS Voiceover" color="#06b6d4" isRunning={loading} selected={selected} nodeId={id} data={data} inputHandles={ttsInputs} outputHandles={ttsOut}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
        <div style={labelBase}>Voice</div>
        <Select
          value={d.current.voice || 'female_warm'}
          onChange={(e) => useWorkflowStore.getState().updateNodeData(id, { voice: e.target.value })}
          options={VOICE_PRESETS.map((v) => ({ value: v.id, label: v.name }))}
        />
        <div style={outputContainerBase}>
          {d.current.audioUrl && (
            <div className="nodrag" style={outputAreaBase}>{d.current.audioUrl}</div>
          )}
          {d.current.error && !loading && (
            <div className="nodrag" style={{ fontSize: 9, color: '#ef4444', padding: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word', userSelect: 'text', WebkitUserSelect: 'text' }}>{d.current.error}</div>
          )}
          {loading && <NodeSpinner variant="tts" />}
        </div>
        <button onPointerDown={(e) => e.stopPropagation()} onClick={loading ? handleCancel : handleGenerate} style={{ ...btnBase, background: loading ? '#ef4444' : '#06b6d4', marginTop: 'auto' }}>
          {loading ? 'Cancel' : 'Generate Voiceover'}
        </button>
      </div>
    </BaseNode>
  );
});

const LLMTextGenNode = React.memo(function LLMTextGenNode({ data, id, selected }) {
  const [loading, setLoading] = useState(false);
  const cancelled = useRef(false);
  const d = useRef(data);
  d.current = data;

  const handleGenerate = async () => {
    cancelled.current = false;
    setLoading(true);
    useWorkflowStore.getState().updateNodeData(id, { isRunning: true, error: undefined });
    try {
      const inputs = getConnectedInputs(id);
      const audioFile = inputs.audioFile || d.current.audioFile || null;
      const audioFileName = inputs.audioFileName || d.current.audioFileName || '';
      if (!audioFile && !audioFileName) {
        useWorkflowStore.getState().updateNodeData(id, { error: 'No audio connected — connect an Audio File node', isRunning: false });
        setLoading(false);
        return;
      }
      let res;
      if (audioFile instanceof File) {
        const fd = new FormData();
        fd.append('type', 'llm_audio_analysis');
        fd.append('audio_file', audioFile);
        fd.append('prompt', d.current.prompt || '');
        fd.append('temperature', String(d.current.temperature ?? 0.7));
        fd.append('top_k', String(d.current.topK ?? 64));
        fd.append('top_p', String(d.current.topP ?? 0.95));
        fd.append('max_length', String(d.current.maxLength ?? 2048));
        const r = await fetch(`${API}/api/generate`, { method: 'POST', body: fd, headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(900000) });
        if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Request failed'); }
        res = await r.json();
      } else {
        res = await generateLLMAudioAnalysis({
          audio_path: audioFileName,
          prompt: d.current.prompt || '',
          temperature: d.current.temperature ?? 0.7,
          top_k: d.current.topK ?? 64,
          top_p: d.current.topP ?? 0.95,
          max_length: d.current.maxLength ?? 2048,
        });
      }
      if (cancelled.current) return;
      useWorkflowStore.getState().updateNodeData(id, {
        text: res.text || '',
        genre: res.genre || '',
        instruments: res.instruments || '',
        bpm: res.bpm || 0,
        keyscale: res.keyscale || '',
        mood: res.mood || '',
        isRunning: false,
        error: undefined,
      });
    } catch (err) {
      if (cancelled.current) return;
      useWorkflowStore.getState().updateNodeData(id, { error: err.message, isRunning: false });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    cancelled.current = true;
    setLoading(false);
    useWorkflowStore.getState().updateNodeData(id, { isRunning: false });
  };

  return (
    <BaseNode title="Audio Analyzer" color="#10b981" isRunning={loading} selected={selected} nodeId={id} data={data} inputHandles={llmTextGenInputs} outputHandles={llmTextGenOut}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
        <div style={labelBase}>Custom Prompt (optional)</div>
        <textarea
          className="nodrag"
          value={d.current.prompt || ''}
          onChange={(e) => useWorkflowStore.getState().updateNodeData(id, { prompt: e.target.value })}
          placeholder="Describe the audio in detail: genre, instruments, beat..."
          style={{ ...inputBase, resize: 'none', fontSize: 10, minHeight: 32, userSelect: 'text', WebkitUserSelect: 'text' }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={labelBase}>Max Length</div>
            <input type="number" min={64} max={4096} step={64} value={d.current.maxLength ?? 2048} onChange={(e) => useWorkflowStore.getState().updateNodeData(id, { maxLength: Number(e.target.value) })} style={inputBase} />
          </div>
        </div>
        {d.current.text && !loading && (
           <div className="nodrag" style={outputAreaBase}>{d.current.text}</div>
        )}
        {d.current.error && !loading && (
          <div style={{ fontSize: 9, color: '#ef4444', padding: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{d.current.error}</div>
        )}
        {loading && <NodeSpinner variant="prompt" />}
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexShrink: 0 }}>
          {loading ? (
            <button onClick={handleCancel} style={{ padding: '2px 7px', borderRadius: 4, border: 'none', background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          ) : (
            <button onClick={handleGenerate} style={{ padding: '2px 7px', borderRadius: 4, border: 'none', background: '#10b981', color: '#fff', fontSize: 9, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Analyze</button>
          )}
          {d.current.text && !loading && (
            <>
              <button onClick={handleGenerate} style={{ padding: '2px 7px', borderRadius: 4, border: 'none', background: '#10b981', color: '#fff', fontSize: 9, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Re-analyze</button>
              <button onClick={() => useWorkflowStore.getState().updateNodeData(id, { text: '' })} style={{ padding: '2px 7px', borderRadius: 4, border: 'none', background: 'rgba(239,68,68,0.6)', color: '#fff', fontSize: 9, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>
            </>
          )}
        </div>
      </div>
    </BaseNode>
  );
});

const PromptCreatorNode = React.memo(function PromptCreatorNode({ data, id, selected }) {
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [promptContent, setPromptContent] = useState('');
  const cancelled = useRef(false);
  const d = useRef(data);
  d.current = data;

  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === id));

  useEffect(() => {
    const fetchPromptsContent = async () => {
      if (d.current.prompts && typeof d.current.prompts === 'object' && d.current.prompts.outputs && d.current.prompts.outputs.length > 0) {
        const url = d.current.prompts.outputs[0];
        try {
          const res = await fetch(url);
          if (res.ok) {
            const text = await res.text();
            setPromptContent(text);
          }
        } catch (e) {
          console.error("Failed to fetch prompts content:", e);
        }
      } else if (typeof d.current.prompts === 'string') {
        setPromptContent(d.current.prompts);
      } else {
        setPromptContent('');
      }
    };
    fetchPromptsContent();
  }, [data.prompts]);

  const handleGenerate = async () => {
    cancelled.current = false;
    setLoading(true);
    useWorkflowStore.getState().updateNodeData(id, { isRunning: true, error: undefined });
    try {
      const inputs = getConnectedInputs(id);
      
      const lyricsText = inputs.lyrics || d.current.lyrics || '';
      const themeText = inputs.theme_style || d.current.theme_style || inputs.theme || d.current.theme || '';
      const storyText = inputs.story_concept || d.current.story_concept || inputs.story || d.current.story || '';
      const locationsText = inputs.subject_scenes || d.current.subject_scenes || '';

      const res = await generatePrompts({
        lyrics: lyricsText,
        theme_style: themeText,
        story_concept: storyText,
        subject_scenes: locationsText,
        language: inputs.whisperLanguage || d.current.whisperLanguage || 'auto',
        fps: inputs.fps ?? d.current.fps ?? 24,
        min_duration: inputs.minDuration ?? d.current.minDuration ?? 4,
        max_duration: inputs.maxDuration ?? d.current.maxDuration ?? 10,
        bias: inputs.bias ?? d.current.bias ?? 0.7,
        duration_preset: inputs.durationPreset || d.current.durationPreset || 'varied_no_repeat',
        use_srt: inputs.useSrt || d.current.useSrt || 'ON',
        llm_model: inputs.llmModel || d.current.llmModel || 'supergemma4-26b-uncensored-fast-v2-Q4_K_M.gguf',
      });
      if (cancelled.current) return;
      useWorkflowStore.getState().updateNodeData(id, { prompts: res.concepts || res.prompts || res, promptId: res.prompt_id || res.job_id || '', isRunning: false, error: undefined });
    } catch (err) {
      if (cancelled.current) return;
      useWorkflowStore.getState().updateNodeData(id, { error: err.message, isRunning: false });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTextFiles = async () => {
    setSaveLoading(true);
    setSaveMsg('');
    try {
      const inputs = getConnectedInputs(id);
      const lyricsText = inputs.lyrics || d.current.lyrics || '';
      const themeText = inputs.theme_style || d.current.theme_style || inputs.theme || d.current.theme || '';
      const storyText = inputs.story_concept || d.current.story_concept || inputs.story || d.current.story || '';
      const locationsText = inputs.subject_scenes || d.current.subject_scenes || '';

      const r = await fetch(`${API}/api/projects/save-inputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lyrics: lyricsText,
          theme_style: themeText,
          story_concept: storyText,
          subject_scenes: locationsText,
        }),
      });
      if (!r.ok) throw new Error('Save failed');
      setSaveMsg('Saved Successfully!');
    } catch (err) {
      setSaveMsg('Error: ' + err.message);
    } finally {
      setSaveLoading(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  const handleCancel = () => {
    cancelled.current = true;
    setLoading(false);
    useWorkflowStore.getState().updateNodeData(id, { isRunning: false });
  };

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

  return (
    <BaseNode title="Prompt Creator" color="#f59e0b" isRunning={loading} selected={selected} nodeId={id} data={data} inputHandles={promptInputs} outputHandles={promptOut} style={{ width: 280 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, width: '100%' }}>

        {/* Story inputs section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 6px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, border: '1px solid rgba(176,38,255,0.1)' }}>
          <div style={{ ...labelBase, fontSize: 9.5, color: '#f59e0b', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'normal', lineHeight: 1.4 }}>
            🔗 Connect Story, Style, & Locations nodes to override defaults
          </div>
        </div>

        {/* Save Text Files & Prompt Outputs container */}
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleSaveTextFiles}
            disabled={saveLoading}
            style={{
              ...btnBase,
              flex: 1,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              fontSize: '9.5px',
              padding: '6px 4px',
              boxShadow: '0 0 10px rgba(16,185,129,0.3)',
            }}
          >
            {saveLoading ? 'Saving...' : '💾 Save Text Files'}
          </button>
        </div>
        {saveMsg && (
          <div style={{ fontSize: 9.5, color: saveMsg.startsWith('Error') ? '#f87171' : '#34d399', textAlign: 'center', fontWeight: 'bold' }}>{saveMsg}</div>
        )}

        <div style={outputContainerBase}>
          {d.current.prompts && (
            <div className="nodrag" style={{ ...outputAreaBase, whiteSpace: 'pre-wrap', maxHeight: node?.height ? 'none' : 150, flex: 1 }}>
              {promptContent || (typeof d.current.prompts === 'string' ? d.current.prompts : JSON.stringify(d.current.prompts, null, 2))}
            </div>
          )}
          {d.current.prompts && d.current.prompts.outputs && d.current.prompts.outputs.map((url, idx) => (
            <a
              key={idx}
              href={url}
              target="_blank"
              rel="noreferrer"
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                fontSize: 9, color: '#63d4ff', textDecoration: 'underline', marginTop: 4, display: 'block', wordBreak: 'break-all', fontWeight: 600
              }}
            >
              🔗 View Prompt File ({url.substring(url.lastIndexOf('/') + 1)})
            </a>
          ))}
          {d.current.error && !loading && (
            <div className="nodrag" style={{ fontSize: 9, color: '#ef4444', padding: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word', userSelect: 'text', WebkitUserSelect: 'text' }}>{d.current.error}</div>
          )}
          {loading && <NodeSpinner variant="prompt" />}
        </div>

        <button onPointerDown={(e) => e.stopPropagation()} onClick={loading ? handleCancel : handleGenerate} style={{ ...btnBase, background: loading ? '#ef4444' : '#f59e0b', marginTop: 'auto', padding: '6px 0' }}>
          {loading ? 'Cancel' : 'Generate Prompts'}
        </button>
      </div>
    </BaseNode>
  );
});

const T2VGeneratorNode = React.memo(function T2VGeneratorNode({ data, id, selected }) {
  const [loading, setLoading] = useState(false);
  const cancelled = useRef(false);
  const d = useRef(data);
  d.current = data;

  const updateNodeData = (patch) => {
    useWorkflowStore.getState().updateNodeData(id, patch);
  };

  const handleGenerate = async () => {
    cancelled.current = false;
    setLoading(true);
    useWorkflowStore.getState().updateNodeData(id, { isRunning: true, error: undefined });
    try {
      const inputs = getConnectedInputs(id);
      
      let conceptsFile = undefined;
      if (inputs.prompts && typeof inputs.prompts === 'object') {
        const outputs = inputs.prompts.outputs || [];
        if (outputs.length > 0) {
          const url = outputs[0];
          conceptsFile = url.substring(url.lastIndexOf('/') + 1);
        }
      }

      const loraParams = {};
      for (let i = 1; i <= 20; i++) {
        const loraKey = `lora_${i}`;
        const strengthKey = `strength_${i}`;
        const zLoraKey = `z_image_lora_${i}`;
        const zStrengthKey = `z_image_strength_${i}`;
        if (inputs[loraKey] !== undefined || d.current[loraKey] !== undefined) {
          loraParams[loraKey] = inputs[loraKey] || d.current[loraKey];
        }
        if (inputs[strengthKey] !== undefined || d.current[strengthKey] !== undefined) {
          loraParams[strengthKey] = inputs[strengthKey] ?? d.current[strengthKey];
        }
        if (inputs[zLoraKey] !== undefined || d.current[zLoraKey] !== undefined) {
          loraParams[zLoraKey] = inputs[zLoraKey] || d.current[zLoraKey];
        }
        if (inputs[zStrengthKey] !== undefined || d.current[zStrengthKey] !== undefined) {
          loraParams[zStrengthKey] = inputs[zStrengthKey] ?? d.current[zStrengthKey];
        }
      }

      const allNodes = useWorkflowStore.getState().nodes;
      const musicNode = allNodes.find(n => n.type === 'MusicGeneratorNode' && n.data?.audioUrl);
      const audioFileNode = allNodes.find(n => n.type === 'AudioFileNode' && n.data?.audioUrl);
      const activeAudioUrl = musicNode?.data?.audioUrl || audioFileNode?.data?.audioUrl || d.current.audioUrl || '';
      const projectPath = useWorkflowStore.getState().projectPath;

      const res = await generateVideo({
        mode: 't2v',
        audio_path: activeAudioUrl,
        project_path: projectPath,
        prompts: inputs.prompt || (inputs.prompts && typeof inputs.prompts === 'string' ? inputs.prompts : '') || d.current.prompt || '',
        concepts_file: conceptsFile || inputs.concepts_file || d.current.concepts_file || undefined,
        fps: inputs.fps ?? d.current.fps ?? 24,
        resolution: inputs.resolution || d.current.resolution || '1024x576',
        width: inputs.width ?? d.current.width ?? 1024,
        height: inputs.height ?? d.current.height ?? 576,
        seed: inputs.seed ?? d.current.seed ?? -1,
        camera_motion: inputs.cameraMotion || d.current.cameraMotion || 'Static',
        // Model parameters
        ltx_gguf: inputs.ltx_gguf || d.current.ltx_gguf || 'VIDEO\\LTX\\ltx-2.3-22b-distilled-1.1-Q4_0.gguf',
        video_vae: inputs.video_vae || d.current.video_vae || 'LTX 2\\LTX23_video_vae_bf16.safetensors',
        gemma_clip: inputs.gemma_clip || d.current.gemma_clip || 'gemma-3-12b-it-abliterated-sikaworld-high-fidelity-edition.safetensors',
        text_projection: inputs.text_projection || d.current.text_projection || 'ltx-2.3_text_projection_bf16.safetensors',
        latent_upscaler: inputs.latent_upscaler || d.current.latent_upscaler || 'ltx-2.3-spatial-upscaler-x2-1.1.safetensors',
        audio_vae: inputs.audio_vae || d.current.audio_vae || 'LTX 2\\LTX23_audio_vae_bf16.safetensors',
        z_image_turbo: inputs.z_image_turbo || d.current.z_image_turbo || 'IMAGE\\Z_image_turbo_bf16.safetensors',
        z_image_clip: inputs.z_image_clip || d.current.z_image_clip || 'qwen_3_4b.safetensors',
        z_image_vae: inputs.z_image_vae || d.current.z_image_vae || 'ae.safetensors',
        supergemma_llm: inputs.supergemma_llm || d.current.supergemma_llm || 'supergemma4-26b-uncensored-fast-v2-Q4_K_M.gguf',
        // LoRAs
        use_custom_loras: inputs.use_custom_loras || d.current.use_custom_loras || 'OFF',
        lora_trigger_word: !!(inputs.lora_trigger_word ?? d.current.lora_trigger_word),
        lora_trigger_text: inputs.lora_trigger_text || d.current.lora_trigger_text || '',
        lora_count: inputs.lora_count ?? d.current.lora_count ?? 1,
        ltx_two_pass_mode: inputs.ltx_two_pass_mode || d.current.ltx_two_pass_mode || 'ON',
        use_z_image_loras: inputs.use_z_image_loras || d.current.use_z_image_loras || 'OFF',
        z_lora_trigger_word: !!(inputs.z_lora_trigger_word ?? d.current.z_lora_trigger_word),
        z_lora_trigger_text: inputs.z_lora_trigger_text || d.current.z_lora_trigger_text || '',
        z_image_lora_count: inputs.z_image_lora_count ?? d.current.z_image_lora_count ?? 1,
        ...loraParams,
        // Advanced Custom Lists
        advanced_enabled: !!(inputs.advanced_enabled ?? d.current.advanced_enabled),
        settings_count: inputs.settings_count ?? d.current.settings_count ?? 2,
        selection_mode_all: inputs.selection_mode_all || d.current.selection_mode_all || 'Index-based',
        camera_motion_list: inputs.camera_motion_list ?? d.current.camera_motion_list ?? 'Slow push-in\nTrack right\nTrack left\nDolly backward\nHandheld follow\nOver-the-shoulder push-in\nSlow pan right\nSlow pan left',
        character_motion_list: inputs.character_motion_list ?? d.current.character_motion_list ?? 'Walks toward camera with confident swagger\nStrides across the frame\nTurns head to look directly at lens',
        camera_motion_preset: inputs.camera_motion_preset || d.current.camera_motion_preset || 'Camera Motion',
        character_motion_preset: inputs.character_motion_preset || d.current.character_motion_preset || 'Character Movement/Motion',
        camera_motion_sel_mode: inputs.camera_motion_sel_mode || d.current.camera_motion_sel_mode || 'index',
        character_motion_sel_mode: inputs.character_motion_sel_mode || d.current.character_motion_sel_mode || 'index',
        camera_motion_items: inputs.camera_motion_items ?? d.current.camera_motion_items ?? 1,
        character_motion_items: inputs.character_motion_items ?? d.current.character_motion_items ?? 1,
        camera_motion_template: inputs.camera_motion_template || d.current.camera_motion_template || 'start with {item1} then follow with {item2}',
        character_motion_template: inputs.character_motion_template || d.current.character_motion_template || 'start with {item1} then follow with {item2}',
      });
      if (cancelled.current) return;
      useWorkflowStore.getState().updateNodeData(id, { videoUrl: res.video_url || res.url || '', promptId: res.prompt_id || res.job_id || '', isRunning: false, error: undefined });
    } catch (err) {
      if (cancelled.current) return;
      useWorkflowStore.getState().updateNodeData(id, { error: err.message, isRunning: false });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    cancelled.current = true;
    setLoading(false);
    useWorkflowStore.getState().updateNodeData(id, { isRunning: false });
  };

  return (
    <BaseNode title="Text-to-Video Generator" color="#6366f1" isRunning={loading} selected={selected} nodeId={id} data={data} inputHandles={t2vInputs} outputHandles={t2vOut}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, width: '100%', minWidth: 200 }} className="nodrag">
        <div style={labelBase}>Prompt Override (Optional)</div>
        <textarea value={d.current.prompt || ''} onChange={(e) => updateNodeData({ prompt: e.target.value })} placeholder="Describe the video (uses prompts from upstream by default)..." style={{ ...inputBase, resize: 'none', height: 75, userSelect: 'text', WebkitUserSelect: 'text' }} />
        
        <div style={labelBase}>Resolution Override</div>
        <Select
          value={d.current.resolution || '1024x576'}
          onChange={(e) => updateNodeData({ resolution: e.target.value })}
          options={['512x512', '768x768', '1024x576', '1024x1024', '1920x1080'].map((r) => ({ value: r, label: r }))}
        />

        <div style={outputContainerBase}>
          {d.current.videoUrl && (
            <div style={{ ...outputAreaBase, wordBreak: 'break-all', maxHeight: 45 }}>
              <a href={d.current.videoUrl} target="_blank" rel="noreferrer" style={{ color: '#63d4ff', textDecoration: 'underline' }}>
                🎬 Play Video ({d.current.videoUrl.substring(d.current.videoUrl.lastIndexOf('/') + 1)})
              </a>
            </div>
          )}
          {d.current.error && !loading && (
            <div style={{ fontSize: 9, color: '#ef4444', padding: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{d.current.error}</div>
          )}
          {loading && <NodeSpinner variant="video" />}
        </div>

        <button onPointerDown={(e) => e.stopPropagation()} onClick={loading ? handleCancel : handleGenerate} style={{ ...btnBase, background: loading ? '#ef4444' : '#6366f1', padding: '6px 0' }}>
          {loading ? 'Cancel' : 'Generate Video'}
        </button>
      </div>
    </BaseNode>
  );
});

const I2VGeneratorNode = React.memo(function I2VGeneratorNode({ data, id, selected }) {
  const [loading, setLoading] = useState(false);
  const cancelled = useRef(false);
  const d = useRef(data);
  d.current = data;

  const updateNodeData = (patch) => {
    useWorkflowStore.getState().updateNodeData(id, patch);
  };

  const handleGenerate = async () => {
    cancelled.current = false;
    setLoading(true);
    useWorkflowStore.getState().updateNodeData(id, { isRunning: true, error: undefined });
    try {
      const inputs = getConnectedInputs(id);
      
      let conceptsFile = undefined;
      if (inputs.prompts && typeof inputs.prompts === 'object') {
        const outputs = inputs.prompts.outputs || [];
        if (outputs.length > 0) {
          const url = outputs[0];
          conceptsFile = url.substring(url.lastIndexOf('/') + 1);
        }
      }

      const loraParams = {};
      for (let i = 1; i <= 20; i++) {
        const loraKey = `lora_${i}`;
        const strengthKey = `strength_${i}`;
        const zLoraKey = `z_image_lora_${i}`;
        const zStrengthKey = `z_image_strength_${i}`;
        if (inputs[loraKey] !== undefined || d.current[loraKey] !== undefined) {
          loraParams[loraKey] = inputs[loraKey] || d.current[loraKey];
        }
        if (inputs[strengthKey] !== undefined || d.current[strengthKey] !== undefined) {
          loraParams[strengthKey] = inputs[strengthKey] ?? d.current[strengthKey];
        }
        if (inputs[zLoraKey] !== undefined || d.current[zLoraKey] !== undefined) {
          loraParams[zLoraKey] = inputs[zLoraKey] || d.current[zLoraKey];
        }
        if (inputs[zStrengthKey] !== undefined || d.current[zStrengthKey] !== undefined) {
          loraParams[zStrengthKey] = inputs[zStrengthKey] ?? d.current[zStrengthKey];
        }
      }

      const allNodes = useWorkflowStore.getState().nodes;
      const musicNode = allNodes.find(n => n.type === 'MusicGeneratorNode' && n.data?.audioUrl);
      const audioFileNode = allNodes.find(n => n.type === 'AudioFileNode' && n.data?.audioUrl);
      const activeAudioUrl = musicNode?.data?.audioUrl || audioFileNode?.data?.audioUrl || d.current.audioUrl || '';
      const projectPath = useWorkflowStore.getState().projectPath;

      const res = await generateVideo({
        mode: 'i2v',
        audio_path: activeAudioUrl,
        project_path: projectPath,
        prompts: inputs.prompt || (inputs.prompts && typeof inputs.prompts === 'string' ? inputs.prompts : '') || d.current.prompt || '',
        concepts_file: conceptsFile || inputs.concepts_file || d.current.concepts_file || undefined,
        image: inputs.imageUrl || d.current.imageUrl || undefined,
        fps: inputs.fps ?? d.current.fps ?? 24,
        resolution: inputs.resolution || d.current.resolution || '1024x576',
        width: inputs.width ?? d.current.width ?? 1024,
        height: inputs.height ?? d.current.height ?? 576,
        seed: inputs.seed ?? d.current.seed ?? -1,
        camera_motion: inputs.cameraMotion || d.current.cameraMotion || 'Static',
        // Model parameters
        ltx_gguf: inputs.ltx_gguf || d.current.ltx_gguf || 'VIDEO\\LTX\\ltx-2.3-22b-distilled-1.1-Q4_0.gguf',
        video_vae: inputs.video_vae || d.current.video_vae || 'LTX 2\\LTX23_video_vae_bf16.safetensors',
        gemma_clip: inputs.gemma_clip || d.current.gemma_clip || 'gemma-3-12b-it-abliterated-sikaworld-high-fidelity-edition.safetensors',
        text_projection: inputs.text_projection || d.current.text_projection || 'ltx-2.3_text_projection_bf16.safetensors',
        latent_upscaler: inputs.latent_upscaler || d.current.latent_upscaler || 'ltx-2.3-spatial-upscaler-x2-1.1.safetensors',
        audio_vae: inputs.audio_vae || d.current.audio_vae || 'LTX 2\\LTX23_audio_vae_bf16.safetensors',
        z_image_turbo: inputs.z_image_turbo || d.current.z_image_turbo || 'IMAGE\\Z_image_turbo_bf16.safetensors',
        z_image_clip: inputs.z_image_clip || d.current.z_image_clip || 'qwen_3_4b.safetensors',
        z_image_vae: inputs.z_image_vae || d.current.z_image_vae || 'ae.safetensors',
        supergemma_llm: inputs.supergemma_llm || d.current.supergemma_llm || 'supergemma4-26b-uncensored-fast-v2-Q4_K_M.gguf',
        // LoRAs
        use_custom_loras: inputs.use_custom_loras || d.current.use_custom_loras || 'OFF',
        lora_trigger_word: !!(inputs.lora_trigger_word ?? d.current.lora_trigger_word),
        lora_trigger_text: inputs.lora_trigger_text || d.current.lora_trigger_text || '',
        lora_count: inputs.lora_count ?? d.current.lora_count ?? 1,
        ltx_two_pass_mode: inputs.ltx_two_pass_mode || d.current.ltx_two_pass_mode || 'ON',
        use_z_image_loras: inputs.use_z_image_loras || d.current.use_z_image_loras || 'OFF',
        z_lora_trigger_word: !!(inputs.z_lora_trigger_word ?? d.current.z_lora_trigger_word),
        z_lora_trigger_text: inputs.z_lora_trigger_text || d.current.z_lora_trigger_text || '',
        z_image_lora_count: inputs.z_image_lora_count ?? d.current.z_image_lora_count ?? 1,
        ...loraParams,
        // Advanced Custom Lists
        advanced_enabled: !!(inputs.advanced_enabled ?? d.current.advanced_enabled),
        settings_count: inputs.settings_count ?? d.current.settings_count ?? 2,
        selection_mode_all: inputs.selection_mode_all || d.current.selection_mode_all || 'Index-based',
        camera_motion_list: inputs.camera_motion_list ?? d.current.camera_motion_list ?? 'Slow push-in\nTrack right\nTrack left\nDolly backward\nHandheld follow\nOver-the-shoulder push-in\nSlow pan right\nSlow pan left',
        character_motion_list: inputs.character_motion_list ?? d.current.character_motion_list ?? 'Walks toward camera with confident swagger\nStrides across the frame\nTurns head to look directly at lens',
        camera_motion_preset: inputs.camera_motion_preset || d.current.camera_motion_preset || 'Camera Motion',
        character_motion_preset: inputs.character_motion_preset || d.current.character_motion_preset || 'Character Movement/Motion',
        camera_motion_sel_mode: inputs.camera_motion_sel_mode || d.current.camera_motion_sel_mode || 'index',
        character_motion_sel_mode: inputs.character_motion_sel_mode || d.current.character_motion_sel_mode || 'index',
        camera_motion_items: inputs.camera_motion_items ?? d.current.camera_motion_items ?? 1,
        character_motion_items: inputs.character_motion_items ?? d.current.character_motion_items ?? 1,
        camera_motion_template: inputs.camera_motion_template || d.current.camera_motion_template || 'start with {item1} then follow with {item2}',
        character_motion_template: inputs.character_motion_template || d.current.character_motion_template || 'start with {item1} then follow with {item2}',
      });
      if (cancelled.current) return;
      useWorkflowStore.getState().updateNodeData(id, { videoUrl: res.video_url || res.url || '', imageUrl: inputs.imageUrl || d.current.imageUrl || undefined, promptId: res.prompt_id || res.job_id || '', isRunning: false, error: undefined });
    } catch (err) {
      if (cancelled.current) return;
      useWorkflowStore.getState().updateNodeData(id, { error: err.message, isRunning: false });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    cancelled.current = true;
    setLoading(false);
    useWorkflowStore.getState().updateNodeData(id, { isRunning: false });
  };

  return (
    <BaseNode title="Image-to-Video Generator" color="#4f46e5" isRunning={loading} selected={selected} nodeId={id} data={data} inputHandles={i2vInputs} outputHandles={i2vOut}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, width: '100%', minWidth: 200 }} className="nodrag">
        <div style={labelBase}>Prompt Override (Optional)</div>
        <textarea value={d.current.prompt || ''} onChange={(e) => updateNodeData({ prompt: e.target.value })} placeholder="Describe the video (uses prompts from upstream by default)..." style={{ ...inputBase, resize: 'none', height: 75, userSelect: 'text', WebkitUserSelect: 'text' }} />
        
        <div style={labelBase}>Resolution Override</div>
        <Select
          value={d.current.resolution || '1024x576'}
          onChange={(e) => updateNodeData({ resolution: e.target.value })}
          options={['512x512', '768x768', '1024x576', '1024x1024', '1920x1080'].map((r) => ({ value: r, label: r }))}
        />

        <div style={outputContainerBase}>
          {d.current.videoUrl && (
            <div style={{ ...outputAreaBase, wordBreak: 'break-all', maxHeight: 45 }}>
              <a href={d.current.videoUrl} target="_blank" rel="noreferrer" style={{ color: '#63d4ff', textDecoration: 'underline' }}>
                🎬 Play Video ({d.current.videoUrl.substring(d.current.videoUrl.lastIndexOf('/') + 1)})
              </a>
            </div>
          )}
          {d.current.error && !loading && (
            <div style={{ fontSize: 9, color: '#ef4444', padding: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{d.current.error}</div>
          )}
          {loading && <NodeSpinner variant="video" />}
        </div>

        <button onPointerDown={(e) => e.stopPropagation()} onClick={loading ? handleCancel : handleGenerate} style={{ ...btnBase, background: loading ? '#ef4444' : '#4f46e5', padding: '6px 0' }}>
          {loading ? 'Cancel' : 'Generate Video'}
        </button>
      </div>
    </BaseNode>
  );
});

const VideoWorkflowSettingsNode = React.memo(function VideoWorkflowSettingsNode({ data, id, selected }) {
  const d = useRef(data);
  d.current = data;
  const [settingsTab, setSettingsTab] = useState('main');
  const updateNodeData = (patch) => {
    useWorkflowStore.getState().updateNodeData(id, patch);
  };

  const tabStyle = (active) => ({
    flex: 1,
    padding: '4px 0',
    textAlign: 'center',
    fontSize: 9,
    fontWeight: active ? 700 : 500,
    color: active ? '#c4b5fd' : '#8b8b9e',
    background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
    border: active ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
    borderRadius: 4,
    cursor: 'pointer',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    transition: 'all 0.15s ease',
  });

  const modelsSection = (
    <>
      <div>
        <div style={labelBase}>LTX GGUF Model</div>
        <Select
          value={d.current.ltx_gguf || 'VIDEO\\LTX\\ltx-2.3-22b-distilled-1.1-Q4_0.gguf'}
          onChange={(e) => updateNodeData({ ltx_gguf: e.target.value })}
          options={[
            { value: 'VIDEO\\LTX\\ltx-2.3-22b-distilled-1.1-Q4_0.gguf', label: 'ltx-2.3-22b-distilled-1.1-Q4_0.gguf' },
            { value: 'VIDEO\\LTX\\ltx-2.3-22b-distilled-1.1-Q3_K_M.gguf', label: 'ltx-2.3-22b-distilled-1.1-Q3_K_M.gguf' }
          ]}
        />
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={labelBase}>Video VAE</div>
          <Select
            value={d.current.video_vae || 'LTX 2\\LTX23_video_vae_bf16.safetensors'}
            onChange={(e) => updateNodeData({ video_vae: e.target.value })}
            options={[{ value: 'LTX 2\\LTX23_video_vae_bf16.safetensors', label: 'LTX23_video_vae_bf16.safetensors' }]}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelBase}>Gemma Clip</div>
          <Select
            value={d.current.gemma_clip || 'gemma-3-12b-it-abliterated-sikaworld-high-fidelity-edition.safetensors'}
            onChange={(e) => updateNodeData({ gemma_clip: e.target.value })}
            options={[
              { value: 'gemma-3-12b-it-abliterated-sikaworld-high-fidelity-edition.safetensors', label: 'gemma-3-12b-fidelity...' },
              { value: 'gemma4_e4b_it_fp8_scaled.safetensors', label: 'gemma4_e4b_it_fp8_scaled...' }
            ]}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={labelBase}>Text Projection</div>
          <Select
            value={d.current.text_projection || 'ltx-2.3_text_projection_bf16.safetensors'}
            onChange={(e) => updateNodeData({ text_projection: e.target.value })}
            options={[{ value: 'ltx-2.3_text_projection_bf16.safetensors', label: 'ltx-2.3_text_projection_bf16...' }]}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelBase}>Latent Upscaler</div>
          <Select
            value={d.current.latent_upscaler || 'ltx-2.3-spatial-upscaler-x2-1.1.safetensors'}
            onChange={(e) => updateNodeData({ latent_upscaler: e.target.value })}
            options={[{ value: 'ltx-2.3-spatial-upscaler-x2-1.1.safetensors', label: 'ltx-2.3-spatial-upscaler-x2...' }]}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={labelBase}>Audio VAE</div>
          <Select
            value={d.current.audio_vae || 'LTX 2\\LTX23_audio_vae_bf16.safetensors'}
            onChange={(e) => updateNodeData({ audio_vae: e.target.value })}
            options={[{ value: 'LTX 2\\LTX23_audio_vae_bf16.safetensors', label: 'LTX23_audio_vae_bf16...' }]}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelBase}>Z-Image Turbo</div>
          <Select
            value={d.current.z_image_turbo || 'IMAGE\\Z_image_turbo_bf16.safetensors'}
            onChange={(e) => updateNodeData({ z_image_turbo: e.target.value })}
            options={[{ value: 'IMAGE\\Z_image_turbo_bf16.safetensors', label: 'Z_image_turbo_bf16.safetensors' }]}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={labelBase}>Z-Image Clip</div>
          <Select
            value={d.current.z_image_clip || 'qwen_3_4b.safetensors'}
            onChange={(e) => updateNodeData({ z_image_clip: e.target.value })}
            options={[{ value: 'qwen_3_4b.safetensors', label: 'qwen_3_4b.safetensors' }]}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelBase}>Z-Image VAE</div>
          <Select
            value={d.current.z_image_vae || 'ae.safetensors'}
            onChange={(e) => updateNodeData({ z_image_vae: e.target.value })}
            options={[{ value: 'ae.safetensors', label: 'ae.safetensors' }]}
          />
        </div>
      </div>

      <div>
        <div style={labelBase}>SuperGemma LLM Model</div>
        <Select
          value={d.current.supergemma_llm || 'supergemma4-26b-uncensored-fast-v2-Q4_K_M.gguf'}
          onChange={(e) => updateNodeData({ supergemma_llm: e.target.value })}
          options={[{ value: 'supergemma4-26b-uncensored-fast-v2-Q4_K_M.gguf', label: 'supergemma4-26b-uncensored-fast-v2...' }]}
        />
      </div>
    </>
  );

  const mainSection = (
    <>
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={labelBase}>Use SRT Duration</div>
          <Select
            value={d.current.use_srt || 'ON'}
            onChange={(e) => updateNodeData({ use_srt: e.target.value })}
            options={[{ value: 'ON', label: 'ON' }, { value: 'OFF', label: 'OFF' }]}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelBase}>FPS</div>
          <input type="number" value={d.current.fps ?? 24} onChange={(e) => updateNodeData({ fps: Number(e.target.value) })} style={inputBase} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={labelBase}>Width</div>
          <input type="number" value={d.current.width ?? 1024} onChange={(e) => updateNodeData({ width: Number(e.target.value) })} style={inputBase} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={labelBase}>Height</div>
          <input type="number" value={d.current.height ?? 576} onChange={(e) => updateNodeData({ height: Number(e.target.value) })} style={inputBase} />
        </div>
      </div>

      <div>
        <div style={labelBase}>Seed</div>
        <input type="number" value={d.current.seed ?? -1} onChange={(e) => updateNodeData({ seed: Number(e.target.value) })} style={inputBase} />
      </div>
    </>
  );

  const remakeSection = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <input
          type="checkbox"
          id={`use_remake_folder_${id}`}
          checked={!!d.current.use_remake_folder}
          onChange={(e) => updateNodeData({ use_remake_folder: e.target.checked })}
          style={{ width: 14, height: 14, cursor: 'pointer' }}
        />
        <label htmlFor={`use_remake_folder_${id}`} style={{ ...labelBase, margin: 0, cursor: 'pointer', userSelect: 'none' }}>
          Use Remake Folder
        </label>
      </div>

      <div>
        <div style={labelBase}>Redo Prompt Number</div>
        <input
          type="number"
          value={d.current.redo_prompt_number ?? 0}
          onChange={(e) => updateNodeData({ redo_prompt_number: Number(e.target.value) })}
          style={inputBase}
          placeholder="0 (remake all in folder)"
        />
      </div>

      <div>
        <div style={labelBase}>Overwrite Mode</div>
        <Select
          value={d.current.overwrite_mode || 'backup'}
          onChange={(e) => updateNodeData({ overwrite_mode: e.target.value })}
          options={[
            { value: 'backup', label: 'Backup (Rename old)' },
            { value: 'overwrite', label: 'Overwrite' }
          ]}
        />
      </div>
    </>
  );

  return (
    <BaseNode title="Video Workflow Settings" color="#312e81" selected={selected} nodeId={id} data={data} outputHandles={videoWorkflowSettingsOut}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', flex: 1, minHeight: 0, minWidth: 200, maxHeight: 380, overflowY: 'auto', paddingRight: 4 }} className="nodrag">
        <div style={{ display: 'flex', gap: 4 }}>
          <div onPointerDown={(e) => e.stopPropagation()} onClick={() => setSettingsTab('main')} style={tabStyle(settingsTab === 'main')}>Settings</div>
          <div onPointerDown={(e) => e.stopPropagation()} onClick={() => setSettingsTab('models')} style={tabStyle(settingsTab === 'models')}>Models</div>
          <div onPointerDown={(e) => e.stopPropagation()} onClick={() => setSettingsTab('remake')} style={tabStyle(settingsTab === 'remake')}>Remake</div>
        </div>
        {settingsTab === 'main' && mainSection}
        {settingsTab === 'models' && modelsSection}
        {settingsTab === 'remake' && remakeSection}
      </div>
    </BaseNode>
  );
});

const LTXLoRASettingsNode = React.memo(function LTXLoRASettingsNode({ data, id, selected }) {
  const ltx = data.ltxLoraSettings || {};
  const [loras, setLoras] = useState(['[none]', 'ltx2\\LTX2.3_Soft_Enhance.safetensors']);

  const update = (patch) => {
    const next = { ...(data.ltxLoraSettings || {}), ...patch };
    data.onUpdate?.(id, { ltxLoraSettings: next });
  };

  useEffect(() => {
    fetchLoras()
      .then((res) => {
        if (res.status === 'ok' && Array.isArray(res.loras)) {
          const list = ['[none]', ...res.loras.filter(x => x !== '[none]')];
          setLoras(list);
        }
      })
      .catch((err) => console.error("Failed to load LTX LoRAs:", err));
  }, []);

  useEffect(() => {
    const defaults = {
      use_custom_loras: 'OFF',
      lora_trigger_word: false,
      lora_count: 1,
      ltx_two_pass_mode: 'ON',
      lora_1: '[none]',
      strength_1: 1.0,
    };
    let needsUpdate = false;
    const patch = {};
    for (const [key, val] of Object.entries(defaults)) {
      if (ltx[key] === undefined) {
        patch[key] = val;
        needsUpdate = true;
      }
    }
    if (needsUpdate) {
      const next = { ...ltx, ...patch };
      data.onUpdate?.(id, { ltxLoraSettings: next });
    }
  }, [id]);

  return (
    <BaseNode title="LTX LoRA Settings" color="#4c1d95" selected={selected} nodeId={id} data={data} outputHandles={ltxLoRASettingsOut} style={{ width: 280 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 4 }} className="nodrag">
        <div style={{ fontSize: 9.5, fontWeight: 'bold', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>LTX Optional LoRAs</div>
        <div style={{ fontSize: 8, color: '#a09bb5', marginTop: 2, marginBottom: 6, lineHeight: 1.3 }}>
          Pick optional model-only LoRAs. Image/style LoRAs can slow down motion during the first pass, so the workflow uses half strength then, full strength during upscale.
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ flex: 1 }}>
            <div style={labelBase}>Use Custom LoRAs</div>
            <Select
              value={ltx.use_custom_loras || 'OFF'}
              onChange={(e) => update({ use_custom_loras: e.target.value })}
              options={[{ value: 'ON', label: 'ON' }, { value: 'OFF', label: 'OFF' }]}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: '100%', marginTop: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9.5, color: '#b9b4d0', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!ltx.lora_trigger_word} onChange={(e) => update({ lora_trigger_word: e.target.checked })} style={{ cursor: 'pointer' }} />
              Use Trigger Word
            </label>
          </div>
        </div>

        {ltx.lora_trigger_word && (
          <div style={{ marginTop: 2, marginBottom: 4 }}>
            <div style={labelBase}>Trigger Word</div>
            <input
              type="text"
              placeholder="e.g. style, character..."
              value={ltx.lora_trigger_text || ''}
              onChange={(e) => update({ lora_trigger_text: e.target.value })}
              style={inputBase}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ flex: 1 }}>
            <div style={labelBase}>LoRA Count</div>
            <input type="number" min={1} max={20} value={ltx.lora_count ?? 1} onChange={(e) => update({ lora_count: Number(e.target.value) })} style={inputBase} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={labelBase}>LTX Two Pass Strength</div>
            <Select
              value={ltx.ltx_two_pass_mode || 'ON'}
              onChange={(e) => update({ ltx_two_pass_mode: e.target.value })}
              options={[{ value: 'ON', label: 'ON' }, { value: 'OFF', label: 'OFF' }]}
            />
          </div>
        </div>

        {Array.from({ length: ltx.lora_count ?? 1 }).map((_, idx) => {
          const num = idx + 1;
          const loraKey = `lora_${num}`;
          const strengthKey = `strength_${num}`;
          return (
            <div key={`ltx_lora_${num}`} style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <div style={{ flex: 2 }}>
                <div style={labelBase}>LoRA {num}</div>
                <Select
                  value={ltx[loraKey] || '[none]'}
                  onChange={(e) => update({ [loraKey]: e.target.value })}
                  options={loras.map((val) => ({ value: val, label: val }))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={labelBase}>Strength {num}</div>
                <input type="number" step={0.1} value={ltx[strengthKey] ?? 1.0} onChange={(e) => update({ [strengthKey]: Number(e.target.value) })} style={inputBase} />
              </div>
            </div>
          );
        })}
      </div>
    </BaseNode>
  );
});

const ZImageLoRASettingsNode = React.memo(function ZImageLoRASettingsNode({ data, id, selected }) {
  const zimg = data.zImageLoraSettings || {};
  const [loras, setLoras] = useState(['[none]', 'ltx2\\LTX2.3_Soft_Enhance.safetensors']);

  const update = (patch) => {
    const next = { ...(data.zImageLoraSettings || {}), ...patch };
    data.onUpdate?.(id, { zImageLoraSettings: next });
  };

  useEffect(() => {
    fetchLoras()
      .then((res) => {
        if (res.status === 'ok' && Array.isArray(res.loras)) {
          const list = ['[none]', ...res.loras.filter(x => x !== '[none]')];
          setLoras(list);
        }
      })
      .catch((err) => console.error("Failed to load Z-Image LoRAs:", err));
  }, []);

  useEffect(() => {
    const defaults = {
      use_z_image_loras: 'OFF',
      z_lora_trigger_word: false,
      z_image_lora_count: 1,
      z_image_lora_1: '[none]',
      z_image_strength_1: 0.7,
    };
    let needsUpdate = false;
    const patch = {};
    for (const [key, val] of Object.entries(defaults)) {
      if (zimg[key] === undefined) {
        patch[key] = val;
        needsUpdate = true;
      }
    }
    if (needsUpdate) {
      const next = { ...zimg, ...patch };
      data.onUpdate?.(id, { zImageLoraSettings: next });
    }
  }, [id]);

  return (
    <BaseNode title="Z-Image LoRA Settings" color="#7c3aed" selected={selected} nodeId={id} data={data} outputHandles={zImageLoRASettingsOut} style={{ width: 280 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', flex: 1, minHeight: 0, minWidth: 200, maxHeight: 350, overflowY: 'auto', paddingRight: 4 }} className="nodrag">
        <div style={{ fontSize: 9.5, fontWeight: 'bold', color: '#ff3bd4', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Z-Image Optional LoRA</div>
        <div style={{ fontSize: 8, color: '#a09bb5', marginTop: 2, marginBottom: 6, lineHeight: 1.3 }}>
          Optional LoRA for the Z-Image still-image branch. Selected LoRAs apply at the strength you enter (no two-pass).
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ flex: 1 }}>
            <div style={labelBase}>Use Z-Image LoRAs</div>
            <Select
              value={zimg.use_z_image_loras || 'OFF'}
              onChange={(e) => update({ use_z_image_loras: e.target.value })}
              options={[{ value: 'ON', label: 'ON' }, { value: 'OFF', label: 'OFF' }]}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: '100%', marginTop: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9.5, color: '#b9b4d0', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!zimg.z_lora_trigger_word} onChange={(e) => update({ z_lora_trigger_word: e.target.checked })} style={{ cursor: 'pointer' }} />
              Use Trigger Word
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ flex: 1 }}>
            <div style={labelBase}>Z-Image LoRA Count</div>
            <input type="number" min={1} max={20} value={zimg.z_image_lora_count ?? 1} onChange={(e) => update({ z_image_lora_count: Number(e.target.value) })} style={inputBase} />
          </div>
          <div style={{ flex: 1 }} />
        </div>

        {zimg.z_lora_trigger_word && (
          <div style={{ marginTop: 2, marginBottom: 4 }}>
            <div style={labelBase}>Z-Image Trigger Word</div>
            <input
              type="text"
              placeholder="e.g. style, character..."
              value={zimg.z_lora_trigger_text || ''}
              onChange={(e) => update({ z_lora_trigger_text: e.target.value })}
              style={inputBase}
            />
          </div>
        )}

        {Array.from({ length: zimg.z_image_lora_count ?? 1 }).map((_, idx) => {
          const num = idx + 1;
          const zLoraKey = `z_image_lora_${num}`;
          const zStrengthKey = `z_image_strength_${num}`;
          return (
            <div key={`z_lora_${num}`} style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <div style={{ flex: 2 }}>
                <div style={labelBase}>Z-Image LoRA {num}</div>
                <Select
                  value={zimg[zLoraKey] || '[none]'}
                  onChange={(e) => update({ [zLoraKey]: e.target.value })}
                  options={loras.map((val) => ({ value: val, label: val }))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={labelBase}>Strength {num}</div>
                <input type="number" step={0.1} value={zimg[zStrengthKey] ?? 0.7} onChange={(e) => update({ [zStrengthKey]: Number(e.target.value) })} style={inputBase} />
              </div>
            </div>
          );
        })}
      </div>
    </BaseNode>
  );
});

const VideoAdvancedSettingsNode = React.memo(function VideoAdvancedSettingsNode({ data, id, selected }) {
  const d = useRef(data);
  d.current = data;
  const updateNodeData = (patch) => {
    useWorkflowStore.getState().updateNodeData(id, patch);
  };
  const divider = <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', margin: '6px 0' }} />;

  return (
    <BaseNode title="Video Advanced Settings" color="#1e1b4b" selected={selected} nodeId={id} data={data} outputHandles={videoAdvancedSettingsOut}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', flex: 1, minHeight: 0, minWidth: 200, maxHeight: 350, overflowY: 'auto', paddingRight: 4 }} className="nodrag">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!d.current.advanced_enabled} onChange={(e) => updateNodeData({ advanced_enabled: e.target.checked })} style={{ cursor: 'pointer' }} />
            Enable Custom Prompt Lists
          </label>
        </div>

        {(d.current.advanced_enabled ?? true) && (
          <React.Fragment>
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={labelBase}>Settings Count</div>
                <input type="number" value={d.current.settings_count ?? 2} onChange={(e) => updateNodeData({ settings_count: Number(e.target.value) })} style={inputBase} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={labelBase}>Selection Mode (All)</div>
                <Select
                  value={d.current.selection_mode_all || 'Index-based'}
                  onChange={(e) => updateNodeData({ selection_mode_all: e.target.value })}
                  options={[{ value: 'Index-based', label: 'Index-based' }, { value: 'Random', label: 'Random' }]}
                />
              </div>
            </div>

            {divider}
            {/* 1. Camera Motion Category */}
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#63d4ff', marginBottom: 4 }}>1. Camera Motion</div>
              
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                <div style={{ flex: 1 }}>
                  <div style={labelBase}>Preset</div>
                  <Select
                    value={d.current.camera_motion_preset || 'Camera Motion'}
                    onChange={(e) => updateNodeData({ camera_motion_preset: e.target.value })}
                    options={[{ value: 'Camera Motion', label: 'Camera Motion' }]}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={labelBase}>Selection Mode</div>
                  <Select
                    value={d.current.camera_motion_sel_mode || 'index'}
                    onChange={(e) => updateNodeData({ camera_motion_sel_mode: e.target.value })}
                    options={[{ value: 'index', label: 'index' }]}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                <div style={{ flex: 1 }}>
                  <div style={labelBase}>Items / Prompt</div>
                  <input type="number" value={d.current.camera_motion_items ?? 1} onChange={(e) => updateNodeData({ camera_motion_items: Number(e.target.value) })} style={inputBase} />
                </div>
                <div style={{ flex: 2 }}>
                  <div style={labelBase}>Item Template</div>
                  <input type="text" value={d.current.camera_motion_template || 'start with {item1} then follow with {item2}'} onChange={(e) => updateNodeData({ camera_motion_template: e.target.value })} style={inputBase} />
                </div>
              </div>

              <div style={labelBase}>List (One entry per line)</div>
              <textarea value={d.current.camera_motion_list ?? 'Slow push-in\nTrack right\nTrack left\nDolly backward\nHandheld follow\nOver-the-shoulder push-in\nSlow pan right\nSlow pan left'} onChange={(e) => updateNodeData({ camera_motion_list: e.target.value })} style={{ ...inputBase, height: 60, resize: 'none' }} />
            </div>

            {divider}
            {/* 2. Character Movement Category */}
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#ff3bd4', marginBottom: 4 }}>2. Character Movement/Motion</div>
              
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                <div style={{ flex: 1 }}>
                  <div style={labelBase}>Preset</div>
                  <Select
                    value={d.current.character_motion_preset || 'Character Movement/Motion'}
                    onChange={(e) => updateNodeData({ character_motion_preset: e.target.value })}
                    options={[{ value: 'Character Movement/Motion', label: 'Character Movement/Motion' }]}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={labelBase}>Selection Mode</div>
                  <Select
                    value={d.current.character_motion_sel_mode || 'index'}
                    onChange={(e) => updateNodeData({ character_motion_sel_mode: e.target.value })}
                    options={[{ value: 'index', label: 'index' }]}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                <div style={{ flex: 1 }}>
                  <div style={labelBase}>Items / Prompt</div>
                  <input type="number" value={d.current.character_motion_items ?? 1} onChange={(e) => updateNodeData({ character_motion_items: Number(e.target.value) })} style={inputBase} />
                </div>
                <div style={{ flex: 2 }}>
                  <div style={labelBase}>Item Template</div>
                  <input type="text" value={d.current.character_motion_template || 'start with {item1} then follow with {item2}'} onChange={(e) => updateNodeData({ character_motion_template: e.target.value })} style={inputBase} />
                </div>
              </div>

              <div style={labelBase}>List (One entry per line)</div>
              <textarea value={d.current.character_motion_list ?? 'Walks toward camera with confident swagger\nStrides across the frame\nTurns head to look directly at lens'} onChange={(e) => updateNodeData({ character_motion_list: e.target.value })} style={{ ...inputBase, height: 60, resize: 'none' }} />
            </div>
          </React.Fragment>
        )}
      </div>
    </BaseNode>
  );
});

const ImageGeneratorNode = React.memo(function ImageGeneratorNode({ data, id, selected }) {
  const [loading, setLoading] = useState(false);
  const cancelled = useRef(false);
  const d = useRef(data);
  d.current = data;

  const handleGenerate = async () => {
    cancelled.current = false;
    setLoading(true);
    useWorkflowStore.getState().updateNodeData(id, { isRunning: true, error: undefined });
    try {
      const inputs = getConnectedInputs(id);
      const res = await generateVideo({
        mode: 't2i',
        prompts: inputs.prompt || d.current.prompt || '',
        width: d.current.width || 1024,
        height: d.current.height || 1024,
      });
      if (cancelled.current) return;
      useWorkflowStore.getState().updateNodeData(id, { imageUrl: res.image_url || res.url || '', promptId: res.prompt_id || res.job_id || '', isRunning: false, error: undefined });
    } catch (err) {
      if (cancelled.current) return;
      useWorkflowStore.getState().updateNodeData(id, { error: err.message, isRunning: false });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    cancelled.current = true;
    setLoading(false);
    useWorkflowStore.getState().updateNodeData(id, { isRunning: false });
  };

  return (
    <BaseNode title="Image Generator" color="#14b8a6" isRunning={loading} selected={selected} nodeId={id} data={data} inputHandles={imageInputs} outputHandles={imageOut}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
        <div style={labelBase}>Prompt</div>
        <textarea className="nodrag" value={d.current.prompt || ''} onChange={(e) => useWorkflowStore.getState().updateNodeData(id, { prompt: e.target.value })} placeholder="Describe the image..." style={{ ...inputBase, resize: 'none', flex: 1, minHeight: 0, userSelect: 'text', WebkitUserSelect: 'text' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={labelBase}>Width</div>
            <input type="number" min={256} max={2048} step={64} value={d.current.width || 1024} onChange={(e) => useWorkflowStore.getState().updateNodeData(id, { width: Number(e.target.value) })} style={inputBase} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={labelBase}>Height</div>
            <input type="number" min={256} max={2048} step={64} value={d.current.height || 1024} onChange={(e) => useWorkflowStore.getState().updateNodeData(id, { height: Number(e.target.value) })} style={inputBase} />
          </div>
        </div>
        <div style={outputContainerBase}>
          {d.current.imageUrl && (
            <div className="nodrag" style={outputAreaBase}>{d.current.imageUrl}</div>
          )}
          {d.current.error && !loading && (
            <div className="nodrag" style={{ fontSize: 9, color: '#ef4444', padding: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word', userSelect: 'text', WebkitUserSelect: 'text' }}>{d.current.error}</div>
          )}
          {loading && <NodeSpinner variant="image" />}
        </div>
        <button onPointerDown={(e) => e.stopPropagation()} onClick={loading ? handleCancel : handleGenerate} style={{ ...btnBase, background: loading ? '#ef4444' : '#14b8a6', marginTop: 'auto' }}>
          {loading ? 'Cancel' : 'Generate Image'}
        </button>
      </div>
    </BaseNode>
  );
});

function WorkflowGear({ nodeId, currentWf, defaultWf, category = 'text-to-audio' }) {
  const [open, setOpen] = React.useState(false);
  const [workflows, setWorkflows] = React.useState([]);
  const ref = React.useRef(null);
  const wf = currentWf || defaultWf;

  React.useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const res = await fetch(`${API}/api/workflows/category/${category}`);
        const data = await res.json();
        setWorkflows(data.workflows || []);
      } catch (err) {
        console.error('Failed to fetch workflows:', err);
      }
    };
    fetchWorkflows();
  }, [category]);

  React.useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => setOpen(!open)}
        style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 4, background: 'rgba(176,38,255,0.1)', fontSize: 9, userSelect: 'none' }}
        title="Select workflow"
      >
        ⚙
      </div>
      {open && (
        <div style={{
          position: 'absolute', bottom: 20, left: -4, zIndex: 100,
          background: '#1a0a2e', border: '1px solid rgba(176,38,255,0.3)',
          borderRadius: 8, padding: 4, minWidth: 220,
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        }}>
          {workflows.length === 0 ? (
            <div style={{ padding: '8px 10px', fontSize: 10, color: '#6b6880' }}>Loading...</div>
          ) : (
            workflows.map((opt) => (
              <div key={opt.name}
                onClick={() => { setOpen(false); useWorkflowStore.getState().updateNodeData(nodeId, { workflow: opt.name }); }}
                style={{
                  padding: '6px 10px', borderRadius: 4, cursor: 'pointer',
                  background: wf === opt.name ? 'rgba(176,38,255,0.15)' : 'transparent',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
                onMouseEnter={(e) => { if (wf !== opt.name) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={(e) => { if (wf !== opt.name) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: wf === opt.name ? '#b026ff' : 'transparent', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: wf === opt.name ? '#b026ff' : '#e0dce6' }}>
                    {opt.display_name || opt.name}
                    {opt.default && <span style={{ marginLeft: 6, fontSize: 9, color: '#22c55e' }}>DEFAULT</span>}
                  </div>
                  <div style={{ fontSize: 9, color: '#6b6880' }}>{opt.description || `${opt.node_count} nodes`}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const VideoAudioCombinerNode = React.memo(function VideoAudioCombinerNode({ data, id, selected }) {
  const [loading, setLoading] = useState(false);
  const cancelled = useRef(false);
  const d = useRef(data);
  d.current = data;

  const handleCombine = async () => {
    cancelled.current = false;
    setLoading(true);
    useWorkflowStore.getState().updateNodeData(id, { isRunning: true, error: undefined });
    try {
      const inputs = getConnectedInputs(id);
      const videoUrl = inputs.videoUrl || d.current.videoUrl || '';
      const audioUrl = inputs.audioUrl || d.current.audioUrl || '';
      
      if (!videoUrl || !audioUrl) {
        throw new Error('Missing video or audio input! Connect both to combine.');
      }
      
      const res = await combineVideoAudio(videoUrl, audioUrl);
      if (cancelled.current) return;
      useWorkflowStore.getState().updateNodeData(id, { videoUrl: res.video_url || res.url || '', isRunning: false, error: undefined });
    } catch (err) {
      if (cancelled.current) return;
      useWorkflowStore.getState().updateNodeData(id, { error: err.message, isRunning: false });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    cancelled.current = true;
    setLoading(false);
    useWorkflowStore.getState().updateNodeData(id, { isRunning: false });
  };

  return (
    <BaseNode title="Video & Audio Combiner" color="#10b981" isRunning={loading} selected={selected} nodeId={id} data={data} inputHandles={combinerInputs} outputHandles={combinerOut}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, width: '100%', minWidth: 200 }} className="nodrag">
        <div style={outputContainerBase}>
          {d.current.videoUrl && (
            <div style={{ ...outputAreaBase, wordBreak: 'break-all', maxHeight: 60 }}>
              <a href={d.current.videoUrl} target="_blank" rel="noreferrer" style={{ color: '#63d4ff', textDecoration: 'underline' }}>
                🎬 Play Combined ({d.current.videoUrl.substring(d.current.videoUrl.lastIndexOf('/') + 1)})
              </a>
            </div>
          )}
          {d.current.error && !loading && (
            <div style={{ fontSize: 9, color: '#ef4444', padding: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{d.current.error}</div>
          )}
          {loading && <NodeSpinner variant="video" />}
        </div>

        <button onPointerDown={(e) => e.stopPropagation()} onClick={loading ? handleCancel : handleCombine} style={{ ...btnBase, background: loading ? '#ef4444' : '#10b981', padding: '6px 0' }}>
          {loading ? 'Cancel' : 'Combine Video & Audio'}
        </button>
      </div>
    </BaseNode>
  );
});

export {
  getConnectedInputs,
  LyricsGeneratorNode,
  MusicGeneratorNode,
  CoverGeneratorNode,
  TTSGeneratorNode,
  LLMTextGenNode,
  PromptCreatorNode,
  T2VGeneratorNode,
  I2VGeneratorNode,
  VideoWorkflowSettingsNode,
  LTXLoRASettingsNode,
  ZImageLoRASettingsNode,
  VideoAdvancedSettingsNode,
  ImageGeneratorNode,
  VideoAudioCombinerNode,
};
