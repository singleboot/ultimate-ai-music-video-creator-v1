import { useState } from 'react';
import { FaMagic, FaMusic, FaRandom, FaStop, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import GlassCard from '../shared/GlassCard';
import GlowButton from '../shared/GlowButton';
import NeonInput from '../shared/NeonInput';
import LanguageSelector from '../shared/LanguageSelector';
import AudioPlayer from '../shared/AudioPlayer';

const STRUCTURES = ["Verse-Chorus", "Verse-Chorus-Bridge", "Intro-Verse-Chorus-Verse-Chorus-Bridge-Outro", "ABAB", "Through-composed", "Free-form"];
const KEY_SCALES = ["C Major", "G Major", "D Major", "A Major", "E Major", "B Major", "F Major", "Bb Major", "Eb Major", "Ab Major", "Db Major", "Gb Major", "A Minor", "E Minor", "B Minor", "F# Minor", "C# Minor", "G# Minor", "D Minor", "G Minor", "C Minor", "F Minor", "Bb Minor", "Eb Minor"];
const TIME_SIGNATURES = ["3", "4", "5", "6", "7"];

function Spinner({ className = "" }) {
  return <div className={`w-8 h-8 border-2 border-[#b026ff] border-t-transparent rounded-full animate-spin ${className}`} />;
}

export default function AudioTab({
  mode, setMode, genre, setGenre, language, setLanguage,
  lyrics, setLyrics, theme, setTheme, structure, setStructure,
  bpm, setBpm, keyScale, setKeyScale, duration, setDuration,
  generatedLyrics, lyricsGenerating, result, loading,
  timeSignature, setTimeSignature, cfgScale, setCfgScale,
  temperature, setTemperature, topP, setTopP, topK, setTopK,
  steps, setSteps, samplingShift, setSamplingShift,
  onGenerateLyrics, onGenerate, onCancel,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-6">
      <h2 className="font-bebas text-3xl tracking-wider text-white neon-text">Text to Audio (ACE-Step 1.5)</h2>

      {/* Mode Selection */}
      <div className="flex gap-3">
        {["manual", "ai", "instrumental"].map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
              mode === m ? "bg-[#b026ff] text-white shadow-[0_0_15px_rgba(176,38,255,0.5)]" : "glass text-[#b9b4d0] hover:text-white hover:border-[#b026ff]"
            }`}>
            {m === "manual" ? "Manual Lyrics" : m === "ai" ? "AI Generate Lyrics" : "Instrumental Only"}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Controls */}
        <GlassCard glow="purple">
          <div className="space-y-4">
            <NeonInput label="Genre / Style" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="e.g. Cinematic orchestral pop" />
            <LanguageSelector value={language} onChange={(e) => setLanguage(e.target.value)} />
            <NeonInput label="Duration (seconds)" type="number" min={1} max={600} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />

            {mode === "manual" && (
              <>
                <NeonInput label="Lyrics" textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} placeholder="Enter your lyrics here..." />
                <GlowButton color="purple" size="lg" fullWidth onClick={onGenerate} loading={loading} pulse>
                  <FaMagic className="inline mr-2" /> Generate Audio
                </GlowButton>
              </>
            )}

            {mode === "instrumental" && (
              <GlowButton color="purple" size="lg" fullWidth onClick={onGenerate} loading={loading} pulse>
                <FaMagic className="inline mr-2" /> Generate Instrumental
              </GlowButton>
            )}

            {mode === "ai" && (
              <>
                <NeonInput label="Theme / Story" textarea value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Describe the theme or story..." />
                <div>
                  <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">Structure</label>
                  <select value={structure} onChange={(e) => setStructure(e.target.value)} className="input-neon">
                    {STRUCTURES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <GlowButton color="purple" size="md" fullWidth onClick={onGenerateLyrics} loading={lyricsGenerating} pulse>
                  <FaMagic className="inline mr-2" /> Generate Lyrics
                </GlowButton>
              </>
            )}

            {/* Basic Settings */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[rgba(176,38,255,0.15)]">
              <div>
                <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">BPM</label>
                <div className="flex items-center gap-3">
                  <input type="range" min="60" max="200" value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className="flex-1 accent-[#b026ff]" />
                  <span className="text-white font-mono text-sm w-10 text-right">{bpm}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">Key Scale</label>
                <select value={keyScale} onChange={(e) => setKeyScale(e.target.value)} className="input-neon">
                  {KEY_SCALES.map((k) => <option key={k}>{k}</option>)}
                </select>
              </div>
            </div>

            {/* Advanced Settings Toggle */}
            <button onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-[#b9b4d0] hover:text-white transition-all">
              {showAdvanced ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
              Advanced ACE-Step Settings
            </button>

            {showAdvanced && (
              <div className="space-y-4 p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(176,38,255,0.1)]">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#b9b4d0] mb-1">Time Signature</label>
                    <select value={timeSignature} onChange={(e) => setTimeSignature(e.target.value)} className="input-neon text-sm">
                      {TIME_SIGNATURES.map((t) => <option key={t} value={t}>{t}/4</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#b9b4d0] mb-1">CFG Scale (0.5-5)</label>
                    <input type="number" step="0.1" min="0.5" max="5" value={cfgScale} onChange={(e) => setCfgScale(Number(e.target.value))} className="input-neon text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#b9b4d0] mb-1">Temperature (0-1.5)</label>
                    <input type="number" step="0.05" min="0" max="1.5" value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} className="input-neon text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#b9b4d0] mb-1">Steps (10-50)</label>
                    <input type="number" min="10" max="50" value={steps} onChange={(e) => setSteps(Number(e.target.value))} className="input-neon text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-[#b9b4d0] mb-1">Top P (0-1)</label>
                    <input type="number" step="0.05" min="0" max="1" value={topP} onChange={(e) => setTopP(Number(e.target.value))} className="input-neon text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#b9b4d0] mb-1">Top K (0-100)</label>
                    <input type="number" min="0" max="100" value={topK} onChange={(e) => setTopK(Number(e.target.value))} className="input-neon text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#b9b4d0] mb-1">Sampling Shift (1-10)</label>
                    <input type="number" min="1" max="10" value={samplingShift} onChange={(e) => setSamplingShift(Number(e.target.value))} className="input-neon text-sm" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Results */}
        <div className="space-y-6">
          <GlassCard glow="pink" className="flex flex-col items-center justify-center min-h-[200px]">
            {loading ? (
              <div className="text-center text-[#b9b4d0]">
                <Spinner className="mx-auto mb-4" />
                <p className="mb-4">Generating audio...</p>
                <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm glass text-[#ff3bd4] hover:bg-[rgba(255,59,212,0.1)] border border-[rgba(255,59,212,0.3)] hover:border-[#ff3bd4] transition-all">
                  <FaStop className="inline mr-2" size={12} /> Cancel
                </button>
              </div>
            ) : result ? (
              <AudioPlayer src={result.audio_url || result.url} title="Generated Audio" />
            ) : (
              <div className="text-center text-[#b9b4d0]">
                <FaMusic size={40} className="mx-auto mb-4 opacity-40" />
                <p>Generated audio will appear here</p>
              </div>
            )}
          </GlassCard>

          {/* Lyrics Box (AI mode) */}
          {mode === "ai" && (
            <GlassCard glow="purple" className="min-h-[180px]">
              {lyricsGenerating ? (
                <div className="flex flex-col items-center justify-center min-h-[180px] text-[#b9b4d0]">
                  <Spinner className="mx-auto mb-4" />
                  <p>Generating lyrics...</p>
                </div>
              ) : generatedLyrics ? (
                <div>
                  <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">Lyrics</label>
                  <textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} className="input-neon min-h-[180px] resize-y w-full" placeholder="Edit generated lyrics..." />
                  <div className="flex gap-3 mt-4">
                    <button onClick={onGenerateLyrics} disabled={lyricsGenerating} className="flex-1 px-4 py-2.5 rounded-xl text-sm glass text-[#b9b4d0] hover:text-white border border-[rgba(176,38,255,0.3)] hover:border-[#b026ff] transition-all disabled:opacity-50">
                      <FaRandom className="inline mr-2" /> Regenerate
                    </button>
                    <GlowButton color="purple" size="md" fullWidth onClick={onGenerate} loading={loading}>
                      <FaMusic className="inline mr-2" /> Generate Music
                    </GlowButton>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[180px] text-[#b9b4d0]">
                  <p>Generated lyrics will appear here</p>
                </div>
              )}
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}