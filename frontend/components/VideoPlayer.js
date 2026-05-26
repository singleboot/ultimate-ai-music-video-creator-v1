import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaPlay, FaPause, FaExpand, FaDownload } from 'react-icons/fa';

export default function VideoPlayer({ src, title = 'Video Preview', poster, onDownload }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setProgress((video.currentTime / video.duration) * 100);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [src]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass rounded-2xl overflow-hidden"
    >
      <div ref={containerRef} className="relative group">
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          className="w-full aspect-video object-cover"
          onClick={togglePlay}
        />

        {/* Gradient overlay bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[rgba(5,1,13,0.9)] to-transparent pointer-events-none" />

        {/* Center play button overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={togglePlay}
              className="w-16 h-16 rounded-full bg-[rgba(176,38,255,0.8)] flex items-center justify-center hover:bg-[#b026ff] transition-all duration-300 shadow-[0_0_30px_rgba(176,38,255,0.6)] backdrop-blur-sm"
            >
              <FaPlay size={24} className="ml-1 text-white" />
            </button>
          </div>
        )}

        {/* Controls bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {/* Progress bar */}
          <div className="w-full h-1 bg-[rgba(255,255,255,0.2)] rounded-full mb-3 cursor-pointer overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#b026ff] to-[#ff3bd4] rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="text-white hover:text-[#63d4ff] transition-colors"
              >
                {isPlaying ? <FaPause size={16} /> : <FaPlay size={16} />}
              </button>
              <span className="text-xs text-white font-mono">
                {title}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {onDownload && (
                <button
                  onClick={onDownload}
                  className="text-white hover:text-[#63d4ff] transition-colors"
                >
                  <FaDownload size={14} />
                </button>
              )}
              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-[#63d4ff] transition-colors"
              >
                <FaExpand size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
