"""Pipeline runner that orchestrates multi-step music video generation."""

import json
import logging
import os
import shutil
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)


class PipelineRunner:
    """Orchestrates multi-step generation pipelines across ACE audio,
    prompt creator, and video workflows."""

    def __init__(self, comfy_client, workflow_editor, input_manager):
        """Initialize the pipeline runner with required services.

        Args:
            comfy_client: ComfyUIClient instance.
            workflow_editor: WorkflowEditor instance.
            input_manager: InputManager instance.
        """
        self.comfy = comfy_client
        self.editor = workflow_editor
        self.input_mgr = input_manager

    async def run_text2audio(self, params: dict) -> str:
        """Generate audio from text description using the ACE workflow.

        Args:
            params: Dict with keys:
                - genre (str): Music genre description.
                - lyrics (str, optional): Provided lyrics. If empty and
                  lyrics_mode='ai', a placeholder is passed for AI generation.
                - lyrics_mode (str, optional): 'ai' or 'manual' (default 'manual').
                - language (str, optional): Language code (default 'en').
                - bpm (int, optional): Beats per minute.
                - duration (int, optional): Duration in seconds (default 180).
                - seed (int, optional): Random seed.

        Returns:
            The ComfyUI prompt_id for the enqueued job.
        """
        workflow = self.editor.get_workflow("ace_audio_cover")
        lyrics = params.get("lyrics", "")

        mode = params.get("lyrics_mode", "manual")
        if mode == "ai" and not lyrics:
            genre = params.get("genre", "pop")
            lyrics = f"[Instrumental]\nAI-generated {genre} composition\n"
            logger.info("Using AI lyrics placeholder for genre: %s", genre)

        inject_params = {
            "lyrics": lyrics,
            "language": params.get("language", "en"),
            "duration": params.get("duration", 180),
        }
        if "bpm" in params:
            inject_params["bpm"] = params["bpm"]
        if "seed" in params:
            inject_params["seed"] = params["seed"]

        self.editor.inject_ace_text2music_params(workflow, inject_params)
        prompt_id = await self.comfy.enqueue_workflow(workflow)
        logger.info("Enqueued text2audio job: prompt_id=%s", prompt_id)
        return prompt_id

    async def run_audio_cover(self, params: dict) -> str:
        """Generate an audio cover using the ACE workflow with a source audio file.

        Uploads the source audio to ComfyUI, then injects params and enqueues.

        Args:
            params: Dict with keys:
                - audio_path (str): Local path to the source audio file to upload.
                - lyrics (str): Lyrics for the cover.
                - language (str, optional): Language code (default 'en').
                - bpm (int, optional): Beats per minute.
                - duration (int, optional): Duration in seconds (default 180).
                - track_name (str, optional): Track name.
                - keyscale (str, optional): Key signature.
                - seed (int, optional): Random seed.

        Returns:
            The ComfyUI prompt_id for the enqueued job.
        """
        audio_path = params.get("audio_path", "")
        if not audio_path:
            raise ValueError("audio_path is required for audio cover")

        filename = await self.comfy.upload_audio(audio_path)

        workflow = self.editor.get_workflow("ace_audio_cover")
        inject_params = {
            "audio_file": filename,
            "lyrics": params.get("lyrics", ""),
            "language": params.get("language", "en"),
            "duration": params.get("duration", 180),
            "track_name": params.get("track_name", ""),
        }
        if "bpm" in params:
            inject_params["bpm"] = params["bpm"]
        if "keyscale" in params:
            inject_params["keyscale"] = params["keyscale"]
        if "seed" in params:
            inject_params["seed"] = params["seed"]

        self.editor.inject_ace_cover_params(workflow, inject_params)
        prompt_id = await self.comfy.enqueue_workflow(workflow)
        logger.info("Enqueued audio cover job: prompt_id=%s", prompt_id)
        return prompt_id

    async def run_tts(self, params: dict) -> str:
        """Run text-to-speech using a Fish Speech or similar workflow.

        Builds a minimal TTS workflow if the 'tts' workflow is available,
        otherwise raises an error.

        Args:
            params: Dict with keys:
                - text (str): Text to synthesize.
                - voice (str, optional): Voice name/preset.

        Returns:
            The ComfyUI prompt_id.

        Raises:
            ValueError: If no TTS workflow is available.
        """
        try:
            workflow = self.editor.get_workflow("tts")
        except ValueError:
            workflow = self._build_tts_workflow(params)

        if "text" in params:
            text_node_id = next(
                (nid for nid, node in workflow.items()
                 if node.get("class_type") == "TextGenerate"),
                None
            )
            if text_node_id:
                self.editor.set_node_input(
                    workflow, text_node_id, "prompt", params["text"]
                )

        prompt_id = await self.comfy.enqueue_workflow(workflow)
        logger.info("Enqueued TTS job: prompt_id=%s", prompt_id)
        return prompt_id

    def _build_tts_workflow(self, params: dict) -> dict:
        """Build a minimal TTS workflow as a fallback when no saved workflow exists.

        Args:
            params: Dict with text and optional voice.

        Returns:
            A minimal ComfyUI API-format workflow dict.

        Raises:
            ValueError: Always raised — TTS workflow not available.
        """
        raise ValueError(
            "TTS workflow not available. Ensure a 'tts' workflow JSON exists "
            "in the workflows directory."
        )

    async def run_prompt_creator(self, params: dict) -> str:
        """Run the prompt creator workflow to generate visual concept prompts.

        Writes lyrics, theme/style, story concept, and subject/scenes text files
        to the ComfyUI input directory, then enqueues the workflow.

        Args:
            params: Dict with keys:
                - lyrics (str): Full lyrics text.
                - theme_style (str): Visual style and theme description.
                - story_concept (str, optional): Story concept/arc.
                - subject_scenes (str, optional): Subject and scenes description.
                - language (str, optional): Language (default 'english').

        Returns:
            The ComfyUI prompt_id.
        """
        workflow = self.editor.get_workflow("prompt_creator")

        self.editor.inject_prompt_creator_params(
            workflow, params, input_manager=self.input_mgr
        )

        prompt_id = await self.comfy.enqueue_workflow(workflow)
        logger.info("Enqueued prompt creator job: prompt_id=%s", prompt_id)
        return prompt_id

    async def run_i2v(self, params: dict) -> str:
        """Run the Image-to-Video workflow.

        Uploads input images to ComfyUI, injects parameters, and enqueues.

        Args:
            params: Dict with keys:
                - images (list of str): Local paths to input images.
                - audio_path (str, optional): Pre-uploaded audio filename or
                  local path to upload.
                - fps (int, optional): Frames per second (default 24).
                - width (int, optional): Video width (default 1280).
                - height (int, optional): Video height (default 720).
                - seed (int, optional): Random seed.
                - model (str, optional): UNet model name.
                - lora_1..lora_20 + strength_1..strength_20 (optional).

        Returns:
            The ComfyUI prompt_id.
        """
        workflow = self.editor.get_workflow("i2v")

        images = params.get("images", [])
        if isinstance(images, list):
            uploaded = []
            for img_path in images:
                fname = await self.comfy.upload_image(img_path)
                uploaded.append(fname)
            if uploaded:
                first_image_node = next(
                    (nid for nid, node in workflow.items()
                     if node.get("class_type") in (
                         "LoadImage", "VHS_LoadImage",
                     )),
                    None
                )
                if first_image_node:
                    self.editor.set_node_input(
                        workflow, first_image_node, "image", uploaded[0]
                    )

        if "audio_path" in params:
            ap = params["audio_path"]
            if os.path.isfile(ap):
                ap = await self.comfy.upload_audio(ap)
            params["audio_path"] = ap

        self.editor.inject_i2v_params(workflow, params)
        prompt_id = await self.comfy.enqueue_workflow(workflow)
        logger.info("Enqueued I2V job: prompt_id=%s", prompt_id)
        return prompt_id

    async def run_t2v(self, params: dict) -> str:
        """Run the Text-to-Video workflow.

        Injects text prompt, camera motion, and other params then enqueues.

        Args:
            params: Dict with keys:
                - prompt (str): Text prompt describing the video.
                - audio_path (str, optional): Pre-uploaded audio filename or
                  local path to upload.
                - fps (int, optional): Frames per second (default 24).
                - width (int, optional): Video width (default 1280).
                - height (int, optional): Video height (default 720).
                - seed (int, optional): Random seed.
                - camera_motion (str, optional): Camera motion description.
                - character_motion (str, optional): Character motion description.
                - model (str, optional): UNet model name.

        Returns:
            The ComfyUI prompt_id.
        """
        workflow = self.editor.get_workflow("t2v")

        if "audio_path" in params:
            ap = params["audio_path"]
            if os.path.isfile(ap):
                ap = await self.comfy.upload_audio(ap)
            params["audio_path"] = ap

        self.editor.inject_t2v_params(workflow, params)
        prompt_id = await self.comfy.enqueue_workflow(workflow)
        logger.info("Enqueued T2V job: prompt_id=%s", prompt_id)
        return prompt_id

    def _extract_output_paths(
        self, history_entry: dict, comfy_output_dir: str
    ) -> list[str]:
        """Extract output file paths from a completed ComfyUI history entry.

        Looks for 'audio' and 'images' keys in each node's outputs and
        constructs absolute paths under the ComfyUI output directory.

        Args:
            history_entry: The history entry dict for a completed job.
            comfy_output_dir: Absolute path to ComfyUI's output directory.

        Returns:
            List of absolute paths to generated files.
        """
        paths = []
        outputs = history_entry.get("outputs", {})

        for node_id, node_output in outputs.items():
            for media_type in ("images", "audio", "files", "gifs"):
                items = node_output.get(media_type, [])
                if not isinstance(items, list):
                    items = [items]
                for item in items:
                    if isinstance(item, dict):
                        subfolder = item.get("subfolder", "")
                        filename = item.get("filename", "")
                        filetype = item.get("type", "output")
                        if filename:
                            if filetype == "output":
                                full_path = os.path.join(
                                    comfy_output_dir, subfolder, filename
                                )
                            else:
                                full_path = os.path.join(
                                    comfy_output_dir, subfolder, filename
                                )
                            paths.append(full_path)

        return paths

    async def run_full_pipeline(self, params: dict) -> dict:
        """Run the complete music video generation pipeline end-to-end.

        Steps:
            1. Generate audio (text2audio or cover).
            2. Generate prompt concepts from the audio/lyrics.
            3. Generate video (I2V or T2V) using generated audio + concepts.
            4. Return final video path.

        Each step waits for the previous to complete before proceeding.

        Args:
            params: Dict with keys:
                - audio_mode (str): 'text2audio' or 'cover'.
                - audio_params (dict): Parameters for the audio step.
                - prompt_params (dict): Parameters for the prompt creator step.
                - video_mode (str): 'i2v' or 't2v'.
                - video_params (dict): Parameters for the video step.
                - comfy_output_dir (str, optional): Override ComfyUI output dir.

        Returns:
            Dict with keys:
                - audio_prompt_id (str)
                - audio_output_paths (list)
                - prompt_prompt_id (str, optional)
                - video_prompt_id (str, optional)
                - video_output_paths (list)
                - final_video (str or None)
                - status (str): 'completed' or error description.
        """
        audio_mode = params.get("audio_mode", "text2audio")
        video_mode = params.get("video_mode", "t2v")
        audio_params = params.get("audio_params", {})
        prompt_params = params.get("prompt_params", {})
        video_params = params.get("video_params", {})

        comfy_output_dir = params.get(
            "comfy_output_dir",
            os.path.join(os.path.dirname(self.input_mgr.base), "output"),
        )

        result = {
            "audio_prompt_id": None,
            "audio_output_paths": [],
            "prompt_prompt_id": None,
            "video_prompt_id": None,
            "video_output_paths": [],
            "final_video": None,
            "status": "running",
        }

        # Step 1: Generate audio
        try:
            if audio_mode == "cover":
                audio_prompt_id = await self.run_audio_cover(audio_params)
            else:
                audio_prompt_id = await self.run_text2audio(audio_params)

            result["audio_prompt_id"] = audio_prompt_id

            logger.info("Step 1 complete, waiting for audio job: %s", audio_prompt_id)
            audio_history = await self.comfy.wait_for_job(
                audio_prompt_id,
                timeout=audio_params.get("timeout", 600),
            )
            audio_paths = self._extract_output_paths(
                audio_history, comfy_output_dir
            )
            result["audio_output_paths"] = audio_paths
            logger.info("Audio outputs: %s", audio_paths)

            # Find the master audio file for downstream steps
            master_audio = None
            for path in audio_paths:
                if "Master" in path or "master" in path:
                    master_audio = path
                    break
            if not master_audio and audio_paths:
                master_audio = audio_paths[0]

            if master_audio and os.path.exists(master_audio):
                uploaded_name = await self.comfy.upload_audio(master_audio)
                video_params["audio_path"] = uploaded_name
                prompt_params["audio_path"] = uploaded_name

        except Exception as e:
            logger.error("Step 1 (audio) failed: %s", e)
            result["status"] = f"audio_step_failed: {e}"
            return result

        # Step 2: Prompt creator
        try:
            if prompt_params:
                if "lyrics" not in prompt_params and "lyrics" in audio_params:
                    prompt_params["lyrics"] = audio_params.get("lyrics", "")

                prompt_prompt_id = await self.run_prompt_creator(prompt_params)
                result["prompt_prompt_id"] = prompt_prompt_id

                logger.info(
                    "Step 2 complete, waiting for prompt job: %s",
                    prompt_prompt_id,
                )
                prompt_history = await self.comfy.wait_for_job(
                    prompt_prompt_id,
                    timeout=prompt_params.get("timeout", 600),
                )
                prompt_paths = self._extract_output_paths(
                    prompt_history, comfy_output_dir
                )
                logger.info("Prompt creator outputs: %s", prompt_paths)
        except Exception as e:
            logger.warning("Step 2 (prompt creator) skipped or failed: %s", e)

        # Step 3: Generate video
        try:
            if video_mode == "i2v":
                video_prompt_id = await self.run_i2v(video_params)
            else:
                video_prompt_id = await self.run_t2v(video_params)

            result["video_prompt_id"] = video_prompt_id

            logger.info(
                "Step 3 complete, waiting for video job: %s", video_prompt_id
            )
            video_history = await self.comfy.wait_for_job(
                video_prompt_id,
                timeout=video_params.get("timeout", 1200),
            )
            video_paths = self._extract_output_paths(
                video_history, comfy_output_dir
            )
            result["video_output_paths"] = video_paths
            logger.info("Video outputs: %s", video_paths)

            final_video = None
            for path in video_paths:
                ext = os.path.splitext(path)[1].lower()
                if ext in (".mp4", ".webm", ".mov", ".avi"):
                    final_video = path
                    break
            result["final_video"] = final_video

        except Exception as e:
            logger.error("Step 3 (video) failed: %s", e)
            result["status"] = f"video_step_failed: {e}"
            return result

        result["status"] = "completed"
        return result
