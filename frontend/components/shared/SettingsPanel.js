import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaSave, FaCog, FaRobot, FaImage, FaVideo } from 'react-icons/fa';
import { getSettings, saveSettings } from '../../lib/projectStore';

const LLM_PROVIDERS = [
  { id: 'local', label: 'Local (Gemma)', desc: 'Use local Gemma via ComfyUI' },
  { id: 'openai', label: 'OpenAI', desc: 'GPT-4o, GPT-4o-mini' },
  { id: 'anthropic', label: 'Anthropic', desc: 'Claude 3.5 Sonnet, Claude 3 Opus' },
  { id: 'google', label: 'Google Gemini', desc: 'Gemini Pro, Gemini Ultra' },
  { id: 'nvidia', label: 'NVIDIA NIM', desc: 'NVIDIA inference endpoints' },
  { id: 'openapi', label: 'OpenAPI / Custom', desc: 'Any OpenAI-compatible API (vLLM, Ollama, LM Studio)' },
];

const IMAGE_PROVIDERS = [
  { id: 'local', label: 'Local ComfyUI', desc: 'Use local ComfyUI workflows' },
  { id: 'openai', label: 'OpenAI DALL-E', desc: 'DALL-E 3 image generation' },
  { id: 'stability', label: 'Stability AI', desc: 'Stable Diffusion 3, SDXL' },
  { id: 'fal', label: 'FAL.ai', desc: 'Fal.ai image models' },
];

const VIDEO_PROVIDERS = [
  { id: 'local', label: 'Local ComfyUI', desc: 'Use local LTX 2.3 workflows' },
  { id: 'runway', label: 'Runway', desc: 'Gen-3 Alpha video generation' },
  { id: 'luma', label: 'Luma AI', desc: 'Dream Machine video generation' },
  { id: 'fal', label: 'FAL.ai', desc: 'Fal.ai video models' },
];

export default function SettingsPanel({ open, onClose }) {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setSettings(getSettings());
  }, [open]);

  const update = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    setSaving(true);
    saveSettings(settings);
    setTimeout(() => { setSaving(false); onClose(); }, 300);
  };

  if (!settings) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto glass-strong rounded-2xl p-8 border border-[rgba(176,38,255,0.3)]">

            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <FaCog className="text-[#b026ff] text-xl" />
                <h2 className="text-2xl font-bebas tracking-wider text-white">Settings</h2>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-[#b9b4d0] hover:text-white transition-all">
                <FaTimes size={18} />
              </button>
            </div>

            {/* ComfyUI Connection */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-[#b9b4d0] mb-4 tracking-wide uppercase">ComfyUI Connection</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#b9b4d0] mb-1">Host</label>
                  <input value={settings.comfyuiHost || '127.0.0.1'} onChange={e => update('comfyuiHost', e.target.value)} className="input-neon" placeholder="127.0.0.1" />
                </div>
                <div>
                  <label className="block text-xs text-[#b9b4d0] mb-1">Port</label>
                  <input type="number" value={settings.comfyuiPort || 8188} onChange={e => update('comfyuiPort', Number(e.target.value))} className="input-neon" placeholder="8188" />
                </div>
              </div>
            </div>

            {/* LLM Provider */}
            <div className="mb-8">
              <label className="flex items-center gap-2 text-sm font-medium text-[#b9b4d0] mb-4 tracking-wide uppercase">
                <FaRobot size={14} /> LLM (Chat & Lyrics & Thumbnail)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                {LLM_PROVIDERS.map(p => (
                  <button key={p.id} onClick={() => update('llmProvider', p.id)}
                    className={`p-3 rounded-xl text-left transition-all text-xs ${
                      settings.llmProvider === p.id
                        ? 'bg-[rgba(176,38,255,0.15)] border border-[#b026ff] text-white'
                        : 'glass border border-[rgba(176,38,255,0.15)] text-[#b9b4d0] hover:border-[rgba(176,38,255,0.4)]'
                    }`}>
                    <p className="font-semibold">{p.label}</p>
                    <p className="opacity-60 mt-0.5">{p.desc}</p>
                  </button>
                ))}
              </div>
              {settings.llmProvider !== 'local' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-[#b9b4d0] mb-1">API Key</label>
                    <input type="password" value={settings.llmApiKey || ''} onChange={e => update('llmApiKey', e.target.value)} className="input-neon" placeholder="Enter API key" />
                  </div>
                  {settings.llmProvider === 'openapi' && (
                    <div>
                      <label className="block text-xs text-[#b9b4d0] mb-1">Base URL</label>
                      <input value={settings.llmBaseUrl || ''} onChange={e => update('llmBaseUrl', e.target.value)} className="input-neon" placeholder="http://localhost:11434/v1" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs text-[#b9b4d0] mb-1">Model</label>
                    <input value={settings.llmModel || ''} onChange={e => update('llmModel', e.target.value)} className="input-neon" placeholder={settings.llmProvider === 'openai' ? 'gpt-4o-mini' : settings.llmProvider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'model-name'} />
                  </div>
                </div>
              )}
            </div>

            {/* Image Provider */}
            <div className="mb-8">
              <label className="flex items-center gap-2 text-sm font-medium text-[#b9b4d0] mb-4 tracking-wide uppercase">
                <FaImage size={14} /> Image Generation (Thumbnails)
              </label>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {IMAGE_PROVIDERS.map(p => (
                  <button key={p.id} onClick={() => update('imageProvider', p.id)}
                    className={`p-3 rounded-xl text-left transition-all text-xs ${
                      settings.imageProvider === p.id
                        ? 'bg-[rgba(176,38,255,0.15)] border border-[#b026ff] text-white'
                        : 'glass border border-[rgba(176,38,255,0.15)] text-[#b9b4d0] hover:border-[rgba(176,38,255,0.4)]'
                    }`}>
                    <p className="font-semibold">{p.label}</p>
                    <p className="opacity-60 mt-0.5">{p.desc}</p>
                  </button>
                ))}
              </div>
              {settings.imageProvider !== 'local' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-[#b9b4d0] mb-1">API Key</label>
                    <input type="password" value={settings.imageApiKey || ''} onChange={e => update('imageApiKey', e.target.value)} className="input-neon" placeholder="Enter API key" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#b9b4d0] mb-1">Model</label>
                    <input value={settings.imageModel || ''} onChange={e => update('imageModel', e.target.value)} className="input-neon" placeholder={settings.imageProvider === 'openai' ? 'dall-e-3' : 'model-name'} />
                  </div>
                </div>
              )}
            </div>

            {/* Video Provider */}
            <div className="mb-8">
              <label className="flex items-center gap-2 text-sm font-medium text-[#b9b4d0] mb-4 tracking-wide uppercase">
                <FaVideo size={14} /> Video Generation
              </label>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {VIDEO_PROVIDERS.map(p => (
                  <button key={p.id} onClick={() => update('videoProvider', p.id)}
                    className={`p-3 rounded-xl text-left transition-all text-xs ${
                      settings.videoProvider === p.id
                        ? 'bg-[rgba(176,38,255,0.15)] border border-[#b026ff] text-white'
                        : 'glass border border-[rgba(176,38,255,0.15)] text-[#b9b4d0] hover:border-[rgba(176,38,255,0.4)]'
                    }`}>
                    <p className="font-semibold">{p.label}</p>
                    <p className="opacity-60 mt-0.5">{p.desc}</p>
                  </button>
                ))}
              </div>
              {settings.videoProvider !== 'local' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-[#b9b4d0] mb-1">API Key</label>
                    <input type="password" value={settings.videoApiKey || ''} onChange={e => update('videoApiKey', e.target.value)} className="input-neon" placeholder="Enter API key" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#b9b4d0] mb-1">Model</label>
                    <input value={settings.videoModel || ''} onChange={e => update('videoModel', e.target.value)} className="input-neon" placeholder={settings.videoProvider === 'runway' ? 'gen-3' : 'model-name'} />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t border-[rgba(176,38,255,0.2)]">
              <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm text-[#b9b4d0] hover:text-white border border-[rgba(176,38,255,0.3)] hover:border-[#b026ff] transition-all">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#b026ff] to-[#7c3aed] hover:shadow-[0_0_20px_rgba(176,38,255,0.5)] transition-all disabled:opacity-50 flex items-center gap-2">
                <FaSave size={14} />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}