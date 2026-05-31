'use client';

import React, { useState, useCallback, useRef } from 'react';
import BaseNode, { inputBase, selectBase, labelBase, btnBase } from './BaseNode';
import { generateLyrics, generateText2Audio, generateAudioCover, generateTTS, generatePrompts, generateVideo } from '../../lib/api';

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

const SpinnerBtn = () => (
  <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'bv-spinner 0.7s linear infinite' }} />
);

const lyricsInputs = [
  { id: 'input-0', label: 'theme', icon: '\uD83C\uDFAD' },
  { id: 'input-1', label: 'genre', icon: '\uD83C\uDFB6' },
  { id: 'input-2', label: 'duration', icon: '\u23F1\uFE0F' },
];
const lyricsOut = [{ id: 'output-0', label: 'lyrics', icon: '\uD83D\uDCDD' }];

const musicInputs = [
  { id: 'input-0', label: 'lyrics', icon: '\uD83D\uDCDD' },
  { id: 'input-1', label: 'settings', icon: '\u2699\uFE0F' },
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

const LyricsGeneratorNode = React.memo(function LyricsGeneratorNode({ data, id, selected }) {
  const [loading, setLoading] = useState(false);
  const cancelled = useRef(false);

  const handleGenerate = useCallback(async () => {
    cancelled.current = false;
    setLoading(true);
    data.onUpdate?.(id, { isRunning: true });
    try {
      const res = await generateLyrics({
        theme: data.theme || '',
        structure: data.structure || 'Verse-Chorus',
        genre: Array.isArray(data.genre) ? data.genre.join(', ') : (data.genre || ''),
        language: data.language || 'en',
        duration: data.duration || 30,
      });
      if (cancelled.current) return;
      data.onUpdate?.(id, { lyrics: res.lyrics || res.text || '', isRunning: false });
    } catch (err) {
      if (cancelled.current) return;
      data.onUpdate?.(id, { error: err.message, isRunning: false });
    } finally {
      setLoading(false);
    }
  }, [data, id]);

  const handleCancel = useCallback(() => {
    cancelled.current = true;
    setLoading(false);
    data.onUpdate?.(id, { isRunning: false });
  }, [data, id]);

  return (
    <BaseNode title="Lyrics Generator" color="#a855f7" isRunning={loading} selected={selected} nodeId={id} data={data} inputHandles={lyricsInputs} outputHandles={lyricsOut}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
        <div style={labelBase}>Structure</div>
        <select
          value={data.structure || 'Verse-Chorus'}
          onChange={(e) => data.onUpdate?.(id, { structure: e.target.value })}
          style={selectBase}
        >
          {STRUCTURES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {data.lyrics && (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', fontSize: 10, color: '#b9b4d0', padding: 6, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(176,38,255,0.1)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {data.lyrics}
          </div>
        )}
        <button onClick={loading ? handleCancel : handleGenerate} style={{ ...btnBase, background: loading ? '#ef4444' : '#b026ff', marginTop: 'auto' }}>
          {loading ? <><SpinnerBtn /> Cancel</> : 'Generate Lyrics'}
        </button>
      </div>
    </BaseNode>
  );
});

const MusicGeneratorNode = React.memo(function MusicGeneratorNode({ data, id, selected }) {
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const cancelled = useRef(false);

  const handleGenerate = useCallback(async () => {
    cancelled.current = false;
    setLoading(true);
    data.onUpdate?.(id, { isRunning: true });
    try {
      const res = await generateText2Audio({
        lyrics: data.lyrics || '',
        genre: Array.isArray(data.genre) ? data.genre.join(', ') : (data.genre || ''),
        bpm: data.bpm || 120,
        duration: data.duration || 30,
        language: data.language || 'en',
        time_signature: data.timeSignature || '4/4',
        cfg_scale: data.cfgScale ?? 7,
        temperature: data.temperature ?? 1.0,
        steps: data.steps ?? 50,
        top_p: data.topP ?? 0.95,
        top_k: data.topK ?? 200,
        sampling_shift: data.samplingShift ?? 0,
      });
      if (cancelled.current) return;
      data.onUpdate?.(id, { audioUrl: res.audio_url || res.url || '', promptId: res.prompt_id || res.job_id || '', isRunning: false });
    } catch (err) {
      if (cancelled.current) return;
      data.onUpdate?.(id, { error: err.message, isRunning: false });
    } finally {
      setLoading(false);
    }
  }, [data, id]);

  const handleCancel = useCallback(() => {
    cancelled.current = true;
    setLoading(false);
    data.onUpdate?.(id, { isRunning: false });
  }, [data, id]);

  return (
    <BaseNode title="Music Generator" color="#b026ff" isRunning={loading} selected={selected} nodeId={id} data={data} inputHandles={musicInputs} outputHandles={musicOut}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
        <button onClick={() => setShowAdvanced(!showAdvanced)} style={{ ...btnBase, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(176,38,255,0.2)', fontSize: 9, padding: '3px 5px' }}>
          {showAdvanced ? 'Hide' : 'Show'} Advanced
        </button>
        {showAdvanced && (
          <>
            <div style={labelBase}>CFG Scale</div>
            <input type="number" step={0.5} value={data.cfgScale ?? 7} onChange={(e) => data.onUpdate?.(id, { cfgScale: Number(e.target.value) })} style={inputBase} />
            <div style={labelBase}>Temperature</div>
            <input type="number" step={0.1} min={0} max={2} value={data.temperature ?? 1.0} onChange={(e) => data.onUpdate?.(id, { temperature: Number(e.target.value) })} style={inputBase} />
            <div style={labelBase}>Steps</div>
            <input type="number" min={1} max={100} value={data.steps ?? 50} onChange={(e) => data.onUpdate?.(id, { steps: Number(e.target.value) })} style={inputBase} />
          </>
        )}
        <button onClick={loading ? handleCancel : handleGenerate} style={{ ...btnBase, background: loading ? '#ef4444' : '#b026ff', marginTop: 'auto' }}>
          {loading ? <><SpinnerBtn /> Cancel</> : 'Generate Music'}
        </button>
      </div>
    </BaseNode>
  );
});

const CoverGeneratorNode = React.memo(function CoverGeneratorNode({ data, id, selected }) {
  const [loading, setLoading] = useState(false);
  const cancelled = useRef(false);

  const handleGenerate = useCallback(async () => {
    cancelled.current = false;
    setLoading(true);
    data.onUpdate?.(id, { isRunning: true });
    try {
      const res = await generateAudioCover({
        audio_file: data.audioFileName || '',
        genre: Array.isArray(data.genre) ? data.genre.join(', ') : (data.genre || ''),
        bpm: data.bpm || 120,
      });
      if (cancelled.current) return;
      data.onUpdate?.(id, { audioUrl: res.audio_url || res.url || '', promptId: res.prompt_id || res.job_id || '', isRunning: false });
    } catch (err) {
      if (cancelled.current) return;
      data.onUpdate?.(id, { error: err.message, isRunning: false });
    } finally {
      setLoading(false);
    }
  }, [data, id]);

  const handleCancel = useCallback(() => {
    cancelled.current = true;
    setLoading(false);
    data.onUpdate?.(id, { isRunning: false });
  }, [data, id]);

  return (
    <BaseNode title="Cover Generator" color="#ec4899" isRunning={loading} selected={selected} nodeId={id} data={data} inputHandles={coverInputs} outputHandles={coverOut}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
        <button onClick={loading ? handleCancel : handleGenerate} style={{ ...btnBase, background: loading ? '#ef4444' : '#ec4899', marginTop: 'auto' }}>
          {loading ? <><SpinnerBtn /> Cancel</> : 'Generate Cover'}
        </button>
      </div>
    </BaseNode>
  );
});

const TTSGeneratorNode = React.memo(function TTSGeneratorNode({ data, id, selected }) {
  const [loading, setLoading] = useState(false);
  const cancelled = useRef(false);

  const handleGenerate = useCallback(async () => {
    cancelled.current = false;
    setLoading(true);
    data.onUpdate?.(id, { isRunning: true });
    try {
      const res = await generateTTS({
        text: data.text || '',
        language: data.language || 'en',
        voice: data.voice || 'female_warm',
      });
      if (cancelled.current) return;
      data.onUpdate?.(id, { audioUrl: res.audio_url || res.url || '', promptId: res.prompt_id || res.job_id || '', isRunning: false });
    } catch (err) {
      if (cancelled.current) return;
      data.onUpdate?.(id, { error: err.message, isRunning: false });
    } finally {
      setLoading(false);
    }
  }, [data, id]);

  const handleCancel = useCallback(() => {
    cancelled.current = true;
    setLoading(false);
    data.onUpdate?.(id, { isRunning: false });
  }, [data, id]);

  return (
    <BaseNode title="TTS Voiceover" color="#06b6d4" isRunning={loading} selected={selected} nodeId={id} data={data} inputHandles={ttsInputs} outputHandles={ttsOut}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
        <div style={labelBase}>Voice</div>
        <select value={data.voice || 'female_warm'} onChange={(e) => data.onUpdate?.(id, { voice: e.target.value })} style={selectBase}>
          {VOICE_PRESETS.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <button onClick={loading ? handleCancel : handleGenerate} style={{ ...btnBase, background: loading ? '#ef4444' : '#06b6d4', marginTop: 'auto' }}>
          {loading ? <><SpinnerBtn /> Cancel</> : 'Generate Voiceover'}
        </button>
      </div>
    </BaseNode>
  );
});

const PromptCreatorNode = React.memo(function PromptCreatorNode({ data, id, selected }) {
  const [loading, setLoading] = useState(false);
  const cancelled = useRef(false);

  const handleGenerate = useCallback(async () => {
    cancelled.current = false;
    setLoading(true);
    data.onUpdate?.(id, { isRunning: true });
    try {
      const res = await generatePrompts({
        lyrics: data.lyrics || '',
        story_concept: data.story || '',
        theme_style: data.theme || '',
      });
      if (cancelled.current) return;
      data.onUpdate?.(id, { prompts: res.concepts || res.prompts || res, promptId: res.prompt_id || res.job_id || '', isRunning: false });
    } catch (err) {
      if (cancelled.current) return;
      data.onUpdate?.(id, { error: err.message, isRunning: false });
    } finally {
      setLoading(false);
    }
  }, [data, id]);

  const handleCancel = useCallback(() => {
    cancelled.current = true;
    setLoading(false);
    data.onUpdate?.(id, { isRunning: false });
  }, [data, id]);

  return (
    <BaseNode title="Prompt Creator" color="#f59e0b" isRunning={loading} selected={selected} nodeId={id} data={data} inputHandles={promptInputs} outputHandles={promptOut}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
        <button onClick={loading ? handleCancel : handleGenerate} style={{ ...btnBase, background: loading ? '#ef4444' : '#f59e0b', marginTop: 'auto' }}>
          {loading ? <><SpinnerBtn /> Cancel</> : 'Generate Prompts'}
        </button>
      </div>
    </BaseNode>
  );
});

const VideoGeneratorNode = React.memo(function VideoGeneratorNode({ data, id, selected }) {
  const [loading, setLoading] = useState(false);
  const cancelled = useRef(false);

  const handleGenerate = useCallback(async () => {
    cancelled.current = false;
    setLoading(true);
    data.onUpdate?.(id, { isRunning: true });
    try {
      const mode = data.mode || 't2v';
      const res = await generateVideo({
        mode,
        prompts: data.prompt || '',
        image: data.imageUrl || undefined,
        fps: data.fps || 24,
        resolution: data.resolution || '1024x576',
        seed: data.seed ?? -1,
        camera_motion: data.cameraMotion || 'Static',
      });
      if (cancelled.current) return;
      data.onUpdate?.(id, { videoUrl: res.video_url || res.url || '', promptId: res.prompt_id || res.job_id || '', isRunning: false });
    } catch (err) {
      if (cancelled.current) return;
      data.onUpdate?.(id, { error: err.message, isRunning: false });
    } finally {
      setLoading(false);
    }
  }, [data, id]);

  const handleCancel = useCallback(() => {
    cancelled.current = true;
    setLoading(false);
    data.onUpdate?.(id, { isRunning: false });
  }, [data, id]);

  const mode = data.mode || 't2v';

  return (
    <BaseNode title="Video Generator" color="#6366f1" isRunning={loading} selected={selected} nodeId={id} data={data} inputHandles={videoInputs} outputHandles={videoOut}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {['t2v', 'i2v'].map((m) => (
            <button key={m} onClick={() => data.onUpdate?.(id, { mode: m })} style={{
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
        <textarea value={data.prompt || ''} onChange={(e) => data.onUpdate?.(id, { prompt: e.target.value })} placeholder="Describe the video..." style={{ ...inputBase, resize: 'none', flex: 1, minHeight: 0 }} />
        <div style={labelBase}>Resolution</div>
        <select value={data.resolution || '1024x576'} onChange={(e) => data.onUpdate?.(id, { resolution: e.target.value })} style={selectBase}>
          {['512x512', '768x768', '1024x576', '1024x1024', '1920x1080'].map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button onClick={loading ? handleCancel : handleGenerate} style={{ ...btnBase, background: loading ? '#ef4444' : '#6366f1', marginTop: 'auto' }}>
          {loading ? <><SpinnerBtn /> Cancel</> : 'Generate Video'}
        </button>
      </div>
    </BaseNode>
  );
});

const ImageGeneratorNode = React.memo(function ImageGeneratorNode({ data, id, selected }) {
  const [loading, setLoading] = useState(false);
  const cancelled = useRef(false);

  const handleGenerate = useCallback(async () => {
    cancelled.current = false;
    setLoading(true);
    data.onUpdate?.(id, { isRunning: true });
    try {
      const res = await generateVideo({
        mode: 't2i',
        prompts: data.prompt || '',
        width: data.width || 1024,
        height: data.height || 1024,
      });
      if (cancelled.current) return;
      data.onUpdate?.(id, { imageUrl: res.image_url || res.url || '', promptId: res.prompt_id || res.job_id || '', isRunning: false });
    } catch (err) {
      if (cancelled.current) return;
      data.onUpdate?.(id, { error: err.message, isRunning: false });
    } finally {
      setLoading(false);
    }
  }, [data, id]);

  const handleCancel = useCallback(() => {
    cancelled.current = true;
    setLoading(false);
    data.onUpdate?.(id, { isRunning: false });
  }, [data, id]);

  return (
    <BaseNode title="Image Generator" color="#14b8a6" isRunning={loading} selected={selected} nodeId={id} data={data} inputHandles={imageInputs} outputHandles={imageOut}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
        <div style={labelBase}>Prompt</div>
        <textarea value={data.prompt || ''} onChange={(e) => data.onUpdate?.(id, { prompt: e.target.value })} placeholder="Describe the image..." style={{ ...inputBase, resize: 'none', flex: 1, minHeight: 0 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={labelBase}>Width</div>
            <input type="number" min={256} max={2048} step={64} value={data.width || 1024} onChange={(e) => data.onUpdate?.(id, { width: Number(e.target.value) })} style={inputBase} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={labelBase}>Height</div>
            <input type="number" min={256} max={2048} step={64} value={data.height || 1024} onChange={(e) => data.onUpdate?.(id, { height: Number(e.target.value) })} style={inputBase} />
          </div>
        </div>
        <button onClick={loading ? handleCancel : handleGenerate} style={{ ...btnBase, background: loading ? '#ef4444' : '#14b8a6', marginTop: 'auto' }}>
          {loading ? <><SpinnerBtn /> Cancel</> : 'Generate Image'}
        </button>
      </div>
    </BaseNode>
  );
});

export {
  LyricsGeneratorNode,
  MusicGeneratorNode,
  CoverGeneratorNode,
  TTSGeneratorNode,
  PromptCreatorNode,
  VideoGeneratorNode,
  ImageGeneratorNode,
};
