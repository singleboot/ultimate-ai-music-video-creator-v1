import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export const resolveUrl = (url, projectPath) => {
  if (!url) return '';
  if (url.startsWith('project://')) {
    const asset = url.substring('project://'.length);
    return `${BASE_URL}/api/projects/asset?path=${encodeURIComponent(projectPath)}&asset=${encodeURIComponent(asset)}`;
  }
  if (url.startsWith('/output/') || url.startsWith('/input/')) {
    return `${BASE_URL}${url}`;
  }
  return url;
};

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
  const system = 'You are a professional songwriter. Output ONLY the raw song lyrics with section tags (like [Verse 1], [Chorus], [Outro]). Do NOT output the theme, genre, title, or any introductory notes, explanations, or commentary.';
  const prompt = `Write original ${genre || 'pop'} song lyrics in ${langName}.
Structure: ${structure || 'Verse-Chorus'}
Theme: ${theme || 'general'}
Duration hint: ${duration || 30} seconds (about ${Math.round((duration || 30) / 3)} lines).
Variation seed: ${seed || Math.floor(Math.random() * 999999)}`;
  const { data } = await api.post('/api/ollama/generate', {
    model: OLLAMA_MODEL, prompt, system, options: { temperature: 0.8 }
  }, { timeout: 120000 });
  let lyricsText = data.response || data.text || '';

  // Post-processing to strip metadata headers and introductory lines
  const cleanLyrics = (text) => {
    const lines = text.split('\n');
    const filteredLines = lines.filter(line => {
      const lower = line.trim().toLowerCase();
      return !(
        lower.startsWith('theme:') ||
        lower.startsWith('genre:') ||
        lower.startsWith('title:') ||
        lower.startsWith('language:') ||
        lower.startsWith('structure:') ||
        lower.startsWith('seed:') ||
        lower.startsWith('duration:') ||
        lower.startsWith('prompt:')
      );
    });

    let cleanText = filteredLines.join('\n').trim();
    // Strip conversational intros before first bracket
    const firstTagIndex = cleanText.indexOf('[');
    if (firstTagIndex > 0) {
      const prefix = cleanText.substring(0, firstTagIndex).trim();
      const prefixLines = prefix.split('\n');
      if (prefixLines.length < 5 && !prefix.includes('\n\n')) {
        cleanText = cleanText.substring(firstTagIndex);
      }
    }
    return cleanText.trim();
  };

  return { lyrics: cleanLyrics(lyricsText) };
};

// Smart lyrics generation (mixed language, parody, bhajan, etc.) via backend ComfyUI
export const generateSmartLyrics = (params) =>
  api.post('/api/smart-lyrics', params, { timeout: 120000 }).then((r) => r.data);

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

/**
 * Start an async video generation job. Returns { job_id } immediately.
 * Poll getVideoJobStatus(job_id) to track progress.
 */
export const startVideoJob = (type, params) =>
  api.post('/api/generate/video/start', { type, params }).then((r) => r.data);

/**
 * Poll the status of an async video generation job.
 * Returns { status, message, outputs, video_url, error, ... }
 */
export const getVideoJobStatus = (jobId) =>
  api.get(`/api/generate/video/status/${jobId}`).then((r) => r.data);

export const cancelJob = (promptId) =>
  api.post(`/api/cancel/${promptId}`).then((r) => r.data);

export const getJobStatus = (promptId) =>
  api.get(`/api/jobs/${promptId}`).then((r) => r.data);

export const sendChat = (message, history = []) =>
  api.post('/api/chat', { message, history }).then((r) => r.data);

export const getHealth = () =>
  api.get('/api/health').then((r) => r.data);

export const combineVideoAudio = (video_url, audio_url, project_path, b_roll_urls) =>
  api.post('/api/generate/combine', { video_url, audio_url, project_path, b_roll_urls }).then((r) => r.data);

export const fetchLoras = () =>
  api.get('/api/models/loras').then((r) => r.data);

export default api;
