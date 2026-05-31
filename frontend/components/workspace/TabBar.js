import { motion } from 'framer-motion';
import {
  FaMusic, FaExchangeAlt, FaVolumeUp, FaPen,
  FaVideo, FaBolt, FaArrowLeft, FaCog, FaClock, FaFileAlt,
} from 'react-icons/fa';

const TABS = [
  { id: 'lyrics', label: 'Lyrics', icon: FaFileAlt, color: '#b026ff' },
  { id: 'music', label: 'Music', icon: FaMusic, color: '#ff3bd4' },
  { id: 'cover', label: 'Cover', icon: FaExchangeAlt, color: '#63d4ff' },
  { id: 'tts', label: 'TTS', icon: FaVolumeUp, color: '#b026ff' },
  { id: 'concepts', label: 'Concepts', icon: FaPen, color: '#ff3bd4' },
  { id: 'video', label: 'Video', icon: FaVideo, color: '#63d4ff' },
  { id: 'pipeline', label: 'Pipeline', icon: FaBolt, color: '#ff3bd4' },
  { id: 'timeline', label: 'Timeline', icon: FaClock, color: '#b026ff' },
];

export default function TabBar({ activeTab, onTabChange, projectName, onBack, onSettings }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-40 glass-strong border-b border-[rgba(176,38,255,0.2)]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(176,38,255,0.1)]">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/5 text-[#b9b4d0] hover:text-white transition-all" title="Back to Projects">
            <FaArrowLeft size={14} />
          </button>
          <div className="w-px h-5 bg-[rgba(176,38,255,0.3)]" />
          <FaMusic className="text-[#b026ff] text-sm" />
          <span className="text-white text-sm font-medium truncate max-w-[200px]">{projectName}</span>
        </div>
        <button onClick={onSettings} className="p-2 rounded-lg hover:bg-white/5 text-[#b9b4d0] hover:text-white transition-all" title="Settings">
          <FaCog size={14} />
        </button>
      </div>
      <div className="flex overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => onTabChange(tab.id)}
              className={`relative flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                isActive ? 'text-white' : 'text-[#b9b4d0] hover:text-white hover:bg-white/5'
              }`}>
              <Icon size={14} style={{ color: isActive ? tab.color : undefined }} />
              <span>{tab.label}</span>
              {isActive && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: `linear-gradient(90deg, ${tab.color}, transparent)` }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}