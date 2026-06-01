import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 600000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.detail || err.message || 'Request failed';
    return Promise.reject(new Error(msg));
  }
);

const OLLAMA_MODEL = process.env.NEXT_PUBLIC_OLLAMA_MODEL || 'gemma4:latest';

export const generateLyrics = async (params) => {
  const { theme, structure, genre, language, duration, seed } = params;
  const langMap = { en: 'English', hi: 'Hindi', bn: 'Bengali', ta: 'Tamil', te: 'Telugu', pa: 'Punjabi', ur: 'Urdu', kn: 'Kannada', ml: 'Malayalam' };
  const langName = langMap[language] || 'English';
  const system = 'You are a professional songwriter. Output ONLY the complete lyrics with section tags ([Verse], [Chorus], etc.). No extra commentary.';
  const prompt = `Write original ${genre || 'pop'} song lyrics in ${langName}.
Structure: ${structure || 'Verse-Chorus'}
Theme: ${theme || 'general'}
Duration hint: ${duration || 30} seconds (about ${Math.round((duration || 30) / 3)} lines).
Variation seed: ${seed || Math.floor(Math.random() * 999999)}`;
  const res = await fetch('/api/ollama/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OLLAMA_MODEL, prompt, system, options: { temperature: 0.8 } }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Ollama request failed');
  }
  const data = await res.json();
  return { lyrics: data.response || data.text || '' };
};

export const generateText2Audio = (params, audioFile) => {
  if (audioFile) {
    const fd = new FormData();
    fd.append('type', 'text2audio');
    fd.append('audio_file', audioFile);
    Object.entries(params).forEach(([k, v]) => {
      fd.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    });
    return api.post('/api/generate', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 600000,
    }).then((r) => r.data);
  }
  return api.post('/api/generate', { type: 'text2audio', params }).then((r) => r.data);
};

export const generateAudioCover = (params) =>
  api.post('/api/generate', { type: 'audio_cover', params }).then((r) => r.data);

export const generateTTS = (params) =>
  api.post('/api/generate', { type: 'tts', params }).then((r) => r.data);

export const generateLLMAudioAnalysis = (params) =>
  api.post('/api/generate/llm-audio-analysis', params).then((r) => r.data);

export const generatePrompts = (params) =>
  api.post('/api/generate', { type: 'prompt_creator', params }).then((r) => r.data);

export const generateVideo = (params) =>
  api.post('/api/generate', { type: params.mode || 't2v', params }).then((r) => r.data);

export const cancelJob = (promptId) =>
  api.post(`/api/cancel/${promptId}`).then((r) => r.data);

export const getJobStatus = (promptId) =>
  api.get(`/api/jobs/${promptId}`).then((r) => r.data);

export const sendChat = (message, history = []) =>
  api.post('/api/chat', { message, history }).then((r) => r.data);

export const getHealth = () =>
  api.get('/api/health').then((r) => r.data);

export default api;
