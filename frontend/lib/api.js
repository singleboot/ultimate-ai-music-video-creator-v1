import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 300000,
  headers: { 'Content-Type': 'application/json' },
});

export const generateText2Audio = (params) =>
  api.post('/api/generate', { mode: 'text2audio', ...params });

export const generateAudioCover = (params) =>
  api.post('/api/generate', { mode: 'audio_cover', ...params });

export const generateTTS = (params) =>
  api.post('/api/generate', { mode: 'tts', ...params });

export const generatePrompts = (params) =>
  api.post('/api/generate', { mode: 'prompt_creator', ...params });

export const generateVideo = (params) =>
  api.post('/api/generate', { mode: params.mode, ...params });

export const runPipeline = (params) =>
  api.post('/api/generate', { mode: 'full_pipeline', ...params });

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
