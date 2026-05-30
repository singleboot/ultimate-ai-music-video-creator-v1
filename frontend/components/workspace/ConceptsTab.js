import { FaPen, FaMagic, FaStop } from 'react-icons/fa';
import GlassCard from '../shared/GlassCard';
import GlowButton from '../shared/GlowButton';
import NeonInput from '../shared/NeonInput';
import LanguageSelector from '../shared/LanguageSelector';

function Spinner({ className = "" }) {
  return <div className={`w-8 h-8 border-2 border-[#b026ff] border-t-transparent rounded-full animate-spin ${className}`} />;
}

export default function ConceptsTab({
  lyrics, setLyrics, story, setStory, theme, setTheme,
  scenes, setScenes, language, setLanguage, results, loading,
  onGenerate, onCancel,
}) {
  return (
    <div className="space-y-6">
      <h2 className="font-bebas text-3xl tracking-wider text-white neon-text">Prompt Creator</h2>

      <div className="grid lg:grid-cols-2 gap-8">
        <GlassCard glow="purple">
          <div className="space-y-4">
            <NeonInput label="Lyrics" textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} placeholder="Enter your lyrics..." />
            <NeonInput label="Story Concept" textarea value={story} onChange={(e) => setStory(e.target.value)} placeholder="Describe the story..." />
            <NeonInput label="Theme / Style" textarea value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Visual style and mood..." />
            <NeonInput label="Subject & Scenes" textarea value={scenes} onChange={(e) => setScenes(e.target.value)} placeholder="Key subjects and scenes..." />
            <LanguageSelector value={language} onChange={(e) => setLanguage(e.target.value)} includeAll />
            <GlowButton color="purple" size="lg" fullWidth onClick={onGenerate} loading={loading} pulse>
              <FaMagic className="inline mr-2" /> Generate Concepts
            </GlowButton>
          </div>
        </GlassCard>

        <div className="space-y-4">
          {loading ? (
            <GlassCard glow="pink" className="flex items-center justify-center min-h-[200px]">
              <div className="text-center text-[#b9b4d0]">
                <Spinner className="mx-auto mb-4" />
                <p className="mb-4">Generating concepts...</p>
                <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm glass text-[#63d4ff] hover:bg-[rgba(99,212,255,0.1)] border border-[rgba(99,212,255,0.3)] hover:border-[#63d4ff] transition-all">
                  <FaStop className="inline mr-2" size={12} /> Cancel
                </button>
              </div>
            </GlassCard>
          ) : results?.concepts?.length > 0 ? (
            results.concepts.map((concept, i) => (
              <GlassCard key={i} glow={i % 3 === 0 ? "purple" : i % 3 === 1 ? "pink" : "blue"} hover={false}>
                <div className="flex items-start gap-3">
                  <span className="text-[#b026ff] font-bebas text-2xl leading-none">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="text-white text-sm font-medium mb-1">{concept.title || `Scene ${i + 1}`}</p>
                    <p className="text-[#b9b4d0] text-xs leading-relaxed">{concept.prompt || concept}</p>
                  </div>
                </div>
              </GlassCard>
            ))
          ) : (
            <GlassCard glow="pink" className="flex items-center justify-center min-h-[200px]">
              <div className="text-center text-[#b9b4d0]">
                <FaPen size={40} className="mx-auto mb-4 opacity-40" />
                <p>Generated concepts will appear here</p>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}