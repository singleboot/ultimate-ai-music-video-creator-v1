"""Workflow editor for loading, modifying, and injecting parameters into
ComfyUI workflow JSONs before enqueuing them."""

import copy
import json
import logging
import os
from typing import Any, Optional

logger = logging.getLogger(__name__)

WORKFLOW_NAMES = {
    "ace_audio_cover": "ace_audio_cover.json",
    "prompt_creator": "prompt_creator.json",
    "i2v": "i2v.json",
    "t2v": "t2v.json",
    "tts": "tts.json",
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

        for name, filename in WORKFLOW_NAMES.items():
            filepath = os.path.join(workflows_dir, filename)
            if os.path.exists(filepath):
                with open(filepath, "r", encoding="utf-8") as f:
                    self._cache[name] = json.load(f)
                logger.info("Loaded workflow '%s' from %s", name, filepath)
            else:
                logger.warning("Workflow file not found: %s", filepath)
                self._cache[name] = {}

    def get_workflow(self, name: str) -> dict:
        """Return a deep copy of a cached workflow by name.

        Args:
            name: Workflow name (e.g. 'ace_audio_cover', 'prompt_creator', 'i2v', 't2v').

        Returns:
            Deep copy of the workflow dict. Empty dict if not found.

        Raises:
            ValueError: If the workflow name is unknown.
        """
        if name not in self._cache:
            raise ValueError(
                f"Unknown workflow '{name}'. Available: {list(self._cache.keys())}"
            )
        return copy.deepcopy(self._cache[name])

    def get_workflow_info(self) -> list[dict]:
        """Return metadata about all loaded workflows.

        Returns:
            List of dicts with keys: name, filename, node_count.
        """
        info = []
        for name, wf in self._cache.items():
            info.append({
                "name": name,
                "filename": WORKFLOW_NAMES.get(name),
                "node_count": len(wf),
            })
        return info

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
        """Inject parameters into the ACE workflow for text-to-music mode.

        Sets task_type="text2music" and provides a silent audio file as the
        reference for source_latents (required by the Cover Guider node).

        Args:
            workflow: The ACE workflow dict.
            params: Dict with keys:
                - audio_file (str): Uploaded silent audio filename for source_latents
                - lyrics (str)
                - language (str, default "en")
                - genre (str, optional)
                - bpm (int, optional)
                - duration (int, default 180)
                - seed (int, optional)
                - time_signature (int, optional)
                - cfg (float, optional)
                - temperature (float, optional)
                - top_p (float, optional)
                - top_k (int, optional)
                - steps (int, optional)
                - sampling_shift (int, optional)
                - sampler (str, optional)

        Returns:
            The modified workflow dict.
        """
        self.set_node_input(workflow, "31", "task_type", "text2music")
        self.set_node_input(workflow, "31", "language", params.get("language", "en"))
        self.set_node_input(workflow, "31", "lyrics", params.get("lyrics", ""))
        self.set_node_input(
            workflow, "31", "duration", params.get("duration", 180)
        )
        self.set_node_input(workflow, "31", "track_name", "None")

        if "bpm" in params:
            self.set_node_input(workflow, "31", "bpm", params["bpm"])
        if "seed" in params:
            self.set_node_input(workflow, "31", "seed", params["seed"])

        self._inject_ace_advanced_params(workflow, params)

        # Keep source_latents connected (required by Cover Guider).
        # The silent audio uploaded by pipeline.py provides a zero latent.
        if "audio_file" in params:
            self.set_node_input(workflow, "16", "audio", params["audio_file"])
        if "duration" in params:
            self.set_node_input(workflow, "16", "duration", params["duration"])

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
