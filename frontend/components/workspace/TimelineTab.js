import { useState } from 'react';
import { FaClock, FaYoutube, FaDownload, FaMagic, FaClosedCaptioning, FaCheck } from 'react-icons/fa';
import toast from 'react-hot-toast';
import GlassCard from '../shared/GlassCard';
import GlowButton from '../shared/GlowButton';
import NeonInput from '../shared/NeonInput';
import VideoPlayer from '../shared/VideoPlayer';
import { generateSubtitles, generateThumbnailPrompts } from '../../lib/api';

export default function TimelineTab({ videoResult, audioResult }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('Music');
  const [thumbnails, setThumbnails] = useState([]);
  const [selectedThumb, setSelectedThumb] = useState(null);
  const [generatingThumb, setGeneratingThumb] = useState(false);
  const [subtitles, setSubtitles] = useState('');
  const [generatingSubs, setGeneratingSubs] = useState(false);
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleGenerateThumbnails = async () => {
    setGeneratingThumb(true);
    try {
      const context = videoResult?.prompts || audioResult?.genre || 'music video';
      const res = await generateThumbnailPrompts(context);
      setThumbnails(res.data?.prompts?.map((_, i) => `/api/thumbnail-${i+1}`) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingThumb(false);
    }
  };

  const handleGenerateSubtitles = async (fromLyrics) => {
    setGeneratingSubs(true);
    try {
      if (fromLyrics) {
        const res = await generateSubtitles(audioResult?.lyrics || '');
        setSubtitles(res.data?.srt || '');
      } else {
        toast('Whisper transcription coming soon', { icon: '🎤' });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingSubs(false);
    }
  };

  const handleUploadYouTube = async () => {
    setUploading(true);
    try { await new Promise(r => setTimeout(r, 3000)); }
    finally { setUploading(false); }
  };

  return (
    <div className="space-y-6">
      <h2 className="font-bebas text-3xl tracking-wider text-white neon-text">Timeline & Publish</h2>

      {/* Video Preview */}
      {videoResult && (
        <GlassCard glow="purple" padding={false}>
          <div className="p-4">
            <VideoPlayer src={videoResult.video_url || videoResult.url} title="Final Video" />
          </div>
        </GlassCard>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* YouTube Metadata */}
          <GlassCard glow="pink">
            <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <FaYoutube className="text-red-500" /> YouTube Metadata
            </h3>
            <div className="space-y-3">
              <NeonInput label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter video title..." />
              <NeonInput label="Description" textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter description..." rows={4} />
              <NeonInput label="Tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tag1, tag2, tag3..." />
              <div>
                <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-neon">
                  {['Music', 'Entertainment', 'Film & Animation', 'People & Blogs', 'Gaming'].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </GlassCard>

          {/* Subtitles */}
          <GlassCard glow="blue">
            <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <FaClosedCaptioning className="text-[#63d4ff]" /> Subtitles
            </h3>
            <div className="flex gap-2 mb-3">
              <button onClick={() => handleGenerateSubtitles(true)} disabled={generatingSubs}
                className="flex-1 px-3 py-2 rounded-xl text-xs glass text-[#b9b4d0] hover:text-white border border-[rgba(176,38,255,0.2)] hover:border-[#b026ff] transition-all disabled:opacity-50">
                {generatingSubs ? 'Generating...' : 'From Lyrics'}
              </button>
              <button onClick={() => handleGenerateSubtitles(false)} disabled={generatingSubs}
                className="flex-1 px-3 py-2 rounded-xl text-xs glass text-[#b9b4d0] hover:text-white border border-[rgba(99,212,255,0.2)] hover:border-[#63d4ff] transition-all disabled:opacity-50">
                {generatingSubs ? 'Generating...' : 'From Audio (Whisper)'}
              </button>
            </div>
            {subtitles && (
              <div>
                <textarea value={subtitles} onChange={(e) => setSubtitles(e.target.value)}
                  className="input-neon min-h-[120px] font-mono text-xs resize-y w-full" />
                <div className="flex gap-2 mt-2">
                  <button className="flex-1 px-3 py-1.5 rounded-lg text-xs glass text-[#b9b4d0] hover:text-white border border-[rgba(176,38,255,0.2)]">
                    <FaDownload className="inline mr-1" /> SRT
                  </button>
                  <button className="flex-1 px-3 py-1.5 rounded-lg text-xs glass text-[#b9b4d0] hover:text-white border border-[rgba(99,212,255,0.2)]">
                    <FaDownload className="inline mr-1" /> VTT
                  </button>
                </div>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Thumbnail */}
          <GlassCard glow="purple">
            <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <FaMagic className="text-[#b026ff]" /> Viral Thumbnail
            </h3>
            <GlowButton color="purple" size="md" fullWidth onClick={handleGenerateThumbnails} loading={generatingThumb}>
              <FaMagic className="inline mr-2" /> Generate Viral Thumbnail
            </GlowButton>
            {thumbnails.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {thumbnails.map((thumb, i) => (
                  <button key={i} onClick={() => setSelectedThumb(i)}
                    className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                      selectedThumb === i ? 'border-[#b026ff] shadow-[0_0_15px_rgba(176,38,255,0.5)]' : 'border-transparent hover:border-[rgba(176,38,255,0.3)]'
                    }`}>
                    <div className="aspect-video bg-[rgba(176,38,255,0.1)] flex items-center justify-center text-[#b9b4d0] text-xs">
                      Option {i + 1}
                    </div>
                    {selectedThumb === i && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#b026ff] flex items-center justify-center">
                        <FaCheck size={10} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </GlassCard>

          {/* YouTube Upload */}
          <GlassCard glow="pink">
            <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <FaYoutube className="text-red-500" /> Publish
            </h3>
            {!youtubeConnected ? (
              <GlowButton color="blue" size="md" fullWidth onClick={() => setYoutubeConnected(true)}>
                Connect YouTube Account
              </GlowButton>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <FaCheck /> YouTube Connected
                </div>
                <GlowButton color="pink" size="md" fullWidth onClick={handleUploadYouTube} loading={uploading}>
                  <FaYoutube className="inline mr-2" /> Upload to YouTube
                </GlowButton>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}