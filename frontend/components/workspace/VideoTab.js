import { useState } from 'react';
import { FaVideo, FaStop, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import GlassCard from '../shared/GlassCard';
import GlowButton from '../shared/GlowButton';
import NeonInput from '../shared/NeonInput';
import VideoPlayer from '../shared/VideoPlayer';

const CAMERA_MOTIONS = ["Static", "Pan Left", "Pan Right", "Tilt Up", "Tilt Down", "Zoom In", "Zoom Out", "Dolly In", "Dolly Out", "Tracking Shot", "Crane Up", "Crane Down", "Handheld", "Steadicam", "Drone Flyover"];
const CHARACTER_MOTIONS = ["Walks toward camera", "Strides across frame", "Leans toward camera", "Points into lens", "Throws arms wide", "Raises hands overhead", "Runs hand through hair", "Slowly backs away", "Drops to one knee", "Throws head back", "Whips jacket off shoulder", "Stomps forward with attitude", "Tilts chin upward", "Reaches toward camera", "Collapses dramatically"];
const SAMPLERS = ["euler", "euler_ancestral", "dpmpp_2m", "dpmpp_2m_sde", "dpmpp_sde", "lms", "heun", "dpm_fast", "dpm_adaptive"];
const VIDEO_FORMATS = ["video/h264-mp4", "video/h265-mp4", "video/webm"];

function Spinner({ className = "" }) {
  return <div className={`w-8 h-8 border-2 border-[#ff3bd4] border-t-transparent rounded-full animate-spin ${className}`} />;
}

export default function VideoTab({
  mode, setMode, prompts, setPrompts,
  fps, setFps, resolution, setResolution, seed, setSeed,
  camera, setCamera, results, loading,
  cfg, setCfg, sampler, setSampler,
  characterMotion, setCharacterMotion,
  useSrtDuration, setUseSrtDuration,
  tailLossFrames, setTailLossFrames,
  preFrames, setPreFrames, crf, setCrf,
  videoFormat, setVideoFormat,
  loras, setLoras,
  onGenerate, onCancel,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [enableLoras, setEnableLoras] = useState(false);

  const addLora = () => { if (loras.length < 5) setLoras([...loras, { file: "", strength: 1.0 }]); };
  const removeLora = (i) => setLoras(loras.filter((_, idx) => idx !== i));
  const updateLora = (i, key, val) => { const n = [...loras]; n[i][key] = val; setLoras(n); };

  const width = resolution.split('x')[0];
  const height = resolution.split('x')[1];

  return (
    <div className="space-y-6">
      <h2 className="font-bebas text-3xl tracking-wider text-white neon-text">Video Generator (LTX 2.3)</h2>

      <GlassCard glow="blue" padding={false}>
        <div className="p-6 md:p-8">
          {/* Mode Toggle */}
          <div className="flex items-center gap-4 mb-6">
            <span className={`text-sm font-medium ${mode === "i2v" ? "text-white" : "text-[#b9b4d0]"}`}>I2V</span>
            <button onClick={() => setMode(mode === "i2v" ? "t2v" : "i2v")}
              className={`relative w-14 h-7 rounded-full transition-all duration-300 ${mode === "i2v" ? "bg-[#b026ff]" : "bg-[#63d4ff]"}`}>
              <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all duration-300 ${mode === "i2v" ? "left-0.5" : "left-7"}`} />
            </button>
            <span className={`text-sm font-medium ${mode === "t2v" ? "text-white" : "text-[#b9b4d0]"}`}>T2V</span>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Controls */}
            <div className="space-y-4">
              {mode === "i2v" && (
                <div className="p-3 rounded-xl bg-[rgba(99,212,255,0.05)] border border-[rgba(99,212,255,0.15)] text-[#b9b4d0] text-xs">
                  I2V mode generates a reference image from your prompt using Z-Image Turbo, then animates it into video with LTX 2.3.
                </div>
              )}

              <NeonInput label="Concept Prompts" textarea value={prompts} onChange={(e) => setPrompts(e.target.value)}
                placeholder="Describe what happens in the video. Include camera motion, subject action, and scene details..." rows={4} />

              {/* Main Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">FPS</label>
                  <select value={fps} onChange={(e) => setFps(Number(e.target.value))} className="input-neon">
                    {[16, 24, 30, 50, 60].map((f) => <option key={f} value={f}>{f} FPS</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">Resolution</label>
                  <select value={resolution} onChange={(e) => setResolution(e.target.value)} className="input-neon">
                    {["512x512", "768x768", "1024x576", "1024x1024", "1280x720", "1920x1080", "2560x1440"].map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">Seed</label>
                  <input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} className="input-neon" placeholder="-1 for random" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">CFG Scale</label>
                  <input type="number" step="0.1" min="0.5" max="3" value={cfg} onChange={(e) => setCfg(Number(e.target.value))} className="input-neon" />
                </div>
              </div>

              {/* Camera & Character Motion */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">Camera Motion</label>
                  <select value={camera} onChange={(e) => setCamera(e.target.value)} className="input-neon">
                    {CAMERA_MOTIONS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">Character Motion</label>
                  <select value={characterMotion} onChange={(e) => setCharacterMotion(e.target.value)} className="input-neon">
                    <option value="">None</option>
                    {CHARACTER_MOTIONS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* Advanced Settings Toggle */}
              <button onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-[#b9b4d0] hover:text-white transition-all">
                {showAdvanced ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                Advanced Settings
              </button>

              {/* Advanced Settings */}
              {showAdvanced && (
                <div className="space-y-4 p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(176,38,255,0.1)]">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[#b9b4d0] mb-1">Sampler</label>
                      <select value={sampler} onChange={(e) => setSampler(e.target.value)} className="input-neon text-sm">
                        {SAMPLERS.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[#b9b4d0] mb-1">CRF Quality (1=better, 51=smaller)</label>
                      <input type="number" min="1" max="51" value={crf} onChange={(e) => setCrf(Number(e.target.value))} className="input-neon text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[#b9b4d0] mb-1">Video Format</label>
                      <select value={videoFormat} onChange={(e) => setVideoFormat(e.target.value)} className="input-neon text-sm">
                        {VIDEO_FORMATS.map((f) => <option key={f}>{f}</option>)}
                      </select>
                    </div>
                    <div className="flex items-end gap-4">
                      <label className="flex items-center gap-2 text-xs text-[#b9b4d0]">
                        <input type="checkbox" checked={useSrtDuration} onChange={(e) => setUseSrtDuration(e.target.checked)} className="accent-[#b026ff]" />
                        Use SRT Duration
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[#b9b4d0] mb-1">Tail Loss Frames</label>
                      <input type="number" value={tailLossFrames} onChange={(e) => setTailLossFrames(Number(e.target.value))} className="input-neon text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-[#b9b4d0] mb-1">Pre Frames</label>
                      <input type="number" value={preFrames} onChange={(e) => setPreFrames(Number(e.target.value))} className="input-neon text-sm" />
                    </div>
                  </div>

                  {/* LoRA Configuration */}
                  <div>
                    <label className="flex items-center gap-2 text-xs text-[#b9b4d0] mb-2">
                      <input type="checkbox" checked={enableLoras} onChange={(e) => setEnableLoras(e.target.checked)} className="accent-[#b026ff]" />
                      Enable Custom LoRAs
                    </label>
                    {enableLoras && (
                      <div className="space-y-2">
                        {loras.map((lora, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <input value={lora.file} onChange={(e) => updateLora(i, 'file', e.target.value)}
                              className="flex-1 input-neon text-sm" placeholder="LoRA filename" />
                            <input type="number" step="0.1" min="0" max="2" value={lora.strength}
                              onChange={(e) => updateLora(i, 'strength', Number(e.target.value))}
                              className="w-20 input-neon text-sm" />
                            {loras.length > 1 && (
                              <button onClick={() => removeLora(i)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                            )}
                          </div>
                        ))}
                        {loras.length < 5 && (
                          <button onClick={addLora} className="text-xs text-[#b026ff] hover:text-white">+ Add LoRA</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <GlowButton color="blue" size="lg" fullWidth onClick={onGenerate} loading={loading} pulse>
                <FaVideo className="inline mr-2" /> Generate Video
              </GlowButton>
            </div>

            {/* Results */}
            <div>
              {loading ? (
                <GlassCard glow="purple" className="flex items-center justify-center min-h-[300px]">
                  <div className="text-center text-[#b9b4d0]">
                    <Spinner className="mx-auto mb-4" />
                    <p className="mb-4">Generating video...</p>
                    <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm glass text-[#ff3bd4] hover:bg-[rgba(255,59,212,0.1)] border border-[rgba(255,59,212,0.3)] hover:border-[#ff3bd4] transition-all">
                      <FaStop className="inline mr-2" size={12} /> Cancel
                    </button>
                  </div>
                </GlassCard>
              ) : results.length > 0 ? (
                <div className="space-y-4">
                  {results.map((result, i) => (
                    <VideoPlayer key={i} src={result.video_url || result.url} title={`Clip ${i + 1}`} />
                  ))}
                </div>
              ) : (
                <GlassCard glow="purple" className="flex items-center justify-center min-h-[300px]">
                  <div className="text-center text-[#b9b4d0]">
                    <FaVideo size={48} className="mx-auto mb-4 opacity-40" />
                    <p>Generated video clips will appear here</p>
                  </div>
                </GlassCard>
              )}
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}