import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 300000,
  headers: { 'Content-Type': 'application/json' },
});

export const generateText2Audio = (params) =>
  api.post('/api/generate', { type: 'text2audio', params });

export const generateAudioCover = (params) =>
  api.post('/api/generate', { type: 'audio_cover', params });

export const generateTTS = (params) =>
  api.post('/api/generate', { type: 'tts', params });

export const generatePrompts = (params) =>
  api.post('/api/generate', { type: 'prompt_creator', params });

export const generateVideo = (params) =>
  api.post('/api/generate', { type: params.mode, params });

export const runPipeline = (params) =>
  api.post('/api/generate', { type: 'full_pipeline', params: { pipeline: params } });

export const getJobStatus = (promptId) =>
  api.get(`/api/jobs/${promptId}`);

export const getQueue = () =>
  api.get('/api/status');

export const getOutputs = () =>
  api.get('/api/outputs');

export const getHealth = () =>
  api.get('/api/health');

export const generateAudioCoverUpload = (formData) =>
  api.post('/api/generate/audio-cover', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000,
  });

// Lyrics generation
export const generateLyrics = (params) =>
  api.post('/api/generate/lyrics', params);

// Project & Settings API
export const getSettings = () =>
  api.get('/api/settings');

export const updateSettings = (settings) =>
  api.post('/api/settings', { settings });

export const createProject = (parentPath, name) =>
  api.post('/api/projects/create', { parent_path: parentPath, name });

export const openProject = (path) =>
  api.post('/api/projects/open', { path });

export const getCurrentProject = () =>
  api.get('/api/projects/current');

export const cancelJob = (promptId) =>
  api.post(`/api/cancel/${promptId}`);

export const sendChat = (message, history) =>
  api.post('/api/chat', { message, history });

export const generateSubtitles = (lyrics) =>
  api.post('/api/generate/subtitles', { lyrics, source: 'lyrics' });

export const generateThumbnailPrompts = (context) =>
  api.post('/api/generate/thumbnail-prompts', { context, count: 3 });
