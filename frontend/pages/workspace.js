import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import TabBar from '../components/workspace/TabBar';
import ChatTab from '../components/workspace/ChatTab';
import AudioTab from '../components/workspace/AudioTab';
import CoverTab from '../components/workspace/CoverTab';
import TTSTab from '../components/workspace/TTSTab';
import ConceptsTab from '../components/workspace/ConceptsTab';
import VideoTab from '../components/workspace/VideoTab';
import PipelineTab from '../components/workspace/PipelineTab';
import SettingsPanel from '../components/shared/SettingsPanel';
import { getCurrentProject } from '../lib/projectStore';
import {
  generateText2Audio, generateAudioCover, generateTTS,
  generatePrompts, generateVideo, runPipeline, generateLyrics,
  cancelJob,
} from '../lib/api';

export default function Workspace() {
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [showSettings, setShowSettings] = useState(false);

  // Loading states
  const [t2aAudioLoading, setT2aAudioLoading] = useState(false);
  const [coverLoading, setCoverLoading] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [promptLoading, setPromptLoading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [pipelineRunning, setPipelineRunning] = useState(false);

  // Prompt IDs for cancellation
  const [t2aPromptId, setT2aPromptId] = useState(null);
  const [coverPromptId, setCoverPromptId] = useState(null);
  const [ttsPromptId, setTtsPromptId] = useState(null);
  const [promptGenPromptId, setPromptGenPromptId] = useState(null);
  const [videoPromptId, setVideoPromptId] = useState(null);

  // Cancel refs
  const t2aCancelled = useRef(false);
  const coverCancelled = useRef(false);
  const ttsCancelled = useRef(false);
  const promptCancelled = useRef(false);
  const videoCancelled = useRef(false);

  // Text2Audio state
  const [t2aMode, setT2aMode] = useState("manual");
  const [t2aGenre, setT2aGenre] = useState("Pop");
  const [t2aLanguage, setT2aLanguage] = useState("en");
  const [t2aLyrics, setT2aLyrics] = useState("");
  const [t2aTheme, setT2aTheme] = useState("");
  const [t2aStructure, setT2aStructure] = useState("Verse-Chorus");
  const [t2aBpm, setT2aBpm] = useState(120);
  const [t2aKey, setT2aKey] = useState("C Major");
  const [t2aDuration, setT2aDuration] = useState(30);
  const [t2aGeneratedLyrics, setT2aGeneratedLyrics] = useState("");
  const [t2aLyricsGenerating, setT2aLyricsGenerating] = useState(false);
  const [t2aResult, setT2aResult] = useState(null);

  // Cover state
  const [coverFile, setCoverFile] = useState(null);
  const [coverGenre, setCoverGenre] = useState("Pop");
  const [coverLanguage, setCoverLanguage] = useState("en");
  const [coverBpm, setCoverBpm] = useState(120);
  const [coverKey, setCoverKey] = useState("C Major");
  const [coverResult, setCoverResult] = useState(null);

  // TTS state
  const [ttsText, setTtsText] = useState("");
  const [ttsLanguage, setTtsLanguage] = useState("hi");
  const [ttsVoice, setTtsVoice] = useState("female_warm");
  const [ttsResult, setTtsResult] = useState(null);

  // Concepts state
  const [promptLyrics, setPromptLyrics] = useState("");
  const [promptStory, setPromptStory] = useState("");
  const [promptTheme, setPromptTheme] = useState("");
  const [promptScenes, setPromptScenes] = useState("");
  const [promptLanguage, setPromptLanguage] = useState("en");
  const [promptResults, setPromptResults] = useState(null);

  // Video state
  const [videoMode, setVideoMode] = useState("t2v");
  const [videoImage, setVideoImage] = useState(null);
  const [videoPrompts, setVideoPrompts] = useState("");
  const [videoFps, setVideoFps] = useState(24);
  const [videoResolution, setVideoResolution] = useState("1024x576");
  const [videoSeed, setVideoSeed] = useState(-1);
  const [videoCamera, setVideoCamera] = useState("Static");
  const [videoResults, setVideoResults] = useState([]);

  // Pipeline state
  const [pipelineResult, setPipelineResult] = useState(null);
  const [pipelineBrief, setPipelineBrief] = useState("");
  const [pipelineStep, setPipelineStep] = useState(0);
  const [pipelineStatus, setPipelineStatus] = useState("");
  const briefRef = useRef("");

  useEffect(() => {
    const p = getCurrentProject();
    if (!p) { router.replace('/'); return; }
    setProject(p);
  }, []);

  // === Generation Handlers ===

  const handleGenerateLyrics = async () => {
    if (!t2aTheme.trim()) { toast.error("Enter a theme or story"); return; }
    t2aCancelled.current = false;
    setT2aLyricsGenerating(true);
    try {
      const res = await generateLyrics({
        theme: t2aTheme, structure: t2aStructure,
        genre: t2aGenre, language: t2aLanguage, duration: t2aDuration,
      });
      if (t2aCancelled.current) return;
      const lyrics = res.data.lyrics;
      setT2aGeneratedLyrics(lyrics);
      setT2aLyrics(lyrics);
      toast.success("Lyrics generated!");
    } catch (err) {
      if (t2aCancelled.current) return;
      toast.error(err.response?.data?.detail || err.message || "Lyrics generation failed");
    } finally { setT2aLyricsGenerating(false); }
  };

  const handleGenerateAudio = async () => {
    const params = {
      genre: t2aGenre, language: t2aLanguage, bpm: t2aBpm,
      key: t2aKey, duration: t2aDuration,
    };
    if (t2aMode === "manual") params.lyrics = t2aLyrics;
    else if (t2aMode === "ai") params.lyrics = t2aGeneratedLyrics || t2aLyrics;
    params.mode_type = t2aMode === "ai" ? "manual" : t2aMode;
    t2aCancelled.current = false;
    setT2aAudioLoading(true);
    try {
      const res = await generateText2Audio(params);
      if (t2aCancelled.current) return;
      const id = res.data?.prompt_id;
      if (id) setT2aPromptId(id);
      setT2aResult(res.data);
      toast.success("Audio generated!");
    } catch (err) {
      if (t2aCancelled.current) return;
      toast.error(err.response?.data?.detail || err.message || "Something went wrong");
    } finally { setT2aAudioLoading(false); }
  };

  const handleGenerateCover = async () => {
    if (!coverFile) { toast.error("Upload a source audio file"); return; }
    coverCancelled.current = false;
    setCoverLoading(true);
    try {
      const res = await generateAudioCover({
        genre: coverGenre, language: coverLanguage,
        bpm: coverBpm, key: coverKey,
      });
      if (coverCancelled.current) return;
      const id = res.data?.prompt_id;
      if (id) setCoverPromptId(id);
      setCoverResult(res.data);
      toast.success("Cover generated!");
    } catch (err) {
      if (coverCancelled.current) return;
      toast.error(err.response?.data?.detail || err.message || "Something went wrong");
    } finally { setCoverLoading(false); }
  };

  const handleGenerateTTS = async () => {
    if (!ttsText.trim()) { toast.error("Enter text for voiceover"); return; }
    ttsCancelled.current = false;
    setTtsLoading(true);
    try {
      const res = await generateTTS({ text: ttsText, language: ttsLanguage, voice: ttsVoice });
      if (ttsCancelled.current) return;
      const id = res.data?.prompt_id;
      if (id) setTtsPromptId(id);
      setTtsResult(res.data);
      toast.success("Voiceover generated!");
    } catch (err) {
      if (ttsCancelled.current) return;
      toast.error(err.response?.data?.detail || err.message || "Something went wrong");
    } finally { setTtsLoading(false); }
  };

  const handleGeneratePrompts = async () => {
    if (!promptLyrics.trim()) { toast.error("Enter lyrics or concepts"); return; }
    promptCancelled.current = false;
    setPromptLoading(true);
    try {
      const res = await generatePrompts({
        lyrics: promptLyrics, story_concept: promptStory,
        theme_style: promptTheme, subject_scenes: promptScenes,
        language: promptLanguage,
      });
      if (promptCancelled.current) return;
      const id = res.data?.prompt_id;
      if (id) setPromptGenPromptId(id);
      setPromptResults(res.data);
      toast.success("Concepts created!");
    } catch (err) {
      if (promptCancelled.current) return;
      toast.error(err.response?.data?.detail || err.message || "Something went wrong");
    } finally { setPromptLoading(false); }
  };

  const handleGenerateVideo = async () => {
    if (!videoPrompts.trim()) { toast.error("Enter a concept prompt"); return; }
    videoCancelled.current = false;
    setVideoLoading(true);
    try {
      const res = await generateVideo({
        mode: videoMode, prompts: videoPrompts, fps: videoFps,
        resolution: videoResolution, seed: videoSeed, camera_motion: videoCamera,
      });
      if (videoCancelled.current) return;
      const id = res.data?.prompt_id;
      if (id) setVideoPromptId(id);
      setVideoResults((prev) => [...prev, res.data]);
      toast.success("Video generated!");
    } catch (err) {
      if (videoCancelled.current) return;
      toast.error(err.response?.data?.detail || err.message || "Something went wrong");
    } finally { setVideoLoading(false); }
  };

  const handleRunPipelineWithBrief = async (theme) => {
    if (!theme.trim()) { toast.error("Describe your vision in the chat first"); return; }
    setPipelineRunning(true);
    setPipelineStep(0);
    setPipelineStatus("Initializing...");
    setPipelineResult(null);
    const steps = ["Generating Audio...", "Creating Concepts...", "Rendering Video...", "Assembling Final..."];
    const params = { theme };
    try {
      for (let i = 0; i < steps.length; i++) {
        setPipelineStep(i);
        setPipelineStatus(steps[i]);
        await new Promise((r) => setTimeout(r, 1500));
      }
      setPipelineStep(4);
      setPipelineStatus("Complete!");
      const res = await runPipeline(params);
      setPipelineResult(res.data);
      toast.success("Your music video is ready!");
    } catch (e) {
      setPipelineRunning(false);
      setPipelineStatus("Failed");
    } finally { setPipelineRunning(false); }
  };

  const handleChatGenerate = (messages) => {
    const summary = messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n');
    briefRef.current = summary;
    setPipelineBrief(summary);
    setActiveTab('pipeline');
    setTimeout(() => handleRunPipelineWithBrief(briefRef.current), 500);
  };

  const handleRunPipeline = () => {
    handleRunPipelineWithBrief(pipelineBrief);
  };

  // === Cancel Handlers ===

  const cancelT2a = () => { t2aCancelled.current = true; if (t2aPromptId) cancelJob(t2aPromptId).catch(() => {}); setT2aAudioLoading(false); toast("Cancelled", { icon: "⏹" }); };
  const cancelCover = () => { coverCancelled.current = true; if (coverPromptId) cancelJob(coverPromptId).catch(() => {}); setCoverLoading(false); toast("Cancelled", { icon: "⏹" }); };
  const cancelTTS = () => { ttsCancelled.current = true; if (ttsPromptId) cancelJob(ttsPromptId).catch(() => {}); setTtsLoading(false); toast("Cancelled", { icon: "⏹" }); };
  const cancelPrompts = () => { promptCancelled.current = true; if (promptGenPromptId) cancelJob(promptGenPromptId).catch(() => {}); setPromptLoading(false); toast("Cancelled", { icon: "⏹" }); };
  const cancelVideo = () => { videoCancelled.current = true; if (videoPromptId) cancelJob(videoPromptId).catch(() => {}); setVideoLoading(false); toast("Cancelled", { icon: "⏹" }); };

  if (!project) return null;

  const renderTab = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatTab onGenerate={handleChatGenerate} disabled={pipelineRunning} />;
      case 'audio':
        return (
          <AudioTab
            mode={t2aMode} setMode={setT2aMode}
            genre={t2aGenre} setGenre={setT2aGenre}
            language={t2aLanguage} setLanguage={setT2aLanguage}
            lyrics={t2aLyrics} setLyrics={setT2aLyrics}
            theme={t2aTheme} setTheme={setT2aTheme}
            structure={t2aStructure} setStructure={setT2aStructure}
            bpm={t2aBpm} setBpm={setT2aBpm}
            keyScale={t2aKey} setKeyScale={setT2aKey}
            duration={t2aDuration} setDuration={setT2aDuration}
            generatedLyrics={t2aGeneratedLyrics}
            lyricsGenerating={t2aLyricsGenerating}
            result={t2aResult}
            loading={t2aAudioLoading}
            onGenerateLyrics={handleGenerateLyrics}
            onGenerate={handleGenerateAudio}
            onCancel={cancelT2a}
          />
        );
      case 'cover':
        return (
          <CoverTab
            file={coverFile} setFile={setCoverFile}
            genre={coverGenre} setGenre={setCoverGenre}
            language={coverLanguage} setLanguage={setCoverLanguage}
            bpm={coverBpm} setBpm={setCoverBpm}
            keyScale={coverKey} setKeyScale={setCoverKey}
            result={coverResult}
            loading={coverLoading}
            onGenerate={handleGenerateCover}
            onCancel={cancelCover}
          />
        );
      case 'tts':
        return (
          <TTSTab
            text={ttsText} setText={setTtsText}
            language={ttsLanguage} setLanguage={setTtsLanguage}
            voice={ttsVoice} setVoice={setTtsVoice}
            result={ttsResult}
            loading={ttsLoading}
            onGenerate={handleGenerateTTS}
            onCancel={cancelTTS}
          />
        );
      case 'concepts':
        return (
          <ConceptsTab
            lyrics={promptLyrics} setLyrics={setPromptLyrics}
            story={promptStory} setStory={setPromptStory}
            theme={promptTheme} setTheme={setPromptTheme}
            scenes={promptScenes} setScenes={setPromptScenes}
            language={promptLanguage} setLanguage={setPromptLanguage}
            results={promptResults}
            loading={promptLoading}
            onGenerate={handleGeneratePrompts}
            onCancel={cancelPrompts}
          />
        );
      case 'video':
        return (
          <VideoTab
            mode={videoMode} setMode={setVideoMode}
            image={videoImage} setImage={setVideoImage}
            prompts={videoPrompts} setPrompts={setVideoPrompts}
            fps={videoFps} setFps={setVideoFps}
            resolution={videoResolution} setResolution={setVideoResolution}
            seed={videoSeed} setSeed={setVideoSeed}
            camera={videoCamera} setCamera={setVideoCamera}
            results={videoResults}
            loading={videoLoading}
            onGenerate={handleGenerateVideo}
            onCancel={cancelVideo}
          />
        );
      case 'pipeline':
        return (
          <PipelineTab
            brief={pipelineBrief} setBrief={setPipelineBrief}
            result={pipelineResult}
            running={pipelineRunning}
            step={pipelineStep}
            status={pipelineStatus}
            onGenerate={handleRunPipeline}
          />
        );
      default:
        return null;
    }
  };

  return (
    <main className="relative min-h-screen bg-[#05010d]">
      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        projectName={project.name}
        onBack={() => router.push('/')}
        onSettings={() => setShowSettings(true)}
      />
      <div className="pt-28 px-4 md:px-8 max-w-6xl mx-auto min-h-screen">
        {renderTab()}
      </div>
      <SettingsPanel open={showSettings} onClose={() => setShowSettings(false)} />
    </main>
  );
}