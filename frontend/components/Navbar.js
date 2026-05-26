import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FaFilm, FaMusic, FaMicrophone, FaVolumeUp, FaPen, FaVideo, FaBolt,
} from 'react-icons/fa';

const sections = [
  { id: 'hero', label: 'Home', icon: FaFilm },
  { id: 'text2audio', label: 'Text to Audio', icon: FaMusic },
  { id: 'audiocover', label: 'Audio Cover', icon: FaMicrophone },
  { id: 'tts', label: 'Voiceover', icon: FaVolumeUp },
  { id: 'prompts', label: 'Prompt Creator', icon: FaPen },
  { id: 'video', label: 'Video Generator', icon: FaVideo },
  { id: 'pipeline', label: 'Full Pipeline', icon: FaBolt },
];

export default function Navbar() {
  const [active, setActive] = useState('hero');
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;

      setVisible(scrollY < lastScrollY || scrollY < 100);
      setLastScrollY(scrollY);

      const offsets = sections.map((s) => {
        const el = document.getElementById(s.id);
        return el ? { id: s.id, top: el.offsetTop - 200 } : { id: s.id, top: Infinity };
      });

      const current = [...offsets].reverse().find((o) => scrollY >= o.top);
      if (current) setActive(current.id);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <motion.nav
      initial={{ x: 80, opacity: 0 }}
      animate={{
        x: visible ? 0 : 80,
        opacity: visible ? 1 : 0,
      }}
      transition={{ duration: 0.3 }}
      className="fixed right-4 top-1/2 -translate-y-1/2 z-50"
    >
      <div className="glass rounded-2xl py-3 px-2 flex flex-col items-center gap-1">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = active === section.id;

          return (
            <button
              key={section.id}
              onClick={() => scrollTo(section.id)}
              className="relative group p-2.5 rounded-xl transition-all duration-300"
              title={section.label}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 rounded-xl bg-[rgba(176,38,255,0.15)] border border-[rgba(176,38,255,0.3)]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                size={16}
                className={`relative z-10 transition-all duration-300 ${
                  isActive
                    ? 'text-[#b026ff] drop-shadow-[0_0_8px_rgba(176,38,255,0.8)]'
                    : 'text-[#b9b4d0] group-hover:text-white'
                }`}
              />
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
}
