import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaRobot, FaPaperPlane, FaTimes, FaMinus, FaExpand, FaMusic, FaVideo, FaPen, FaVolumeUp, FaExchangeAlt, FaBolt, FaUpload } from 'react-icons/fa';
import { sendChat } from '../../lib/api';

function ChatMessage({ role, content, actions, onAction, media, progress }) {
  const isUser = role === 'user';
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-[#63d4ff] flex items-center justify-center flex-shrink-0">
          <FaRobot size={11} />
        </div>
      )}
      <div className={`max-w-[85%] ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block p-2.5 rounded-xl text-sm leading-relaxed ${
          isUser
            ? 'bg-[rgba(176,38,255,0.15)] border border-[rgba(176,38,255,0.3)] text-white'
            : 'bg-[rgba(99,212,255,0.1)] border border-[rgba(99,212,255,0.2)] text-[#b9b4d0]'
        }`}>
          {content}
        </div>
        {progress && (
          <div className="mt-2 text-xs text-[#b9b4d0]">
            <div className="w-full bg-[rgba(255,255,255,0.05)] rounded-full h-1.5">
              <div className="bg-[#63d4ff] h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress.percent || 0}%` }} />
            </div>
            <span className="mt-1 opacity-70">{progress.step || 'Processing...'}</span>
          </div>
        )}
        {media && (
          <div className="mt-2">
            {media.type === 'audio' && (
              <audio controls className="w-full max-w-[250px] h-8" src={media.url} />
            )}
            {media.type === 'video' && (
              <video controls className="w-full max-w-[250px] rounded-lg" src={media.url} />
            )}
            {media.type === 'image' && (
              <img src={media.url} alt="Generated" className="w-full max-w-[250px] rounded-lg" />
            )}
          </div>
        )}
        {actions && actions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {actions.map((action, i) => (
              <button key={i} onClick={() => onAction(action)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium glass text-[#b9b4d0] hover:text-white border border-[rgba(176,38,255,0.2)] hover:border-[#b026ff] transition-all">
                {action}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function ChatPopup({ onAction }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [sizeMode, setSizeMode] = useState('sm');

  const sizeClasses = {
    sm: 'w-[360px] max-h-[500px]',
    md: 'w-[520px] max-h-[700px]',
    lg: 'w-[700px] max-h-[900px]',
  };

  const messageAreaSizes = {
    sm: 'min-h-[200px] max-h-[320px]',
    md: 'min-h-[400px] max-h-[550px]',
    lg: 'min-h-[600px] max-h-[750px]',
  };

  const cycleSize = () => {
    setSizeMode((prev) => prev === 'sm' ? 'md' : prev === 'md' ? 'lg' : 'sm');
  };
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m your AI music video assistant. Are you creating a new music video or making a cover?', actions: ['New Video', 'Cover Song'] },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addBotMessage = (content, extra = {}) => {
    setMessages((prev) => [...prev, { role: 'assistant', content, ...extra }]);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const userMsg = { role: 'user', content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);
    try {
      const res = await sendChat(text, updated);
      const data = res.data || {};
      const reply = data.response || 'Sorry, something went wrong.';
      const msg = { role: 'assistant', content: reply };
      if (data.actions && data.actions.length > 0) msg.actions = data.actions;
      setMessages((prev) => [...prev, msg]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally { setLoading(false); }
  };

  const handleAction = (action) => {
    setMessages((prev) => [...prev, { role: 'user', content: action }]);
    addBotMessage(`Running ${action}...`);
    if (onAction) onAction(action, addBotMessage);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
        onClick={() => { setIsOpen(!isOpen); setIsMinimized(false); }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-[#b026ff] to-[#63d4ff] flex items-center justify-center shadow-[0_0_30px_rgba(176,38,255,0.5)] hover:shadow-[0_0_50px_rgba(176,38,255,0.8)] transition-all">
        {isOpen ? <FaTimes size={20} /> : <FaRobot size={20} />}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-24 right-6 z-50 ${sizeClasses[sizeMode]} glass-strong rounded-2xl border border-[rgba(176,38,255,0.3)] overflow-hidden flex flex-col`}
            style={{ resize: 'both' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(176,38,255,0.1)] bg-[rgba(176,38,255,0.05)]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#b026ff] to-[#63d4ff] flex items-center justify-center">
                  <FaRobot size={14} />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">AI Assistant</h3>
                  <p className="text-[#b9b4d0] text-[10px]">Music Video Creator</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={cycleSize} className="p-1.5 rounded-lg hover:bg-white/5 text-[#b9b4d0] hover:text-white transition-all" title={`Size: ${sizeMode.toUpperCase()} (click to cycle)`}>
                  <FaExpand size={12} />
                </button>
                <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 rounded-lg hover:bg-white/5 text-[#b9b4d0] hover:text-white transition-all">
                  <FaMinus size={12} />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-[#b9b4d0] hover:text-white transition-all">
                  <FaTimes size={12} />
                </button>
              </div>
            </div>

            {/* Messages */}
            {!isMinimized && (
              <>
                <div className={`flex-1 overflow-y-auto p-3 space-y-3 ${messageAreaSizes[sizeMode]}`}>
                  {messages.map((msg, i) => (
                    <ChatMessage key={i} {...msg} onAction={handleAction} />
                  ))}
                  {loading && (
                    <div className="flex gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#63d4ff] flex items-center justify-center flex-shrink-0">
                        <FaRobot size={11} />
                      </div>
                      <div className="bg-[rgba(99,212,255,0.1)] border border-[rgba(99,212,255,0.2)] rounded-xl p-2.5">
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} className="flex gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#63d4ff]" />
                          <div className="w-1.5 h-1.5 rounded-full bg-[#63d4ff]" />
                          <div className="w-1.5 h-1.5 rounded-full bg-[#63d4ff]" />
                        </motion.div>
                      </div>
                    </div>
                  )}
                  <div ref={endRef} />
                </div>

                {/* Input */}
                <div className="p-3 border-t border-[rgba(176,38,255,0.1)]">
                  <div className="flex gap-2">
                    <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                      placeholder="Type a message..." disabled={loading}
                      className="flex-1 px-3 py-2 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(176,38,255,0.2)] text-white placeholder-[#b9b4d0] text-sm focus:outline-none focus:border-[#b026ff] transition-all" />
                    <button onClick={handleSend} disabled={!input.trim() || loading}
                      className="p-2 rounded-xl bg-[#b026ff] text-white hover:bg-[#9020dd] disabled:opacity-30 transition-all">
                      <FaPaperPlane size={14} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}