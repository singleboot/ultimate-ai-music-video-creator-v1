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

export const generateLyrics = (params) =>
  api.post('/api/generate/lyrics', params).then((r) => r.data);

export const generateText2Audio = (params) =>
  api.post('/api/generate', { type: 'text2audio', params }).then((r) => r.data);

export const generateAudioCover = (params) =>
  api.post('/api/generate', { type: 'audio_cover', params }).then((r) => r.data);

export const generateTTS = (params) =>
  api.post('/api/generate', { type: 'tts', params }).then((r) => r.data);

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
