import { FaBolt, FaRobot } from 'react-icons/fa';
import GlassCard from '../shared/GlassCard';
import GlowButton from '../shared/GlowButton';
import ProgressTracker from '../shared/ProgressTracker';
import AudioPlayer from '../shared/AudioPlayer';
import VideoPlayer from '../shared/VideoPlayer';

export default function PipelineTab({
  brief, setBrief, result, running, step, status, onGenerate,
}) {
  return (
    <div className="space-y-6">
      <h2 className="font-bebas text-3xl tracking-wider text-white neon-text">Full Pipeline</h2>

      <div className="max-w-3xl mx-auto">
        <GlassCard glow="purple" className="text-center">
          {brief ? (
            <div className="mb-6 text-left">
              <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">Your Vision Brief</label>
              <div className="p-4 rounded-xl bg-[rgba(99,212,255,0.05)] border border-[rgba(99,212,255,0.15)] text-[#b9b4d0] text-sm leading-relaxed max-h-[120px] overflow-y-auto">
                {brief}
              </div>
              <button onClick={() => setBrief("")} className="mt-2 text-xs text-[#b026ff] hover:text-white transition-colors">Clear & start over</button>
            </div>
          ) : (
            <div className="mb-6 text-center text-[#b9b4d0]">
              <FaRobot size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Use the Chat tab to describe your vision, then click Generate</p>
            </div>
          )}

          {!running && !result && (
            <GlowButton color="gradient" size="xl" fullWidth onClick={onGenerate} loading={running} pulse disabled={!brief}>
              <FaBolt className="inline mr-2" /> Auto-Generate Everything
            </GlowButton>
          )}

          {(running || result) && (
            <GlassCard glow="blue" className="mt-6">
              <ProgressTracker currentStep={step} status={status} />
            </GlassCard>
          )}

          {result && (
            <div className="mt-8 space-y-6">
              <div className="flex items-center justify-center gap-3 text-[#63d4ff]">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-lg font-semibold">Your Music Video is Ready!</span>
              </div>

              {result.video_url && (
                <VideoPlayer src={result.video_url} title="Final Music Video" />
              )}

              {result.audio_url && (
                <AudioPlayer src={result.audio_url} title="Generated Soundtrack" />
              )}

              <GlowButton color="blue" size="lg" onClick={() => window.open(result.video_url || result.url, "_blank")}>
                Download Final Video
              </GlowButton>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}