"""Workflow editor for loading, modifying, and injecting parameters into
ComfyUI workflow JSONs before enqueuing them."""

import copy
import glob
import json
import logging
import os
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Legacy mapping for backward compatibility
WORKFLOW_NAMES = {
    "ace_audio_cover": "ace_audio_cover.json",
    "ace_text2music_v2": "ace_text2music_v2.json",
    "llm_gemma4_text_gen_v1": "llm_gemma4_text_gen_v1.json",
    "prompt_creator": "prompt_creator.json",
    "i2v": "i2v.json",
    "t2v": "t2v.json",
    "tts": "tts.json",
}

# Category mappings - supports multiple workflows per category
WORKFLOW_CATEGORIES = {
    "ace_audio_cover": "cover-audio",
    "ace_text2music": "text-to-audio",
    "ace_text2music_v2": "text-to-audio",
    "llm_gemma4_text_gen_v1": "text-to-audio",
    "prompt_creator": "text-to-audio",
    "i2v": "image-to-video",
    "t2v": "text-to-video",
    "tts": "text-to-audio",
}

# Workflow metadata for display and selection
WORKFLOW_METADATA = {
    "ace_audio_cover": {
        "display_name": "ACE Audio Cover",
        "description": "Generate cover audio from reference audio",
        "version": "1.0",
        "default": True,
    },
    "ace_text2music": {
        "display_name": "ACE Text to Music",
        "description": "Generate music from text description",
        "version": "1.0",
        "default": False,
    },
    "ace_text2music_v2": {
        "display_name": "ACE Text2Music v2",
        "description": "Improved text2music with separate genre/lyrics nodes and turbo model",
        "version": "2.0",
        "default": True,
    },
    "llm_gemma4_text_gen_v1": {
        "display_name": "Gemma4 Audio Analysis",
        "description": "Analyze audio with Gemma4 LLM - genre, instruments, beat, mood",
        "version": "1.0",
        "default": True,
    },
    "prompt_creator": {
        "display_name": "Prompt Creator",
        "description": "Generate enhanced prompts for music generation",
        "version": "1.0",
        "default": True,
    },
    "i2v": {
        "display_name": "Image to Video",
        "description": "Generate video from image",
        "version": "1.0",
        "default": True,
    },
    "t2v": {
        "display_name": "Text to Video",
        "description": "Generate video from text description",
        "version": "1.0",
        "default": True,
    },
    "tts": {
        "display_name": "Text to Speech",
        "description": "Generate speech from text",
        "version": "1.0",
        "default": True,
    },
}


class WorkflowEditor:
    """Loads workflow JSONs from disk and provides methods to inject parameters
    into specific nodes before submission to ComfyUI."""

    def __init__(self, workflows_dir: str):
        """Load all workflow JSONs from the given directory.

        Args:
            workflows_dir: Absolute path to the directory containing workflow JSONs.
        """
        self.workflows_dir = workflows_dir
        self._cache: dict[str, dict] = {}
        self._filenames: dict[str, str] = {}
        self._load_all()

    def _load_all(self):
        """Scan workflows_dir for all .json files and load them into cache."""
        self._cache.clear()
        self._filenames.clear()

        # Load from known WORKFLOW_NAMES first (backward compat)
        for name, filename in WORKFLOW_NAMES.items():
            filepath = os.path.join(self.workflows_dir, filename)
            if os.path.exists(filepath):
                with open(filepath, "r", encoding="utf-8") as f:
                    self._cache[name] = json.load(f)
                self._filenames[name] = filename
                logger.info("Loaded workflow '%s' from %s", name, filepath)
            else:
                logger.warning("Workflow file not found: %s", filepath)

        # Auto-discover any additional .json files not in WORKFLOW_NAMES
        for filepath in glob.glob(os.path.join(self.workflows_dir, "*.json")):
            filename = os.path.basename(filepath)
            name = os.path.splitext(filename)[0]
            if name not in self._cache:
                with open(filepath, "r", encoding="utf-8") as f:
                    self._cache[name] = json.load(f)
                self._filenames[name] = filename
                logger.info("Auto-discovered workflow '%s' from %s", name, filepath)

    def reload(self):
        """Re-scan the workflows directory and reload all workflows."""
        self._load_all()
        names = list(self._cache.keys())
        logger.info("Reloaded %d workflows: %s", len(names), names)
        return {"workflows": self.get_workflow_info(), "count": len(names)}

    def get_workflow(self, name: str) -> dict:
        """Return a deep copy of a cached workflow by name.

        Args:
            name: Workflow name (e.g. 'ace_audio_cover', 'prompt_creator', 'i2v', 't2v').

        Returns:
            Deep copy of the workflow dict. Returns empty dict if not found.
        """
        if name not in self._cache:
            logger.error(f"Unknown workflow '{name}'. Available: {list(self._cache.keys())}")
            return {}
        return copy.deepcopy(self._cache[name])

    def get_workflow_info(self) -> list[dict]:
        """Return metadata about all loaded workflows.

        Returns:
            List of dicts with keys: name, filename, node_count, category, metadata.
        """
        info = []
        for name, wf in self._cache.items():
            metadata = WORKFLOW_METADATA.get(name, {})
            info.append({
                "name": name,
                "filename": self._filenames.get(name, f"{name}.json"),
                "node_count": len(wf),
                "category": WORKFLOW_CATEGORIES.get(name, "uncategorized"),
                "display_name": metadata.get("display_name", name),
                "description": metadata.get("description", ""),
                "version": metadata.get("version", "1.0"),
                "default": metadata.get("default", False),
            })
        return info

    def get_workflows_by_category(self, category: str) -> list[dict]:
        """Return all workflows in a specific category.

        Args:
            category: Category name (e.g., 'text-to-audio', 'image-to-video').

        Returns:
            List of workflow info dicts in the specified category.
        """
        all_workflows = self.get_workflow_info()
        return [wf for wf in all_workflows if wf["category"] == category]

    def get_default_workflow(self, category: str) -> Optional[str]:
        """Return the name of the default workflow for a category.

        Args:
            category: Category name.

        Returns:
            Workflow name or None if no default found.
        """
        workflows = self.get_workflows_by_category(category)
        for wf in workflows:
            if wf.get("default", False):
                return wf["name"]
        # If no default, return the first workflow in the category
        return workflows[0]["name"] if workflows else None

    @staticmethod
    def set_node_input(
        workflow: dict, node_id: str, input_name: str, value: Any
    ) -> dict:
        """Set a specific node's input value in the workflow.

        If the value is None and the input is a connection list (e.g. ["14", 0]),
        the connection is replaced with an empty string to break it.

        Args:
            workflow: The workflow dict to modify (in-place, also returned).
            node_id: The node ID string (e.g. "31", "28:79", "736:424").
            input_name: The input key name (e.g. "task_type", "language", "fps").
            value: The value to set.

        Returns:
            The modified workflow dict.
        """
        node = workflow.get(node_id)
        if node is None:
            logger.warning("Node '%s' not found in workflow", node_id)
            return workflow
        if "inputs" not in node:
            node["inputs"] = {}
        node["inputs"][input_name] = value
        return workflow

    def inject_llm_text_gen_params(self, workflow: dict, params: dict) -> dict:
        """Inject parameters into the LLM Gemma4 text generation workflow.

        Sets prompt on TextGenerate (node 1), audio filename on LoadAudio (node 5),
        and optional sampling params on TextGenerate.

        Args:
            workflow: The LLM text gen workflow dict.
            params: Dict with keys:
                - prompt (str): Text prompt for the LLM
                - audio_file (str): Filename of uploaded audio in ComfyUI input/
                - temperature (float, optional)
                - top_k (int, optional)
                - top_p (float, optional)
                - max_length (int, optional)
                - seed (int, optional)

        Returns:
            The modified workflow dict.
        """
        if "prompt" in params:
            self.set_node_input(workflow, "1", "prompt", params["prompt"])
        if "audio_file" in params:
            self.set_node_input(workflow, "5", "audio", params["audio_file"])
        if "temperature" in params:
            self.set_node_input(workflow, "1", "sampling_mode.temperature", params["temperature"])
        if "top_k" in params:
            self.set_node_input(workflow, "1", "sampling_mode.top_k", params["top_k"])
        if "top_p" in params:
            self.set_node_input(workflow, "1", "sampling_mode.top_p", params["top_p"])
        if "max_length" in params:
            self.set_node_input(workflow, "1", "max_length", params["max_length"])
        if "seed" in params:
            self.set_node_input(workflow, "1", "sampling_mode.seed", params["seed"])
        return workflow

    def inject_ace_cover_params(self, workflow: dict, params: dict) -> dict:
        """Inject parameters into the ACE audio cover workflow.

        Sets task_type, language, lyrics, bpm, keyscale, duration, track_name
        on the ACEStep15TaskTextEncode node (id "31"), and the audio file path
        on VHS_LoadAudioUpload (id "16").

        Args:
            workflow: The ACE workflow dict.
            params: Dict with keys:
                - audio_file (str): filename for node "16"
                - lyrics (str)
                - language (str, default "en")
                - bpm (int, optional)
                - duration (int, default 180)
                - track_name (str, default "")
                - keyscale (str, optional)
                - seed (int, optional)

        Returns:
            The modified workflow dict.
        """
        self.set_node_input(
            workflow, "16", "audio", params.get("audio_file", "")
        )
        if "start_time" in params:
            self.set_node_input(workflow, "16", "start_time", params["start_time"])
        if "duration" in params:
            self.set_node_input(workflow, "16", "duration", params["duration"])

        node_31 = workflow.get("31", {})
        inputs_31 = node_31.get("inputs", {})

        inject = {
            "task_type": "cover",
            "language": params.get("language", "en"),
            "lyrics": params.get("lyrics", ""),
            "duration": params.get("duration", inputs_31.get("duration", 180)),
            "track_name": params.get("track_name", "None"),
        }

        if "bpm" in params:
            inject["bpm"] = params["bpm"]
        if "keyscale" in params:
            inject["keyscale"] = params["keyscale"]
        if "seed" in params:
            inject["seed"] = params["seed"]

        for key, value in inject.items():
            self.set_node_input(workflow, "31", key, value)

        self._inject_ace_advanced_params(workflow, params)

        return workflow

    def _inject_ace_advanced_params(self, workflow: dict, params: dict) -> None:
        """Inject advanced ACE-Step generation parameters into workflow nodes.

        Sets params on the task encode node (31), the scheduler (21),
        the sampling shift node (23), and the sampler select node (20).

        Args:
            workflow: The ACE workflow dict.
            params: Dict with optional keys:
                - time_signature (int): from frontend timeSignature
                - cfg (float): from frontend cfgScale
                - temperature (float)
                - top_p (float)
                - top_k (int)
                - steps (int): scheduler steps
                - sampling_shift (int): ModelSamplingAuraFlow shift
                - sampler (str): sampler_name for KSamplerSelect
        """
        ace_node = "31"
        if "time_signature" in params:
            self.set_node_input(workflow, ace_node, "timesignature", params["time_signature"])
        if "cfg" in params:
            self.set_node_input(workflow, ace_node, "cfg_scale", params["cfg"])
        if "temperature" in params:
            self.set_node_input(workflow, ace_node, "temperature", params["temperature"])
        if "top_p" in params:
            self.set_node_input(workflow, ace_node, "top_p", params["top_p"])
        if "top_k" in params:
            self.set_node_input(workflow, ace_node, "top_k", params["top_k"])
        if "steps" in params:
            self.set_node_input(workflow, "21", "steps", params["steps"])
        if "sampling_shift" in params:
            self.set_node_input(workflow, "23", "shift", params["sampling_shift"])
        if "sampler" in params:
            self.set_node_input(workflow, "20", "sampler_name", params["sampler"])

    def inject_ace_text2music_params(self, workflow: dict, params: dict) -> dict:
        """Inject parameters into the simplified ACE text2music workflow.

        All node 31 inputs are direct values (no QwenVL / AudioInfo connections).
        Genre text is injected directly into the `text` field.

        Args:
            workflow: The ACE text2music workflow dict.
            params: Dict with keys:
                - audio_file (str): Uploaded silent audio filename for source_latents
                - lyrics (str)
                - genre (str): Genre/style text injected directly into text field
                - language (str, default "en")
                - bpm (int, optional)
                - duration (int, default 180)
                - seed (int, optional)

        Returns:
            The modified workflow dict.
        """
        # Detect v2 workflow by checking for node 94 (TextEncodeAceStepAudio1.5)
        if "94" in workflow and workflow["94"].get("class_type") == "TextEncodeAceStepAudio1.5":
            return self.inject_ace_text2music_v2_params(workflow, params)

        self.set_node_input(workflow, "31", "task_type", "text2music")
        self.set_node_input(workflow, "31", "lyrics", params.get("lyrics", ""))
        self.set_node_input(workflow, "31", "language", params.get("language", "en"))
        self.set_node_input(workflow, "31", "duration", params.get("duration", 180))
        self.set_node_input(workflow, "31", "track_name", params.get("track_name", "None"))
        self.set_node_input(workflow, "31", "text", params.get("genre", params.get("text", "")))

        if "bpm" in params:
            self.set_node_input(workflow, "31", "bpm", params["bpm"])
        if "seed" in params:
            self.set_node_input(workflow, "31", "seed", params["seed"])

        self._inject_ace_advanced_params(workflow, params)

        if "audio_file" in params:
            self.set_node_input(workflow, "16", "audio", params["audio_file"])
        if "duration" in params:
            self.set_node_input(workflow, "16", "duration", params["duration"])

        return workflow

    def inject_ace_text2music_v2_params(self, workflow: dict, params: dict) -> dict:
        """Inject parameters into the ACE text2music v2 workflow.

        v2 uses separate ttN text nodes for genre (109) and lyrics (110),
        TextEncodeAceStepAudio1.5 (94) as the main encode node,
        EmptyAceStep1.5LatentAudio (98) for duration, KSampler (3) for
        sampling, and ModelSamplingAuraFlow (78) for shift.

        Args:
            workflow: The ACE text2music v2 workflow dict.
            params: Dict with keys:
                - lyrics (str): Injected into node 110 text field
                - genre (str): Injected into node 109 text field
                - language (str, default "en")
                - bpm (int, optional)
                - duration (int, default 30)
                - seed (int, optional)
                - cfg_scale (float, optional)
                - temperature (float, optional)
                - top_p (float, optional)
                - top_k (int, optional)
                - min_p (float, optional)
                - keyscale (str, optional)
                - steps (int, optional): KSampler steps
                - sampling_shift (int, optional): ModelSamplingAuraFlow shift

        Returns:
            The modified workflow dict.
        """
        genre = params.get("genre", "")
        lyrics = params.get("lyrics", "")

        # Inject genre into node 109 (ttN text "genre")
        self.set_node_input(workflow, "109", "text", genre)

        # Inject lyrics into node 110 (ttN text "lyrics")
        self.set_node_input(workflow, "110", "text", lyrics)

        # Inject parameters into node 94 (TextEncodeAceStepAudio1.5)
        encode_node = "94"
        self.set_node_input(workflow, encode_node, "language", params.get("language", "en"))
        self.set_node_input(workflow, encode_node, "duration", params.get("duration", 30))
        self.set_node_input(workflow, encode_node, "timesignature", str(params.get("time_signature", params.get("timesignature", "4"))))

        if "bpm" in params:
            self.set_node_input(workflow, encode_node, "bpm", params["bpm"])
        if "seed" in params:
            self.set_node_input(workflow, encode_node, "seed", params["seed"])
            self.set_node_input(workflow, "3", "seed", params["seed"])
        if "keyscale" in params:
            self.set_node_input(workflow, encode_node, "keyscale", params["keyscale"])

        # Advanced params on node 94
        if "cfg_scale" in params:
            self.set_node_input(workflow, encode_node, "cfg_scale", params["cfg_scale"])
        if "temperature" in params:
            self.set_node_input(workflow, encode_node, "temperature", params["temperature"])
        if "top_p" in params:
            self.set_node_input(workflow, encode_node, "top_p", params["top_p"])
        if "top_k" in params:
            top_k = min(max(int(params["top_k"]), 0), 100)
            self.set_node_input(workflow, encode_node, "top_k", top_k)
        if "min_p" in params:
            self.set_node_input(workflow, encode_node, "min_p", params["min_p"])

        # Duration into EmptyAceStep1.5LatentAudio (node 98)
        self.set_node_input(workflow, "98", "seconds", params.get("duration", 30))

        # KSampler (node 3) steps
        if "steps" in params:
            self.set_node_input(workflow, "3", "steps", params["steps"])

        # ModelSamplingAuraFlow (node 78) shift
        if "sampling_shift" in params:
            self.set_node_input(workflow, "78", "shift", params["sampling_shift"])

        # KSampler (node 3) cfg — for turbo, cfg=1 is standard
        if "cfg" in params:
            self.set_node_input(workflow, "3", "cfg", params["cfg"])

        return workflow

    def inject_prompt_creator_params(
        self, workflow: dict, params: dict, input_manager: Any = None
    ) -> dict:
        """Inject parameters into the prompt creator workflow.

        Sets language on the VRGDG_ManualLyricsExtractor_SRT node (id "28:79")
        and optionally writes text files via input_manager.

        Args:
            workflow: The prompt creator workflow dict.
            params: Dict with keys:
                - language (str, default "english")
                - lyrics (str, optional, written to text file)
                - theme_style (str, optional, written to text file)
                - story_concept (str, optional, written to text file)
                - subject_scenes (str, optional, written to text file)
            input_manager: Optional InputManager instance. If provided, text
                files are written to disk for the VRGDG_LoadTextAdvanced nodes.

        Returns:
            The modified workflow dict.
        """
        lang = params.get("language", "english")
        self.set_node_input(workflow, "28:79", "language", lang)

        if input_manager:
            if "lyrics" in params:
                input_manager.write_lyrics(params["lyrics"])
            if "theme_style" in params:
                input_manager.write_theme_style(params["theme_style"])
            if "story_concept" in params:
                input_manager.write_story_concept(params["story_concept"])
            if "subject_scenes" in params:
                input_manager.write_subject_scenes(params["subject_scenes"])

        return workflow

    def _inject_ltx_advanced_params(self, workflow: dict, params: dict) -> None:
        """Inject advanced LTX 2.3 generation parameters.

        Sets cfg on CFGGuider nodes, sampler_name on KSamplerSelect nodes,
        crf and format on VHS_VideoCombine, tail/pre frames on the SRT loader.

        Args:
            workflow: The LTX workflow dict.
            params: Dict with optional keys:
                - cfg (float)
                - sampler (str)
                - crf (int)
                - video_format (str)
                - tail_loss_frames (int)
                - pre_frames (int)
        """
        cfg_nodes = ["219:188", "218:185"]
        sampler_nodes = ["219:187", "218:186"]
        video_combine = "273"
        srt_loader = "218:287"

        if "cfg" in params:
            for nid in cfg_nodes:
                self.set_node_input(workflow, nid, "cfg", params["cfg"])
        if "sampler" in params:
            for nid in sampler_nodes:
                self.set_node_input(workflow, nid, "sampler_name", params["sampler"])
        if "crf" in params:
            self.set_node_input(workflow, video_combine, "crf", params["crf"])
        if "video_format" in params:
            self.set_node_input(workflow, video_combine, "format", params["video_format"])
        if "tail_loss_frames" in params:
            self.set_node_input(workflow, srt_loader, "tail_loss_frames", params["tail_loss_frames"])
        if "pre_frames" in params:
            self.set_node_input(workflow, srt_loader, "pre_frames", params["pre_frames"])

    def _inject_loras_from_array(self, workflow: dict, params: dict) -> None:
        """Inject LoRA parameters from an array format into the flat lora_1..lora_20 format.

        Args:
            workflow: The LTX workflow dict.
            params: Dict with optional 'loras' key containing list of {file, strength} objects.
        """
        loras = params.get("loras", [])
        if not isinstance(loras, list) or not loras:
            return
        lora_node = workflow.get("842")
        if not lora_node:
            return
        for i, lora in enumerate(loras[:20], start=1):
            if lora.get("file"):
                self.set_node_input(workflow, "842", f"lora_{i}", lora["file"])
                self.set_node_input(workflow, "842", f"strength_{i}", lora.get("strength", 1.0))

    def inject_i2v_params(self, workflow: dict, params: dict) -> dict:
        """Inject parameters into the Image-to-Video workflow.

        Sets fps, width, height, seed, model, LoRA parameters, and advanced
        LTX 2.3 params.

        Args:
            workflow: The i2v workflow dict.
            params: Dict with keys:
                - fps (int, default 24)
                - width (int, default 1280)
                - height (int, default 720)
                - seed (int, optional)
                - model (str, optional)
                - lora_1 .. lora_20 (str, optional)
                - strength_1 .. strength_20 (float, optional)
                - audio_path (str, optional — uploaded filename for audio)
                - cfg (float, optional)
                - sampler (str, optional)
                - crf (int, optional)
                - video_format (str, optional)
                - tail_loss_frames (int, optional)
                - pre_frames (int, optional)
                - loras (list[dict], optional) — array of {file, strength}

        Returns:
            The modified workflow dict.
        """
        self.set_node_input(
            workflow, "736:424", "value", params.get("fps", 24)
        )
        self.set_node_input(
            workflow, "736:425", "value", params.get("width", 1280)
        )
        self.set_node_input(
            workflow, "736:426", "value", params.get("height", 720)
        )
        if "seed" in params:
            self.set_node_input(
                workflow, "736:449", "value", params["seed"]
            )

        if "model" in params:
            self.set_node_input(
                workflow, "271:215", "unet_name", params["model"]
            )

        if "audio_path" in params:
            audio_node = workflow.get("736:691")
            if audio_node:
                self.set_node_input(
                    workflow, "736:691", "audio_file", params["audio_path"]
                )

        lora_node = workflow.get("842")
        if lora_node:
            for i in range(1, 21):
                lora_key = f"lora_{i}"
                strength_key = f"strength_{i}"
                if lora_key in params:
                    self.set_node_input(workflow, "842", lora_key, params[lora_key])
                if strength_key in params:
                    self.set_node_input(
                        workflow, "842", strength_key, params[strength_key]
                    )

        self._inject_loras_from_array(workflow, params)
        self._inject_ltx_advanced_params(workflow, params)

        return workflow

    def inject_t2v_params(self, workflow: dict, params: dict) -> dict:
        """Inject parameters into the Text-to-Video workflow.

        Same as i2v plus camera motion settings.

        Args:
            workflow: The t2v workflow dict.
            params: Dict with keys:
                - All i2v keys
                - camera_motion (str, optional)
                - character_motion (str, optional)

        Returns:
            The modified workflow dict.
        """
        self.inject_i2v_params(workflow, params)

        camera_node = workflow.get("887")
        if camera_node and "camera_motion" in params:
            self.set_node_input(
                workflow, "887", "items_1", params["camera_motion"]
            )
            self.set_node_input(
                workflow, "887", "items_2",
                params.get("character_motion", "")
            )

        if "prompt" in params:
            gemma_node = workflow.get("853")
            if gemma_node:
                self.set_node_input(
                    workflow, "853", "user_input", params["prompt"]
                )

        return workflow
