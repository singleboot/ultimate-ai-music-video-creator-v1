import { FaVolumeUp, FaStop } from 'react-icons/fa';
import GlassCard from '../shared/GlassCard';
import GlowButton from '../shared/GlowButton';
import NeonInput from '../shared/NeonInput';
import LanguageSelector from '../shared/LanguageSelector';
import AudioPlayer from '../shared/AudioPlayer';

const VOICE_PRESETS = [
  { id: "male_deep", name: "Deep Voice", accent: "Indian Male", color: "#b026ff" },
  { id: "female_warm", name: "Warm Voice", accent: "Indian Female", color: "#ff3bd4" },
  { id: "male_british", name: "British Narrator", accent: "British Male", color: "#63d4ff" },
  { id: "female_american", name: "American Presenter", accent: "US Female", color: "#7c3aed" },
  { id: "male_bbc", name: "BBC Announcer", accent: "British Male", color: "#06b6d4" },
  { id: "female_soft", name: "Soft Voice", accent: "Indian Female", color: "#f472b6" },
];

function Spinner({ className = "" }) {
  return <div className={`w-8 h-8 border-2 border-[#63d4ff] border-t-transparent rounded-full animate-spin ${className}`} />;
}

export default function TTSTab({
  text, setText, language, setLanguage,
  voice, setVoice, result, loading,
  onGenerate, onCancel,
}) {
  return (
    <div className="space-y-6">
      <h2 className="font-bebas text-3xl tracking-wider text-white neon-text">TTS Voiceover</h2>

      <div className="grid lg:grid-cols-2 gap-8">
        <GlassCard glow="blue">
          <div className="space-y-4">
            <NeonInput label="Text for Voiceover" textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter the text you want to convert to speech..." rows={6} />
            <LanguageSelector value={language} onChange={(e) => setLanguage(e.target.value)} />
            <GlowButton color="blue" size="lg" fullWidth onClick={onGenerate} loading={loading} pulse>
              <FaVolumeUp className="inline mr-2" /> Generate Voiceover
            </GlowButton>
          </div>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard glow="purple">
            <label className="block text-sm font-medium text-[#b9b4d0] mb-4 tracking-wide uppercase">Voice Preset</label>
            <div className="grid grid-cols-2 gap-3">
              {VOICE_PRESETS.map((v) => (
                <button key={v.id} onClick={() => setVoice(v.id)}
                  className={`p-4 rounded-xl text-left transition-all duration-300 ${
                    voice === v.id
                      ? "bg-[rgba(176,38,255,0.15)] border-2 border-[#b026ff] shadow-[0_0_15px_rgba(176,38,255,0.3)]"
                      : "glass hover:border-[rgba(176,38,255,0.5)]"
                  }`}>
                  <div className="w-10 h-10 rounded-full mb-2" style={{ background: v.color, boxShadow: `0 0 15px ${v.color}40` }} />
                  <p className="text-white text-sm font-semibold">{v.name}</p>
                  <p className="text-[#b9b4d0] text-xs">{v.accent}</p>
                </button>
              ))}
            </div>
          </GlassCard>

          {loading ? (
            <GlassCard glow="pink" className="flex items-center justify-center min-h-[100px]">
              <div className="text-center text-[#b9b4d0]">
                <Spinner className="mx-auto mb-2" />
                <p className="text-sm mb-3">Generating voiceover...</p>
                <button onClick={onCancel} className="px-4 py-2 rounded-xl text-xs glass text-[#63d4ff] hover:bg-[rgba(99,212,255,0.1)] border border-[rgba(99,212,255,0.3)] hover:border-[#63d4ff] transition-all">
                  <FaStop className="inline mr-2" size={10} /> Cancel
                </button>
              </div>
            </GlassCard>
          ) : result ? (
            <GlassCard glow="blue">
              <AudioPlayer src={result.audio_url || result.url} title="Voiceover" />
            </GlassCard>
          ) : (
            <GlassCard glow="pink" className="flex items-center justify-center min-h-[100px]">
              <p className="text-[#b9b4d0] text-sm">Voiceover preview will appear here</p>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}