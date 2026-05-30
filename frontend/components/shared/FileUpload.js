import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUpload, FaFile, FaTimes, FaCheck } from 'react-icons/fa';

export default function FileUpload({
  onFileSelect,
  accept = { 'audio/*': ['.mp3', '.wav', '.flac', '.ogg'] },
  maxSize = 50 * 1024 * 1024,
  label = 'Drop your file here',
  hint = 'MP3, WAV, FLAC up to 50MB',
}) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setError('');
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError('File too large. Max 50MB.');
      } else {
        setError('Invalid file type.');
      }
      return;
    }
    if (acceptedFiles.length > 0) {
      const f = acceptedFiles[0];
      setFile(f);
      if (onFileSelect) onFileSelect(f);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
  });

  const removeFile = () => {
    setFile(null);
    setError('');
    if (onFileSelect) onFileSelect(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="w-full"
    >
      <div
        {...getRootProps()}
        className={`
          relative overflow-hidden rounded-2xl cursor-pointer
          transition-all duration-300
          ${isDragActive
            ? 'border-[#63d4ff] shadow-[0_0_30px_rgba(99,212,255,0.4)]'
            : file
            ? 'border-[#63d4ff] border-opacity-50'
            : 'border-[rgba(176,38,255,0.3)] hover:border-[#b026ff]'
          }
          border-2 border-dashed
          ${file ? 'bg-[rgba(99,212,255,0.05)]' : 'bg-[rgba(11,4,23,0.4)]'}
        `}
        style={{ backdropFilter: 'blur(10px)' }}
      >
        <input {...getInputProps()} />

        {/* Holographic overlay on drag */}
        <AnimatePresence>
          {isDragActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-r from-[rgba(176,38,255,0.1)] via-[rgba(99,212,255,0.1)] to-[rgba(255,59,212,0.1)] pointer-events-none"
              style={{
                backgroundSize: '200% 100%',
                animation: 'holographic-shift 2s ease infinite',
              }}
            />
          )}
        </AnimatePresence>

        <div className="relative z-10 flex flex-col items-center justify-center p-8 md:p-12">
          {file ? (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[rgba(99,212,255,0.2)] flex items-center justify-center">
                <FaCheck className="text-[#63d4ff]" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{file.name}</p>
                <p className="text-xs text-[#b9b4d0]">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(); }}
                className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.1)] transition-colors text-[#b9b4d0] hover:text-white"
              >
                <FaTimes size={16} />
              </button>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-[rgba(176,38,255,0.15)] flex items-center justify-center mb-4">
                <FaUpload className="text-[#b026ff]" size={24} />
              </div>
              <p className="text-white font-semibold text-lg mb-2">{label}</p>
              <p className="text-[#b9b4d0] text-sm">{hint}</p>
            </>
          )}
        </div>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-0 left-0 right-0 bg-[rgba(255,59,212,0.2)] border-t border-[#ff3bd4] border-opacity-30 px-4 py-2"
            >
              <p className="text-[#ff3bd4] text-xs flex items-center gap-2">
                <FaTimes size={10} /> {error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
