import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaSave, FaCog } from 'react-icons/fa';
import { getSettings, saveSettings } from '../../lib/projectStore';

const API_MODES = [
  { id: 'local', label: 'Local ComfyUI', desc: 'Run on your local ComfyUI instance' },
  { id: 'comfyui_cloud', label: 'ComfyUI Cloud', desc: 'Use ComfyUI Cloud service' },
  { id: 'fal', label: 'Fal.ai', desc: 'Use Fal.ai API for generation' },
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto glass-strong rounded-2xl p-8 border border-[rgba(176,38,255,0.3)]"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <FaCog className="text-[#b026ff] text-xl" />
                <h2 className="text-2xl font-bebas tracking-wider text-white">Settings</h2>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-[#b9b4d0] hover:text-white transition-all">
                <FaTimes size={18} />
              </button>
            </div>

            {/* API Mode Selection */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-[#b9b4d0] mb-4 tracking-wide uppercase">AI Engine</label>
              <div className="grid gap-3">
                {API_MODES.map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => update('mode', mode.id)}
                    className={`p-4 rounded-xl text-left transition-all duration-300 ${
                      settings.mode === mode.id
                        ? 'bg-[rgba(176,38,255,0.15)] border-2 border-[#b026ff]'
                        : 'glass border border-[rgba(176,38,255,0.15)] hover:border-[rgba(176,38,255,0.4)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        settings.mode === mode.id ? 'border-[#b026ff]' : 'border-[#b9b4d0]'
                      }`}>
                        {settings.mode === mode.id && (
                          <div className="w-2 h-2 rounded-full bg-[#b026ff]" />
                        )}
                      </div>
                      <div>
                        <p className="text-white text-sm font-semibold">{mode.label}</p>
                        <p className="text-[#b9b4d0] text-xs">{mode.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Mode-specific settings */}
            {settings.mode === 'local' && (
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-[#b9b4d0] mb-2">ComfyUI Host</label>
                  <input
                    value={settings.comfyuiHost}
                    onChange={e => update('comfyuiHost', e.target.value)}
                    className="input-neon"
                    placeholder="127.0.0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#b9b4d0] mb-2">ComfyUI Port</label>
                  <input
                    type="number"
                    value={settings.comfyuiPort}
                    onChange={e => update('comfyuiPort', Number(e.target.value))}
                    className="input-neon"
                    placeholder="8188"
                  />
                </div>
              </div>
            )}

            {settings.mode === 'comfyui_cloud' && (
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-[#b9b4d0] mb-2">API URL</label>
                  <input
                    value={settings.comfyuiCloudUrl}
                    onChange={e => update('comfyuiCloudUrl', e.target.value)}
                    className="input-neon"
                    placeholder="https://api.comfyui.cloud"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#b9b4d0] mb-2">API Key</label>
                  <input
                    type="password"
                    value={settings.comfyuiCloudKey}
                    onChange={e => update('comfyuiCloudKey', e.target.value)}
                    className="input-neon"
                    placeholder="Enter your ComfyUI Cloud API key"
                  />
                </div>
              </div>
            )}

            {settings.mode === 'fal' && (
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-[#b9b4d0] mb-2">Fal.ai API Key</label>
                  <input
                    type="password"
                    value={settings.falApiKey}
                    onChange={e => update('falApiKey', e.target.value)}
                    className="input-neon"
                    placeholder="Enter your Fal.ai API key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#b9b4d0] mb-2">Model Endpoint</label>
                  <input
                    value={settings.falModelEndpoint}
                    onChange={e => update('falModelEndpoint', e.target.value)}
                    className="input-neon"
                    placeholder="fal-ai/stable-diffusion-v3"
                  />
                </div>
              </div>
            )}

            {/* Default Parameters */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-[#b9b4d0] mb-4 tracking-wide uppercase">Default Parameters</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { key: 'defaultWidth', label: 'Width' },
                  { key: 'defaultHeight', label: 'Height' },
                  { key: 'defaultFps', label: 'FPS' },
                  { key: 'defaultSteps', label: 'Steps' },
                  { key: 'defaultCfg', label: 'CFG Scale' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-xs text-[#b9b4d0] mb-1">{field.label}</label>
                    <input
                      type="number"
                      value={settings[field.key]}
                      onChange={e => update(field.key, Number(e.target.value))}
                      className="input-neon text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t border-[rgba(176,38,255,0.2)]">
              <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm text-[#b9b4d0] hover:text-white border border-[rgba(176,38,255,0.3)] hover:border-[#b026ff] transition-all">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#b026ff] to-[#7c3aed] hover:shadow-[0_0_20px_rgba(176,38,255,0.5)] transition-all disabled:opacity-50 flex items-center gap-2"
              >
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
