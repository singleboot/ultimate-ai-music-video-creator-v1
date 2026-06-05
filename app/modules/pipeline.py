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


import re

def get_clean_lyrics_lines(lyrics_text: str) -> list[str]:
    clean_lines = []
    for line in lyrics_text.splitlines():
        line = line.strip()
        if not line:
            continue
        # Skip section headers like [Verse 1], [Chorus], etc.
        # But KEEP lines like [Male] or [Female] if they have text after them or are specifically speaker-only tags.
        if line.startswith('[') and line.endswith(']'):
            tag = line[1:-1].strip().lower()
            # If the tag is a known section header, skip it
            if any(h in tag for h in ["verse", "chorus", "bridge", "intro", "outro", "hook", "pre-chorus"]):
                continue
        clean_lines.append(line)
    return clean_lines


def post_process_concept_prompts(concepts_file_path: str, params: dict):
    """Post-processes the ConceptPrompts.txt JSON file to dynamically align subjects for multi-singer tracks."""
    if not os.path.exists(concepts_file_path):
        return

    subject_text = params.get("subject_scenes", "")
    from .subject_parser import parse_multi_subjects, get_subject_for_segment
    subjects_map = parse_multi_subjects(subject_text)
    
    # If there are no multi-singer subjects defined (only default), nothing to post-process
    if len(subjects_map) <= 1 and "default" in subjects_map:
        return

    try:
        with open(concepts_file_path, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            if not content:
                return
            prompts_dict = json.loads(content)
    except Exception as e:
        logger.warning("Failed to read/parse concepts file for post-processing: %s", e)
        return

    lyrics = params.get("lyrics", "")
    clean_lines = get_clean_lyrics_lines(lyrics)

    default_subject = subjects_map.get("default", "")
    if not default_subject and subjects_map:
        default_subject = list(subjects_map.values())[0]

    updated_prompts = {}
    for key, prompt_text in prompts_dict.items():
        match = re.match(r'^Prompt(\d+)$', key)
        if not match:
            updated_prompts[key] = prompt_text
            continue
        
        idx = int(match.group(1)) - 1
        segment_lyric = ""
        if 0 <= idx < len(clean_lines):
            segment_lyric = clean_lines[idx]

        target_subject = get_subject_for_segment(segment_lyric, subjects_map, default_subject)
        
        if target_subject and target_subject != default_subject and default_subject:
            def_sub_clean = default_subject.rstrip('.').strip()
            target_sub_clean = target_subject.rstrip('.').strip()
            
            pattern = re.compile(re.escape(def_sub_clean), re.IGNORECASE)
            if pattern.search(prompt_text):
                new_prompt_text = pattern.sub(target_sub_clean, prompt_text, count=1)
                updated_prompts[key] = new_prompt_text
                logger.info("Aligned prompt %s to singer subject: %s", key, target_sub_clean)
            else:
                # Fallback: if default subject string is not exactly matched, split on the first colon (which separates the location)
                # and replace the portion before the colon with target_subject + location
                parts = prompt_text.split(':', 1)
                if len(parts) == 2:
                    sub_parts = parts[0].split('.', 1)
                    if len(sub_parts) == 2:
                        new_prompt_text = f"{target_sub_clean}.{sub_parts[1]}:{parts[1]}"
                        updated_prompts[key] = new_prompt_text
                    else:
                        updated_prompts[key] = f"{target_sub_clean}. {prompt_text}"
                else:
                    updated_prompts[key] = f"{target_sub_clean}. {prompt_text}"
        else:
            updated_prompts[key] = prompt_text

    try:
        with open(concepts_file_path, 'w', encoding='utf-8') as f:
            json.dump(updated_prompts, f, indent=2)
        logger.info("Successfully post-processed concept prompts with dynamic singer subjects.")
    except Exception as e:
        logger.error("Failed to write updated concept prompts: %s", e)

def download_youtube_audio(url: str, output_dir: str) -> str:
    """Download audio from a YouTube link using yt-dlp, with caching."""
    import yt_dlp
    from urllib.parse import urlparse, parse_qs
    
    # Clean the URL to extract only the video ID if it's a YouTube link
    try:
        parsed = urlparse(url)
        if "youtube.com" in parsed.netloc:
            qs = parse_qs(parsed.query)
            if "v" in qs:
                url = f"https://www.youtube.com/watch?v={qs['v'][0]}"
        elif "youtu.be" in parsed.netloc:
            video_id = parsed.path.strip("/")
            url = f"https://www.youtube.com/watch?v={video_id}"
    except Exception as url_err:
        logger.warning("Failed to clean YouTube URL: %s", url_err)

    # Clean URL and get video ID
    ydl_opts_info = {'quiet': True, 'no_warnings': True, 'noplaylist': True}
    with yt_dlp.YoutubeDL(ydl_opts_info) as ydl:
        info = ydl.extract_info(url, download=False)
        video_id = info.get('id')
        
    if video_id:
        for f in os.listdir(output_dir):
            if f.startswith(f"youtube_{video_id}."):
                existing_path = os.path.join(output_dir, f)
                logger.info("Using cached YouTube audio: %s", existing_path)
                return existing_path

    # Download if not cached
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': os.path.join(output_dir, 'youtube_%(id)s.%(ext)s'),
        'quiet': True,
        'no_warnings': True,
        'noplaylist': True,
    }
    
    try:
        ydl_opts['postprocessors'] = [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }]
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
            return os.path.join(output_dir, f"youtube_{video_id}.mp3")
    except Exception as e:
        logger.warning("Failed to extract mp3 using ffmpeg, falling back to raw download: %s", e)
        ydl_opts.pop('postprocessors', None)
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            if os.path.exists(filename):
                return filename
            for ext in ('m4a', 'webm', 'opus', 'mp3', 'wav'):
                check_path = os.path.join(output_dir, f"youtube_{video_id}.{ext}")
                if os.path.exists(check_path):
                    return check_path
            raise RuntimeError(f"Could not locate downloaded YouTube file for ID {video_id}")


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

    def _resolve_youtube_audio(self, audio_path: str) -> str:
        if not audio_path:
            return audio_path
        if "youtube.com" in audio_path or "youtu.be" in audio_path:
            logger.info("Resolving YouTube audio link: %s", audio_path)
            input_dir = self.input_mgr.base if self.input_mgr else os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "comfyui", "input"))
            try:
                resolved = download_youtube_audio(audio_path, input_dir)
                logger.info("YouTube link resolved to: %s", resolved)
                return resolved
            except Exception as e:
                logger.error("Failed to download YouTube audio: %s", e, exc_info=True)
                raise RuntimeError(f"Failed to fetch YouTube audio: {e}")
        return audio_path

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
        workflow_name = params.get("workflow", "ace_text2music_v2")
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
            history = await self.comfy.wait_for_job(prompt_id, timeout=1800)
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

    async def run_enhance_text(self, params: dict) -> str:
        """Enhance and expand user's prompt text using Gemma via ComfyUI.

        Args:
            params: Dict with keys:
                - text (str): The short input text to enhance.
                - type (str): 'story_concept', 'theme_style', or 'subject_scenes'.

        Returns:
            The enhanced text.
        """
        text = params.get("text", "").strip()
        text_type = params.get("type", "story_concept")
        context = params.get("context", "").strip()
        seed = random.randint(0, 2**32 - 1)

        if not text and not context:
            return ""

        if not text and context:
            text = f"Generate {text_type.replace('_', ' ')} based on the connected context."

        if text_type == "story_concept":
            instruction = (
                "You are an expert creative director and screenwriter. "
                "Enhance and expand the following short music video narrative/story concept. "
                "Add rich visual storytelling details, pacing details, and key actions. "
                "Do not include any introductory text, explanations, or meta-commentary. "
                "Return only the enhanced story concept."
            )
        elif text_type == "theme_style":
            instruction = (
                "You are an expert cinematographer and colorist. "
                "Enhance and expand the following visual style, theme, and lighting description for a music video. "
                "Provide detailed guidance on visual aesthetics, color palette, camera motion, framing, lighting, and mood. "
                "Do not include any introductory text, explanations, or meta-commentary. "
                "Return only the enhanced visual style."
            )
        else: # subject_scenes
            instruction = (
                "You are an expert cinematographer. "
                "Enhance and expand the following description of subjects and scenes/locations for a music video. "
                "Provide details on character appearance, actions, exact environment settings, lighting, and layout. "
                "CRITICAL: If the guiding context specifies vocal type or singer gender (e.g., 'male vocals', 'female vocals', 'singing by a man'), ensure the main subject's gender and description match that vocal type (e.g., describe the main subject as a man if the vocals are male). "
                "Do not include any introductory text, explanations, or meta-commentary. "
                "Return only the enhanced subjects and locations."
            )

        context_str = f"Guiding Context / Preceding Concept:\n{context}\n\n" if context else ""

        prompt_text = (
            f"<bos><start_of_turn>user\n"
            f"{instruction}\n\n"
            f"{context_str}"
            f"Input Description: {text}\n\n"
            f"<end_of_turn>\n<start_of_turn>model\n"
        )

        max_length = int(params.get("max_length", 1024))
        workflow = _build_lyrics_workflow()
        workflow["2"]["inputs"]["prompt"] = prompt_text
        workflow["2"]["inputs"]["sampling_mode.seed"] = seed
        workflow["2"]["inputs"]["max_length"] = max_length

        prompt_id = await self.comfy.enqueue_workflow(workflow)
        logger.info("Enqueued text enhancement job: prompt_id=%s, type=%s", prompt_id, text_type)

        try:
            history = await self.comfy.wait_for_job(prompt_id, timeout=1800)
        except Exception as e:
            logger.error("Text enhancement job %s failed: %s", prompt_id, e)
            raise RuntimeError(f"Text enhancement failed: {e}")

        outputs = history.get("outputs", {})
        node_out = outputs.get("3", {})
        raw_text = node_out.get("text", "") or node_out.get("string", "") or ""

        if isinstance(raw_text, list):
            raw_text = "\n".join(part for part in raw_text if isinstance(part, str))

        raw_text = raw_text.strip()
        return raw_text

    async def run_llm_audio_analysis(self, params: dict) -> dict:
        """Analyze audio using Gemma4 LLM via the llm_gemma4_text_gen_v1 workflow.

        Uploads the audio to ComfyUI, sets the prompt and audio filename,
        enqueues the workflow, waits for completion, and extracts structured
        JSON with genre, instruments, bpm, keyscale, and mood.

        Args:
            params: Dict with keys:
                - audio_path (str): Local path to the audio file to analyze.
                - prompt (str, optional): Custom analysis prompt.
                - temperature (float, optional)
                - top_k (int, optional)
                - top_p (float, optional)
                - max_length (int, optional)

        Returns:
            Dict with keys:
                - text (str): Full prose description for preview
                - genre (str): Detected genre
                - instruments (str): Detected instruments
                - bpm (int): Detected BPM
                - keyscale (str): Detected key/scale
                - mood (str): Detected mood

        Raises:
            RuntimeError: If generation fails or returns empty.
        """
        audio_path = params.get("audio_path", "")
        if not audio_path:
            raise ValueError("audio_path is required for LLM audio analysis")

        # Resolve YouTube URLs dynamically
        audio_path = self._resolve_youtube_audio(audio_path)

        # Resolve project:// paths to local filesystem paths
        if audio_path.startswith("project://"):
            project_path = params.get("project_path") or params.get("projectPath")
            if project_path:
                rel = audio_path[len("project://"):]
                audio_path = os.path.realpath(os.path.join(project_path, rel))

        # Resolve HTTP output URL back to actual local filesystem path if generated internally
        if audio_path.startswith("http://") or audio_path.startswith("https://"):
            from urllib.parse import urlparse
            path_part = urlparse(audio_path).path  # e.g., /output/audio/ComfyUI_00006_.mp3
            if path_part.startswith("/output/"):
                # COMFYUI_OUTPUT_DIR is the root mount point for /output/
                # Remove the /output/ prefix and join with actual comfyui output folder
                rel_path = path_part.replace("/output/", "", 1)
                project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
                comfyui_output_dir = os.environ.get("COMFYUI_OUTPUT_DIR", os.path.join(project_root, "comfyui", "output"))
                resolved_local_path = os.path.join(comfyui_output_dir, rel_path)
                if os.path.exists(resolved_local_path):
                    audio_path = resolved_local_path
                else:
                    # Try joining relative to project root / comfyui folder directly
                    resolved_local_path_alt = os.path.join(project_root, "comfyui", rel_path)
                    if os.path.exists(resolved_local_path_alt):
                        audio_path = resolved_local_path_alt

        filename = await self.comfy.upload_audio(audio_path)

        workflow = self.editor.get_workflow(params.get("workflow", "llm_gemma4_text_gen_v1"))

        # Select prompt based on mode
        mode = params.get("mode", "instrument")
        if mode == "lyrics":
            default_prompt = (
                "You are an expert audio transcriber. Listen to the attached audio file and extract the lyrics. \n\n"
                "You must strictly output the lyrics formatted exactly like the example below, using tags like [Verse], [Pre-Chorus], [Chorus], etc. Do not include any introductory sentences, conversational filler, or explanations. Do not output <think> tags.\n\n"
                "Format Example:\n"
                "[Verse]\n"
                "Salt in the air, phone face down\n"
                "Sun melting slow, gold to brown\n\n"
                "[Chorus]\n"
                "Let the ocean take the weight\n"
                "I don't need to rush my fate\n\n"
                "Task: Transcribe the attached audio into the format above. Only output the structured lyrics."
            )
        else:
            default_prompt = (
                "Analyze this audio track and output ONLY valid JSON with exactly these keys:\n"
                "genre, instruments, bpm, keyscale, mood, description.\n\n"
                "Rules:\n"
                "- genre: a short genre name (e.g. 'Bollywood Dance', 'Punjabi Pop')\n"
                "- instruments: comma-separated list of primary instruments\n"
                "- bpm: integer beats per minute (estimate if unsure)\n"
                "- keyscale: musical key and scale (e.g. 'C major', 'A minor')\n"
                "- mood: one-word or short phrase describing the mood\n"
                "- description: a 2-3 sentence prose summary detailing style, energy, and the gender/type of vocals if singing is present (e.g. 'male vocals', 'female vocals', or 'instrumental')\n\n"
                "Output ONLY the JSON object. No markdown, no commentary."
            )

        prompt = params.get("prompt")
        if not prompt:
            prompt = default_prompt

        inject_params = {
            "audio_file": filename,
            "prompt": prompt,
        }
        for key in ("temperature", "top_k", "top_p", "max_length"):
            if key in params:
                inject_params[key] = params[key]
        inject_params["seed"] = params.get("seed", random.randint(0, 2**32 - 1))

        self.editor.inject_llm_text_gen_params(workflow, inject_params)
        prompt_id = await self.comfy.enqueue_workflow(workflow)
        logger.info("Enqueued LLM audio analysis job: prompt_id=%s, mode=%s", prompt_id, mode)

        try:
            history = await self.comfy.wait_for_job(prompt_id, timeout=1800)
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

        if mode == "lyrics":
            logger.info("LLM lyrics transcription completed for job %s", prompt_id)
            return {"text": raw_text}

        # Try to parse JSON from the response
        result = self._parse_llm_audio_json(raw_text)
        logger.info("LLM audio analysis parsed for job %s: genre=%s bpm=%s key=%s",
                    prompt_id, result.get("genre"), result.get("bpm"), result.get("keyscale"))
        return result

    @staticmethod
    def _parse_llm_audio_json(raw_text: str) -> dict:
        """Parse LLM audio analysis output, extracting JSON if present.

        Falls back to regex extraction if JSON parsing fails.

        Args:
            raw_text: Raw LLM output text.

        Returns:
            Dict with text, genre, instruments, bpm, keyscale, mood.
        """
        import re

        text = raw_text
        genre = ""
        instruments = ""
        bpm = 0
        keyscale = ""
        mood = ""

        # Try to find and parse JSON block
        json_match = re.search(r'\{[\s\S]*?\}', text)
        if json_match:
            try:
                parsed = json.loads(json_match.group())
                genre = str(parsed.get("genre", "")).strip()
                instruments = str(parsed.get("instruments", "")).strip()
                bpm = int(parsed.get("bpm", 0)) if str(parsed.get("bpm", "0")).isdigit() else 0
                keyscale = str(parsed.get("keyscale", "")).strip()
                mood = str(parsed.get("mood", "")).strip()
                if parsed.get("description"):
                    text = str(parsed.get("description")).strip()
            except (json.JSONDecodeError, ValueError):
                pass

        # Fallback: regex extraction from prose
        if not genre:
            g = re.search(r'[Gg]enre[:\s]+([^\n]+)', text)
            if g:
                genre = g.group(1).strip()
        if not instruments:
            i = re.search(r'[Ii]nstruments?[:\s]+([^\n]+)', text)
            if i:
                instruments = i.group(1).strip()
        if not bpm:
            b = re.search(r'([Bb][Pp][Mm]|[Tt]empo)[:\s]+(\d+)', text)
            if b:
                bpm = int(b.group(2))
        if not keyscale:
            k = re.search(r'([Kk]ey|[Ss]cale)[:\s]+([A-G][#b]?\s*(major|minor))', text)
            if k:
                keyscale = k.group(2).strip()
        if not mood:
            m = re.search(r'[Mm]ood[:\s]+([^\n]+)', text)
            if m:
                mood = m.group(1).strip()

        return {
            "text": text,
            "genre": genre,
            "instruments": instruments,
            "bpm": bpm,
            "keyscale": keyscale,
            "mood": mood,
        }

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

        genre = params.get("genre", params.get("text", "futurebass")).strip()
        singer_style = params.get("singer_style", "auto")
        
        style_tags = []
        if singer_style == "male":
            style_tags.append("male vocals, singing by a man")
        elif singer_style == "female":
            style_tags.append("female vocals, singing by a woman")
        elif singer_style == "duet":
            style_tags.append("duet, male and female vocals, singing by a man and a woman")
        elif singer_style == "chorus":
            style_tags.append("chorus, group vocals, ensemble singing")

        if style_tags:
            genre_lower = genre.lower()
            tags_to_add = [tag for tag in style_tags if tag.split(',')[0].strip() not in genre_lower]
            if tags_to_add:
                genre = f"{genre}, {', '.join(tags_to_add)}"

        inject_params = {
            "audio_file": filename,
            "genre": genre,
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

        # Upload audio to ComfyUI if a local path is provided
        audio_path = params.get("audio_path")
        audio_path = self._resolve_youtube_audio(audio_path)
        if audio_path and os.path.exists(audio_path):
            uploaded_name = await self.comfy.upload_audio(audio_path)
            # Build the absolute path to the uploaded file in ComfyUI's input dir.
            # self.input_mgr.base is the ComfyUI input directory path.
            input_base = self.input_mgr.base if (self.input_mgr and self.input_mgr.base) else ""
            if input_base:
                abs_audio_path = os.path.realpath(os.path.join(input_base, uploaded_name))
            else:
                # Fallback: use COMFYUI_INPUT_DIR env var
                env_input_dir = os.environ.get("COMFYUI_INPUT_DIR", "")
                if env_input_dir:
                    abs_audio_path = os.path.realpath(os.path.join(env_input_dir, uploaded_name))
                else:
                    abs_audio_path = uploaded_name
            params["audio_path"] = abs_audio_path
            logger.info("Uploaded prompt creator audio %s → ComfyUI input: %s (base=%s)",
                        audio_path, abs_audio_path, input_base)


        self.editor.inject_prompt_creator_params(
            workflow, params, input_manager=self.input_mgr
        )

        # Write enqueued workflow to a debug file for troubleshooting
        try:
            with open(os.path.join(os.path.dirname(__file__), "..", "debug_prompt_creator_workflow.json"), "w", encoding="utf-8") as debug_f:
                json.dump(workflow, debug_f, indent=2)
        except Exception as debug_e:
            logger.warning("Failed to write debug workflow: %s", debug_e)

        prompt_id = await self.comfy.enqueue_workflow(workflow)
        logger.info("Enqueued prompt creator job: prompt_id=%s", prompt_id)
        return prompt_id

    async def run_i2v(self, params: dict) -> str:
        """Run the Image-to-Video workflow.

        Uploads input images to ComfyUI, injects parameters, and enqueues.

        Args:
            params: Dict with keys:
                - images (list of str): Local paths to input images.
                - prompt (str, optional): Text prompt for the video.
                - prompts (str, optional): Alias for prompt.
                - audio_path (str, optional): Pre-uploaded audio filename or
                  local path to upload.
                - fps (int, optional): Frames per second (default 24).
                - width (int, optional): Video width (default 1280).
                - height (int, optional): Video height (default 720).
                - seed (int, optional): Random seed.
                - model (str, optional): UNet model name.
                - ltx_gguf (str, optional): GGUF UNet model.
                - gemma_clip (str, optional): CLIP text encoder model.
                - text_projection (str, optional): Text projection model.
                - video_vae (str, optional): Video VAE model.
                - audio_vae (str, optional): Audio VAE model.
                - latent_upscaler (str, optional): Latent upscaler model.
                - supergemma_llm (str, optional): SuperGemma LLM model file.
                - z_image_turbo (str, optional): Z-image UNet model.
                - z_image_clip (str, optional): Z-image CLIP model.
                - z_image_vae (str, optional): Z-image VAE model.
                - lora_1..lora_20 + strength_1..strength_20 (optional).
                - concepts_file (str, optional): Pre-generated concepts file.

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
            ap = self._resolve_youtube_audio(ap)
            if os.path.isfile(ap):
                ap = await self.comfy.upload_audio(ap)
                ap = os.path.realpath(os.path.join(self.input_mgr.base, ap))
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
                - prompts (str, optional): Alias for prompt.
                - audio_path (str, optional): Pre-uploaded audio filename or
                  local path to upload.
                - fps (int, optional): Frames per second (default 24).
                - width (int, optional): Video width (default 1280).
                - height (int, optional): Video height (default 720).
                - seed (int, optional): Random seed.
                - camera_motion (str, optional): Camera motion description.
                - character_motion (str, optional): Character motion description.
                - model (str, optional): UNet model name.
                - ltx_gguf (str, optional): GGUF UNet model.
                - gemma_clip (str, optional): CLIP text encoder model.
                - text_projection (str, optional): Text projection model.
                - video_vae (str, optional): Video VAE model.
                - audio_vae (str, optional): Audio VAE model.
                - latent_upscaler (str, optional): Latent upscaler model.
                - supergemma_llm (str, optional): SuperGemma LLM model file.
                - concepts_file (str, optional): Pre-generated concepts file.

        Returns:
            The ComfyUI prompt_id.
        """
        workflow = self.editor.get_workflow(params.get("workflow", "t2v"))

        if "audio_path" in params:
            ap = params["audio_path"]
            ap = self._resolve_youtube_audio(ap)
            if os.path.isfile(ap):
                ap = await self.comfy.upload_audio(ap)
                ap = os.path.realpath(os.path.join(self.input_mgr.base, ap))
            params["audio_path"] = ap

        self.editor.inject_t2v_params(workflow, params)
        prompt_id = await self.comfy.enqueue_workflow(workflow)
        logger.info("Enqueued T2V job: prompt_id=%s", prompt_id)
        return prompt_id

    async def run_upscale(self, params: dict) -> str:
        """Run the SeedVR2 Video Upscaler workflow.

        Injects input video, upscaling settings, and enqueues.

        Args:
            params: Dict with keys:
                - video_path (str): Absolute path to the input video.
                - resolution (int, optional): Output resolution height.
                - batch_size (int, optional): Batch size.
                - temporal_overlap (int, optional): Temporal overlap size.

        Returns:
            The ComfyUI prompt_id.
        """
        workflow = self.editor.get_workflow(params.get("workflow", "seedvr2_upscale"))

        if "video_path" in params:
            vp = params["video_path"]
            if os.path.isfile(vp):
                # Copy or upload the video to input folder so ComfyUI LoadVideo can read it
                filename = os.path.basename(vp)
                dest = os.path.realpath(os.path.join(self.input_mgr.base, filename))
                if os.path.realpath(vp) != dest:
                    import shutil
                    logger.info("Copying upscale input video %s to ComfyUI input folder %s", vp, dest)
                    shutil.copy2(vp, dest)
                # LoadVideo node needs the relative name under input folder
                params["video_path"] = filename

        self.editor.inject_upscale_params(workflow, params)
        prompt_id = await self.comfy.enqueue_workflow(workflow)
        logger.info("Enqueued Video Upscaler job: prompt_id=%s", prompt_id)
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
            history = await self.comfy.wait_for_job(prompt_id, timeout=1800)
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

                # Inject generated concepts filename into video params
                concepts_file = None
                for path in prompt_paths:
                    if path.lower().endswith((".txt", ".json")):
                        concepts_file = os.path.basename(path)
                        break
                
                concepts_file_path = None
                if concepts_file:
                    concepts_file_path = os.path.join(comfy_output_dir, "VRGDG_TEMP", "TextFiles", "ConceptPrompts", concepts_file)
                    if not os.path.exists(concepts_file_path):
                        concepts_file_path = os.path.join(comfy_output_dir, concepts_file)
                else:
                    fallback_path = os.path.join(comfy_output_dir, "VRGDG_TEMP", "TextFiles", "ConceptPrompts", "ConceptPrompts.txt")
                    if os.path.exists(fallback_path):
                        concepts_file = "ConceptPrompts.txt"
                        concepts_file_path = fallback_path

                if concepts_file_path and os.path.exists(concepts_file_path):
                    post_process_concept_prompts(concepts_file_path, params)

                if concepts_file:
                    video_params["concepts_file"] = concepts_file
                    logger.info("Injected concepts_file into video_params: %s", concepts_file)
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
                timeout=video_params.get("timeout", 3600),
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
