import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import TabBar from '../components/workspace/TabBar';
import ChatPopup from '../components/shared/ChatPopup';
import LyricsTab from '../components/workspace/LyricsTab';
import MusicTab from '../components/workspace/MusicTab';
import CoverTab from '../components/workspace/CoverTab';
import TTSTab from '../components/workspace/TTSTab';
import ConceptsTab from '../components/workspace/ConceptsTab';
import VideoTab from '../components/workspace/VideoTab';
import PipelineTab from '../components/workspace/PipelineTab';
import TimelineTab from '../components/workspace/TimelineTab';
import SettingsPanel from '../components/shared/SettingsPanel';
import { getCurrentProject } from '../lib/projectStore';
import {
  generateText2Audio, generateAudioCover, generateTTS,
  generatePrompts, generateVideo, generateLyrics,
  cancelJob, getJobStatus,
} from '../lib/api';

export default function Workspace() {
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState('lyrics');
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
  const [t2aGenre, setT2aGenre] = useState(["Pop"]);
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
  const [t2aTimeSignature, setT2aTimeSignature] = useState("4");
  const [t2aCfgScale, setT2aCfgScale] = useState(2);
  const [t2aTemperature, setT2aTemperature] = useState(0.85);
  const [t2aTopP, setT2aTopP] = useState(0.9);
  const [t2aTopK, setT2aTopK] = useState(0);
  const [t2aSteps, setT2aSteps] = useState(30);
  const [t2aSamplingShift, setT2aSamplingShift] = useState(5);

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
  const [videoResolution, setVideoResolution] = useState("1920x1080");
  const [videoSeed, setVideoSeed] = useState(-1);
  const [videoCamera, setVideoCamera] = useState("Static");
  const [videoCfg, setVideoCfg] = useState(1);
  const [videoSampler, setVideoSampler] = useState("euler");
  const [videoCharMotion, setVideoCharMotion] = useState("");
  const [videoUseSrtDuration, setVideoUseSrtDuration] = useState(true);
  const [videoTailFrames, setVideoTailFrames] = useState(25);
  const [videoPreFrames, setVideoPreFrames] = useState(50);
  const [videoCrf, setVideoCrf] = useState(19);
  const [videoFormat, setVideoFormat] = useState("video/h264-mp4");
  const [videoLoras, setVideoLoras] = useState([{ file: "", strength: 1.0 }]);
  const [videoResults, setVideoResults] = useState([]);

  // Pipeline state
  const [pipelineResult, setPipelineResult] = useState(null);
  const [pipelineBrief, setPipelineBrief] = useState("");
  const [pipelineStep, setPipelineStep] = useState(0);
  const [pipelineStatus, setPipelineStatus] = useState("");

  useEffect(() => {
    const p = getCurrentProject();
    if (!p) { router.replace('/'); return; }
    setProject(p);
  }, []);

  // === Job Progress Polling ===

  const pollJobStatus = async (promptId, onProgress) => {
    while (true) {
      try {
        const res = await getJobStatus(promptId);
        const status = res.data;
        if (status.status === 'completed') return status;
        if (status.status === 'failed') throw new Error(status.error || 'Job failed');
        if (onProgress) onProgress(status);
        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {
        if (e.message?.includes('failed')) throw e;
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  };

  // === Generation Handlers ===

  const handleGenerateLyrics = async () => {
    if (!t2aTheme.trim()) { toast.error("Enter a theme or story"); return; }
    t2aCancelled.current = false;
    setT2aLyricsGenerating(true);
    try {
      const res = await generateLyrics({
        theme: t2aTheme, structure: t2aStructure,
        genre: t2aGenre.join(", "), language: t2aLanguage, duration: t2aDuration,
      });
      if (t2aCancelled.current) return;
      const lyrics = res.data.lyrics;
      setT2aGeneratedLyrics(lyrics);
      setT2aLyrics(lyrics);
      setPromptLyrics(lyrics);
      toast.success("Lyrics generated!");
    } catch (err) {
      if (t2aCancelled.current) return;
      toast.error(err.response?.data?.detail || err.message || "Lyrics generation failed");
    } finally { setT2aLyricsGenerating(false); }
  };

  const handleGenerateAudio = async () => {
    const params = {
      genre: t2aGenre.join(", "), language: t2aLanguage, bpm: t2aBpm,
      key: t2aKey, duration: t2aDuration,
      time_signature: t2aTimeSignature, cfg: t2aCfgScale,
      temperature: t2aTemperature, top_p: t2aTopP, top_k: t2aTopK,
      steps: t2aSteps, sampling_shift: t2aSamplingShift,
      lyrics: t2aLyrics,
      mode_type: "manual",
    };
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
        cfg: videoCfg, sampler: videoSampler, character_motion: videoCharMotion,
        use_srt_duration: videoUseSrtDuration, tail_loss_frames: videoTailFrames,
        pre_frames: videoPreFrames, crf: videoCrf, video_format: videoFormat,
        loras: videoLoras,
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

  // === Pipeline (Real Progress) ===

  const handleRunPipelineStep = async (stepName, apiCall, setStatus) => {
    setStatus(`Running ${stepName}...`);
    const res = await apiCall();
    const promptId = res.data?.prompt_id;
    if (promptId) {
      await pollJobStatus(promptId, (status) => {
        setStatus(`${stepName}: ${status.status || 'processing'}...`);
      });
    }
    return res.data;
  };

  // === Chat Action Handler ===

  const t2aResultRef = useRef(null);
  const videoResultsRef = useRef([]);
  useEffect(() => { t2aResultRef.current = t2aResult; }, [t2aResult]);
  useEffect(() => { videoResultsRef.current = videoResults; }, [videoResults]);

  const handleChatAction = async (action, addBotMessage) => {
    switch (action) {
      case 'New Video':
        setActiveTab('lyrics');
        if (addBotMessage) addBotMessage('Switched to Lyrics tab! Tell me about your song — genre, theme, mood. Then generate lyrics.', { actions: ['Generate Lyrics', 'Generate Music'] });
        break;
      case 'Cover Song':
        setActiveTab('cover');
        if (addBotMessage) addBotMessage('Switched to Cover tab! Upload your source audio file, set the genre and style, then click Generate Cover.', { actions: [] });
        break;
      case 'Generate Lyrics':
        await handleGenerateLyrics();
        if (addBotMessage) addBotMessage('Lyrics generated! Switch to the Music tab to generate audio.', { actions: ['Generate Music'] });
        break;
      case 'Generate Music':
        setActiveTab('music');
        await handleGenerateAudio();
        if (addBotMessage) {
          const result = t2aResultRef.current;
          const audioUrl = result?.audio_url || result?.url;
          if (audioUrl) addBotMessage('Audio generated!', { media: { type: 'audio', url: audioUrl }, actions: ['Generate Concepts', 'Generate Video'] });
          else addBotMessage('Audio generated! Check the Audio tab to preview.', { actions: ['Generate Concepts', 'Generate Video'] });
        }
        break;
      case 'Edit Lyrics':
        setActiveTab('lyrics');
        if (addBotMessage) addBotMessage('Edit your lyrics in the Lyrics tab, then switch to Music tab to generate audio.', { actions: ['Generate Music'] });
        break;
      case 'Generate Concepts':
        await handleGeneratePrompts();
        if (addBotMessage) addBotMessage('Visual concepts created! Check the Concepts tab, then generate your video.', { actions: ['Generate Video'] });
        setActiveTab('concepts');
        break;
      case 'Generate Video':
        await handleGenerateVideo();
        if (addBotMessage) {
          const last = videoResultsRef.current[0];
          const videoUrl = last?.video_url || last?.url;
          if (videoUrl) addBotMessage('Video generated!', { media: { type: 'video', url: videoUrl }, actions: ['Open Timeline'] });
          else addBotMessage('Video generated! Check the Video tab to preview.', { actions: ['Open Timeline'] });
        }
        setActiveTab('video');
        break;
      case 'Open Timeline':
        setActiveTab('timeline');
        if (addBotMessage) addBotMessage('Timeline & Publishing tab open. Add YouTube metadata, generate thumbnails, and publish!', { actions: [] });
        break;
      default:
        break;
    }
  };

  // === Full Pipeline Handler ===

  const handleRunPipeline = async () => {
    if (!pipelineBrief.trim()) { toast.error("Enter a vision brief first"); return; }
    setPipelineRunning(true);
    setPipelineStep(1);
    setPipelineStatus("Initializing pipeline...");
    try {
      setPipelineStatus("Generating audio...");
      const audioRes = await generateText2Audio({
        genre: t2aGenre, language: t2aLanguage, bpm: t2aBpm,
        key: t2aKey, duration: t2aDuration,
        time_signature: t2aTimeSignature, cfg: t2aCfgScale,
        temperature: t2aTemperature, top_p: t2aTopP, top_k: t2aTopK,
        steps: t2aSteps, sampling_shift: t2aSamplingShift,
        lyrics: pipelineBrief,
      });
      const audioId = audioRes.data?.prompt_id;
      if (audioId) await pollJobStatus(audioId, (s) => setPipelineStatus(`Audio: ${s.status || 'processing'}...`));
      setPipelineStep(2);

      setPipelineStatus("Creating concepts...");
      await generatePrompts({
        lyrics: pipelineBrief, theme_style: t2aGenre,
        story_concept: pipelineBrief, language: t2aLanguage,
      });
      setPipelineStep(3);

      setPipelineStatus("Generating video...");
      const videoRes = await generateVideo({
        mode: videoMode, prompts: pipelineBrief, fps: videoFps,
        resolution: videoResolution, seed: videoSeed, camera_motion: videoCamera,
        cfg: videoCfg, sampler: videoSampler, character_motion: videoCharMotion,
        crf: videoCrf, video_format: videoFormat, loras: videoLoras,
      });
      const videoId = videoRes.data?.prompt_id;
      if (videoId) await pollJobStatus(videoId, (s) => setPipelineStatus(`Video: ${s.status || 'processing'}...`));
      setPipelineStep(4);
      setPipelineStatus("Assembling final video...");
      setPipelineResult(videoRes.data);
      toast.success("Music video created!");
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || "Pipeline step failed");
    } finally {
      setPipelineRunning(false);
      setPipelineStep(0);
      setPipelineStatus("");
    }
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
      case 'lyrics':
        return (
          <LyricsTab
            mode={t2aMode} setMode={setT2aMode}
            genre={t2aGenre} setGenre={setT2aGenre}
            language={t2aLanguage} setLanguage={setT2aLanguage}
            lyrics={t2aLyrics} setLyrics={setT2aLyrics}
            theme={t2aTheme} setTheme={setT2aTheme}
            structure={t2aStructure} setStructure={setT2aStructure}
            generatedLyrics={t2aGeneratedLyrics}
            lyricsGenerating={t2aLyricsGenerating}
            onGenerateLyrics={handleGenerateLyrics}
          />
        );
      case 'music':
        return (
          <MusicTab
            genre={t2aGenre} setGenre={setT2aGenre}
            lyrics={t2aLyrics} setLyrics={setT2aLyrics}
            bpm={t2aBpm} setBpm={setT2aBpm}
            keyScale={t2aKey} setKeyScale={setT2aKey}
            duration={t2aDuration} setDuration={setT2aDuration}
            result={t2aResult}
            loading={t2aAudioLoading}
            timeSignature={t2aTimeSignature} setTimeSignature={setT2aTimeSignature}
            cfgScale={t2aCfgScale} setCfgScale={setT2aCfgScale}
            temperature={t2aTemperature} setTemperature={setT2aTemperature}
            topP={t2aTopP} setTopP={setT2aTopP}
            topK={t2aTopK} setTopK={setT2aTopK}
            steps={t2aSteps} setSteps={setT2aSteps}
            samplingShift={t2aSamplingShift} setSamplingShift={setT2aSamplingShift}
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
            cfg={videoCfg} setCfg={setVideoCfg}
            sampler={videoSampler} setSampler={setVideoSampler}
            characterMotion={videoCharMotion} setCharacterMotion={setVideoCharMotion}
            useSrtDuration={videoUseSrtDuration} setUseSrtDuration={setVideoUseSrtDuration}
            tailLossFrames={videoTailFrames} setTailLossFrames={setVideoTailFrames}
            preFrames={videoPreFrames} setPreFrames={setVideoPreFrames}
            crf={videoCrf} setCrf={setVideoCrf}
            videoFormat={videoFormat} setVideoFormat={setVideoFormat}
            loras={videoLoras} setLoras={setVideoLoras}
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
      case 'timeline':
        return (
          <TimelineTab
            videoResult={videoResults[videoResults.length - 1]}
            audioResult={t2aResult || coverResult}
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
      <ChatPopup onAction={handleChatAction} />
      <SettingsPanel open={showSettings} onClose={() => setShowSettings(false)} />
    </main>
  );
}