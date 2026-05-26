import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FaArrowDown, FaMusic, FaMicrophone, FaVolumeUp, FaPen,
  FaVideo, FaBolt, FaPlay, FaStop, FaDownload, FaCog, FaRandom,
  FaImage, FaArrowRight, FaMagic, FaStar,
  FaRobot, FaExchangeAlt,
  FaCirclePlay,
} from 'react-icons/fa6';
import GlassCard from '../components/GlassCard';
import GlowButton from '../components/GlowButton';
import NeonInput from '../components/NeonInput';
import LanguageSelector from '../components/LanguageSelector';
import AudioPlayer from '../components/AudioPlayer';
import VideoPlayer from '../components/VideoPlayer';
import ProgressTracker from '../components/ProgressTracker';
import FileUpload from '../components/FileUpload';
import {
  generateText2Audio, generateAudioCover, generateTTS,
  generatePrompts, generateVideo, runPipeline,
} from '../lib/api';

const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7, ease: "easeOut" },
};

const stagger = {
  initial: {},
  whileInView: { transition: { staggerChildren: 0.1 } },
  viewport: { once: true, margin: "-80px" },
};

function SectionTitle({ children, subtitle }) {
  return (
    <motion.div {...fadeInUp} className="mb-12">
      <h2 className="section-title text-gradient">{children}</h2>
      {subtitle && <p className="section-subtitle">{subtitle}</p>}
    </motion.div>
  );
}

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "bn", name: "Bengali" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "pa", name: "Punjabi" },
  { code: "ur", name: "Urdu" },
  { code: "kn", name: "Kannada" },
  { code: "ml", name: "Malayalam" },
];

const GENRES = [
  "Pop", "Rock", "Hip Hop", "EDM", "Classical", "Jazz",
  "R&B", "Country", "Metal", "Folk", "Ambient", "Lo-fi",
];

const KEY_SCALES = [
  "C Major", "G Major", "D Major", "A Major", "E Major", "B Major",
  "F Major", "Bb Major", "Eb Major", "Ab Major", "Db Major", "Gb Major",
  "A Minor", "E Minor", "B Minor", "F# Minor", "C# Minor", "G# Minor",
  "D Minor", "G Minor", "C Minor", "F Minor", "Bb Minor", "Eb Minor",
];

const STRUCTURES = [
  "Verse-Chorus", "Verse-Chorus-Bridge", "Intro-Verse-Chorus-Verse-Chorus-Bridge-Outro",
  "ABAB", "Through-composed", "Free-form",
];

const VOICE_PRESETS = [
  { id: "male_deep", name: "Deep Voice", accent: "Indian Male", color: "#b026ff" },
  { id: "female_warm", name: "Warm Voice", accent: "Indian Female", color: "#ff3bd4" },
  { id: "male_british", name: "British Narrator", accent: "British Male", color: "#63d4ff" },
  { id: "female_american", name: "American Presenter", accent: "US Female", color: "#7c3aed" },
  { id: "male_bbc", name: "BBC Announcer", accent: "British Male", color: "#06b6d4" },
  { id: "female_soft", name: "Soft Voice", accent: "Indian Female", color: "#f472b6" },
];

const CAMERA_MOTIONS = [
  "Static", "Pan Left", "Pan Right", "Tilt Up", "Tilt Down",
  "Zoom In", "Zoom Out", "Dolly In", "Dolly Out", "Tracking Shot",
  "Crane Up", "Crane Down", "Handheld", "Steadicam", "Drone Flyover",
];

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0);
  const [pipelineStatus, setPipelineStatus] = useState("");
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [promptId, setPromptId] = useState(null);

  const mainRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: mainRef });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);

  // Section 2: Text2Audio state
  const [t2aMode, setT2aMode] = useState("manual");
  const [t2aGenre, setT2aGenre] = useState("Pop");
  const [t2aLanguage, setT2aLanguage] = useState("en");
  const [t2aLyrics, setT2aLyrics] = useState("");
  const [t2aTheme, setT2aTheme] = useState("");
  const [t2aStructure, setT2aStructure] = useState("Verse-Chorus");
  const [t2aBpm, setT2aBpm] = useState(120);
  const [t2aKey, setT2aKey] = useState("C Major");
  const [t2aResult, setT2aResult] = useState(null);

  // Section 3: Audio Cover state
  const [coverFile, setCoverFile] = useState(null);
  const [coverGenre, setCoverGenre] = useState("Pop");
  const [coverLanguage, setCoverLanguage] = useState("en");
  const [coverBpm, setCoverBpm] = useState(120);
  const [coverKey, setCoverKey] = useState("C Major");
  const [coverResult, setCoverResult] = useState(null);

  // Section 4: TTS state
  const [ttsText, setTtsText] = useState("");
  const [ttsLanguage, setTtsLanguage] = useState("hi");
  const [ttsVoice, setTtsVoice] = useState("female_warm");
  const [ttsResult, setTtsResult] = useState(null);

  // Section 5: Prompt Creator state
  const [promptLyrics, setPromptLyrics] = useState("");
  const [promptStory, setPromptStory] = useState("");
  const [promptTheme, setPromptTheme] = useState("");
  const [promptScenes, setPromptScenes] = useState("");
  const [promptLanguage, setPromptLanguage] = useState("en");
  const [promptResults, setPromptResults] = useState(null);

  // Section 6: Video Generator state
  const [videoMode, setVideoMode] = useState("t2v");
  const [videoImage, setVideoImage] = useState(null);
  const [videoPrompts, setVideoPrompts] = useState("");
  const [videoFps, setVideoFps] = useState(24);
  const [videoResolution, setVideoResolution] = useState("1024x576");
  const [videoSeed, setVideoSeed] = useState(-1);
  const [videoCamera, setVideoCamera] = useState("Static");
  const [videoResults, setVideoResults] = useState([]);

  // Section 7: Pipeline state
  const [pipelineTheme, setPipelineTheme] = useState("");
  const [pipelineResult, setPipelineResult] = useState(null);

  const handleApiCall = useCallback(async (apiFn, params, successMsg) => {
    setLoading(true);
    try {
      const res = await apiFn(params);
      const id = res.data?.prompt_id || res.data?.job_id;
      if (id) setPromptId(id);
      toast.success(successMsg || "Done!");
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || "Something went wrong";
      toast.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Text2Audio handler
  const handleGenerateAudio = async () => {
    const params = {
      genre: t2aGenre,
      language: t2aLanguage,
      bpm: t2aBpm,
      key: t2aKey,
    };
    if (t2aMode === "manual") {
      params.lyrics = t2aLyrics;
    } else if (t2aMode === "ai") {
      params.theme = t2aTheme;
      params.structure = t2aStructure;
    }
    params.mode_type = t2aMode;

    try {
      const data = await handleApiCall(generateText2Audio, params, "Audio generated!");
      setT2aResult(data);
    } catch (e) {}
  };

  // Audio Cover handler
  const handleGenerateCover = async () => {
    if (!coverFile) { toast.error("Upload a source audio file"); return; }
    const params = {
      genre: coverGenre,
      language: coverLanguage,
      bpm: coverBpm,
      key: coverKey,
    };
    try {
      const data = await handleApiCall(generateAudioCover, params, "Cover generated!");
      setCoverResult(data);
    } catch (e) {}
  };

  // TTS handler
  const handleGenerateTTS = async () => {
    if (!ttsText.trim()) { toast.error("Enter text for voiceover"); return; }
    const params = {
      text: ttsText,
      language: ttsLanguage,
      voice: ttsVoice,
    };
    try {
      const data = await handleApiCall(generateTTS, params, "Voiceover generated!");
      setTtsResult(data);
    } catch (e) {}
  };

  // Prompt Creator handler
  const handleGeneratePrompts = async () => {
    if (!promptLyrics.trim()) { toast.error("Enter lyrics or concepts"); return; }
    const params = {
      lyrics: promptLyrics,
      story_concept: promptStory,
      theme_style: promptTheme,
      subject_scenes: promptScenes,
      language: promptLanguage,
    };
    try {
      const data = await handleApiCall(generatePrompts, params, "Concepts created!");
      setPromptResults(data);
    } catch (e) {}
  };

  // Video Generator handler
  const handleGenerateVideo = async () => {
    if (videoMode === "i2v" && !videoImage) { toast.error("Upload an image"); return; }
    const params = {
      mode: videoMode,
      prompts: videoPrompts,
      fps: videoFps,
      resolution: videoResolution,
      seed: videoSeed,
      camera_motion: videoCamera,
    };
    try {
      const data = await handleApiCall(generateVideo, params, "Video generated!");
      setVideoResults((prev) => [...prev, data]);
    } catch (e) {}
  };

  // Pipeline handler
  const handleRunPipeline = async () => {
    if (!pipelineTheme.trim()) { toast.error("Enter a theme/style"); return; }
    setPipelineRunning(true);
    setPipelineStep(0);
    setPipelineStatus("Initializing...");
    setPipelineResult(null);

    const steps = [
      "Generating Audio...",
      "Creating Concepts...",
      "Rendering Video...",
      "Assembling Final...",
    ];

    const params = { theme: pipelineTheme };

    try {
      for (let i = 0; i < steps.length; i++) {
        setPipelineStep(i);
        setPipelineStatus(steps[i]);
        await new Promise((r) => setTimeout(r, 1500));
      }
      setPipelineStep(4);
      setPipelineStatus("Complete!");
      const data = await handleApiCall(runPipeline, params, "Pipeline complete!");
      setPipelineResult(data);
      toast.success("Your music video is ready!");
    } catch (e) {
      setPipelineRunning(false);
      setPipelineStatus("Failed");
    } finally {
      setPipelineRunning(false);
    }
  };

  const Section = ({ id, children, className = "" }) => (
    <section id={id} className={`relative py-20 md:py-32 ${className}`}>
      <div className="section-container">{children}</div>
    </section>
  );


  return (
    <main ref={mainRef} className="relative min-h-screen">

      {/* ===== HERO ===== */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <motion.div style={{ opacity: heroOpacity, scale: heroScale }} className="relative z-10 text-center px-6">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="light-ray top-[20%]" />
            <div className="light-ray top-[40%]" style={{ animationDelay: "2s", animationDirection: "reverse" }} />
            <div className="light-ray top-[60%]" style={{ animationDelay: "4s" }} />
            <div className="light-ray top-[80%]" style={{ animationDelay: "1s", animationDirection: "reverse" }} />
          </div>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.3 }}>
            <h1 className="font-bebas text-7xl md:text-9xl lg:text-[10rem] leading-none tracking-wider text-white neon-text mb-4">
              ULTIMATE
            </h1>
            <h1 className="font-bebas text-6xl md:text-8xl lg:text-[8rem] leading-none tracking-wider text-gradient-purple-pink mb-8">
              MUSIC VIDEO
            </h1>
            <h1 className="font-bebas text-5xl md:text-7xl lg:text-[7rem] leading-none tracking-wider text-white neon-text-blue mb-6">
              CREATOR
            </h1>
            <p className="text-[#b9b4d0] text-lg md:text-xl tracking-widest uppercase mb-2">
              Where Music Meets Cinema
            </p>
            <p className="text-[#b9b4d0] text-sm md:text-base max-w-xl mx-auto mb-10 opacity-70">
              AI-powered platform for generating music, voiceovers, concepts, and cinematic videos
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <button
                onClick={() => document.getElementById("text2audio").scrollIntoView({ behavior: "smooth" })}
                className="group relative px-10 py-4 bg-gradient-to-r from-[#b026ff] via-[#ff3bd4] to-[#63d4ff] rounded-xl text-white font-semibold text-lg tracking-wider shadow-[0_0_30px_rgba(176,38,255,0.5)] hover:shadow-[0_0_60px_rgba(176,38,255,0.8)] transition-all duration-500"
              >
                <span className="relative z-10">Start Creating</span>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#b026ff] via-[#ff3bd4] to-[#63d4ff] opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-500" />
              </button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2"
          >
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-[#b9b4d0]">
              <FaArrowDown size={20} />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ===== SECTION 2: TEXT TO AUDIO ===== */}
      <Section id="text2audio">
        <SectionTitle subtitle="Generate original music from text descriptions or your own lyrics">
          Text to Audio
        </SectionTitle>

        <motion.div {...fadeInUp} className="flex flex-wrap gap-3 mb-8">
          {["manual", "ai", "instrumental"].map((mode) => (
            <button
              key={mode}
              onClick={() => setT2aMode(mode)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium tracking-wide transition-all duration-300 ${
                t2aMode === mode
                  ? "bg-[#b026ff] text-white shadow-[0_0_15px_rgba(176,38,255,0.5)]"
                  : "glass text-[#b9b4d0] hover:text-white hover:border-[#b026ff]"
              }`}
            >
              {mode === "manual" ? "Manual Lyrics" : mode === "ai" ? "AI Generate Lyrics" : "Instrumental Only"}
            </button>
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          <GlassCard glow="purple">
            <div className="space-y-4">
              <NeonInput label="Genre / Style" value={t2aGenre} onChange={(e) => setT2aGenre(e.target.value)} placeholder="e.g., Cinematic orchestral pop" />
              <LanguageSelector value={t2aLanguage} onChange={(e) => setT2aLanguage(e.target.value)} />
              {t2aMode === "manual" && (
                <NeonInput label="Lyrics" textarea value={t2aLyrics} onChange={(e) => setT2aLyrics(e.target.value)} placeholder="Enter your lyrics here..." />
              )}
              {t2aMode === "ai" && (
                <>
                  <NeonInput label="Theme / Story" textarea value={t2aTheme} onChange={(e) => setT2aTheme(e.target.value)} placeholder="Describe the theme or story for AI-generated lyrics..." />
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">Structure</label>
                    <select value={t2aStructure} onChange={(e) => setT2aStructure(e.target.value)} className="input-neon">
                      {STRUCTURES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">BPM</label>
                  <div className="flex items-center gap-3">
                    <input type="range" min="60" max="200" value={t2aBpm} onChange={(e) => setT2aBpm(Number(e.target.value))} className="flex-1 accent-[#b026ff]" />
                    <span className="text-white font-mono text-sm w-10 text-right">{t2aBpm}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">Key Scale</label>
                  <select value={t2aKey} onChange={(e) => setT2aKey(e.target.value)} className="input-neon">
                    {KEY_SCALES.map((k) => <option key={k}>{k}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </GlassCard>

          <div className="space-y-6">
            <GlassCard glow="pink" className="flex flex-col items-center justify-center min-h-[200px]">
              {t2aResult ? (
                <AudioPlayer src={t2aResult.audio_url || t2aResult.url} title="Generated Audio" onDownload={() => {}} />
              ) : (
                <div className="text-center text-[#b9b4d0]">
                  <FaMusic size={40} className="mx-auto mb-4 opacity-40" />
                  <p>Generated audio will appear here</p>
                </div>
              )}
            </GlassCard>
            <GlowButton color="purple" size="lg" fullWidth onClick={handleGenerateAudio} loading={loading} pulse>
              <FaMagic className="inline mr-2" /> Generate Audio
            </GlowButton>
          </div>
        </div>
      </Section>

      {/* ===== SECTION 3: AUDIO COVER ===== */}
      <Section id="audiocover">
        <SectionTitle subtitle="Transform any audio into a new genre with AI cover generation">
          Audio Cover
        </SectionTitle>

        <div className="grid lg:grid-cols-2 gap-8">
          <GlassCard glow="pink">
            <div className="space-y-4">
              <FileUpload
                onFileSelect={setCoverFile}
                accept={{ "audio/*": [".mp3", ".wav", ".flac", ".ogg", ".m4a"] }}
                label="Upload source audio"
                hint="MP3, WAV, FLAC, M4A up to 50MB"
              />
              <NeonInput label="Genre / Style" value={coverGenre} onChange={(e) => setCoverGenre(e.target.value)} placeholder="Target genre for cover" />
              <LanguageSelector value={coverLanguage} onChange={(e) => setCoverLanguage(e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">BPM</label>
                  <input type="range" min="60" max="200" value={coverBpm} onChange={(e) => setCoverBpm(Number(e.target.value))} className="w-full accent-[#ff3bd4]" />
                  <span className="text-white font-mono text-sm">{coverBpm}</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">Key Scale</label>
                  <select value={coverKey} onChange={(e) => setCoverKey(e.target.value)} className="input-neon">
                    {KEY_SCALES.map((k) => <option key={k}>{k}</option>)}
                  </select>
                </div>
              </div>
              <GlowButton color="pink" size="lg" fullWidth onClick={handleGenerateCover} loading={loading} pulse>
                <FaExchangeAlt className="inline mr-2" /> Generate Cover
              </GlowButton>
            </div>
          </GlassCard>

          <div className="space-y-4">
            {coverResult && (
              <GlassCard glow="blue">
                <AudioPlayer src={coverResult.audio_url || coverResult.url} title="Generated Cover" onDownload={() => {}} />
              </GlassCard>
            )}
            {!coverResult && (
              <GlassCard glow="purple" className="flex items-center justify-center min-h-[200px]">
                <div className="text-center text-[#b9b4d0]">
                  <FaMicrophone size={40} className="mx-auto mb-4 opacity-40" />
                  <p>Generated cover will appear here</p>
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      </Section>


      {/* ===== SECTION 4: TTS VOICEOVER ===== */}
      <Section id="tts">
        <SectionTitle subtitle="Generate realistic voiceovers in multiple Indian languages and accents">
          TTS Voiceover
        </SectionTitle>

        <div className="grid lg:grid-cols-2 gap-8">
          <GlassCard glow="blue">
            <div className="space-y-4">
              <NeonInput label="Text for Voiceover" textarea value={ttsText} onChange={(e) => setTtsText(e.target.value)} placeholder="Enter the text you want to convert to speech..." rows={6} />
              <LanguageSelector value={ttsLanguage} onChange={(e) => setTtsLanguage(e.target.value)} />
              <GlowButton color="blue" size="lg" fullWidth onClick={handleGenerateTTS} loading={loading} pulse>
                <FaVolumeUp className="inline mr-2" /> Generate Voiceover
              </GlowButton>
            </div>
          </GlassCard>

          <div className="space-y-4">
            <GlassCard glow="purple">
              <label className="block text-sm font-medium text-[#b9b4d0] mb-4 tracking-wide uppercase">Voice Preset</label>
              <div className="grid grid-cols-2 gap-3">
                {VOICE_PRESETS.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => setTtsVoice(voice.id)}
                    className={`p-4 rounded-xl text-left transition-all duration-300 ${
                      ttsVoice === voice.id
                        ? "bg-[rgba(176,38,255,0.15)] border-2 border-[#b026ff] shadow-[0_0_15px_rgba(176,38,255,0.3)]"
                        : "glass hover:border-[rgba(176,38,255,0.5)]"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full mb-2" style={{ background: voice.color, boxShadow: `0 0 15px ${voice.color}40` }} />
                    <p className="text-white text-sm font-semibold">{voice.name}</p>
                    <p className="text-[#b9b4d0] text-xs">{voice.accent}</p>
                  </button>
                ))}
              </div>
            </GlassCard>
            {ttsResult && (
              <GlassCard glow="blue">
                <AudioPlayer src={ttsResult.audio_url || ttsResult.url} title="Voiceover" onDownload={() => {}} />
              </GlassCard>
            )}
            {!ttsResult && (
              <GlassCard glow="pink" className="flex items-center justify-center min-h-[100px]">
                <p className="text-[#b9b4d0] text-sm">Voiceover preview will appear here</p>
              </GlassCard>
            )}
          </div>
        </div>
      </Section>

      {/* ===== SECTION 5: PROMPT CREATOR ===== */}
      <Section id="prompts">
        <SectionTitle subtitle="Generate rich concept prompts from your lyrics and story ideas">
          Prompt Creator
        </SectionTitle>

        <div className="grid lg:grid-cols-2 gap-8">
          <GlassCard glow="purple">
            <div className="space-y-4">
              <NeonInput label="Lyrics" textarea value={promptLyrics} onChange={(e) => setPromptLyrics(e.target.value)} placeholder="Enter your lyrics..." />
              <NeonInput label="Story Concept" textarea value={promptStory} onChange={(e) => setPromptStory(e.target.value)} placeholder="Describe the story..." />
              <NeonInput label="Theme / Style" textarea value={promptTheme} onChange={(e) => setPromptTheme(e.target.value)} placeholder="Visual style and mood..." />
              <NeonInput label="Subject & Scenes" textarea value={promptScenes} onChange={(e) => setPromptScenes(e.target.value)} placeholder="Key subjects and scenes..." />
              <LanguageSelector value={promptLanguage} onChange={(e) => setPromptLanguage(e.target.value)} includeAll />
              <GlowButton color="purple" size="lg" fullWidth onClick={handleGeneratePrompts} loading={loading} pulse>
                <FaMagic className="inline mr-2" /> Generate Concepts
              </GlowButton>
            </div>
          </GlassCard>

          <div className="space-y-4">
            {promptResults?.concepts?.length > 0 ? (
              promptResults.concepts.map((concept, i) => (
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
                  <p>Generated concepts will appear here as animated timeline cards</p>
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      </Section>

      {/* ===== SECTION 6: VIDEO GENERATOR ===== */}
      <Section id="video">
        <SectionTitle subtitle="Generate cinematic video clips from images or text prompts">
          Video Generator
        </SectionTitle>

        <GlassCard glow="blue" padding={false}>
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-4 mb-8">
              <span className={`text-sm font-medium ${videoMode === "i2v" ? "text-white" : "text-[#b9b4d0]"}`}>I2V</span>
              <button
                onClick={() => setVideoMode(videoMode === "i2v" ? "t2v" : "i2v")}
                className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                  videoMode === "i2v" ? "bg-[#b026ff]" : "bg-[#63d4ff]"
                }`}
              >
                <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all duration-300 ${
                  videoMode === "i2v" ? "left-0.5" : "left-7"
                }`} />
              </button>
              <span className={`text-sm font-medium ${videoMode === "t2v" ? "text-white" : "text-[#b9b4d0]"}`}>T2V</span>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                {videoMode === "i2v" && (
                  <FileUpload
                    onFileSelect={setVideoImage}
                    accept={{ "image/*": [".png", ".jpg", ".jpeg", ".webp"] }}
                    label="Upload reference image"
                    hint="PNG, JPG, WebP - the starting frame for your video"
                  />
                )}
                <NeonInput label="Concept Prompts" textarea value={videoPrompts} onChange={(e) => setVideoPrompts(e.target.value)} placeholder="Describe what happens in the video..." />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">FPS</label>
                    <select value={videoFps} onChange={(e) => setVideoFps(Number(e.target.value))} className="input-neon">
                      {[16, 24, 30, 60].map((f) => <option key={f} value={f}>{f} FPS</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">Resolution</label>
                    <select value={videoResolution} onChange={(e) => setVideoResolution(e.target.value)} className="input-neon">
                      {["512x512", "768x768", "1024x576", "1024x1024", "1920x1080"].map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">Seed</label>
                    <input type="number" value={videoSeed} onChange={(e) => setVideoSeed(Number(e.target.value))} className="input-neon" placeholder="-1 for random" />
                  </div>
                  {videoMode === "t2v" && (
                    <div>
                      <label className="block text-sm font-medium text-[#b9b4d0] mb-2 tracking-wide uppercase">Camera Motion</label>
                      <select value={videoCamera} onChange={(e) => setVideoCamera(e.target.value)} className="input-neon">
                        {CAMERA_MOTIONS.map((m) => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                <GlowButton color="blue" size="lg" fullWidth onClick={handleGenerateVideo} loading={loading} pulse>
                  <FaVideo className="inline mr-2" /> Generate Video
                </GlowButton>
              </div>

              <div>
                {videoResults.length > 0 ? (
                  <div className="space-y-4">
                    {videoResults.map((result, i) => (
                      <VideoPlayer key={i} src={result.video_url || result.url} title={`Clip ${i + 1}`} onDownload={() => {}} />
                    ))}
                  </div>
                ) : (
                  <GlassCard glow="purple" className="flex items-center justify-center min-h-[300px]">
                    <div className="text-center text-[#b9b4d0]">
                      <FaVideo size={48} className="mx-auto mb-4 opacity-40" />
                      <p>Generated video clips will appear here</p>
                    </div>
                  </GlassCard>
                )}
              </div>
            </div>
          </div>
        </GlassCard>
      </Section>


      {/* ===== SECTION 7: FULL PIPELINE ===== */}
      <Section id="pipeline">
        <SectionTitle subtitle="Generate everything from a single theme description - music, concepts, video, and final assembly">
          Full Pipeline
        </SectionTitle>

        <div className="max-w-3xl mx-auto">
          <GlassCard glow="purple" className="text-center">
            <NeonInput label="Theme / Style Description" textarea value={pipelineTheme} onChange={(e) => setPipelineTheme(e.target.value)} placeholder="Describe the complete vision for your music video..." rows={4} containerClass="mb-6" />

            {!pipelineRunning && !pipelineResult && (
              <GlowButton color="gradient" size="xl" fullWidth onClick={handleRunPipeline} loading={loading} pulse>
                <FaBolt className="inline mr-2" /> Auto-Generate Everything
              </GlowButton>
            )}

            {(pipelineRunning || pipelineResult) && (
              <GlassCard glow="blue" className="mt-6">
                <ProgressTracker currentStep={pipelineStep} status={pipelineStatus} />
              </GlassCard>
            )}

            {pipelineResult && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 space-y-6">
                <div className="flex items-center justify-center gap-3 text-[#63d4ff]">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="text-lg font-semibold">Your Music Video is Ready!</span>
                </div>

                {pipelineResult.video_url && (
                  <VideoPlayer src={pipelineResult.video_url} title="Final Music Video" onDownload={() => {}} />
                )}

                {pipelineResult.audio_url && (
                  <AudioPlayer src={pipelineResult.audio_url} title="Generated Soundtrack" />
                )}

                <GlowButton color="blue" size="lg" onClick={() => window.open(pipelineResult.video_url || pipelineResult.url, "_blank")}>
                  <FaDownload className="inline mr-2" /> Download Final Video
                </GlowButton>
              </motion.div>
            )}
          </GlassCard>
        </div>
      </Section>

      {/* ===== FOOTER ===== */}
      <footer className="relative py-12 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <div className="w-16 h-1 bg-gradient-to-r from-[#b026ff] via-[#ff3bd4] to-[#63d4ff] mx-auto mb-6 rounded-full" />
          <p className="text-[#b9b4d0] text-sm font-inter">
            Ultimate Music Video Creator v1 &copy; {new Date().getFullYear()}
          </p>
          <p className="text-[#b9b4d0] text-xs mt-2 opacity-60">
            Powered by AI &mdash; Where Music Meets Cinema
          </p>
        </div>
      </footer>
    </main>
  );
}

