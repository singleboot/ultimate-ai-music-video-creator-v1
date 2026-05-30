import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaRobot, FaPaperPlane, FaBolt, FaUser } from 'react-icons/fa';
import { sendChat } from '../../lib/api';

function ChatMessage({ role, content }) {
  const isUser = role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-[#b026ff]' : 'bg-[#63d4ff]'
      }`}>
        {isUser ? <FaUser size={12} /> : <FaRobot size={12} />}
      </div>
      <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
        isUser
          ? 'bg-[rgba(176,38,255,0.15)] border border-[rgba(176,38,255,0.3)] text-white'
          : 'bg-[rgba(99,212,255,0.1)] border border-[rgba(99,212,255,0.2)] text-[#b9b4d0]'
      }`}>
        {content}
      </div>
    </motion.div>
  );
}

export default function ChatBot({ onGenerate, disabled }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m your AI music video assistant. Tell me about the video you want to create — describe the mood, theme, genre, visuals, or anything you imagine!' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      const reply = res.data?.response || 'Sorry, I couldn\'t process that.';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <section className="relative py-12 md:py-20">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-4xl mx-auto"
        >
          <div className="glass-strong rounded-2xl overflow-hidden border border-[rgba(176,38,255,0.15)]">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-[rgba(176,38,255,0.1)] bg-[rgba(176,38,255,0.05)]">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#b026ff] to-[#63d4ff] flex items-center justify-center">
                <FaRobot size={16} />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">AI Assistant</h3>
                <p className="text-[#b9b4d0] text-xs">Describe your music video vision</p>
              </div>
            </div>

            {/* Messages */}
            <div className="h-[300px] overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <ChatMessage key={i} role={msg.role} content={msg.content} />
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#63d4ff] flex items-center justify-center flex-shrink-0">
                    <FaRobot size={12} />
                  </div>
                  <div className="bg-[rgba(99,212,255,0.1)] border border-[rgba(99,212,255,0.2)] rounded-2xl p-3">
                    <motion.div
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="flex gap-1"
                    >
                      <div className="w-2 h-2 rounded-full bg-[#63d4ff]" />
                      <div className="w-2 h-2 rounded-full bg-[#63d4ff]" />
                      <div className="w-2 h-2 rounded-full bg-[#63d4ff]" />
                    </motion.div>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Input + Generate */}
            <div className="p-4 border-t border-[rgba(176,38,255,0.1)]">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe your music video idea..."
                    className="w-full px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(176,38,255,0.2)] text-white placeholder-[#b9b4d0] text-sm focus:outline-none focus:border-[#b026ff] transition-all"
                    disabled={loading}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-[#b026ff] hover:bg-[rgba(176,38,255,0.1)] disabled:opacity-30 transition-all"
                  >
                    <FaPaperPlane size={14} />
                  </button>
                </div>
              </div>

              {/* Generate button when there's enough context */}
              {messages.length >= 4 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4"
                >
                  <button
                    onClick={() => onGenerate(messages)}
                    disabled={disabled}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#b026ff] to-[#ff3bd4] text-white font-semibold text-sm tracking-wide hover:shadow-[0_0_30px_rgba(176,38,255,0.5)] transition-all duration-300 disabled:opacity-50"
                  >
                    <FaBolt className="inline mr-2" /> Generate Music Video
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}