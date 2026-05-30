import { FaExchangeAlt, FaStop } from 'react-icons/fa';
import GlassCard from '../shared/GlassCard';
import GlowButton from '../shared/GlowButton';
import NeonInput from '../shared/NeonInput';
import LanguageSelector from '../shared/LanguageSelector';
import FileUpload from '../shared/FileUpload';
import AudioPlayer from '../shared/AudioPlayer';

const KEY_SCALES = ["C Major", "G Major", "D Major", "A Major", "E Major", "B Major", "F Major", "Bb Major", "Eb Major", "Ab Major", "Db Major", "Gb Major", "A Minor", "E Minor", "B Minor", "F# Minor", "C# Minor", "G# Minor", "D Minor", "G Minor", "C Minor", "F Minor", "Bb Minor", "Eb Minor"];

function Spinner({ className = "" }) {
  return <div className={`w-8 h-8 border-2 border-[#ff3bd4] border-t-transparent rounded-full animate-spin ${className}`} />;
}

export default function CoverTab({
  file, setFile, genre, setGenre, language, setLanguage,
  bpm, setBpm, keyScale, setKeyScale, result, loading,
  onGenerate, onCancel,
}) {
  return (
    <div className="space-y-6">
      <h2 className="font-bebas text-3xl tracking-wider text-white neon-text">Audio Cover</h2>

      <div className="grid lg:grid-cols-2 gap-8">
        <GlassCard glow="pink">
          <div className="space-y-4">
            <FileUpload
              onFileSelect={setFile}
              accept={{ "audio/*": [".mp3", ".wav", ".flac", ".ogg", ".m4a"] }}
              label="Upload source audio"
              hint="MP3, WAV, FLAC, M4A up to 50MB"
            />
            <NeonInput label="Genre / Style" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Target genre for cover" />
            <LanguageSelector value={language} onChange={(e) => setLanguage(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">BPM</label>
                <input type="range" min="60" max="200" value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className="w-full accent-[#ff3bd4]" />
                <span className="text-white font-mono text-sm">{bpm}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">Key Scale</label>
                <select value={keyScale} onChange={(e) => setKeyScale(e.target.value)} className="input-neon">
                  {KEY_SCALES.map((k) => <option key={k}>{k}</option>)}
                </select>
              </div>
            </div>
            <GlowButton color="pink" size="lg" fullWidth onClick={onGenerate} loading={loading} pulse>
              <FaExchangeAlt className="inline mr-2" /> Generate Cover
            </GlowButton>
          </div>
        </GlassCard>

        <div className="space-y-4">
          {loading ? (
            <GlassCard glow="purple" className="flex items-center justify-center min-h-[200px]">
              <div className="text-center text-[#b9b4d0]">
                <Spinner className="mx-auto mb-4" />
                <p className="mb-4">Generating cover...</p>
                <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm glass text-[#ff3bd4] hover:bg-[rgba(255,59,212,0.1)] border border-[rgba(255,59,212,0.3)] hover:border-[#ff3bd4] transition-all">
                  <FaStop className="inline mr-2" size={12} /> Cancel
                </button>
              </div>
            </GlassCard>
          ) : result ? (
            <GlassCard glow="blue">
              <AudioPlayer src={result.audio_url || result.url} title="Generated Cover" />
            </GlassCard>
          ) : (
            <GlassCard glow="purple" className="flex items-center justify-center min-h-[200px]">
              <div className="text-center text-[#b9b4d0]">
                <FaExchangeAlt size={40} className="mx-auto mb-4 opacity-40" />
                <p>Generated cover will appear here</p>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}