"""Pipeline runner that orchestrates multi-step music video generation."""

import json
import logging
import os
import random
import shutil
import subprocess
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Min duration that makes sense for lyrics
MIN_DURATION = 5

_LYRICS_WORKFLOW: dict | None = None


def _build_lyrics_workflow() -> dict:
    return {
        "1": {
            "inputs": {
                "clip_name": "gemma4_e4b_it_fp8_scaled.safetensors",
                "type": "stable_diffusion",
                "device": "default",
            },
            "class_type": "CLIPLoader",
        },
        "2": {
            "inputs": {
                "prompt": "",
                "max_length": 1024,
                "sampling_mode": "on",
                "sampling_mode.temperature": 0.8,
                "sampling_mode.top_k": 64,
                "sampling_mode.top_p": 0.95,
                "sampling_mode.min_p": 0.05,
                "sampling_mode.repetition_penalty": 1.1,
                "sampling_mode.seed": 0,
                "clip": ["1", 0],
            },
            "class_type": "TextGenerate",
        },
        "3": {
            "inputs": {
                "text": ["2", 0],
            },
            "class_type": "ShowText|pysssss",
        },
    }


def _duration_to_lyrics_hint(duration: int) -> str:
    if duration <= 10:
        return "very short (2-4 lines, ~10 seconds at performance speed)"
    elif duration <= 20:
        return "short (one verse + chorus, ~20 seconds)"
    elif duration <= 30:
        return "medium (verse-chorus-verse, ~30 seconds)"
    else:
        return "full song length (multiple verses, choruses, bridge, ~60+ seconds)"


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
        """Generate audio from text description using the ACE text2music workflow.

        Supports both v1 (ace_text2music) and v2 (ace_text2music_v2) workflows.
        v2 uses separate ttN text nodes for genre/lyrics and EmptyAceStep1.5LatentAudio.

        Args:
            params: Dict with keys:
                - workflow (str): Workflow name (default 'ace_text2music')
                - genre (str): Music genre description.
                - lyrics (str, optional): Provided lyrics.
                - language (str, optional): Language code (default 'en').
                - bpm (int, optional): Beats per minute.
                - duration (int, optional): Duration in seconds.
                - seed (int, optional): Random seed.
                - time_signature (str, optional): Time signature.
                - cfg_scale (float, optional)
                - temperature (float, optional)
                - top_p (float, optional)
                - top_k (int, optional)
                - min_p (float, optional)
                - keyscale (str, optional)
                - steps (int, optional): Sampling steps.
                - sampling_shift (int, optional): ModelSamplingAuraFlow shift.

        Returns:
            The ComfyUI prompt_id for the enqueued job.
        """
        workflow_name = params.get("workflow", "ace_text2music")
        workflow = self.editor.get_workflow(workflow_name)
        lyrics = params.get("lyrics", "")

        if not lyrics.strip():
            genre = params.get("genre", "pop")
            lyrics = f"[{genre} composition]\n"

        is_v2 = "94" in workflow and workflow["94"].get("class_type") == "TextEncodeAceStepAudio1.5"
        default_duration = 30 if is_v2 else 180

        inject_params = {
            "lyrics": lyrics,
            "genre": params.get("genre", ""),
            "language": params.get("language", "en"),
            "duration": params.get("duration", default_duration),
            "seed": params.get("seed", random.randint(0, 2**32 - 1)),
        }

        # v1-specific: needs audio_file for VHS_LoadAudioUpload
        if not is_v2:
            project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
            silent_path = os.path.join(project_root, "input", "silence_2s.wav")
            if os.path.exists(silent_path):
                audio_file = await self.comfy.upload_audio(silent_path)
            else:
                audio_file = ""
            inject_params["audio_file"] = audio_file
            if "audio_path" in params:
                inject_params["audio_file"] = await self.comfy.upload_audio(params["audio_path"])

        # Common optional params
        for key in ("bpm", "cfg_scale", "temperature", "top_p", "top_k", "min_p", "keyscale"):
            if key in params:
                inject_params[key] = params[key]

        # v2-specific params
        if is_v2:
            if "time_signature" in params:
                ts = params["time_signature"]
                # Normalize "4/4", "3/4", "6/8" etc to just the numerator
                if "/" in str(ts):
                    ts = str(ts).split("/")[0]
                if ts in ("2", "3", "4", "6"):
                    inject_params["time_signature"] = ts
            if "steps" in params:
                inject_params["steps"] = params["steps"]
            if "sampling_shift" in params:
                inject_params["sampling_shift"] = params["sampling_shift"]

        self.editor.inject_ace_text2music_params(workflow, inject_params)
        prompt_id = await self.comfy.enqueue_workflow(workflow)
        logger.info("Enqueued text2audio job: prompt_id=%s (workflow=%s)", prompt_id, workflow_name)
        return prompt_id

    async def run_generate_lyrics(self, params: dict) -> str:
        """Generate lyrics text using Gemma via ComfyUI, then return the text.

        Builds a minimal CLIPLoader + TextGenerate workflow, enqueues it,
        and extracts the generated text from the job history.

        Args:
            params: Dict with keys:
                - theme (str): Theme or story for the lyrics.
                - structure (str): Song structure (e.g. Verse-Chorus).
                - genre (str): Music genre/style.
                - language (str, optional): Language code.
                - duration (int, optional): Target duration in seconds.

        Returns:
            The generated lyrics text.

        Raises:
            RuntimeError: If lyrics generation fails or returns empty.
        """
        theme = params.get("theme", "")
        structure = params.get("structure", "Verse-Chorus")
        genre = params.get("genre", "pop")
        language = params.get("language", "en")
        duration = int(params.get("duration", 30))
        seed = params.get("seed", random.randint(0, 2**32 - 1))
        length_hint = _duration_to_lyrics_hint(duration)

        prompt_text = (
            f"<bos><start_of_turn>user\n"
            f"You are a professional songwriter. Write original song lyrics "
            f"based on the following specifications:\n\n"
            f"Theme / Story: {theme}\n"
            f"Genre: {genre}\n"
            f"Structure: {structure}\n"
            f"Language: {language}\n"
            f"Desired length: {length_hint}\n\n"
            f"Output ONLY the complete lyrics with section tags ([Verse], [Chorus], "
            f"[Bridge], [Outro] etc.). "
            f"Do not include any introductory text, explanations, or meta-commentary.\n"
            f"<end_of_turn>\n<start_of_turn>model\n"
        )

        workflow = _build_lyrics_workflow()
        workflow["2"]["inputs"]["prompt"] = prompt_text
        workflow["2"]["inputs"]["sampling_mode.seed"] = seed

        prompt_id = await self.comfy.enqueue_workflow(workflow)
        logger.info("Enqueued lyrics generation job: prompt_id=%s", prompt_id)

        try:
            history = await self.comfy.wait_for_job(prompt_id, timeout=120)
        except Exception as e:
            logger.error("Lyrics job %s failed: %s", prompt_id, e)
            raise RuntimeError(f"Lyrics generation failed: {e}")

        outputs = history.get("outputs", {})
        node_out = outputs.get("3", {})
        raw_text = node_out.get("text", "") or node_out.get("string", "") or ""

        if isinstance(raw_text, list):
            raw_text = "\n".join(part for part in raw_text if isinstance(part, str))

        raw_text = raw_text.strip()

        if not raw_text:
            logger.warning("Lyrics job %s returned empty text", prompt_id)
            # Fallback: return a minimal template
            raw_text = (
                f"[Verse]\n"
                f"({theme or 'Untitled'} - {genre})\n\n"
                f"[Chorus]\n"
                f"(Generated lyrics)\n"
            )

        logger.info("Lyrics generated (%d chars) for job %s", len(raw_text), prompt_id)
        return raw_text

    async def run_llm_audio_analysis(self, params: dict) -> str:
        """Analyze audio using Gemma4 LLM via the llm_gemma4_text_gen_v1 workflow.

        Uploads the audio to ComfyUI, sets the prompt and audio filename,
        enqueues the workflow, waits for completion, and extracts the
        generated text description.

        Args:
            params: Dict with keys:
                - audio_path (str): Local path to the audio file to analyze.
                - prompt (str, optional): Custom analysis prompt.
                - temperature (float, optional)
                - top_k (int, optional)
                - top_p (float, optional)
                - max_length (int, optional)

        Returns:
            The generated text description from Gemma4.

        Raises:
            RuntimeError: If generation fails or returns empty.
        """
        audio_path = params.get("audio_path", "")
        if not audio_path:
            raise ValueError("audio_path is required for LLM audio analysis")

        filename = await self.comfy.upload_audio(audio_path)

        workflow = self.editor.get_workflow(params.get("workflow", "llm_gemma4_text_gen_v1"))
        inject_params = {
            "audio_file": filename,
            "prompt": params.get("prompt", (
                "Describe the audio in detail: identify the genre, instruments used, "
                "beat pattern, tempo, key, mood, and production style. "
                "Be specific and technical."
            )),
        }
        for key in ("temperature", "top_k", "top_p", "max_length"):
            if key in params:
                inject_params[key] = params[key]
        inject_params["seed"] = params.get("seed", random.randint(0, 2**32 - 1))

        self.editor.inject_llm_text_gen_params(workflow, inject_params)
        prompt_id = await self.comfy.enqueue_workflow(workflow)
        logger.info("Enqueued LLM audio analysis job: prompt_id=%s", prompt_id)

        try:
            history = await self.comfy.wait_for_job(prompt_id, timeout=300)
        except Exception as e:
            logger.error("LLM audio analysis job %s failed: %s", prompt_id, e)
            raise RuntimeError(f"LLM audio analysis failed: {e}")

        outputs = history.get("outputs", {})
        node_out = outputs.get("4", {})
        raw_text = node_out.get("text", "") or node_out.get("string", "") or ""

        if isinstance(raw_text, list):
            raw_text = "\n".join(part for part in raw_text if isinstance(part, str))

        raw_text = raw_text.strip()
        if not raw_text:
            logger.warning("LLM audio analysis job %s returned empty text", prompt_id)
            raise RuntimeError("LLM audio analysis returned empty result")

        logger.info("LLM audio analysis generated (%d chars) for job %s", len(raw_text), prompt_id)
        return raw_text

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

        workflow = self.editor.get_workflow(params.get("workflow", "ace_audio_cover"))
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
        inject_params["seed"] = params.get("seed", random.randint(0, 2**32 - 1))

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
            workflow = self.editor.get_workflow(params.get("workflow", "tts"))
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
        """Build a minimal TTS workflow using the loaded tts.json workflow.

        Injects the TTS text into the TextGenerate node's prompt.

        Args:
            params: Dict with text and optional voice.

        Returns:
            A ComfyUI API-format workflow dict.
        """
        workflow = self.editor.get_workflow(params.get("workflow", "tts"))
        text = params.get("text", "")
        voice = params.get("voice", "default")
        prompt_text = (
            f"<bos><start_of_turn>user\n"
            f"Read the following text aloud as a {voice} voice narration:\n\n{text}\n"
            f"<end_of_turn>\n<start_of_turn>model\n"
        )
        text_node_id = next(
            (nid for nid, node in workflow.items()
             if node.get("class_type") == "TextGenerate"),
            None
        )
        if text_node_id:
            self.editor.set_node_input(workflow, text_node_id, "prompt", prompt_text)
        return workflow

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
        workflow = self.editor.get_workflow(params.get("workflow", "prompt_creator"))

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
        workflow = self.editor.get_workflow(params.get("workflow", "i2v"))

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
        workflow = self.editor.get_workflow(params.get("workflow", "t2v"))

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

    async def run_chat(self, params: dict) -> str:
        """Generate a chat-style AI response using Gemma via ComfyUI.

        Args:
            params: Dict with keys:
                - message (str): The user's latest message.
                - history (list[dict]): Previous messages [{"role": ..., "content": ...}].

        Returns:
            The AI response text.

        Raises:
            RuntimeError: If generation fails or returns empty.
        """
        message = params.get("message", "")
        history = params.get("history", [])

        # Build conversation context
        context_parts = []
        for msg in history[-6:]:  # last 6 messages for context
            role = msg.get("role", "user")
            content = msg.get("content", "")
            context_parts.append(f"{role}: {content}")
        context_parts.append(f"user: {message}")
        conversation = "\n".join(context_parts)

        prompt_text = (
            "<bos><start_of_turn>user\n"
            "You are a creative AI assistant helping a user plan their music video. "
            "The user will describe ideas for a music video — themes, genres, visuals, "
            "lyrics concepts, camera styles, moods, etc.\n\n"
            "Your role:\n"
            "- Engage conversationally, ask clarifying questions\n"
            "- Suggest creative directions (visual styles, genres, transitions)\n"
            "- Summarize the brief when enough info is gathered\n"
            "- Keep responses concise (2-4 sentences)\n\n"
            f"Conversation so far:\n{conversation}\n"
            "<end_of_turn>\n<start_of_turn>model\n"
        )

        workflow = _build_lyrics_workflow()
        workflow["2"]["inputs"]["prompt"] = prompt_text
        workflow["2"]["inputs"]["sampling_mode.seed"] = random.randint(0, 2**32 - 1)

        prompt_id = await self.comfy.enqueue_workflow(workflow)
        logger.info("Enqueued chat generation job: prompt_id=%s", prompt_id)

        try:
            history = await self.comfy.wait_for_job(prompt_id, timeout=300)
        except Exception as e:
            logger.error("Chat job %s failed: %s", prompt_id, e)
            raise RuntimeError(f"Chat generation failed: {e}")

        outputs = history.get("outputs", {})
        node_out = outputs.get("3", {})
        raw_text = node_out.get("text", "") or node_out.get("string", "") or ""

        if isinstance(raw_text, list):
            raw_text = "\n".join(part for part in raw_text if isinstance(part, str))

        raw_text = raw_text.strip()
        if not raw_text:
            raise RuntimeError("Chat returned empty response")

        return raw_text

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

        # Step 4: Assembly — merge audio into video
        try:
            if final_video and master_audio and os.path.exists(master_audio):
                stem, ext = os.path.splitext(final_video)
                assembled_path = f"{stem}_assembled{ext}"
                if shutil.which("ffmpeg"):
                    cmd = [
                        "ffmpeg", "-y",
                        "-i", final_video,
                        "-i", master_audio,
                        "-c:v", "copy",
                        "-c:a", "aac",
                        "-shortest",
                        assembled_path,
                    ]
                    subprocess.run(cmd, capture_output=True, timeout=120)
                    if os.path.exists(assembled_path):
                        result["final_video"] = assembled_path
                        logger.info("Assembled video with audio: %s", assembled_path)
                else:
                    logger.warning("ffmpeg not found — skipping audio merge")
            else:
                logger.info("No master audio available for assembly step")
        except Exception as e:
            logger.warning("Assembly step failed (non-fatal): %s", e)

        result["status"] = "completed"
        return result
