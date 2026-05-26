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
            "track_name": params.get("track_name", ""),
        }

        if "bpm" in params:
            inject["bpm"] = params["bpm"]
        if "keyscale" in params:
            inject["keyscale"] = params["keyscale"]
        if "seed" in params:
            inject["seed"] = params["seed"]

        for key, value in inject.items():
            self.set_node_input(workflow, "31", key, value)

        return workflow

    def inject_ace_text2music_params(self, workflow: dict, params: dict) -> dict:
        """Inject parameters into the ACE workflow for text-to-music mode.

        Same as cover but sets task_type="text2music" and disconnects the
        source_latents input on the Cover Guider node (id "19") since no
        reference audio is needed.

        Args:
            workflow: The ACE workflow dict.
            params: Dict with keys:
                - lyrics (str)
                - language (str, default "en")
                - genre (str, optional)
                - bpm (int, optional)
                - duration (int, default 180)
                - seed (int, optional)

        Returns:
            The modified workflow dict.
        """
        self.set_node_input(workflow, "31", "task_type", "text2music")
        self.set_node_input(workflow, "31", "language", params.get("language", "en"))
        self.set_node_input(workflow, "31", "lyrics", params.get("lyrics", ""))
        self.set_node_input(
            workflow, "31", "duration", params.get("duration", 180)
        )
        self.set_node_input(workflow, "31", "track_name", "")

        if "bpm" in params:
            self.set_node_input(workflow, "31", "bpm", params["bpm"])
        if "seed" in params:
            self.set_node_input(workflow, "31", "seed", params["seed"])

        node_19 = workflow.get("19")
        if node_19 and "source_latents" in node_19.get("inputs", {}):
            del node_19["inputs"]["source_latents"]
            logger.info("Removed source_latents connection from node 19")

        self.set_node_input(workflow, "16", "audio", "")

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

    def inject_i2v_params(self, workflow: dict, params: dict) -> dict:
        """Inject parameters into the Image-to-Video workflow.

        Sets fps, width, height, seed, model, and LoRA parameters.

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
