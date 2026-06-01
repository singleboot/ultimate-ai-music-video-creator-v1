'use client';

import React, { useState, useRef, useEffect } from 'react';
import BaseNode, { inputBase, labelBase, btnBase, Select } from './BaseNode';
import { generateLyrics, generateText2Audio, generateAudioCover, generateTTS, generatePrompts, generateVideo, generateLLMAudioAnalysis } from '../../lib/api';
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
  const inputs = {};
  for (const edge of incoming) {
    const src = map[edge.source];
    if (src) Object.assign(inputs, src.data);
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
  { id: 'input-2', label: 'duration', icon: '\u23F1\uFE0F' },
  { id: 'input-3', label: 'language', icon: '\uD83C\uDF10' },
];
const lyricsOut = [{ id: 'output-0', label: 'lyrics', icon: '\uD83D\uDCDD' }];

const musicInputs = [
  { id: 'input-0', label: 'params', icon: '\u2699\uFE0F' },
];
const musicOut = [{ id: 'output-0', label: 'audio', icon: '\uD83C\uDFB5' }];

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
  { id: 'input-0', label: 'lyrics', icon: '\uD83D\uDCDD' },
  { id: 'input-1', label: 'theme', icon: '\uD83C\uDFAD' },
  { id: 'input-2', label: 'story', icon: '\uD83D\uDCD6' },
];
const promptOut = [{ id: 'output-0', label: 'prompts', icon: '\u2728' }];

const videoInputs = [
  { id: 'input-0', label: 'prompts', icon: '\u2728' },
  { id: 'input-1', label: 'image', icon: '\uD83D\uDDBC\uFE0F' },
];
const videoOut = [{ id: 'output-0', label: 'video', icon: '\uD83C\uDFAC' }];

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
};

const outputContainerBase = {
  position: 'relative', flex: 1, minHeight: 0, borderRadius: 8, overflow: 'hidden',
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
              value={data.lyrics}
              onChange={(e) => useWorkflowStore.getState().updateNodeData(id, { lyrics: e.target.value })}
              style={{
                ...inputBase,
                resize: 'none', width: '100%', height: '100%',
                fontSize: 10, lineHeight: 1.6,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                fontFamily: 'monospace',
                borderRadius: 8, boxSizing: 'border-box',
              }}
            />
          </div>
        )}
        {data.debug && !loading && (
          <div style={{ fontSize: 9, color: '#93c5fd', padding: 4 }}>{data.debug}</div>
        )}
        {(data.error) && !loading && (
          <div style={{ fontSize: 9, color: '#ef4444', padding: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{data.error}</div>
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
      const baseGenre = inputs.genre || (Array.isArray(d.current.genre) ? d.current.genre.join(', ') : d.current.genre) || '';
      const instruments = inputs.instruments || d.current.instruments || '';
      const genre = instruments ? `${baseGenre} : ${instruments}` : baseGenre;
      const res = await generateText2Audio({
          workflow: d.current.workflow || 'ace_text2music_v2',
        lyrics: inputs.lyrics || d.current.lyrics || '',
        genre,
        bpm: inputs.bpm || d.current.bpm || 120,
        duration: inputs.duration || d.current.duration || 30,
        language: inputs.language || d.current.language || 'en',
        time_signature: (d.current.timeSignature || '4/4').split('/')[0],
        cfg_scale: d.current.cfgScale ?? 7,
        temperature: d.current.temperature ?? 1.0,
        steps: d.current.steps ?? 30,
        top_p: d.current.topP ?? 0.95,
        top_k: d.current.topK ?? 0,
        sampling_shift: d.current.samplingShift ?? 0,
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

  return (
    <BaseNode title="Music Generator" color="#b026ff" isRunning={loading} selected={selected} nodeId={id} data={data} inputHandles={musicInputs} outputHandles={musicOut}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
        {showAdvanced && (
          <>
            <div style={labelBase}>CFG Scale</div>
            <input type="number" step={0.5} value={d.current.cfgScale ?? 7} onChange={(e) => useWorkflowStore.getState().updateNodeData(id, { cfgScale: Number(e.target.value) })} style={inputBase} />
            <div style={labelBase}>Temperature</div>
            <input type="number" step={0.1} min={0} max={2} value={d.current.temperature ?? 1.0} onChange={(e) => useWorkflowStore.getState().updateNodeData(id, { temperature: Number(e.target.value) })} style={inputBase} />
            <div style={labelBase}>Steps</div>
            <input type="number" min={1} max={100} value={d.current.steps ?? 30} onChange={(e) => useWorkflowStore.getState().updateNodeData(id, { steps: Number(e.target.value) })} style={inputBase} />
          </>
        )}
        <div style={outputContainerBase}>
          {d.current.audioUrl && !loading && (
            <audio controls preload="metadata" style={{ width: '100%', height: 28 }} src={d.current.audioUrl} />
          )}
          {d.current.error && !loading && (
            <div style={{ fontSize: 9, color: '#ef4444', padding: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{d.current.error}</div>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <WorkflowGear nodeId={id} currentWf={d.current.workflow} defaultWf="ace_text2music_v2" category="text-to-audio" />
          <button onPointerDown={(e) => e.stopPropagation()} onClick={loading ? handleCancel : handleGenerate} style={{ ...btnBase, background: loading ? '#ef4444' : '#b026ff', marginTop: 0, width: 'auto', padding: '3px 8px' }}>
            {loading ? 'Cancel' : 'Generate Music'}
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
            <audio controls preload="metadata" style={{ width: '100%', height: 28 }} src={d.current.audioUrl} />
          )}
          {d.current.error && !loading && (
            <div style={{ fontSize: 9, color: '#ef4444', padding: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{d.current.error}</div>
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
            <div style={outputAreaBase}>{d.current.audioUrl}</div>
          )}
          {d.current.error && !loading && (
            <div style={{ fontSize: 9, color: '#ef4444', padding: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{d.current.error}</div>
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
        const r = await fetch(`${API}/api/generate`, { method: 'POST', body: fd, headers: { 'Accept': 'application/json' } });
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
          value={d.current.prompt || ''}
          onChange={(e) => useWorkflowStore.getState().updateNodeData(id, { prompt: e.target.value })}
          placeholder="Describe the audio in detail: genre, instruments, beat..."
          style={{ ...inputBase, resize: 'none', fontSize: 10, minHeight: 32 }}
        />
        {d.current.text && !loading && (
          <div style={outputAreaBase}>{d.current.text}</div>
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
  const cancelled = useRef(false);
  const d = useRef(data);
  d.current = data;

  const handleGenerate = async () => {
    cancelled.current = false;
    setLoading(true);
    useWorkflowStore.getState().updateNodeData(id, { isRunning: true, error: undefined });
    try {
      const inputs = getConnectedInputs(id);
      const res = await generatePrompts({
        lyrics: inputs.lyrics || d.current.lyrics || '',
        story_concept: inputs.story || d.current.story || '',
        theme_style: inputs.theme || d.current.theme || '',
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

  const handleCancel = () => {
    cancelled.current = true;
    setLoading(false);
    useWorkflowStore.getState().updateNodeData(id, { isRunning: false });
  };

  return (
    <BaseNode title="Prompt Creator" color="#f59e0b" isRunning={loading} selected={selected} nodeId={id} data={data} inputHandles={promptInputs} outputHandles={promptOut}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
        <div style={outputContainerBase}>
          {d.current.prompts && (
            <div style={outputAreaBase}>
              {typeof d.current.prompts === 'string' ? d.current.prompts : JSON.stringify(d.current.prompts, null, 2)}
            </div>
          )}
          {d.current.error && !loading && (
            <div style={{ fontSize: 9, color: '#ef4444', padding: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{d.current.error}</div>
          )}
          {loading && <NodeSpinner variant="prompt" />}
        </div>
        <button onPointerDown={(e) => e.stopPropagation()} onClick={loading ? handleCancel : handleGenerate} style={{ ...btnBase, background: loading ? '#ef4444' : '#f59e0b', marginTop: 'auto' }}>
          {loading ? 'Cancel' : 'Generate Prompts'}
        </button>
      </div>
    </BaseNode>
  );
});

const VideoGeneratorNode = React.memo(function VideoGeneratorNode({ data, id, selected }) {
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
      const mode = d.current.mode || 't2v';
      const res = await generateVideo({
        mode,
        prompts: inputs.prompt || d.current.prompt || '',
        image: inputs.imageUrl || d.current.imageUrl || undefined,
        fps: d.current.fps || 24,
        resolution: d.current.resolution || '1024x576',
        seed: d.current.seed ?? -1,
        camera_motion: d.current.cameraMotion || 'Static',
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

  const mode = d.current.mode || 't2v';

  return (
    <BaseNode title="Video Generator" color="#6366f1" isRunning={loading} selected={selected} nodeId={id} data={data} inputHandles={videoInputs} outputHandles={videoOut}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {['t2v', 'i2v'].map((m) => (
            <button key={m} onPointerDown={(e) => e.stopPropagation()} onClick={() => useWorkflowStore.getState().updateNodeData(id, { mode: m })} style={{
              flex: 1, padding: '5px 0', borderRadius: 8,
              border: `1px solid ${mode === m ? '#6366f1' : 'rgba(176,38,255,0.2)'}`,
              background: mode === m ? '#6366f130' : 'rgba(255,255,255,0.03)',
              color: mode === m ? '#fff' : '#b9b4d0',
              fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
            }}>
              {m.toUpperCase()}
            </button>
          ))}
        </div>
        <div style={labelBase}>Prompt</div>
        <textarea value={d.current.prompt || ''} onChange={(e) => useWorkflowStore.getState().updateNodeData(id, { prompt: e.target.value })} placeholder="Describe the video..." style={{ ...inputBase, resize: 'none', flex: 1, minHeight: 0 }} />
        <div style={labelBase}>Resolution</div>
        <Select
          value={d.current.resolution || '1024x576'}
          onChange={(e) => useWorkflowStore.getState().updateNodeData(id, { resolution: e.target.value })}
          options={['512x512', '768x768', '1024x576', '1024x1024', '1920x1080'].map((r) => ({ value: r, label: r }))}
        />
        <div style={outputContainerBase}>
          {d.current.videoUrl && (
            <div style={outputAreaBase}>{d.current.videoUrl}</div>
          )}
          {d.current.error && !loading && (
            <div style={{ fontSize: 9, color: '#ef4444', padding: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{d.current.error}</div>
          )}
          {loading && <NodeSpinner variant="video" />}
        </div>
        <button onPointerDown={(e) => e.stopPropagation()} onClick={loading ? handleCancel : handleGenerate} style={{ ...btnBase, background: loading ? '#ef4444' : '#6366f1', marginTop: 'auto' }}>
          {loading ? 'Cancel' : 'Generate Video'}
        </button>
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
        <textarea value={d.current.prompt || ''} onChange={(e) => useWorkflowStore.getState().updateNodeData(id, { prompt: e.target.value })} placeholder="Describe the image..." style={{ ...inputBase, resize: 'none', flex: 1, minHeight: 0 }} />
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
            <div style={outputAreaBase}>{d.current.imageUrl}</div>
          )}
          {d.current.error && !loading && (
            <div style={{ fontSize: 9, color: '#ef4444', padding: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{d.current.error}</div>
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

export {
  LyricsGeneratorNode,
  MusicGeneratorNode,
  CoverGeneratorNode,
  TTSGeneratorNode,
  LLMTextGenNode,
  PromptCreatorNode,
  VideoGeneratorNode,
  ImageGeneratorNode,
};
