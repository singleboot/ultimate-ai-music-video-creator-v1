import { FaVideo, FaStop } from 'react-icons/fa';
import GlassCard from '../shared/GlassCard';
import GlowButton from '../shared/GlowButton';
import NeonInput from '../shared/NeonInput';
import VideoPlayer from '../shared/VideoPlayer';

const CAMERA_MOTIONS = ["Static", "Pan Left", "Pan Right", "Tilt Up", "Tilt Down", "Zoom In", "Zoom Out", "Dolly In", "Dolly Out", "Tracking Shot", "Crane Up", "Crane Down", "Handheld", "Steadicam", "Drone Flyover"];

function Spinner({ className = "" }) {
  return <div className={`w-8 h-8 border-2 border-[#ff3bd4] border-t-transparent rounded-full animate-spin ${className}`} />;
}

export default function VideoTab({
  mode, setMode, image, setImage, prompts, setPrompts,
  fps, setFps, resolution, setResolution, seed, setSeed,
  camera, setCamera, results, loading,
  onGenerate, onCancel,
}) {
  return (
    <div className="space-y-6">
      <h2 className="font-bebas text-3xl tracking-wider text-white neon-text">Video Generator</h2>

      <GlassCard glow="blue" padding={false}>
        <div className="p-6 md:p-8">
          <div className="flex items-center gap-4 mb-8">
            <span className={`text-sm font-medium ${mode === "i2v" ? "text-white" : "text-[#b9b4d0]"}`}>I2V</span>
            <button onClick={() => setMode(mode === "i2v" ? "t2v" : "i2v")}
              className={`relative w-14 h-7 rounded-full transition-all duration-300 ${mode === "i2v" ? "bg-[#b026ff]" : "bg-[#63d4ff]"}`}>
              <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all duration-300 ${mode === "i2v" ? "left-0.5" : "left-7"}`} />
            </button>
            <span className={`text-sm font-medium ${mode === "t2v" ? "text-white" : "text-[#b9b4d0]"}`}>T2V</span>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {mode === "i2v" && (
                <div className="p-3 rounded-xl bg-[rgba(99,212,255,0.05)] border border-[rgba(99,212,255,0.15)] text-[#b9b4d0] text-xs">
                  I2V mode generates a reference image from your prompt, then animates it into video.
                </div>
              )}
              <NeonInput label="Concept Prompts" textarea value={prompts} onChange={(e) => setPrompts(e.target.value)} placeholder="Describe what happens in the video..." />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">FPS</label>
                  <select value={fps} onChange={(e) => setFps(Number(e.target.value))} className="input-neon">
                    {[16, 24, 30, 60].map((f) => <option key={f} value={f}>{f} FPS</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">Resolution</label>
                  <select value={resolution} onChange={(e) => setResolution(e.target.value)} className="input-neon">
                    {["512x512", "768x768", "1024x576", "1024x1024", "1920x1080"].map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">Seed</label>
                  <input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} className="input-neon" placeholder="-1 for random" />
                </div>
                {mode === "t2v" && (
                  <div>
                    <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">Camera Motion</label>
                    <select value={camera} onChange={(e) => setCamera(e.target.value)} className="input-neon">
                      {CAMERA_MOTIONS.map((m) => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <GlowButton color="blue" size="lg" fullWidth onClick={onGenerate} loading={loading} pulse>
                <FaVideo className="inline mr-2" /> Generate Video
              </GlowButton>
            </div>

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