import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaPlay, FaPause, FaDownload } from 'react-icons/fa';

export default function AudioPlayer({ src, title = 'Audio Preview', onDownload }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);
  const waveformRef = useRef(null);

  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      const pct = (audio.currentTime / audio.duration) * 100;
      setProgress(pct);
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (t) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleClickWaveform = (e) => {
    if (!waveformRef.current || !audioRef.current) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * audioRef.current.duration;
  };

  const bars = Array.from({ length: 50 }, (_, i) => ({
    height: Math.random() * 80 + 20,
    delay: i * 0.03,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass rounded-2xl p-6"
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white truncate">{title}</h4>
        </div>
        {onDownload && (
          <button
            onClick={onDownload}
            className="p-2 rounded-lg glass hover:border-[#63d4ff] transition-all duration-300 text-[#63d4ff]"
          >
            <FaDownload size={14} />
          </button>
        )}
      </div>

      {/* Waveform */}
      <div
        ref={waveformRef}
        onClick={handleClickWaveform}
        className="relative h-20 glass rounded-xl mb-4 cursor-pointer overflow-hidden flex items-center justify-center gap-[3px] px-4"
        style={{ cursor: 'pointer' }}
      >
        <div className="absolute inset-0 flex items-center justify-center gap-[3px] px-4">
          {bars.map((bar, i) => (
            <motion.div
              key={i}
              className="w-[3px] rounded-full"
              style={{
                background: `linear-gradient(to top, #b026ff, #ff3bd4)`,
                height: `${bar.height}%`,
                alignSelf: 'center',
              }}
              animate={isPlaying ? {
                height: [
                  `${Math.random() * 80 + 20}%`,
                  `${Math.random() * 80 + 20}%`,
                  `${Math.random() * 80 + 20}%`,
                  `${Math.random() * 80 + 20}%`,
                ],
              } : {
                height: `${bar.height}%`,
              }}
              transition={{
                duration: 0.5 + bar.delay,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>

        {/* Progress overlay */}
        <div
          className="absolute left-0 top-0 bottom-0 bg-[rgba(176,38,255,0.15)] transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-[#b026ff] flex items-center justify-center hover:bg-[#8a1fcc] transition-all duration-300 shadow-[0_0_15px_rgba(176,38,255,0.4)]"
          >
            {isPlaying ? <FaPause size={14} /> : <FaPlay size={14} className="ml-0.5" />}
          </button>
          <span className="text-xs text-[#b9b4d0] font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
