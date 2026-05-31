import {
  generateLyrics,
  generateText2Audio,
  generateAudioCover,
  generateTTS,
  generatePrompts,
  generateVideo,
} from './api';

const API_MAP = {
  LyricsGeneratorNode: {
    api: generateLyrics,
    buildParams: (inputs, data) => ({
      theme: inputs.theme || data.theme || '',
      structure: inputs.structure || data.structure || 'Verse-Chorus',
      genre: inputs.genre || (Array.isArray(data.genre) ? data.genre.join(', ') : data.genre) || '',
      language: inputs.language || data.language || 'en',
      duration: inputs.duration || data.duration || 30,
    }),
    extractResult: (res) => res.lyrics || res.text || '',
    resultKey: 'lyrics',
  },
  MusicGeneratorNode: {
    api: generateText2Audio,
    buildParams: (inputs, data) => ({
      lyrics: inputs.lyrics || data.lyrics || '',
      genre: inputs.genre || (Array.isArray(data.genre) ? data.genre.join(', ') : data.genre) || '',
      bpm: inputs.bpm || data.bpm || 120,
      duration: inputs.duration || data.duration || 30,
      language: inputs.language || data.language || 'en',
      time_signature: inputs.timeSignature || data.timeSignature || '4/4',
      cfg_scale: inputs.cfgScale ?? data.cfgScale ?? 7,
      temperature: inputs.temperature ?? data.temperature ?? 1.0,
      steps: inputs.steps ?? data.steps ?? 50,
      top_p: inputs.topP ?? data.topP ?? 0.95,
      top_k: inputs.topK ?? data.topK ?? 200,
      sampling_shift: inputs.samplingShift ?? data.samplingShift ?? 0,
    }),
    extractResult: (res) => res.audio_url || res.url || '',
    resultKey: 'audioUrl',
  },
  CoverGeneratorNode: {
    api: generateAudioCover,
    buildParams: (inputs, data) => ({
      audio_file: inputs.audioFileName || data.audioFileName || '',
      genre: inputs.genre || (Array.isArray(data.genre) ? data.genre.join(', ') : data.genre) || '',
      bpm: inputs.bpm || data.bpm || 120,
    }),
    extractResult: (res) => res.audio_url || res.url || '',
    resultKey: 'audioUrl',
  },
  TTSGeneratorNode: {
    api: generateTTS,
    buildParams: (inputs, data) => ({
      text: inputs.text || data.text || '',
      language: inputs.language || data.language || 'en',
      voice: inputs.voice || data.voice || 'female_warm',
    }),
    extractResult: (res) => res.audio_url || res.url || '',
    resultKey: 'audioUrl',
  },
  PromptCreatorNode: {
    api: generatePrompts,
    buildParams: (inputs, data) => ({
      lyrics: inputs.lyrics || data.lyrics || '',
      story_concept: inputs.story || data.story || '',
      theme_style: inputs.theme || data.theme || '',
    }),
    extractResult: (res) => res.concepts || res.prompts || res,
    resultKey: 'prompts',
  },
  VideoGeneratorNode: {
    api: generateVideo,
    buildParams: (inputs, data) => ({
      mode: data.mode || 't2v',
      prompts: inputs.prompt || data.prompt || '',
      image: inputs.imageUrl || data.imageUrl || undefined,
      fps: data.fps || 24,
      resolution: data.resolution || '1024x576',
      seed: data.seed ?? -1,
      camera_motion: data.cameraMotion || 'Static',
    }),
    extractResult: (res) => res.video_url || res.url || '',
    resultKey: 'videoUrl',
  },
  ImageGeneratorNode: {
    api: generateVideo,
    buildParams: (inputs, data) => ({
      mode: 't2i',
      prompts: inputs.prompt || data.prompt || '',
      width: data.width || 1024,
      height: data.height || 1024,
    }),
    extractResult: (res) => res.image_url || res.url || '',
    resultKey: 'imageUrl',
  },
};

const INPUT_TYPES = new Set([
  'GenreNode',
  'LanguageNode',
  'ThemeNode',
  'BPMNode',
  'DurationNode',
  'AudioFileNode',
  'LyricsInputNode',
]);

const OUTPUT_TYPES = new Set([
  'AudioPlayerNode',
  'VideoPlayerNode',
  'ImagePreviewNode',
  'TextPreviewNode',
]);

function topoSort(nodes, edges) {
  const inDegree = {};
  const adj = {};

  for (const node of nodes) {
    inDegree[node.id] = 0;
    adj[node.id] = [];
  }

  for (const edge of edges) {
    if (inDegree[edge.target] !== undefined) {
      inDegree[edge.target] += 1;
    }
    if (adj[edge.source]) {
      adj[edge.source].push(edge.target);
    }
  }

  const queue = [];
  for (const id of Object.keys(inDegree)) {
    if (inDegree[id] === 0) {
      queue.push(id);
    }
  }

  const order = [];
  while (queue.length > 0) {
    const current = queue.shift();
    order.push(current);
    for (const neighbor of (adj[current] || [])) {
      inDegree[neighbor] -= 1;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (order.length !== nodes.length) {
    throw new Error('Workflow contains a cycle. Cannot execute.');
  }

  return order;
}

function gatherInputs(nodeId, nodes, edges, nodeMap) {
  const inputs = {};
  const incomingEdges = edges.filter((e) => e.target === nodeId);

  for (const edge of incomingEdges) {
    const sourceNode = nodeMap[edge.source];
    if (!sourceNode) continue;

    const sourceData = sourceNode.data || {};
    Object.assign(inputs, sourceData);
  }

  return inputs;
}

export async function executeWorkflow(nodes, edges, updateNodeData) {
  if (nodes.length === 0) {
    return { success: false, error: 'No nodes in workflow' };
  }

  let order;
  try {
    order = topoSort(nodes, edges);
  } catch (err) {
    return { success: false, error: err.message };
  }

  const nodeMap = {};
  for (const node of nodes) {
    nodeMap[node.id] = node;
  }

  for (const nodeId of order) {
    const node = nodeMap[nodeId];
    if (!node) continue;

    const nodeType = node.type;

    if (INPUT_TYPES.has(nodeType)) {
      updateNodeData(nodeId, { status: 'done', error: undefined });
      continue;
    }

    if (OUTPUT_TYPES.has(nodeType)) {
      const inputs = gatherInputs(nodeId, nodes, edges, nodeMap);
      const dataToSet = { status: 'done', error: undefined };

      if (inputs.audioUrl) dataToSet.audioUrl = inputs.audioUrl;
      if (inputs.videoUrl) dataToSet.videoUrl = inputs.videoUrl;
      if (inputs.imageUrl) dataToSet.imageUrl = inputs.imageUrl;
      if (inputs.lyrics) dataToSet.text = inputs.lyrics;
      if (inputs.text) dataToSet.text = inputs.text;
      if (inputs.prompts) dataToSet.text = typeof inputs.prompts === 'string' ? inputs.prompts : JSON.stringify(inputs.prompts, null, 2);

      updateNodeData(nodeId, dataToSet);
      continue;
    }

    const apiConfig = API_MAP[nodeType];
    if (!apiConfig) {
      updateNodeData(nodeId, { status: 'error', error: `Unknown node type: ${nodeType}` });
      continue;
    }

    updateNodeData(nodeId, { status: 'running', error: undefined });

    try {
      const inputs = gatherInputs(nodeId, nodes, edges, nodeMap);
      const params = apiConfig.buildParams(inputs, node.data || {});
      const result = await apiConfig.api(params);
      const value = apiConfig.extractResult(result);

      const update = { status: 'done', error: undefined };
      update[apiConfig.resultKey] = value;
      updateNodeData(nodeId, update);
    } catch (err) {
      updateNodeData(nodeId, { status: 'error', error: err.message });
      return { success: false, error: `Node "${nodeId}" failed: ${err.message}` };
    }
  }

  return { success: true };
}
