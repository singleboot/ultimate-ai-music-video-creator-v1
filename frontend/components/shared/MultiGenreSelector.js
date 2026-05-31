import { useState } from 'react';
import { FaPlus, FaTimes } from 'react-icons/fa';

const GENRE_OPTIONS = [
  "Pop", "Rock", "Hip Hop", "R&B", "Electronic", "Jazz", "Classical",
  "Country", "Blues", "Folk", "Metal", "Punk", "Reggae", "Soul",
  "Funk", "Disco", "Ambient", "Lo-fi", "House", "Techno", "Trance",
  "Dubstep", "Drum & Bass", "Trap", "K-pop", "Latin", "Afrobeat",
  "Indie", "Alternative", "Grunge", "Ska", "Gospel", "Cinematic",
  "Orchestral", "Acoustic", "Experimental", "Fusion", "World",
];

export default function MultiGenreSelector({ value = [], onChange }) {
  const [custom, setCustom] = useState('');

  const toggleGenre = (g) => {
    if (value.includes(g)) {
      onChange(value.filter((x) => x !== g));
    } else {
      onChange([...value, g]);
    }
  };

  const addCustom = () => {
    const trimmed = custom.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setCustom('');
  };

  const handleCustomKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addCustom(); }
  };

  const removeGenre = (g) => onChange(value.filter((x) => x !== g));

  return (
    <div>
      <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">Genre / Style</label>

      {/* Selected genres as chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {value.map((g) => (
            <span key={g}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[rgba(176,38,255,0.15)] border border-[rgba(176,38,255,0.3)] text-white">
              {g}
              <button onClick={() => removeGenre(g)} className="text-[#b9b4d0] hover:text-white transition-colors">
                <FaTimes size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Preset genre grid */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {GENRE_OPTIONS.map((g) => (
          <button key={g} onClick={() => toggleGenre(g)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
              value.includes(g)
                ? 'bg-[#b026ff] text-white shadow-[0_0_8px_rgba(176,38,255,0.4)]'
                : 'bg-[rgba(255,255,255,0.04)] border border-[rgba(176,38,255,0.15)] text-[#b9b4d0] hover:border-[#b026ff] hover:text-white'
            }`}>
            {g}
          </button>
        ))}
      </div>

      {/* Custom genre input */}
      <div className="flex gap-2">
        <input value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={handleCustomKey}
          placeholder="Custom genre..."
          className="flex-1 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(176,38,255,0.2)] text-white placeholder-[#b9b4d0] text-xs focus:outline-none focus:border-[#b026ff] transition-all" />
        <button onClick={addCustom} disabled={!custom.trim()}
          className="px-2.5 py-1.5 rounded-lg bg-[rgba(176,38,255,0.2)] border border-[rgba(176,38,255,0.3)] text-white hover:bg-[rgba(176,38,255,0.3)] disabled:opacity-30 transition-all">
          <FaPlus size={10} />
        </button>
      </div>
    </div>
  );
}
