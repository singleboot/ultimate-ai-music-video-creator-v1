'use client';

import React, { useCallback, useRef, useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useReactFlow,
  getSmoothStepPath,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import useWorkflowStore from '../../store/workflowStore';

import { GenreNode, LanguageNode, ThemeNode, BPMNode, DurationNode, AudioFileNode, LyricsInputNode, SongSettingsNode, StoryConceptNode, StyleThemeNode, SubjectLocationsNode, GutsSettingsNode, VisualStylesNode, YouTubeAudioNode, BRollFocusNode } from '../nodes/inputNodes';
import { LyricsGeneratorNode, SmartLyricsNode, MusicGeneratorNode, CoverGeneratorNode, TTSGeneratorNode, LLMTextGenNode, PromptCreatorNode, BRollPromptCreatorNode, BRollVideoCreatorNode, T2VGeneratorNode, I2VGeneratorNode, VideoWorkflowSettingsNode, LTXLoRASettingsNode, ZImageLoRASettingsNode, VideoAdvancedSettingsNode, ImageGeneratorNode, VideoAudioCombinerNode, VideoUpscalerNode } from '../nodes/processingNodes';
import { AudioPlayerNode, VideoPlayerNode, ImagePreviewNode, TextPreviewNode, DebugJsonNode } from '../nodes/outputNodes';

function DeleteButtonEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd }) {
  const [hover, setHover] = useState(false);
  const [edgePath, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  return (
    <g 
      onMouseEnter={() => setHover(true)} 
      onMouseLeave={() => setHover(false)}
      style={{ cursor: 'pointer' }}
    >
      {/* Invisible thick path to expand hover/click area */}
      <path 
        d={edgePath} 
        style={{ stroke: 'transparent', strokeWidth: 15, fill: 'none', cursor: 'pointer' }} 
      />
      <path d={edgePath} style={{ ...style, strokeWidth: hover ? 4 : 2, transition: 'stroke-width 0.15s' }} markerEnd={markerEnd} fill="none" />
      {hover && (
        <g 
          onClick={(e) => {
            e.stopPropagation();
            useWorkflowStore.getState().onEdgesChange([{ type: 'remove', id }]);
          }} 
          style={{ cursor: 'pointer' }}
        >
          <circle cx={labelX} cy={labelY} r={12} fill="transparent" />
          <circle cx={labelX} cy={labelY} r={10} fill="#ef4444" stroke="#fff" strokeWidth={2} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
          <text x={labelX} y={labelY + 4} textAnchor="middle" fill="#fff" fontSize={12} fontWeight={700} style={{ pointerEvents: 'none', userSelect: 'none' }}>×</text>
        </g>
      )}
    </g>
  );
}

const edgeTypes = { smoothstep: DeleteButtonEdge };

const nodeTypes = {
  GenreNode,
  LanguageNode,
  ThemeNode,
  BPMNode,
  DurationNode,
  AudioFileNode,
  LyricsInputNode,
  SongSettingsNode,
  StoryConceptNode,
  StyleThemeNode,
  SubjectLocationsNode,
  GutsSettingsNode,
  LyricsGeneratorNode,
  SmartLyricsNode,
  MusicGeneratorNode,
  CoverGeneratorNode,
  TTSGeneratorNode,
  LLMTextGenNode,
  PromptCreatorNode,
  BRollPromptCreatorNode,
  T2VGeneratorNode,
  I2VGeneratorNode,
  VideoWorkflowSettingsNode,
  LTXLoRASettingsNode,
  ZImageLoRASettingsNode,
  VideoAdvancedSettingsNode,
  ImageGeneratorNode,
  VideoAudioCombinerNode,
  VideoUpscalerNode,
  AudioPlayerNode,
  VideoPlayerNode,
  ImagePreviewNode,
  TextPreviewNode,
  DebugJsonNode,
  VisualStylesNode,
  YouTubeAudioNode,
  BRollFocusNode,
  BRollVideoCreatorNode,
};

const NODE_LABELS = {
  GenreNode: 'Genre', LanguageNode: 'Language', ThemeNode: 'Theme',
  BPMNode: 'BPM', DurationNode: 'Duration', AudioFileNode: 'Audio File',
  LyricsInputNode: 'Lyrics Input', SongSettingsNode: 'Song Settings',
  StoryConceptNode: 'Story Concept Input', StyleThemeNode: 'Style & Theme Input',
  SubjectLocationsNode: 'Subject & Locations Input',
  GutsSettingsNode: 'Guts Settings',
  LyricsGeneratorNode: 'Lyrics Generator', SmartLyricsNode: 'Smart Lyrics Studio', MusicGeneratorNode: 'Music Generator',
  CoverGeneratorNode: 'Cover Generator',   TTSGeneratorNode: 'TTS Voiceover',
  LLMTextGenNode: 'Audio Analyzer',  PromptCreatorNode: 'Prompt Creator', BRollPromptCreatorNode: 'B-Roll Prompt Creator',
  BRollVideoCreatorNode: 'B-Roll Video Creator', BRollFocusNode: 'B-Roll Focus',
  T2VGeneratorNode: 'Text-to-Video Generator', I2VGeneratorNode: 'Image-to-Video Generator',
  VideoWorkflowSettingsNode: 'Video Workflow Settings',
  LTXLoRASettingsNode: 'LTX LoRA Settings', ZImageLoRASettingsNode: 'Z-Image LoRA Settings',
  VideoAdvancedSettingsNode: 'Video Advanced Settings',
  ImageGeneratorNode: 'Image Generator',
  VideoAudioCombinerNode: 'Video & Audio Combiner',
  VideoUpscalerNode: 'Video Upscaler',
  AudioPlayerNode: 'Audio Player', VideoPlayerNode: 'Video Player',
  ImagePreviewNode: 'Image Preview', TextPreviewNode: 'Text Preview',
  DebugJsonNode: 'ComfyUI JSON Debugger',
  VisualStylesNode: 'Visual Style Presets',
  YouTubeAudioNode: 'YouTube Audio Source',
};

// Maps (nodeType → handleId → dataKey)
const HANDLE_KEY = {
  GenreNode: { 'output-0': 'genre' },
  LanguageNode: { 'output-0': 'language' },
  ThemeNode: { 'output-0': 'theme' },
  BPMNode: { 'output-0': 'bpm' },
  DurationNode: { 'output-0': 'duration' },
  AudioFileNode: { 'output-0': 'audio', 'output-1': 'file' },
  LyricsInputNode: { 'output-0': 'lyrics' },
  SongSettingsNode: { 'output-0': 'songSettings' },
  GutsSettingsNode: { 'output-0': 'gutsSettings' },
  StoryConceptNode: { 'input-0': 'context', 'output-0': 'story_concept' },
  StyleThemeNode: { 'input-0': 'context', 'output-0': 'theme_style' },
  VisualStylesNode: { 'output-0': 'theme_style' },
  YouTubeAudioNode: { 'output-0': 'audio', 'output-1': 'file' },
  SubjectLocationsNode: { 'input-0': 'context', 'output-0': 'subject_scenes' },
  LyricsGeneratorNode: { 'input-0': 'theme', 'input-1': 'genre', 'input-2': 'songSettings', 'output-0': 'lyrics' },
  SmartLyricsNode: { 'input-0': 'theme', 'input-1': 'lyrics', 'output-0': 'lyrics' },
  MusicGeneratorNode: { 'input-0': 'params', 'input-1': 'instruments', 'input-2': 'settings', 'output-0': 'audio', 'output-1': 'debug' },
  CoverGeneratorNode: { 'input-0': 'audio', 'input-1': 'genre', 'input-2': 'bpm', 'output-0': 'audio' },
  TTSGeneratorNode: { 'input-0': 'text', 'input-1': 'language', 'input-2': 'voice', 'output-0': 'audio' },
  LLMTextGenNode: { 'input-0': 'audio', 'output-0': 'text' },
  PromptCreatorNode: { 'input-0': 'params', 'input-1': 'story_concept', 'input-2': 'theme_style', 'input-3': 'subject_scenes', 'input-4': 'guts_settings', 'input-5': 'lyrics', 'output-0': 'prompts' },
  BRollPromptCreatorNode: { 'input-0': 'prompts', 'input-1': 'text', 'output-0': 'prompts' },
  BRollFocusNode: { 'text': 'text' },
  BRollVideoCreatorNode: { 'input-0': 'prompts', 'output-0': 'video' },
  T2VGeneratorNode: { 'input-0': 'prompts', 'input-1': 'settings', 'input-2': 'loras', 'input-3': 'advanced', 'output-0': 'video', 'output-1': 'combiner' },
  I2VGeneratorNode: { 'input-0': 'prompts', 'input-1': 'image', 'input-2': 'settings', 'input-3': 'loras', 'input-4': 'z-loras', 'input-5': 'advanced', 'output-0': 'video', 'output-1': 'image', 'output-2': 'combiner' },
  VideoWorkflowSettingsNode: { 'output-0': 'settings' },
  LTXLoRASettingsNode: { 'output-0': 'loras' },
  ZImageLoRASettingsNode: { 'output-0': 'z-loras' },
  VideoAdvancedSettingsNode: { 'output-0': 'advanced' },
  VideoAudioCombinerNode: { 'input-0': 'video', 'input-1': 'audio', 'output-0': 'video' },
  VideoUpscalerNode: { 'video': 'video' },
  ImageGeneratorNode: { 'input-0': 'prompts', 'input-1': 'params', 'output-0': 'image' },
  AudioPlayerNode: { 'input-0': 'audio' },
  VideoPlayerNode: { 'input-0': 'video' },
  ImagePreviewNode: { 'input-0': 'image' },
  TextPreviewNode: { 'input-0': 'text/lyrics' },
  DebugJsonNode: { 'input-0': 'debug' },
};

// Output dataKey → compatible target suggestions
const SUGGESTIONS = {
  genre: [
    { type: 'LyricsGeneratorNode', handle: 'input-1', label: 'Lyrics Generator' },
    { type: 'CoverGeneratorNode', handle: 'input-1', label: 'Cover Generator' },
  ],
  language: [
    { type: 'TTSGeneratorNode', handle: 'input-1', label: 'TTS Voiceover' },
  ],
  theme: [
    { type: 'LyricsGeneratorNode', handle: 'input-0', label: 'Lyrics Generator' },
    { type: 'SmartLyricsNode', handle: 'input-0', label: 'Smart Lyrics Studio' },
    { type: 'PromptCreatorNode', handle: 'input-0', label: 'Prompt Creator' },
  ],
  bpm: [
    { type: 'CoverGeneratorNode', handle: 'input-2', label: 'Cover Generator' },
  ],
  duration: [],
  songSettings: [
    { type: 'MusicGeneratorNode', handle: 'input-2', label: 'Music Generator' },
    { type: 'LyricsGeneratorNode', handle: 'input-2', label: 'Lyrics Generator' },
  ],
  audio: [
    { type: 'CREATE_FULL_PIPELINE', handle: 'input-0', label: '⚡ Auto-Create Downstream Video Pipeline' },
    { type: 'LLMTextGenNode', handle: 'input-0', label: 'Audio Analyzer' },
    { type: 'AudioPlayerNode', handle: 'input-0', label: 'Audio Player' },
    { type: 'CoverGeneratorNode', handle: 'input-0', label: 'Cover Generator' },
    { type: 'PromptCreatorNode', handle: 'input-0', label: 'Prompt Creator (sync BPM)' },
    { type: 'VideoAudioCombinerNode', handle: 'input-1', label: 'Video & Audio Combiner' },
  ],
  debug: [
    { type: 'TextPreviewNode', handle: 'input-0', label: 'Text Preview' },
  ],
  gutsSettings: [
    { type: 'PromptCreatorNode', handle: 'input-4', label: 'Prompt Creator (Settings)' },
  ],
  file: [],
  lyrics: [
    { type: 'MusicGeneratorNode', handle: 'input-0', label: 'Music Generator' },
    { type: 'SmartLyricsNode', handle: 'input-1', label: 'Smart Lyrics Studio' },
    { type: 'PromptCreatorNode', handle: 'input-5', label: 'Prompt Creator' },
    { type: 'StoryConceptNode', handle: 'input-0', label: 'Story Concept (Context)' },
  ],
  text: [
    { type: 'TTSGeneratorNode', handle: 'input-0', label: 'TTS Voiceover' },
    { type: 'TextPreviewNode', handle: 'input-0', label: 'Text Preview' },
    { type: 'BRollPromptCreatorNode', handle: 'input-1', label: 'B-Roll Prompt Creator' },
  ],
  prompts: [
    { type: 'BRollPromptCreatorNode', handle: 'input-0', label: 'B-Roll Prompt Creator' },
    { type: 'BRollVideoCreatorNode', handle: 'input-0', label: 'B-Roll Video Creator' },
    { type: 'T2VGeneratorNode', handle: 'input-0', label: 'T2V Generator' },
    { type: 'I2VGeneratorNode', handle: 'input-0', label: 'I2V Generator' },
    { type: 'ImageGeneratorNode', handle: 'input-0', label: 'Image Generator' },
  ],
  video: [
    { type: 'VideoPlayerNode', handle: 'input-0', label: 'Video Player' },
    { type: 'VideoAudioCombinerNode', handle: 'input-0', label: 'Video & Audio Combiner' },
    { type: 'VideoUpscalerNode', handle: 'video', label: 'Video Upscaler' },
  ],
  image: [
    { type: 'ImagePreviewNode', handle: 'input-0', label: 'Image Preview' },
    { type: 'I2VGeneratorNode', handle: 'input-1', label: 'Video (I2V)' },
  ],
  settings: [
    { type: 'T2VGeneratorNode', handle: 'input-1', label: 'T2V Generator' },
    { type: 'I2VGeneratorNode', handle: 'input-2', label: 'I2V Generator' },
  ],
  loras: [
    { type: 'T2VGeneratorNode', handle: 'input-2', label: 'T2V Generator' },
    { type: 'I2VGeneratorNode', handle: 'input-3', label: 'I2V Generator' },
  ],
  'z-loras': [
    { type: 'I2VGeneratorNode', handle: 'input-4', label: 'I2V Generator' },
  ],
  advanced: [
    { type: 'T2VGeneratorNode', handle: 'input-3', label: 'T2V Generator' },
    { type: 'I2VGeneratorNode', handle: 'input-5', label: 'I2V Generator' },
  ],
  combiner: [
    { type: 'VideoAudioCombinerNode', handle: 'input-0', label: 'Video & Audio Combiner' },
    { type: 'VideoUpscalerNode', handle: 'video', label: 'Video Upscaler' },
  ],
  'text/lyrics': [
    { type: 'TextPreviewNode', handle: 'input-0', label: 'Text Preview' },
  ],
  story_concept: [
    { type: 'PromptCreatorNode', handle: 'input-1', label: 'Prompt Creator (Story)' },
    { type: 'StyleThemeNode', handle: 'input-0', label: 'Style & Theme (Context)' },
  ],
  theme_style: [
    { type: 'PromptCreatorNode', handle: 'input-2', label: 'Prompt Creator (Style)' },
    { type: 'SubjectLocationsNode', handle: 'input-0', label: 'Subject & Locations (Context)' },
  ],
  subject_scenes: [
    { type: 'PromptCreatorNode', handle: 'input-3', label: 'Prompt Creator (Locations)' },
  ],
};

// Input dataKey → compatible source suggestions (reverse)
const INPUT_SUGGESTIONS = {

  theme: [
    { type: 'ThemeNode', handle: 'output-0', label: 'Theme' },
    { type: 'LyricsGeneratorNode', handle: 'output-0', label: 'Lyrics Generator' },
  ],
  genre: [
    { type: 'GenreNode', handle: 'output-0', label: 'Genre' },
  ],
  language: [
    { type: 'LanguageNode', handle: 'output-0', label: 'Language' },
  ],
  bpm: [
    { type: 'BPMNode', handle: 'output-0', label: 'BPM' },
  ],
  duration: [
    { type: 'DurationNode', handle: 'output-0', label: 'Duration' },
  ],
  audio: [
    { type: 'YouTubeAudioNode', handle: 'output-0', label: 'YouTube Audio Source' },
    { type: 'AudioFileNode', handle: 'output-0', label: 'Audio File' },
    { type: 'MusicGeneratorNode', handle: 'output-0', label: 'Music Generator' },
    { type: 'CoverGeneratorNode', handle: 'output-0', label: 'Cover Generator' },
    { type: 'TTSGeneratorNode', handle: 'output-0', label: 'TTS Voiceover' },
  ],
  lyrics: [
    { type: 'LyricsInputNode', handle: 'output-0', label: 'Lyrics Input' },
    { type: 'LyricsGeneratorNode', handle: 'output-0', label: 'Lyrics Generator' },
    { type: 'SmartLyricsNode', handle: 'output-0', label: 'Smart Lyrics Studio' },
  ],
  text: [
    { type: 'BRollFocusNode', handle: 'text', label: 'B-Roll Focus' },
    { type: 'LyricsInputNode', handle: 'output-0', label: 'Lyrics Input' },
    { type: 'LLMTextGenNode', handle: 'output-0', label: 'Audio Analyzer' },
  ],
  guts_settings: [
    { type: 'GutsSettingsNode', handle: 'output-0', label: 'Guts Settings' },
  ],
  params: [
    { type: 'GutsSettingsNode', handle: 'output-0', label: 'Guts Settings' },
    { type: 'SongSettingsNode', handle: 'output-0', label: 'Song Settings' },
  ],
  settings: [
    { type: 'SongSettingsNode', handle: 'output-0', label: 'Song Settings' },
    { type: 'VideoWorkflowSettingsNode', handle: 'output-0', label: 'Video Workflow Settings' },
  ],
  loras: [
    { type: 'LTXLoRASettingsNode', handle: 'output-0', label: 'LTX LoRA Settings' },
  ],
  'z-loras': [
    { type: 'ZImageLoRASettingsNode', handle: 'output-0', label: 'Z-Image LoRA Settings' },
  ],
  advanced: [
    { type: 'VideoAdvancedSettingsNode', handle: 'output-0', label: 'Video Advanced Settings' },
  ],
  instruments: [
    { type: 'LLMTextGenNode', handle: 'output-0', label: 'Audio Analyzer' },
  ],
  prompts: [
    { type: 'PromptCreatorNode', handle: 'output-0', label: 'Prompt Creator' },
    { type: 'BRollPromptCreatorNode', handle: 'output-0', label: 'B-Roll Prompt Creator' },
  ],
  video: [
    { type: 'T2VGeneratorNode', handle: 'output-0', label: 'T2V Generator' },
    { type: 'I2VGeneratorNode', handle: 'output-0', label: 'I2V Generator' },
    { type: 'VideoAudioCombinerNode', handle: 'output-0', label: 'Video & Audio Combiner' },
  ],
  image: [
    { type: 'ImageGeneratorNode', handle: 'output-0', label: 'Image Generator' },
  ],
  story: [
    { type: 'ThemeNode', handle: 'output-0', label: 'Theme' },
  ],
  story_concept: [
    { type: 'StoryConceptNode', handle: 'output-0', label: 'Story Concept Override' },
  ],
  theme_style: [
    { type: 'StyleThemeNode', handle: 'output-0', label: 'Style & Theme Override' },
  ],
  subject_scenes: [
    { type: 'SubjectLocationsNode', handle: 'output-0', label: 'Subject & Locations Override' },
  ],
  voice: [],
  context: [
    { type: 'LyricsGeneratorNode', handle: 'output-0', label: 'Lyrics Generator' },
    { type: 'LyricsInputNode', handle: 'output-0', label: 'Lyrics Input' },
    { type: 'StoryConceptNode', handle: 'output-0', label: 'Story Concept Override' },
    { type: 'StyleThemeNode', handle: 'output-0', label: 'Style & Theme Override' },
  ],
};

let nodeIdCounter = 0;
function getNodeId() {
  nodeIdCounter += 1;
  return `node_${Date.now()}_${nodeIdCounter}`;
}

function addPromptCreatorPipeline(addNode, basePos) {
  const promptId = getNodeId();
  const storyId = getNodeId();
  const styleId = getNodeId();
  const scenesId = getNodeId();
  const gutsId = getNodeId();

  addNode({ id: promptId, type: 'PromptCreatorNode', position: basePos, data: {} });
  addNode({ id: storyId, type: 'StoryConceptNode', position: { x: basePos.x - 470, y: basePos.y - 100 }, data: {} });
  addNode({ id: styleId, type: 'StyleThemeNode', position: { x: basePos.x - 470, y: basePos.y + 70 }, data: {} });
  addNode({ id: scenesId, type: 'SubjectLocationsNode', position: { x: basePos.x - 470, y: basePos.y + 240 }, data: {} });
  addNode({ id: gutsId, type: 'GutsSettingsNode', position: { x: basePos.x - 240, y: basePos.y + 70 }, data: {} });

  setTimeout(() => {
    const edges = [
      {
        id: `edge_${Date.now()}_p1`,
        source: storyId,
        sourceHandle: 'output-0',
        target: styleId,
        targetHandle: 'input-0',
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
      {
        id: `edge_${Date.now()}_p2`,
        source: styleId,
        sourceHandle: 'output-0',
        target: scenesId,
        targetHandle: 'input-0',
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
      {
        id: `edge_${Date.now()}_p3`,
        source: storyId,
        sourceHandle: 'output-0',
        target: promptId,
        targetHandle: 'input-1',
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
      {
        id: `edge_${Date.now()}_p4`,
        source: styleId,
        sourceHandle: 'output-0',
        target: promptId,
        targetHandle: 'input-2',
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
      {
        id: `edge_${Date.now()}_p5`,
        source: scenesId,
        sourceHandle: 'output-0',
        target: promptId,
        targetHandle: 'input-3',
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
      {
        id: `edge_${Date.now()}_p6`,
        source: gutsId,
        sourceHandle: 'output-0',
        target: promptId,
        targetHandle: 'input-4',
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
    ];
    useWorkflowStore.getState().onEdgesChange(edges.map(e => ({ type: 'add', item: e })));
  }, 50);

  return promptId;
}

function addVideoGeneratorPipeline(addNode, basePos, type) {
  const genId = getNodeId();
  const settingsId = getNodeId();
  const ltxLoRAId = getNodeId();
  const zImageLoRAId = getNodeId();
  const advancedId = getNodeId();
  const combinerId = getNodeId();
  const videoPlayId = getNodeId();
  const isT2V = type === 'T2VGeneratorNode';

  addNode({ id: genId, type, position: basePos, data: {} });
  addNode({ id: settingsId, type: 'VideoWorkflowSettingsNode', position: { x: basePos.x - 300, y: basePos.y - 250 }, data: {} });
  addNode({ id: ltxLoRAId, type: 'LTXLoRASettingsNode', position: { x: basePos.x - 300, y: basePos.y - 50 }, data: {} });
  if (!isT2V) {
    addNode({ id: zImageLoRAId, type: 'ZImageLoRASettingsNode', position: { x: basePos.x - 300, y: basePos.y + 150 }, data: {} });
  }
  addNode({ id: advancedId, type: 'VideoAdvancedSettingsNode', position: { x: basePos.x - 600, y: basePos.y }, data: {} });
  addNode({ id: combinerId, type: 'VideoAudioCombinerNode', position: { x: basePos.x + 300, y: basePos.y }, data: {} });
  addNode({ id: videoPlayId, type: 'VideoPlayerNode', position: { x: basePos.x + 600, y: basePos.y }, data: {} });

  let imagePrevId = null;
  if (!isT2V) {
    imagePrevId = getNodeId();
    addNode({ id: imagePrevId, type: 'ImagePreviewNode', position: { x: basePos.x + 300, y: basePos.y + 200 }, data: {} });
  }

  setTimeout(() => {
    const settingsTargetHandle = isT2V ? 'input-1' : 'input-2';
    const lorasTargetHandle = isT2V ? 'input-2' : 'input-3';
    const zLoRAsTargetHandle = isT2V ? null : 'input-4';
    const advancedTargetHandle = isT2V ? 'input-3' : 'input-5';
    const combinerSourceHandle = isT2V ? 'output-1' : 'output-2';
 
    const edges = [
      {
        id: `edge_${Date.now()}_v1`,
        source: settingsId,
        sourceHandle: 'output-0',
        target: genId,
        targetHandle: settingsTargetHandle,
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
      {
        id: `edge_${Date.now()}_lora`,
        source: ltxLoRAId,
        sourceHandle: 'output-0',
        target: genId,
        targetHandle: lorasTargetHandle,
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
      {
        id: `edge_${Date.now()}_v2`,
        source: advancedId,
        sourceHandle: 'output-0',
        target: genId,
        targetHandle: advancedTargetHandle,
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
      {
        id: `edge_${Date.now()}_v3`,
        source: genId,
        sourceHandle: combinerSourceHandle,
        target: combinerId,
        targetHandle: 'input-0',
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
      {
        id: `edge_${Date.now()}_v5`,
        source: combinerId,
        sourceHandle: 'output-0',
        target: videoPlayId,
        targetHandle: 'input-0',
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
    ];
 
    if (!isT2V) {
      edges.push({
        id: `edge_${Date.now()}_zlora`,
        source: zImageLoRAId,
        sourceHandle: 'output-0',
        target: genId,
        targetHandle: zLoRAsTargetHandle,
        type: 'smoothstep',
        style: { stroke: '#7c3aed', strokeWidth: 2 },
      });
    }

    if (imagePrevId) {
      edges.push({
        id: `edge_${Date.now()}_v4`,
        source: genId,
        sourceHandle: 'output-1',
        target: imagePrevId,
        targetHandle: 'input-0',
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      });
    }

    useWorkflowStore.getState().onEdgesChange(edges.map(e => ({ type: 'add', item: e })));
  }, 50);

  return genId;
}

function addMusicGeneratorPipeline(addNode, basePos) {
  const genId = getNodeId();
  const genreId = getNodeId();
  const themeId = getNodeId();
  const settingsId = getNodeId();
  const lyricsId = getNodeId();
  const playerId = getNodeId();

  addNode({ id: genId, type: 'MusicGeneratorNode', position: basePos, data: {} });
  addNode({ id: genreId, type: 'GenreNode', position: { x: basePos.x - 600, y: basePos.y - 100 }, data: {} });
  addNode({ id: themeId, type: 'ThemeNode', position: { x: basePos.x - 600, y: basePos.y + 50 }, data: {} });
  addNode({ id: settingsId, type: 'SongSettingsNode', position: { x: basePos.x - 600, y: basePos.y + 200 }, data: {} });
  addNode({ id: lyricsId, type: 'LyricsGeneratorNode', position: { x: basePos.x - 300, y: basePos.y }, data: {} });
  addNode({ id: playerId, type: 'AudioPlayerNode', position: { x: basePos.x + 300, y: basePos.y }, data: {} });

  setTimeout(() => {
    const edges = [
      {
        id: `edge_${Date.now()}_m1`,
        source: genreId,
        sourceHandle: 'output-0',
        target: lyricsId,
        targetHandle: 'input-1',
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
      {
        id: `edge_${Date.now()}_m2`,
        source: themeId,
        sourceHandle: 'output-0',
        target: lyricsId,
        targetHandle: 'input-0',
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
      {
        id: `edge_${Date.now()}_m3`,
        source: settingsId,
        sourceHandle: 'output-0',
        target: lyricsId,
        targetHandle: 'input-2',
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
      {
        id: `edge_${Date.now()}_m4`,
        source: settingsId,
        sourceHandle: 'output-0',
        target: genId,
        targetHandle: 'input-2',
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
      {
        id: `edge_${Date.now()}_m5`,
        source: lyricsId,
        sourceHandle: 'output-0',
        target: genId,
        targetHandle: 'input-0',
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
      {
        id: `edge_${Date.now()}_m6`,
        source: genId,
        sourceHandle: 'output-0',
        target: playerId,
        targetHandle: 'input-0',
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
    ];
    useWorkflowStore.getState().onEdgesChange(edges.map(e => ({ type: 'add', item: e })));
  }, 50);

  return genId;
}

function addLyricsGeneratorPipeline(addNode, basePos) {
  const genId = getNodeId();
  const themeId = getNodeId();
  const genreId = getNodeId();
  const settingsId = getNodeId();
  const previewId = getNodeId();

  addNode({ id: genId, type: 'LyricsGeneratorNode', position: basePos, data: {} });
  addNode({ id: themeId, type: 'ThemeNode', position: { x: basePos.x - 300, y: basePos.y - 160 }, data: {} });
  addNode({ id: genreId, type: 'GenreNode', position: { x: basePos.x - 300, y: basePos.y - 30 }, data: {} });
  addNode({ id: settingsId, type: 'SongSettingsNode', position: { x: basePos.x - 300, y: basePos.y + 100 }, data: {} });
  addNode({ id: previewId, type: 'TextPreviewNode', position: { x: basePos.x + 300, y: basePos.y }, data: {} });

  setTimeout(() => {
    const edges = [
      {
        id: `edge_${Date.now()}_l1`,
        source: themeId,
        sourceHandle: 'output-0',
        target: genId,
        targetHandle: 'input-0',
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
      {
        id: `edge_${Date.now()}_l2`,
        source: genreId,
        sourceHandle: 'output-0',
        target: genId,
        targetHandle: 'input-1',
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
      {
        id: `edge_${Date.now()}_l3`,
        source: settingsId,
        sourceHandle: 'output-0',
        target: genId,
        targetHandle: 'input-2',
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
      {
        id: `edge_${Date.now()}_l4`,
        source: genId,
        sourceHandle: 'output-0',
        target: previewId,
        targetHandle: 'input-0',
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
    ];
    useWorkflowStore.getState().onEdgesChange(edges.map(e => ({ type: 'add', item: e })));
  }, 50);

  return genId;
}

function addTTSGeneratorPipeline(addNode, basePos) {
  const genId = getNodeId();
  const inputId = getNodeId();
  const playerId = getNodeId();

  addNode({ id: genId, type: 'TTSGeneratorNode', position: basePos, data: {} });
  addNode({ id: inputId, type: 'LyricsInputNode', position: { x: basePos.x - 300, y: basePos.y }, data: {} });
  addNode({ id: playerId, type: 'AudioPlayerNode', position: { x: basePos.x + 300, y: basePos.y }, data: {} });

  setTimeout(() => {
    const edges = [
      {
        id: `edge_${Date.now()}_t1`,
        source: inputId,
        sourceHandle: 'output-0',
        target: genId,
        targetHandle: 'input-0',
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
      {
        id: `edge_${Date.now()}_t2`,
        source: genId,
        sourceHandle: 'output-0',
        target: playerId,
        targetHandle: 'input-0',
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
    ];
    useWorkflowStore.getState().onEdgesChange(edges.map(e => ({ type: 'add', item: e })));
  }, 50);

  return genId;
}

function addCoverGeneratorPipeline(addNode, basePos) {
  const genId = getNodeId();
  const fileId = getNodeId();
  const genreId = getNodeId();
  const bpmId = getNodeId();
  const playerId = getNodeId();

  addNode({ id: genId, type: 'CoverGeneratorNode', position: basePos, data: {} });
  addNode({ id: fileId, type: 'AudioFileNode', position: { x: basePos.x - 300, y: basePos.y - 120 }, data: {} });
  addNode({ id: genreId, type: 'GenreNode', position: { x: basePos.x - 300, y: basePos.y }, data: {} });
  addNode({ id: bpmId, type: 'BPMNode', position: { x: basePos.x - 300, y: basePos.y + 120 }, data: {} });
  addNode({ id: playerId, type: 'AudioPlayerNode', position: { x: basePos.x + 300, y: basePos.y }, data: {} });

  setTimeout(() => {
    const edges = [
      {
        id: `edge_${Date.now()}_c1`,
        source: fileId,
        sourceHandle: 'output-0',
        target: genId,
        targetHandle: 'input-0',
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
      {
        id: `edge_${Date.now()}_c2`,
        source: genreId,
        sourceHandle: 'output-0',
        target: genId,
        targetHandle: 'input-1',
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
      {
        id: `edge_${Date.now()}_c3`,
        source: bpmId,
        sourceHandle: 'output-0',
        target: genId,
        targetHandle: 'input-2',
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
      {
        id: `edge_${Date.now()}_c4`,
        source: genId,
        sourceHandle: 'output-0',
        target: playerId,
        targetHandle: 'input-0',
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
    ];
    useWorkflowStore.getState().onEdgesChange(edges.map(e => ({ type: 'add', item: e })));
  }, 50);

  return genId;
}

function addLLMTextGenPipeline(addNode, basePos) {
  const genId = getNodeId();
  const fileId = getNodeId();
  const previewId = getNodeId();

  addNode({ id: genId, type: 'LLMTextGenNode', position: basePos, data: {} });
  addNode({ id: fileId, type: 'AudioFileNode', position: { x: basePos.x - 300, y: basePos.y }, data: {} });
  addNode({ id: previewId, type: 'TextPreviewNode', position: { x: basePos.x + 300, y: basePos.y }, data: {} });

  setTimeout(() => {
    const edges = [
      {
        id: `edge_${Date.now()}_g1`,
        source: fileId,
        sourceHandle: 'output-0',
        target: genId,
        targetHandle: 'input-0',
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
      {
        id: `edge_${Date.now()}_g2`,
        source: genId,
        sourceHandle: 'output-0',
        target: previewId,
        targetHandle: 'input-0',
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
    ];
    useWorkflowStore.getState().onEdgesChange(edges.map(e => ({ type: 'add', item: e })));
  }, 50);

  return genId;
}

export default function NodeCanvas() {
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const onNodesChange = useWorkflowStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange);
  const addNode = useWorkflowStore((s) => s.addNode);
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const setSelectedNode = useWorkflowStore((s) => s.setSelectedNode);
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);

  const reactFlowWrapper = useRef(null);
  const reactFlowInstance = useReactFlow();

  const [suggestions, setSuggestions] = useState(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [connectMenu, setConnectMenu] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const mouseRef = useRef({ x: 0, y: 0 });
  const connectStartRef = useRef(null);
  const edgeCountRef = useRef(0);

  // Ctrl + Space Quick Search State
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [quickSearchPos, setQuickSearchPos] = useState({ x: 0, y: 0 });
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  const [selectedQuickSearchIndex, setSelectedQuickSearchIndex] = useState(0);

  // Flatten all searchable nodes from sections
  const ALL_SEARCHABLE_NODES = useMemo(() => {
    return QUICK_ADD_SECTIONS.flatMap(section => 
      section.nodes.map(node => ({
        ...node,
        section: section.title
      }))
    );
  }, []);

  const filteredQuickSearchNodes = useMemo(() => {
    if (!quickSearchQuery) return ALL_SEARCHABLE_NODES;
    const q = quickSearchQuery.toLowerCase();
    return ALL_SEARCHABLE_NODES.filter(
      n => {
        const lbl = n.label.toLowerCase();
        const typ = n.type.toLowerCase();
        return lbl.startsWith(q) || lbl.split(/[\s-]+/).some(word => word.startsWith(q)) || typ.startsWith(q) || typ.split(/[\s-]+/).some(word => word.startsWith(q));
      }
    );
  }, [quickSearchQuery, ALL_SEARCHABLE_NODES]);

  // Handle Ctrl + Space trigger
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && (e.key === ' ' || e.code === 'Space')) {
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        e.preventDefault();
        setQuickSearchPos({ x: mouseRef.current.x, y: mouseRef.current.y });
        setQuickSearchQuery('');
        setSelectedQuickSearchIndex(0);
        setShowQuickSearch(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Track edge count to detect if a connection was actually made
  useEffect(() => {
    edgeCountRef.current = edges.length;
  }, [edges]);

  const onUpdate = useCallback((nodeId, data) => updateNodeData(nodeId, data), [updateNodeData]);
  const onDelete = useCallback((nodeId) => removeNode(nodeId), [removeNode]);

  // ── Autosave ──────────────────────────────────────────────
  const autoSaveWorkflow = useWorkflowStore((s) => s.autoSaveWorkflow);
  const backupTextContent = useWorkflowStore((s) => s.backupTextContent);

  // Interval autosave every 30s
  useEffect(() => {
    const id = setInterval(() => {
      autoSaveWorkflow();
      backupTextContent();
    }, 30000);
    return () => clearInterval(id);
  }, [autoSaveWorkflow, backupTextContent]);

  // Debounced autosave on nodes/edges change
  const saveTimerRef = useRef(null);
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      autoSaveWorkflow();
      useWorkflowStore.getState().saveWorkflow().catch(e => console.error("Auto-sync error:", e));
      backupTextContent();
    }, 2000);
  }, [nodes, edges, autoSaveWorkflow, backupTextContent]);

  // Save on unload
  useEffect(() => {
    const handler = () => {
      useWorkflowStore.getState().autoSaveWorkflow();
      useWorkflowStore.getState().backupTextContent();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Restore from autosave if empty and not inside a project folder
  useEffect(() => {
    if (nodes.length > 0) return;
    const store = useWorkflowStore.getState();
    if (store.projectPath) return; // Do not restore global autosave inside project folders
    const restored = store.restoreAutoSave();
    if (restored && restored.nodes.length > 0) {
      store.applyAutoSave(restored);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Connection status ────────────────────────────────────
  const [statusLLM, setStatusLLM] = useState(false);
  const [statusComfy, setStatusComfy] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(3000) });
        setStatusLLM(r.ok);
      } catch { setStatusLLM(false); }
      try {
        const r = await fetch('http://127.0.0.1:8188/system_stats', { signal: AbortSignal.timeout(3000) });
        setStatusComfy(r.ok);
      } catch { setStatusComfy(false); }
    };
    check();
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, []);

  const enrichedNodes = useMemo(() => {
    return nodes.map((n) => ({ ...n, data: { ...n.data, onUpdate, onDelete } }));
  }, [nodes, onUpdate, onDelete]);

  const onNodeClick = useCallback((_event, node) => setSelectedNode(node.id), [setSelectedNode]);
  const onPaneClick = useCallback(() => setSelectedNode(null), [setSelectedNode]);

  // Keyboard delete
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        e.preventDefault();
        removeNode(selectedNodeId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, removeNode]);

  // Track mouse for suggestion panel position
  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const onConnectStart = useCallback((_event, { nodeId, handleId, handleType }) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const keys = HANDLE_KEY[node.type];
    if (!keys) return;
    const dataKey = keys[handleId];
    if (!dataKey) return;

    connectStartRef.current = { nodeId, handleId, handleType, dataKey, nodeType: node.type };
    edgeCountRef.current = edges.length;

    // Show quick suggestions while dragging
    if (handleType === 'source') {
      const list = SUGGESTIONS[dataKey];
      if (list && list.length > 0) {
        setSuggestions({ items: list, sourceNodeId: nodeId, sourceHandle: handleId, type: 'output', dataKey });
      }
    } else {
      const list = INPUT_SUGGESTIONS[dataKey];
      if (list && list.length > 0) {
        setSuggestions({ items: list, targetNodeId: nodeId, targetHandle: handleId, type: 'input', dataKey });
      }
    }
  }, [nodes, edges.length]);

  const onConnectEnd = useCallback(() => {
    setSuggestions(null);

    // If no edge was added (connection released in empty space), open the persistent menu
    const store = useWorkflowStore.getState();
    const info = connectStartRef.current;
    if (!info) return;

    // Check if a new edge appeared after this drag ended
    setTimeout(() => {
      const currentEdges = useWorkflowStore.getState().edges.length;
      if (currentEdges > edgeCountRef.current) return; // connection was made
      if (!connectStartRef.current) return;

      // Open persistent connect menu
      const items = info.handleType === 'source'
        ? (SUGGESTIONS[info.dataKey] || [])
        : (INPUT_SUGGESTIONS[info.dataKey] || []);

      if (items.length === 0) return;

      setConnectMenu({
        items,
        sourceNodeId: info.handleType === 'source' ? info.nodeId : null,
        sourceHandle: info.handleType === 'source' ? info.handleId : null,
        targetNodeId: info.handleType === 'target' ? info.nodeId : null,
        targetHandle: info.handleType === 'target' ? info.handleId : null,
        type: info.handleType,
        dataKey: info.dataKey,
      });
      setSearchQuery('');
    }, 50);
  }, []);

  const handleMenuSuggestionClick = useCallback((item) => {
    if (!connectMenu) return;

    const pos = reactFlowInstance.screenToFlowPosition({ x: mouseRef.current.x, y: mouseRef.current.y });

    if (item.type === 'CREATE_FULL_PIPELINE') {
      const state = useWorkflowStore.getState();
      
      // Node IDs
      const analyzerId = `node_${Date.now()}_analyzer`;
      // 1. Spawn Nodes
      addNode({ id: analyzerId, type: 'LLMTextGenNode', position: { x: pos.x, y: pos.y }, data: {} });
      const promptId = addPromptCreatorPipeline(addNode, { x: pos.x + 800, y: pos.y + 120 });
      const t2vGenId = addVideoGeneratorPipeline(addNode, { x: pos.x + 1750, y: pos.y + 120 }, 'T2VGeneratorNode');

      // 2. Spawn Connections (using short timeout to let store digest nodes addition)
      setTimeout(() => {
        const edgesToAdd = [
          // Audio source Node -> Analyzer
          {
            id: `edge_${Date.now()}_a1`,
            source: connectMenu.sourceNodeId,
            sourceHandle: connectMenu.sourceHandle,
            target: analyzerId,
            targetHandle: 'input-0',
            type: 'smoothstep',
            style: { stroke: '#b026ff', strokeWidth: 2 },
          },
          // Analyzer -> Prompt Creator
          {
            id: `edge_${Date.now()}_a2`,
            source: analyzerId,
            sourceHandle: 'output-0',
            target: promptId,
            targetHandle: 'input-0',
            type: 'smoothstep',
            style: { stroke: '#b026ff', strokeWidth: 2 },
          },
          // Prompt Creator -> Video Generator
          {
            id: `edge_${Date.now()}_a3`,
            source: promptId,
            sourceHandle: 'output-0',
            target: t2vGenId,
            targetHandle: 'input-0',
            type: 'smoothstep',
            style: { stroke: '#b026ff', strokeWidth: 2 },
          }
        ];
        useWorkflowStore.getState().onEdgesChange(edgesToAdd.map(e => ({ type: 'add', item: e })));
      }, 50);

      setConnectMenu(null);
      connectStartRef.current = null;
      return;
    }

    let targetNodeId;
    if (item.type === 'PromptCreatorNode') {
      targetNodeId = addPromptCreatorPipeline(addNode, { x: pos.x - 70, y: pos.y - 15 });
    } else if (item.type === 'T2VGeneratorNode' || item.type === 'I2VGeneratorNode') {
      targetNodeId = addVideoGeneratorPipeline(addNode, { x: pos.x - 70, y: pos.y - 15 }, item.type);
    } else if (item.type === 'MusicGeneratorNode') {
      targetNodeId = addMusicGeneratorPipeline(addNode, { x: pos.x - 70, y: pos.y - 15 });
    } else if (item.type === 'LyricsGeneratorNode') {
      targetNodeId = addLyricsGeneratorPipeline(addNode, { x: pos.x - 70, y: pos.y - 15 });
    } else if (item.type === 'TTSGeneratorNode') {
      targetNodeId = addTTSGeneratorPipeline(addNode, { x: pos.x - 70, y: pos.y - 15 });
    } else if (item.type === 'CoverGeneratorNode') {
      targetNodeId = addCoverGeneratorPipeline(addNode, { x: pos.x - 70, y: pos.y - 15 });
    } else if (item.type === 'LLMTextGenNode') {
      targetNodeId = addLLMTextGenPipeline(addNode, { x: pos.x - 70, y: pos.y - 15 });
    } else {
      targetNodeId = getNodeId();
      const newNode = {
        id: targetNodeId,
        type: item.type,
        position: { x: pos.x - 70, y: pos.y - 15 },
        data: {},
      };
      addNode(newNode);
    }

    if (connectMenu.type === 'source') {
      const edge = {
        id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        source: connectMenu.sourceNodeId,
        sourceHandle: connectMenu.sourceHandle,
        target: targetNodeId,
        targetHandle: item.handle,
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      };
      useWorkflowStore.getState().onEdgesChange([{ type: 'add', item: edge }]);
    } else {
      const edge = {
        id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        source: targetNodeId,
        sourceHandle: item.handle,
        target: connectMenu.targetNodeId,
        targetHandle: connectMenu.targetHandle,
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      };
      useWorkflowStore.getState().onEdgesChange([{ type: 'add', item: edge }]);
    }

    setConnectMenu(null);
    connectStartRef.current = null;
  }, [connectMenu, addNode]);

  const handleQuickSearchSelect = useCallback((item) => {
    const pos = reactFlowInstance.screenToFlowPosition({ x: quickSearchPos.x, y: quickSearchPos.y });
    if (item.type === 'PromptCreatorNode') {
      addPromptCreatorPipeline(addNode, pos);
    } else if (item.type === 'T2VGeneratorNode' || item.type === 'I2VGeneratorNode') {
      addVideoGeneratorPipeline(addNode, pos, item.type);
    } else if (item.type === 'MusicGeneratorNode') {
      addMusicGeneratorPipeline(addNode, pos);
    } else if (item.type === 'LyricsGeneratorNode') {
      addLyricsGeneratorPipeline(addNode, pos);
    } else if (item.type === 'TTSGeneratorNode') {
      addTTSGeneratorPipeline(addNode, pos);
    } else if (item.type === 'CoverGeneratorNode') {
      addCoverGeneratorPipeline(addNode, pos);
    } else if (item.type === 'LLMTextGenNode') {
      addLLMTextGenPipeline(addNode, pos);
    } else {
      addNode({ id: getNodeId(), type: item.type, position: pos, data: {} });
    }
    setShowQuickSearch(false);
  }, [quickSearchPos, addNode, reactFlowInstance]);

  const onConnect = useCallback((connection) => {
    useWorkflowStore.getState().onEdgesChange([{
      type: 'add',
      item: {
        ...connection,
        id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
    }]);
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    const nodeType = event.dataTransfer.getData('application/reactflow');
    if (!nodeType) return;
    const pos = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    
    const actualType = nodeType.replace('_bundle', '');
    if (actualType === 'PromptCreatorNode') {
      addPromptCreatorPipeline(addNode, { x: pos.x - 70, y: pos.y - 15 });
    } else if (actualType === 'T2VGeneratorNode' || actualType === 'I2VGeneratorNode') {
      addVideoGeneratorPipeline(addNode, { x: pos.x - 70, y: pos.y - 15 }, actualType);
    } else if (actualType === 'MusicGeneratorNode') {
      addMusicGeneratorPipeline(addNode, { x: pos.x - 70, y: pos.y - 15 });
    } else if (actualType === 'LyricsGeneratorNode') {
      addLyricsGeneratorPipeline(addNode, { x: pos.x - 70, y: pos.y - 15 });
    } else if (actualType === 'TTSGeneratorNode') {
      addTTSGeneratorPipeline(addNode, { x: pos.x - 70, y: pos.y - 15 });
    } else if (actualType === 'CoverGeneratorNode') {
      addCoverGeneratorPipeline(addNode, { x: pos.x - 70, y: pos.y - 15 });
    } else if (actualType === 'LLMTextGenNode') {
      addLLMTextGenPipeline(addNode, { x: pos.x - 70, y: pos.y - 15 });
    } else {
      addNode({ id: getNodeId(), type: actualType, position: { x: pos.x - 70, y: pos.y - 15 }, data: {} });
    }
  }, [addNode]);

  return (
    <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%', background: '#05010d', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(15,5,30,0.9)', borderRadius: 8, padding: '4px 10px', border: '1px solid rgba(176,38,255,0.2)' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusLLM ? '#22c55e' : '#ef4444', boxShadow: statusLLM ? '0 0 6px #22c55e' : '0 0 6px #ef4444' }} />
          <span style={{ fontSize: 10, color: statusLLM ? '#22c55e' : '#ef4444', fontWeight: 600 }}>LLM</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(15,5,30,0.9)', borderRadius: 8, padding: '4px 10px', border: '1px solid rgba(176,38,255,0.2)' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusComfy ? '#22c55e' : '#ef4444', boxShadow: statusComfy ? '0 0 6px #22c55e' : '0 0 6px #ef4444' }} />
          <span style={{ fontSize: 10, color: statusComfy ? '#22c55e' : '#ef4444', fontWeight: 600 }}>ComfyUI</span>
        </div>
      </div>
      <ReactFlow
        nodes={enrichedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ style: { stroke: '#b026ff', strokeWidth: 2 }, type: 'smoothstep' }}
        style={{ background: '#05010d' }}
        deleteKeyCode={['Backspace', 'Delete']}
        selectionKeyCode={['Control', 'Meta']}
      >
        <Background color="rgba(176,38,255,0.15)" gap={24} size={1} />
        <Controls style={{ borderRadius: 12, border: '1px solid rgba(176,38,255,0.3)', overflow: 'hidden', background: 'rgba(15,5,30,0.95)' }} />
        <MiniMap style={{ height: 120, width: 180, borderRadius: 12, border: '1px solid rgba(176,38,255,0.3)', background: 'rgba(15,5,30,0.9)' }} nodeColor="#b026ff" maskColor="rgba(5,1,13,0.8)" />
      </ReactFlow>

      {/* Suggestion overlay during drag */}
      {suggestions && (
        <div
          style={{
            position: 'fixed',
            left: mouseRef.current.x + 16,
            top: mouseRef.current.y - 10,
            zIndex: 1000,
            background: 'rgba(15,5,30,0.98)',
            border: '1px solid rgba(176,38,255,0.4)',
            borderRadius: 12,
            padding: 6,
            minWidth: 200,
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            pointerEvents: 'auto',
          }}
        >
          <div style={{ padding: '6px 10px 4px', fontSize: 10, fontWeight: 700, color: '#6b6880', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {suggestions.type === 'output' ? 'Release to add...' : 'Release to add...'}
          </div>
          {suggestions.items.slice(0, 4).map((item, i) => (
            <div key={`${item.type}-${i}`} style={{ padding: '7px 10px', fontSize: 11, color: '#b9b4d0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: suggestions.type === 'output' ? '#b026ff' : '#63d4ff', display: 'inline-block' }} />
              {item.label}
            </div>
          ))}
          {suggestions.items.length > 4 && (
            <div style={{ padding: '4px 10px', fontSize: 10, color: '#6b6880' }}>
              +{suggestions.items.length - 4} more
            </div>
          )}
        </div>
      )}

      {/* Persistent connect menu */}
      {connectMenu && (
        <React.Fragment>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
            onClick={() => { setConnectMenu(null); connectStartRef.current = null; }}
          />
          <div
          style={{
            position: 'fixed',
            left: mouseRef.current.x - 140,
            top: mouseRef.current.y - 20,
            zIndex: 1000,
            background: 'rgba(10,3,20,0.98)',
            border: '1px solid rgba(176,38,255,0.3)',
            borderRadius: 16,
            padding: 8,
            minWidth: 280,
            maxWidth: 320,
            backdropFilter: 'blur(24px)',
            boxShadow: '0 8px 48px rgba(0,0,0,0.7)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ padding: '4px 10px 8px', fontSize: 11, fontWeight: 700, color: '#b026ff' }}>
            {connectMenu.type === 'source' ? 'Add node to receive' : 'Add node that provides'} <span style={{ color: '#b9b4d0', textTransform: 'lowercase' }}>{connectMenu.dataKey}</span>
          </div>
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter nodes..."
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setConnectMenu(null); connectStartRef.current = null; }
            }}
            style={{
              width: '100%', padding: '8px 10px', marginBottom: 6, boxSizing: 'border-box',
              borderRadius: 8, border: '1px solid rgba(176,38,255,0.2)',
              background: 'rgba(176,38,255,0.06)',
              color: '#fff', fontSize: 12, outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {(searchQuery
              ? connectMenu.items.filter((item) =>
                  item.label.toLowerCase().startsWith(searchQuery.toLowerCase()) || item.label.toLowerCase().split(/[\s-]+/).some(word => word.startsWith(searchQuery.toLowerCase()))
                )
              : connectMenu.items
            ).length === 0 ? (
              <div style={{ padding: '16px 10px', textAlign: 'center', fontSize: 11, color: '#6b6880' }}>
                No compatible nodes found
              </div>
            ) : (
              (searchQuery
                ? connectMenu.items.filter((item) =>
                    item.label.toLowerCase().startsWith(searchQuery.toLowerCase()) || item.label.toLowerCase().split(/[\s-]+/).some(word => word.startsWith(searchQuery.toLowerCase()))
                  )
                : connectMenu.items
              ).map((item, i) => (
                <div
                  key={`${item.type}-${i}`}
                  onClick={() => handleMenuSuggestionClick(item)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(176,38,255,0.12)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: connectMenu.type === 'source' ? '#b026ff' : '#63d4ff',
                    flexShrink: 0,
                  }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{item.label}</div>
                    <div style={{ fontSize: 10, color: '#6b6880', marginTop: 1 }}>
                      {item.type.replace('Node', '').replace(/([A-Z])/g, ' $1').trim() || 'node'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div style={{ borderTop: '1px solid rgba(176,38,255,0.1)', marginTop: 4, padding: '6px 10px 2px', fontSize: 10, color: '#6b6880', display: 'flex', justifyContent: 'space-between' }}>
            <span>Click to add & connect</span>
            <span>Esc to cancel</span>
          </div>
        </div>
        </React.Fragment>
      )}

      {/* Floating + button */}
      <div
        onClick={() => setShowQuickAdd(!showQuickAdd)}
        style={{
          position: 'absolute',
          bottom: 100,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #b026ff, #7c3aed)',
          border: 'none',
          color: '#fff',
          fontSize: 24,
          fontWeight: 300,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 24px rgba(176,38,255,0.4)',
          transition: 'transform 0.2s',
          transform: showQuickAdd ? 'translateX(-50%) rotate(45deg)' : 'translateX(-50%)',
          userSelect: 'none',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = showQuickAdd ? 'translateX(-50%) rotate(45deg) scale(1.1)' : 'translateX(-50%) scale(1.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = showQuickAdd ? 'translateX(-50%) rotate(45deg)' : 'translateX(-50%)'; }}
      >
        +
      </div>

      {/* Quick-add menu */}
      {showQuickAdd && (
        <div
          style={{
            position: 'absolute',
            bottom: 158,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            background: 'rgba(15,5,30,0.98)',
            border: '1px solid rgba(176,38,255,0.3)',
            borderRadius: 16,
            padding: 8,
            minWidth: 260,
            maxHeight: 360,
            overflowY: 'auto',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 48px rgba(0,0,0,0.6)',
          }}
        >
          {QUICK_ADD_SECTIONS.map((section) => (
            <div key={section.title} style={{ marginBottom: 4 }}>
              <div style={{ padding: '6px 10px 4px', fontSize: 10, fontWeight: 700, color: '#6b6880', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {section.title}
              </div>
              {section.nodes.map((n) => (
                <div
                  key={n.type}
                  onClick={() => {
                    const pos = centerPos(nodes.length);
                    if (n.type === 'PromptCreatorNode') {
                      addPromptCreatorPipeline(addNode, pos);
                    } else if (n.type === 'T2VGeneratorNode' || n.type === 'I2VGeneratorNode') {
                      addVideoGeneratorPipeline(addNode, pos, n.type);
                    } else {
                      addNode({ id: getNodeId(), type: n.type, position: pos, data: {} });
                    }
                    setShowQuickAdd(false);
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = `${n.color}15`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: `${n.color}20`, border: `1px solid ${n.color}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, flexShrink: 0,
                  }}>
                    {n.icon}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{n.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Ctrl + Space Quick Search menu */}
      {showQuickSearch && (
        <React.Fragment>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
            onClick={() => setShowQuickSearch(false)}
          />
          <div
            style={{
              position: 'fixed',
              left: Math.max(10, Math.min(window.innerWidth - 320, quickSearchPos.x - 150)),
              top: Math.max(10, Math.min(window.innerHeight - 350, quickSearchPos.y - 30)),
              zIndex: 1000,
              background: 'rgba(10,3,20,0.98)',
              border: '1px solid rgba(176,38,255,0.4)',
              borderRadius: 16,
              padding: 10,
              width: 300,
              backdropFilter: 'blur(24px)',
              boxShadow: '0 12px 50px rgba(0,0,0,0.8), 0 0 20px rgba(176,38,255,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 8px 8px', fontSize: 11, fontWeight: 700, color: '#b026ff', letterSpacing: '0.05em' }}>
              <span>🚀 QUICK SEARCH</span>
            </div>
            <input
              autoFocus
              value={quickSearchQuery}
              onChange={(e) => {
                setQuickSearchQuery(e.target.value);
                setSelectedQuickSearchIndex(0);
              }}
              placeholder="Type node name..."
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setShowQuickSearch(false);
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedQuickSearchIndex(prev => 
                    prev < filteredQuickSearchNodes.length - 1 ? prev + 1 : prev
                  );
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedQuickSearchIndex(prev => (prev > 0 ? prev - 1 : 0));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  const item = filteredQuickSearchNodes[selectedQuickSearchIndex];
                  if (item) {
                    handleQuickSearchSelect(item);
                  }
                }
              }}
              style={{
                width: '100%', padding: '10px 12px', marginBottom: 8, boxSizing: 'border-box',
                borderRadius: 10, border: '1px solid rgba(176,38,255,0.3)',
                background: 'rgba(176,38,255,0.08)',
                color: '#fff', fontSize: 13, outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {filteredQuickSearchNodes.length === 0 ? (
                <div style={{ padding: '16px 10px', textAlign: 'center', fontSize: 11, color: '#6b6880' }}>
                  No matching nodes found
                </div>
              ) : (
                filteredQuickSearchNodes.map((item, i) => {
                  const isSelected = i === selectedQuickSearchIndex;
                  return (
                    <div
                      key={`${item.type}-${i}`}
                      onClick={() => handleQuickSearchSelect(item)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background: isSelected ? 'rgba(176,38,255,0.18)' : 'transparent',
                        border: isSelected ? '1px solid rgba(176,38,255,0.3)' : '1px solid transparent',
                        transition: 'background 0.1s, border 0.1s',
                      }}
                      onMouseEnter={() => setSelectedQuickSearchIndex(i)}
                    >
                      <div style={{
                        width: 24, height: 24, borderRadius: 6,
                        background: `${item.color}20`, border: `1px solid ${item.color}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, flexShrink: 0,
                      }}>
                        {item.icon}
                      </div>
                      <div style={{ flexGrow: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{item.label}</div>
                        <div style={{ fontSize: 9, color: '#6b6880', marginTop: 1 }}>
                          {item.section}
                        </div>
                      </div>
                      {isSelected && (
                        <span style={{ fontSize: 10, color: '#b026ff', fontWeight: 600 }}>↵ Enter</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div style={{ borderTop: '1px solid rgba(176,38,255,0.1)', marginTop: 6, padding: '8px 8px 0', fontSize: 9, color: '#6b6880', display: 'flex', justifyContent: 'space-between' }}>
              <span>↑↓ Navigation</span>
              <span>Esc to close</span>
            </div>
          </div>
        </React.Fragment>
      )}
    </div>
  );
}

const QUICK_ADD_SECTIONS = [
  {
    title: 'INPUTS',
    nodes: [
      { type: 'ThemeNode', label: 'Theme', icon: '\uD83C\uDFAD', color: '#ff3bd4' },
      { type: 'GenreNode', label: 'Genre', icon: '\uD83C\uDFB6', color: '#b026ff' },
      { type: 'LanguageNode', label: 'Language', icon: '\uD83C\uDF10', color: '#63d4ff' },
      { type: 'BPMNode', label: 'BPM', icon: '\u2699\uFE0F', color: '#f59e0b' },
      { type: 'DurationNode', label: 'Duration', icon: '\u23F1\uFE0F', color: '#22c55e' },
      { type: 'SongSettingsNode', label: 'Song Settings', icon: '\uD83D\uDCFB', color: '#10b981' },
      { type: 'GutsSettingsNode', label: 'Guts Settings', icon: '⚙️', color: '#10b981' },
      { type: 'AudioFileNode', label: 'Audio File', icon: '\uD83C\uDFB5', color: '#ec4899' },
      { type: 'LyricsInputNode', label: 'Lyrics', icon: '\uD83D\uDCDD', color: '#a855f7' },
      { type: 'StoryConceptNode', label: 'Story Concept', icon: '📝', color: '#f59e0b' },
      { type: 'StyleThemeNode', label: 'Style & Theme', icon: '🎨', color: '#b026ff' },
      { type: 'VisualStylesNode', label: 'Visual Style Presets', icon: '🎨', color: '#ec4899' },
      { type: 'YouTubeAudioNode', label: 'YouTube Audio Source', icon: '🎵', color: '#ef4444' },
      { type: 'SubjectLocationsNode', label: 'Subject & Locations', icon: '📍', color: '#3b82f6' },
    ],
  },
  {
    title: 'PROCESSING',
    nodes: [
      { type: 'LyricsGeneratorNode', label: 'Lyrics Generator', icon: '✍️', color: '#a855f7' },
      { type: 'SmartLyricsNode', label: 'Smart Lyrics Studio', icon: '⚡', color: '#ff3bd4' },
      { type: 'MusicGeneratorNode', label: 'Music Generator', icon: '🎵', color: '#b026ff' },
      { type: 'CoverGeneratorNode', label: 'Cover Generator', icon: '🎤', color: '#ec4899' },
      { type: 'TTSGeneratorNode', label: 'TTS Generator', icon: '🗣️', color: '#06b6d4' },
      { type: 'LLMTextGenNode', label: 'Audio Analyzer', icon: '🔍', color: '#10b981' },
      { type: 'PromptCreatorNode', label: 'Prompt Creator', icon: '✨', color: '#f59e0b' },
      { type: 'BRollPromptCreatorNode', label: 'B-Roll Prompt Creator', icon: '✨', color: '#f472b6' },
      { type: 'BRollVideoCreatorNode', label: 'B-Roll Video Creator', icon: '🎬', color: '#f472b6' },
      { type: 'BRollFocusNode', label: 'B-Roll Focus', icon: '🔍', color: '#f472b6' },
      { type: 'T2VGeneratorNode', label: 'T2V Generator', icon: '🎬', color: '#6366f1' },
      { type: 'I2VGeneratorNode', label: 'I2V Generator', icon: '🖼️', color: '#4f46e5' },
      { type: 'VideoWorkflowSettingsNode', label: 'Video Workflow Settings', icon: '⚙️', color: '#312e81' },
      { type: 'LTXLoRASettingsNode', label: 'LTX LoRA Settings', icon: '🧬', color: '#4c1d95' },
      { type: 'ZImageLoRASettingsNode', label: 'Z-Image LoRA Settings', icon: '🧬', color: '#4c1d95' },
      { type: 'VideoAdvancedSettingsNode', label: 'Video Advanced Settings', icon: '🛠️', color: '#1e1b4b' },
      { type: 'VideoAudioCombinerNode', label: 'Video & Audio Combiner', icon: '🎬', color: '#10b981' },
      { type: 'VideoUpscalerNode', label: 'Video Upscaler', icon: '🚀', color: '#8b5cf6' },
      { type: 'ImageGeneratorNode', label: 'Image Generator', icon: '\uD83D\uDDBC\uFE0F', color: '#14b8a6' },
    ],
  },
  {
    title: 'OUTPUTS',
    nodes: [
      { type: 'AudioPlayerNode', label: 'Audio Player', icon: '\u25B6\uFE0F', color: '#b026ff' },
      { type: 'VideoPlayerNode', label: 'Video Player', icon: '\uD83C\uDFAC', color: '#6366f1' },
      { type: 'ImagePreviewNode', label: 'Image Preview', icon: '\uD83D\uDDBC\uFE0F', color: '#14b8a6' },
      { type: 'TextPreviewNode', label: 'Text Preview', icon: '\uD83D\uDCC4', color: '#b9b4d0' },
      { type: 'DebugJsonNode', label: 'JSON Debugger', icon: '🐞', color: '#e11d48' },
    ],
  },
];

function centerPos(count) {
  const x = 300 + Math.random() * 200;
  const y = 60 + count * 40 + Math.random() * 100;
  return { x, y };
}
