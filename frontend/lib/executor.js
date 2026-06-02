import {
  generateLyrics,
  generateText2Audio,
  generateAudioCover,
  generateTTS,
  generatePrompts,
  generateVideo,
  combineVideoAudio,
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
    buildParams: (inputs, data) => {
      const ss = inputs._songSettings || {};
      const analyzer = inputs._analyzer || null;

      let genreString = '';
      let bpm = 120;
      let keyscale = '';

      if (analyzer) {
        const baseGenre = ss.genre || data.genre || 'pop';
        const analyzerDesc = analyzer.text || '';
        genreString = baseGenre;
        if (analyzerDesc) {
          genreString += ` : ${analyzerDesc}`;
        }
        bpm = analyzer.bpm || ss.bpm || data.bpm || 120;
        keyscale = analyzer.keyscale || ss.keyscale || data.keyscale || '';
      } else {
        genreString = ss.genre || data.genre || '';
        bpm = ss.bpm || data.bpm || 120;
        keyscale = ss.keyscale || data.keyscale || '';
      }

      return {
        workflow: data.workflow || 'ace_text2music_v2',
        lyrics: inputs.lyrics || data.lyrics || '',
        genre: genreString,
        bpm: bpm,
        keyscale: keyscale,
        duration: ss.duration || data.duration || 30,
        language: ss.language || data.language || 'en',
        time_signature: String(ss.timeSignature || data.timeSignature || '4/4').split('/')[0],
        cfg_scale: inputs.cfgScale ?? data.cfgScale ?? 2,
        temperature: inputs.temperature ?? data.temperature ?? 0.85,
        steps: inputs.steps ?? data.steps ?? 8,
        top_p: inputs.topP ?? data.topP ?? 0.9,
        top_k: Math.min(100, inputs.topK ?? data.topK ?? 0),
        sampling_shift: inputs.samplingShift ?? data.samplingShift ?? 3,
      };
    },
    extractResult: (res) => res.audio_url || res.url || '',
    resultKey: 'audioUrl',
  },
  CoverGeneratorNode: {
    api: generateAudioCover,
    buildParams: (inputs, data) => ({
      workflow: data.workflow || 'ace_audio_cover',
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
      story_concept: inputs.story_concept || inputs.story || data.story_concept || data.story || '',
      theme_style: inputs.theme_style || inputs.theme || data.theme_style || data.theme || '',
      subject_scenes: inputs.subject_scenes || data.subject_scenes || '',
    }),
    extractResult: (res) => res.concepts || res.prompts || res,
    resultKey: 'prompts',
  },
  T2VGeneratorNode: {
    api: generateVideo,
    buildParams: (inputs, data) => {
      let conceptsFile = undefined;
      if (inputs.prompts && typeof inputs.prompts === 'object') {
        const outputs = inputs.prompts.outputs || [];
        if (outputs.length > 0) {
          const url = outputs[0];
          conceptsFile = url.substring(url.lastIndexOf('/') + 1);
        }
      }
      const loraParams = {};
      for (let i = 1; i <= 20; i++) {
        const loraKey = `lora_${i}`;
        const strengthKey = `strength_${i}`;
        const zLoraKey = `z_image_lora_${i}`;
        const zStrengthKey = `z_image_strength_${i}`;
        if (inputs[loraKey] !== undefined || data[loraKey] !== undefined) {
          loraParams[loraKey] = inputs[loraKey] || data[loraKey];
        }
        if (inputs[strengthKey] !== undefined || data[strengthKey] !== undefined) {
          loraParams[strengthKey] = inputs[strengthKey] ?? data[strengthKey];
        }
        if (inputs[zLoraKey] !== undefined || data[zLoraKey] !== undefined) {
          loraParams[zLoraKey] = inputs[zLoraKey] || data[zLoraKey];
        }
        if (inputs[zStrengthKey] !== undefined || data[zStrengthKey] !== undefined) {
          loraParams[zStrengthKey] = inputs[zStrengthKey] ?? data[zStrengthKey];
        }
      }

      const allNodes = useWorkflowStore.getState().nodes;
      const musicNode = allNodes.find(n => n.type === 'MusicGeneratorNode' && n.data?.audioUrl);
      const audioFileNode = allNodes.find(n => n.type === 'AudioFileNode' && n.data?.audioUrl);
      const activeAudioUrl = musicNode?.data?.audioUrl || audioFileNode?.data?.audioUrl || data.audioUrl || '';
      const projectPath = useWorkflowStore.getState().projectPath;

      return {
        mode: 't2v',
        audio_path: activeAudioUrl,
        project_path: projectPath,
        prompts: inputs.prompt || (inputs.prompts && typeof inputs.prompts === 'string' ? inputs.prompts : '') || data.prompt || '',
        concepts_file: conceptsFile || inputs.concepts_file || data.concepts_file || undefined,
        fps: inputs.fps ?? data.fps ?? 24,
        resolution: inputs.resolution || data.resolution || '1024x576',
        width: inputs.width ?? data.width ?? 1024,
        height: inputs.height ?? data.height ?? 576,
        seed: inputs.seed ?? data.seed ?? -1,
        camera_motion: inputs.cameraMotion || data.cameraMotion || 'Static',
        ltx_gguf: inputs.ltx_gguf || data.ltx_gguf || 'VIDEO\\LTX\\ltx-2.3-22b-distilled-1.1-Q4_0.gguf',
        video_vae: inputs.video_vae || data.video_vae || 'LTX 2\\LTX23_video_vae_bf16.safetensors',
        gemma_clip: inputs.gemma_clip || data.gemma_clip || 'gemma-3-12b-it-abliterated-sikaworld-high-fidelity-edition.safetensors',
        text_projection: inputs.text_projection || data.text_projection || 'ltx-2.3_text_projection_bf16.safetensors',
        latent_upscaler: inputs.latent_upscaler || data.latent_upscaler || 'ltx-2.3-spatial-upscaler-x2-1.1.safetensors',
        audio_vae: inputs.audio_vae || data.audio_vae || 'LTX 2\\LTX23_audio_vae_bf16.safetensors',
        z_image_turbo: inputs.z_image_turbo || data.z_image_turbo || 'IMAGE\\Z_image_turbo_bf16.safetensors',
        z_image_clip: inputs.z_image_clip || data.z_image_clip || 'qwen_3_4b.safetensors',
        z_image_vae: inputs.z_image_vae || data.z_image_vae || 'ae.safetensors',
        supergemma_llm: inputs.supergemma_llm || data.supergemma_llm || 'supergemma4-26b-uncensored-fast-v2-Q4_K_M.gguf',
        use_custom_loras: inputs.use_custom_loras || data.use_custom_loras || 'OFF',
        lora_trigger_word: !!(inputs.lora_trigger_word ?? data.lora_trigger_word),
        lora_count: inputs.lora_count ?? data.lora_count ?? 1,
        ltx_two_pass_mode: inputs.ltx_two_pass_mode || data.ltx_two_pass_mode || 'ON',
        use_z_image_loras: inputs.use_z_image_loras || data.use_z_image_loras || 'OFF',
        z_lora_trigger_word: !!(inputs.z_lora_trigger_word ?? data.z_lora_trigger_word),
        z_image_lora_count: inputs.z_image_lora_count ?? data.z_image_lora_count ?? 1,
        ...loraParams,
        advanced_enabled: !!(inputs.advanced_enabled ?? data.advanced_enabled),
        settings_count: inputs.settings_count ?? data.settings_count ?? 2,
        selection_mode_all: inputs.selection_mode_all || data.selection_mode_all || 'Index-based',
        camera_motion_list: inputs.camera_motion_list ?? data.camera_motion_list ?? 'Slow push-in\nTrack right\nTrack left\nDolly backward\nHandheld follow\nOver-the-shoulder push-in\nSlow pan right\nSlow pan left',
        character_motion_list: inputs.character_motion_list ?? data.character_motion_list ?? 'Walks toward camera with confident swagger\nStrides across the frame\nTurns head to look directly at lens',
        camera_motion_preset: inputs.camera_motion_preset || data.camera_motion_preset || 'Camera Motion',
        character_motion_preset: inputs.character_motion_preset || data.character_motion_preset || 'Character Movement/Motion',
        camera_motion_sel_mode: inputs.camera_motion_sel_mode || data.camera_motion_sel_mode || 'index',
        character_motion_sel_mode: inputs.character_motion_sel_mode || data.character_motion_sel_mode || 'index',
        camera_motion_items: inputs.camera_motion_items ?? data.camera_motion_items ?? 1,
        character_motion_items: inputs.character_motion_items ?? data.character_motion_items ?? 1,
        camera_motion_template: inputs.camera_motion_template || data.camera_motion_template || 'start with {item1} then follow with {item2}',
        character_motion_template: inputs.character_motion_template || data.character_motion_template || 'start with {item1} then follow with {item2}',
        use_remake_folder: inputs.use_remake_folder ?? data.use_remake_folder ?? false,
        redo_prompt_number: inputs.redo_prompt_number ?? data.redo_prompt_number ?? 0,
        overwrite_mode: inputs.overwrite_mode || data.overwrite_mode || 'backup',
      };
    },
    extractResult: (res) => res.video_url || res.url || '',
    resultKey: 'videoUrl',
  },
  I2VGeneratorNode: {
    api: generateVideo,
    buildParams: (inputs, data) => {
      let conceptsFile = undefined;
      if (inputs.prompts && typeof inputs.prompts === 'object') {
        const outputs = inputs.prompts.outputs || [];
        if (outputs.length > 0) {
          const url = outputs[0];
          conceptsFile = url.substring(url.lastIndexOf('/') + 1);
        }
      }
      const loraParams = {};
      for (let i = 1; i <= 20; i++) {
        const loraKey = `lora_${i}`;
        const strengthKey = `strength_${i}`;
        const zLoraKey = `z_image_lora_${i}`;
        const zStrengthKey = `z_image_strength_${i}`;
        if (inputs[loraKey] !== undefined || data[loraKey] !== undefined) {
          loraParams[loraKey] = inputs[loraKey] || data[loraKey];
        }
        if (inputs[strengthKey] !== undefined || data[strengthKey] !== undefined) {
          loraParams[strengthKey] = inputs[strengthKey] ?? data[strengthKey];
        }
        if (inputs[zLoraKey] !== undefined || data[zLoraKey] !== undefined) {
          loraParams[zLoraKey] = inputs[zLoraKey] || data[zLoraKey];
        }
        if (inputs[zStrengthKey] !== undefined || data[zStrengthKey] !== undefined) {
          loraParams[zStrengthKey] = inputs[zStrengthKey] ?? data[zStrengthKey];
        }
      }

      const allNodes = useWorkflowStore.getState().nodes;
      const musicNode = allNodes.find(n => n.type === 'MusicGeneratorNode' && n.data?.audioUrl);
      const audioFileNode = allNodes.find(n => n.type === 'AudioFileNode' && n.data?.audioUrl);
      const activeAudioUrl = musicNode?.data?.audioUrl || audioFileNode?.data?.audioUrl || data.audioUrl || '';
      const projectPath = useWorkflowStore.getState().projectPath;

      return {
        mode: 'i2v',
        audio_path: activeAudioUrl,
        project_path: projectPath,
        prompts: inputs.prompt || (inputs.prompts && typeof inputs.prompts === 'string' ? inputs.prompts : '') || data.prompt || '',
        concepts_file: conceptsFile || inputs.concepts_file || data.concepts_file || undefined,
        image: inputs.imageUrl || data.imageUrl || undefined,
        fps: inputs.fps ?? data.fps ?? 24,
        resolution: inputs.resolution || data.resolution || '1024x576',
        width: inputs.width ?? data.width ?? 1024,
        height: inputs.height ?? data.height ?? 576,
        seed: inputs.seed ?? data.seed ?? -1,
        camera_motion: inputs.cameraMotion || data.cameraMotion || 'Static',
        ltx_gguf: inputs.ltx_gguf || data.ltx_gguf || 'VIDEO\\LTX\\ltx-2.3-22b-distilled-1.1-Q4_0.gguf',
        video_vae: inputs.video_vae || data.video_vae || 'LTX 2\\LTX23_video_vae_bf16.safetensors',
        gemma_clip: inputs.gemma_clip || data.gemma_clip || 'gemma-3-12b-it-abliterated-sikaworld-high-fidelity-edition.safetensors',
        text_projection: inputs.text_projection || data.text_projection || 'ltx-2.3_text_projection_bf16.safetensors',
        latent_upscaler: inputs.latent_upscaler || data.latent_upscaler || 'ltx-2.3-spatial-upscaler-x2-1.1.safetensors',
        audio_vae: inputs.audio_vae || data.audio_vae || 'LTX 2\\LTX23_audio_vae_bf16.safetensors',
        z_image_turbo: inputs.z_image_turbo || data.z_image_turbo || 'IMAGE\\Z_image_turbo_bf16.safetensors',
        z_image_clip: inputs.z_image_clip || data.z_image_clip || 'qwen_3_4b.safetensors',
        z_image_vae: inputs.z_image_vae || data.z_image_vae || 'ae.safetensors',
        supergemma_llm: inputs.supergemma_llm || data.supergemma_llm || 'supergemma4-26b-uncensored-fast-v2-Q4_K_M.gguf',
        use_custom_loras: inputs.use_custom_loras || data.use_custom_loras || 'OFF',
        lora_trigger_word: !!(inputs.lora_trigger_word ?? data.lora_trigger_word),
        lora_count: inputs.lora_count ?? data.lora_count ?? 1,
        ltx_two_pass_mode: inputs.ltx_two_pass_mode || data.ltx_two_pass_mode || 'ON',
        use_z_image_loras: inputs.use_z_image_loras || data.use_z_image_loras || 'OFF',
        z_lora_trigger_word: !!(inputs.z_lora_trigger_word ?? data.z_lora_trigger_word),
        z_image_lora_count: inputs.z_image_lora_count ?? data.z_image_lora_count ?? 1,
        ...loraParams,
        advanced_enabled: !!(inputs.advanced_enabled ?? data.advanced_enabled),
        settings_count: inputs.settings_count ?? data.settings_count ?? 2,
        selection_mode_all: inputs.selection_mode_all || data.selection_mode_all || 'Index-based',
        camera_motion_list: inputs.camera_motion_list ?? data.camera_motion_list ?? 'Slow push-in\nTrack right\nTrack left\nDolly backward\nHandheld follow\nOver-the-shoulder push-in\nSlow pan right\nSlow pan left',
        character_motion_list: inputs.character_motion_list ?? data.character_motion_list ?? 'Walks toward camera with confident swagger\nStrides across the frame\nTurns head to look directly at lens',
        camera_motion_preset: inputs.camera_motion_preset || data.camera_motion_preset || 'Camera Motion',
        character_motion_preset: inputs.character_motion_preset || data.character_motion_preset || 'Character Movement/Motion',
        camera_motion_sel_mode: inputs.camera_motion_sel_mode || data.camera_motion_sel_mode || 'index',
        character_motion_sel_mode: inputs.character_motion_sel_mode || data.character_motion_sel_mode || 'index',
        camera_motion_items: inputs.camera_motion_items ?? data.camera_motion_items ?? 1,
        character_motion_items: inputs.character_motion_items ?? data.character_motion_items ?? 1,
        camera_motion_template: inputs.camera_motion_template || data.camera_motion_template || 'start with {item1} then follow with {item2}',
        character_motion_template: inputs.character_motion_template || data.character_motion_template || 'start with {item1} then follow with {item2}',
        use_remake_folder: inputs.use_remake_folder ?? data.use_remake_folder ?? false,
        redo_prompt_number: inputs.redo_prompt_number ?? data.redo_prompt_number ?? 0,
        overwrite_mode: inputs.overwrite_mode || data.overwrite_mode || 'backup',
      };
    },
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
  VideoAudioCombinerNode: {
    api: (params) => combineVideoAudio(params.video_url, params.audio_url),
    buildParams: (inputs, data) => ({
      video_url: inputs.videoUrl || data.videoUrl || '',
      audio_url: inputs.audioUrl || data.audioUrl || '',
    }),
    extractResult: (res) => res.video_url || res.url || '',
    resultKey: 'videoUrl',
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
  'SongSettingsNode',
  'VideoWorkflowSettingsNode',
  'LTXLoRASettingsNode',
  'ZImageLoRASettingsNode',
  'VideoAdvancedSettingsNode',
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
  const targetNode = nodeMap[nodeId];
  const targetType = targetNode ? targetNode.type : '';

  for (const edge of incomingEdges) {
    const sourceNode = nodeMap[edge.source];
    if (!sourceNode) continue;

    const sourceData = sourceNode.data || {};
    if (sourceNode.type === 'LLMTextGenNode') {
      inputs._analyzer = { ...sourceData };
    }

    if (targetType === 'PromptCreatorNode') {
      const handle = edge.targetHandle;
      if (handle === 'input-1') {
        inputs.story_concept = sourceData.story_concept || sourceData.story || sourceData.text || '';
      } else if (handle === 'input-2') {
        inputs.theme_style = sourceData.theme_style || sourceData.theme || sourceData.text || '';
      } else if (handle === 'input-3') {
        inputs.subject_scenes = sourceData.subject_scenes || sourceData.subject || sourceData.text || '';
      } else if (handle === 'input-4') {
        if (sourceData.gutsSettings && typeof sourceData.gutsSettings === 'object') {
          inputs._gutsSettings = { ...sourceData.gutsSettings };
          Object.assign(inputs, sourceData.gutsSettings);
        } else {
          Object.assign(inputs, sourceData);
        }
      } else if (handle === 'input-5') {
        inputs.lyrics = sourceData.lyrics || sourceData.text || '';
      } else {
        Object.assign(inputs, sourceData);
      }
    } else {
      Object.assign(inputs, sourceData);
    }

    if (sourceData.songSettings && typeof sourceData.songSettings === 'object') {
      inputs._songSettings = { ...sourceData.songSettings };
      Object.assign(inputs, sourceData.songSettings);
    }
    if (sourceData.gutsSettings && typeof sourceData.gutsSettings === 'object') {
      inputs._gutsSettings = { ...sourceData.gutsSettings };
      Object.assign(inputs, sourceData.gutsSettings);
    }
    if (sourceData.ltxLoraSettings && typeof sourceData.ltxLoraSettings === 'object') {
      inputs._ltxLoraSettings = { ...sourceData.ltxLoraSettings };
      Object.assign(inputs, sourceData.ltxLoraSettings);
    }
    if (sourceData.zImageLoraSettings && typeof sourceData.zImageLoraSettings === 'object') {
      inputs._zImageLoraSettings = { ...sourceData.zImageLoraSettings };
      Object.assign(inputs, sourceData.zImageLoraSettings);
    }
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
