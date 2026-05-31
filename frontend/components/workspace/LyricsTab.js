import { useState } from 'react';
import { FaMagic, FaRandom } from 'react-icons/fa';
import GlassCard from '../shared/GlassCard';
import GlowButton from '../shared/GlowButton';
import NeonInput from '../shared/NeonInput';
import LanguageSelector from '../shared/LanguageSelector';
import MultiGenreSelector from '../shared/MultiGenreSelector';

const STRUCTURES = ["Verse-Chorus", "Verse-Chorus-Bridge", "Intro-Verse-Chorus-Verse-Chorus-Bridge-Outro", "ABAB", "Through-composed", "Free-form"];

function Spinner({ className = "" }) {
  return <div className={`w-8 h-8 border-2 border-[#b026ff] border-t-transparent rounded-full animate-spin ${className}`} />;
}

export default function LyricsTab({
  mode, setMode, genre, setGenre, language, setLanguage,
  lyrics, setLyrics, theme, setTheme, structure, setStructure,
  generatedLyrics, lyricsGenerating,
  onGenerateLyrics,
}) {
  return (
    <div className="space-y-6">
      <h2 className="font-bebas text-3xl tracking-wider text-white neon-text">Lyrics</h2>

      <div className="flex gap-3">
        {["manual", "ai"].map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
              mode === m ? "bg-[#b026ff] text-white shadow-[0_0_15px_rgba(176,38,255,0.5)]" : "glass text-[#b9b4d0] hover:text-white hover:border-[#b026ff]"
            }`}>
            {m === "manual" ? "Write Lyrics" : "AI Generate"}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Controls */}
        <GlassCard glow="purple">
          <div className="space-y-4">
            <MultiGenreSelector value={genre} onChange={setGenre} />
            <LanguageSelector value={language} onChange={(e) => setLanguage(e.target.value)} />

            {mode === "manual" && (
              <NeonInput label="Lyrics" textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} placeholder="Enter your lyrics here..." />
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
          </div>
        </GlassCard>

        {/* Right: Lyrics Preview */}
        <GlassCard glow="pink" className="min-h-[200px]">
          {mode === "ai" && lyricsGenerating ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] text-[#b9b4d0]">
              <Spinner className="mx-auto mb-4" />
              <p>Generating lyrics...</p>
            </div>
          ) : generatedLyrics ? (
            <div>
              <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">Generated Lyrics</label>
              <textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} className="input-neon min-h-[250px] resize-y w-full" placeholder="Edit generated lyrics..." />
              <div className="flex gap-3 mt-4">
                <button onClick={onGenerateLyrics} disabled={lyricsGenerating} className="flex-1 px-4 py-2.5 rounded-xl text-sm glass text-[#b9b4d0] hover:text-white border border-[rgba(176,38,255,0.3)] hover:border-[#b026ff] transition-all disabled:opacity-50">
                  <FaRandom className="inline mr-2" /> Regenerate
                </button>
              </div>
            </div>
          ) : mode === "manual" ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] text-[#b9b4d0]">
              <p>Type your lyrics in the left panel</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[200px] text-[#b9b4d0]">
              <p>Generated lyrics will appear here</p>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
