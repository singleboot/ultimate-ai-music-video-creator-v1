'use client';

import React, { useRef, useState, useEffect } from 'react';
import BaseNode, { labelBase } from './BaseNode';
import useWorkflowStore from '../../store/workflowStore';
import { resolveUrl } from '../../lib/api';

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

const audioIn = [{ id: 'input-0', label: 'audio', icon: '\uD83C\uDFB5' }];
const videoIn = [{ id: 'input-0', label: 'video', icon: '\uD83C\uDFAC' }];
const imageIn = [{ id: 'input-0', label: 'image', icon: '\uD83D\uDDBC\uFE0F' }];
const textIn = [{ id: 'input-0', label: 'text/lyrics', icon: '\uD83D\uDCDD' }];

const AudioPlayerNode = React.memo(function AudioPlayerNode({ data, id, selected }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const projectPath = useWorkflowStore((s) => s.projectPath);
  const connected = getConnectedInputs(id);
  const audioUrl = connected.audioUrl || data.audioUrl || '';
  const url = resolveUrl(audioUrl, projectPath);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => { setCur(a.currentTime); setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0); };
    const onMeta = () => setDur(a.duration);
    const onEnd = () => { setPlaying(false); setProgress(0); setCur(0); };
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('ended', onEnd);
    return () => { a.removeEventListener('timeupdate', onTime); a.removeEventListener('loadedmetadata', onMeta); a.removeEventListener('ended', onEnd); };
  }, [audioUrl]);

  const toggle = () => { const a = audioRef.current; if (!a) return; if (playing) a.pause(); else a.play(); setPlaying(!playing); };
  const fmt = (t) => { const m = Math.floor(t / 60); const s = Math.floor(t % 60); return `${m}:${String(s).padStart(2, '0')}`; };

  return (
    <BaseNode title="Audio Player" color="#b026ff" selected={selected} nodeId={id} data={data} inputHandles={audioIn} hasOutput={false}>
      <audio ref={audioRef} src={url} preload="metadata" />
      {url ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, justifyContent: 'center' }}>
          <div onClick={(e) => { if (!audioRef.current) return; const rect = e.currentTarget.getBoundingClientRect(); const pct = (e.clientX - rect.left) / rect.width; audioRef.current.currentTime = pct * audioRef.current.duration; }} style={{ height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(176,38,255,0.15)', cursor: 'pointer', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #b026ff, #ff3bd4)', borderRadius: 8, transition: 'width 0.1s linear' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button onClick={toggle} style={{ width: 16, height: 16, borderRadius: '50%', border: 'none', background: '#b026ff', color: '#fff', fontSize: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {playing ? '\u275A\u275A' : '\u25B6'}
            </button>
            <span style={{ fontSize: 11, color: '#b9b4d0', fontFamily: 'monospace' }}>{fmt(cur)} / {fmt(dur)}</span>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: '#6b6880', fontSize: 11, padding: 12 }}>No audio connected</div>
      )}
    </BaseNode>
  );
});

const VideoPlayerNode = React.memo(function VideoPlayerNode({ data, id, selected }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const projectPath = useWorkflowStore((s) => s.projectPath);
  const connected = getConnectedInputs(id);
  const videoUrl = connected.videoUrl || data.videoUrl || connected.video || data.video || '';
  const url = resolveUrl(videoUrl, projectPath);
  const toggle = () => { const v = videoRef.current; if (!v) return; if (playing) v.pause(); else v.play(); setPlaying(!playing); };

  return (
    <BaseNode title="Video Player" color="#6366f1" selected={selected} nodeId={id} data={data} inputHandles={videoIn} hasOutput={false}>
      {url ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
          <div style={{ borderRadius: 10, overflow: 'hidden', background: '#000', position: 'relative', flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video ref={videoRef} src={url} style={{ width: '100%', height: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', borderRadius: 10 }} controls={false} onClick={toggle} />
            {!playing && (
              <button onClick={toggle} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(99,102,241,0.85)', color: '#fff', fontSize: 11, cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
                {'\u25B6'}
              </button>
            )}
          </div>
          <button onClick={toggle} style={{ padding: '3px 0', borderRadius: 4, border: 'none', background: '#6366f1', color: '#fff', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
            {playing ? 'Pause' : 'Play'}
          </button>
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: '#6b6880', fontSize: 11, padding: 20 }}>No video connected</div>
      )}
    </BaseNode>
  );
});

const ImagePreviewNode = React.memo(function ImagePreviewNode({ data, id, selected }) {
  const projectPath = useWorkflowStore((s) => s.projectPath);
  const connected = getConnectedInputs(id);
  const imageUrl = connected.imageUrl || data.imageUrl || connected.image || data.image || '';
  const url = resolveUrl(imageUrl, projectPath);
  return (
    <BaseNode title="Image Preview" color="#14b8a6" selected={selected} nodeId={id} data={data} inputHandles={imageIn} hasOutput={false}>
      {url ? (
        <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(176,38,255,0.15)', flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
          <img src={url} alt="Generated" style={{ width: '100%', height: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: '#6b6880', fontSize: 11, padding: 20 }}>No image connected</div>
      )}
    </BaseNode>
  );
});

const TextPreviewNode = React.memo(function TextPreviewNode({ data, id, selected }) {
  const connected = getConnectedInputs(id);
  const text = connected.debugJson || connected.text || data.text || data.lyrics || '';
  return (
    <BaseNode title="Text Preview" color="#b9b4d0" selected={selected} nodeId={id} data={data} inputHandles={textIn} hasOutput={false}>
      <div className="nodrag" style={{ flex: 1, overflowY: 'auto', fontSize: 11, color: '#b9b4d0', lineHeight: 1.6, padding: 8, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(176,38,255,0.1)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace', userSelect: 'text', WebkitUserSelect: 'text' }}>
        {text || <span style={{ color: '#6b6880' }}>No text connected</span>}
      </div>
    </BaseNode>
  );
});

export { AudioPlayerNode, VideoPlayerNode, ImagePreviewNode, TextPreviewNode };
