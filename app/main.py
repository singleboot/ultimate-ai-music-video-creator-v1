"""FastAPI backend for Ultimate Music Video Creator.

Provides a REST API bridge between a Next.js frontend and a running ComfyUI
instance for AI-powered music video generation.
"""

import asyncio
import logging
import os
import sys
import time
import uuid
from contextlib import asynccontextmanager
from typing import Any, Optional, Union

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from modules import ComfyUIClient, InputManager, PipelineRunner, WorkflowEditor

import json

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("main")

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
WORKFLOWS_DIR = os.path.join(PROJECT_ROOT, "workflows")
COMFYUI_HOST = os.environ.get("COMFYUI_HOST", "127.0.0.1")
COMFYUI_PORT = int(os.environ.get("COMFYUI_PORT", "8188"))
comfy_in_default = os.path.join(PROJECT_ROOT, "comfyui", "input")
COMFYUI_INPUT_DIR = os.environ.get(
    "COMFYUI_INPUT_DIR",
    comfy_in_default if os.path.exists(comfy_in_default) else os.path.join(PROJECT_ROOT, "input"),
)
if os.path.exists(COMFYUI_INPUT_DIR):
    COMFYUI_INPUT_DIR = os.path.realpath(COMFYUI_INPUT_DIR)

COMFYUI_OUTPUT_DIR = os.environ.get(
    "COMFYUI_OUTPUT_DIR",
    os.path.join(PROJECT_ROOT, "comfyui", "output"),
)
if os.path.exists(COMFYUI_OUTPUT_DIR):
    COMFYUI_OUTPUT_DIR = os.path.realpath(COMFYUI_OUTPUT_DIR)
OUTPUT_DIR = COMFYUI_OUTPUT_DIR

# ---------------------------------------------------------------------------
# Global state (set up during lifespan)
# ---------------------------------------------------------------------------
comfy_client: ComfyUIClient = None
workflow_editor: WorkflowEditor = None
input_manager: InputManager = None
pipeline_runner: PipelineRunner = None

# ---------------------------------------------------------------------------
# Async video job registry
# ---------------------------------------------------------------------------
# Maps job_id -> {"status": "pending"|"running"|"completed"|"failed",
#                 "message": str, "outputs": list, "error": str}
video_jobs: dict[str, dict] = {}

# Prevent GC of background asyncio tasks
_background_tasks: set = set()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize services on startup, clean up on shutdown."""
    global comfy_client, workflow_editor, input_manager, pipeline_runner

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(COMFYUI_INPUT_DIR, exist_ok=True)

    comfy_client = ComfyUIClient(host=COMFYUI_HOST, port=COMFYUI_PORT)
    workflow_editor = WorkflowEditor(WORKFLOWS_DIR)
    input_manager = InputManager(COMFYUI_INPUT_DIR)
    pipeline_runner = PipelineRunner(comfy_client, workflow_editor, input_manager)

    available = await comfy_client.is_available()
    logger.info(
        "ComfyUI at %s:%s — %s",
        COMFYUI_HOST,
        COMFYUI_PORT,
        "connected" if available else "NOT REACHABLE",
    )

    yield

    await comfy_client.close()


app = FastAPI(
    title="Ultimate Music Video Creator API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if os.path.isdir(OUTPUT_DIR):
    app.mount("/output", StaticFiles(directory=OUTPUT_DIR), name="output")


# ---------------------------------------------------------------------------
# Pydantic request models
# ---------------------------------------------------------------------------

class LyricsGenerateRequest(BaseModel):
    """Request to generate lyrics text."""
    theme: str = ""
    structure: str = "Verse-Chorus"
    genre: str = "pop"
    language: str = "en"
    duration: int = 30
    seed: int = -1


class SmartLyricsRequest(BaseModel):
    """Request for smart lyrics generation with mixed language, parody, bhajan, etc."""
    mode: str = "generate_new"          # "generate_new" | "adapt_existing"
    input_type: str = "theme"           # "theme" | "lyrics" | "youtube"
    theme: str = ""                     # Theme/description text
    existing_lyrics: str = ""           # Paste-in lyrics for adapt mode
    youtube_url: str = ""               # YouTube URL for song-inspired generation
    transformation: str = ""            # "parody", "bhajan", "love", etc.
    genre: str = "pop"
    languages: list[str] = Field(default_factory=lambda: ["en"])
    language_override: str = ""         # "hindi_only" | "english_only" | "hindi_english_mix" | ""
    structure: str = "Verse-Chorus"
    duration: int = 30
    seed: int = -1


class EnhanceTextRequest(BaseModel):
    """Request to enhance and expand user prompt text using Gemma LLM."""
    text: str
    type: str = "story_concept"  # "story_concept", "theme_style", or "subject_scenes"
    context: Optional[str] = ""
    max_length: Optional[int] = 1024


class LLMAudioAnalysisRequest(BaseModel):
    """Request to analyze audio with Gemma4 LLM."""
    audio_path: str = ""
    project_path: Optional[str] = ""
    prompt: str = ""
    mode: str = "instrument"  # "instrument" or "lyrics"
    temperature: float = 0.7
    top_k: int = 64
    top_p: float = 0.95
    max_length: int = 2048


class ChatRequest(BaseModel):
    """Request to send a chat message to the AI assistant."""
    message: str = ""
    history: list[dict[str, Any]] = Field(default_factory=list)


class FullPipelineParams(BaseModel):
    """Structured params for full_pipeline generation type."""
    audio_mode: str = "text2audio"
    audio_params: dict[str, Any] = Field(default_factory=dict)
    prompt_params: dict[str, Any] = Field(default_factory=dict)
    video_mode: str = "t2v"
    video_params: dict[str, Any] = Field(default_factory=dict)
    comfy_output_dir: Optional[str] = None


class CreateProjectRequest(BaseModel):
    """Request to create a new project."""
    parent_path: str
    name: str


class OpenProjectRequest(BaseModel):
    """Request to open an existing project."""
    path: str


class SaveWorkflowRequest(BaseModel):
    """Request to save project workflow."""
    project_path: str
    workflow: dict


class SaveProjectAsRequest(BaseModel):
    """Request to duplicate/save project under a different name."""
    project_path: str
    new_name: str
    workflow: dict


class OpenFolderRequest(BaseModel):
    """Request to open a project folder workflow."""
    path: str


class SyncAssetsRequest(BaseModel):
    """Request to sync generated files to the project folder."""
    project_path: str
    nodes: list
    edges: list
    workflow_name: Optional[str] = ""


class UpdateSettingsRequest(BaseModel):
    """Request to update app settings."""
    settings: dict[str, Any]


PROJECT_DIRS = ["music", "images", "videos", "lyrics", "srt"]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

def _scan_output_dir(output_dir: str, since: float, suffixes: tuple = None) -> list[str]:
    urls = []
    if not os.path.isdir(output_dir):
        return urls
    entries = []
    for root, _dirs, files in os.walk(output_dir):
        for fname in files:
            if suffixes and not fname.lower().endswith(suffixes):
                continue
            fpath = os.path.join(root, fname)
            try:
                mtime = os.path.getmtime(fpath)
                if mtime >= since:
                    rel = os.path.relpath(fpath, output_dir).replace("\\", "/")
                    size = os.path.getsize(fpath)
                    priority = 0
                    name_lower = fname.lower()
                    if "master" in name_lower:
                        priority = 2
                    elif "other" in name_lower:
                        priority = 1
                    entries.append((mtime, f"/output/{rel}", priority, size))
            except OSError:
                continue
    entries.sort(key=lambda x: (-x[2], -x[3]))
    urls = [e[1] for e in entries]
    return urls


@app.get("/api/health")
async def health_check() -> dict:
    """Health check endpoint — reports API and ComfyUI connectivity status."""
    connected = await comfy_client.is_available() if comfy_client else False
    return {
        "status": "ok",
        "comfyui_connected": connected,
        "comfyui_url": f"http://{COMFYUI_HOST}:{COMFYUI_PORT}",
    }


SETTINGS_FILE = os.path.join(PROJECT_ROOT, "user_settings.json")


def _load_settings() -> dict:
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            logger.warning("Failed to load settings: %s", e)
    return {}


def _save_settings(data: dict) -> None:
    with open(SETTINGS_FILE, "w") as f:
        json.dump(data, f, indent=2)


class SaveInputsRequest(BaseModel):
    """Request to save project input text files."""
    lyrics: Optional[str] = None
    theme_style: Optional[str] = None
    story_concept: Optional[str] = None
    subject_scenes: Optional[str] = None


@app.post("/api/projects/save-inputs")
async def save_inputs(req: SaveInputsRequest) -> dict:
    """Save raw story concept, theme style, lyrics, and subject/scene lists directly to disk."""
    try:
        saved_paths = {}
        if req.lyrics is not None:
            saved_paths["lyrics"] = input_manager.write_lyrics(req.lyrics)
        if req.theme_style is not None:
            saved_paths["theme_style"] = input_manager.write_theme_style(req.theme_style)
        if req.story_concept is not None:
            saved_paths["story_concept"] = input_manager.write_story_concept(req.story_concept)
        if req.subject_scenes is not None:
            saved_paths["subject_scenes"] = input_manager.write_subject_scenes(req.subject_scenes)
        return {"status": "ok", "saved_files": saved_paths}
    except Exception as e:
        logger.error("Failed to save input files: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate/lyrics")
async def generate_lyrics(req: LyricsGenerateRequest) -> dict:
    """Generate lyrics text using Gemma via ComfyUI.

    Returns the generated lyrics as a string. The caller can then pass
    these lyrics (possibly edited) to the text2audio endpoint for music generation.
    """
    params = req.model_dump()
    if params.get("seed", -1) < 0:
        params["seed"] = int(time.time() * 1000) % (2**32)
    try:
        lyrics = await pipeline_runner.run_generate_lyrics(params)
        return {"status": "ok", "lyrics": lyrics}
    except Exception as e:
        logger.error("Lyrics generation failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/smart-lyrics")
async def smart_lyrics(req: SmartLyricsRequest) -> dict:
    """Smart lyrics generation with mixed language, parody, bhajan, etc."""
    params = req.model_dump()
    if params.get("seed", -1) < 0:
        params["seed"] = int(time.time() * 1000) % (2**32)
    try:
        lyrics = await pipeline_runner.run_smart_lyrics(params)
        return {"status": "ok", "lyrics": lyrics}
    except Exception as e:
        logger.error("Smart lyrics generation failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate/enhance-text")
async def enhance_text(req: EnhanceTextRequest) -> dict:
    """Enhance and expand style, story concept, or subject/scene prompts using LLM."""
    try:
        enhanced = await pipeline_runner.run_enhance_text(req.model_dump())
        return {"status": "ok", "enhanced": enhanced}
    except Exception as e:
        logger.error("Text enhancement failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate/llm-audio-analysis")
async def generate_llm_audio_analysis(req: LLMAudioAnalysisRequest) -> dict:
    """Analyze audio using Gemma4 LLM via ComfyUI.

    Uploads the audio, runs the llm_gemma4_text_gen_v1 workflow,
    and returns the generated text description.
    """
    if not req.audio_path:
        raise HTTPException(status_code=400, detail="audio_path is required")
    params = req.model_dump()
    try:
        result = await pipeline_runner.run_llm_audio_analysis(params)
        return {"status": "ok", **result}
    except Exception as e:
        logger.error("LLM audio analysis failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


def _copy_assets_to_project(params: dict, urls: list[str]) -> list[str]:
    project_path = params.get("project_path") or params.get("projectPath")
    if not project_path:
        return urls
    import shutil
    import urllib.parse
    
    copied_urls = []
    for url in urls:
        if not url:
            copied_urls.append(url)
            continue
        # Resolve url path to local filesystem path
        local_path = None
        if url.startswith("http://") or url.startswith("https://"):
            parsed = urllib.parse.urlparse(url)
            path_part = parsed.path
            if path_part.startswith("/output/"):
                rel = path_part[len("/output/"):]
                local_path = os.path.realpath(os.path.join(OUTPUT_DIR, urllib.parse.unquote(rel)))
            elif path_part.startswith("/input/"):
                rel = path_part[len("/input/"):]
                local_path = os.path.realpath(os.path.join(COMFYUI_INPUT_DIR, urllib.parse.unquote(rel)))
        elif url.startswith("/output/"):
            rel = url[len("/output/"):]
            local_path = os.path.realpath(os.path.join(OUTPUT_DIR, urllib.parse.unquote(rel)))
        elif url.startswith("/input/"):
            rel = url[len("/input/"):]
            local_path = os.path.realpath(os.path.join(COMFYUI_INPUT_DIR, urllib.parse.unquote(rel)))
        else:
            p_out = os.path.join(OUTPUT_DIR, url)
            if os.path.exists(p_out):
                local_path = p_out
            else:
                p_in = os.path.join(COMFYUI_INPUT_DIR, url)
                if os.path.exists(p_in):
                    local_path = p_in

        if local_path and os.path.exists(local_path):
            ext = os.path.splitext(local_path)[1].lower()
            if ext in (".mp4", ".webm", ".mov", ".avi", ".gif"):
                if params.get("is_combine"):
                    subdir = "videos"
                elif params.get("is_b_roll"):
                    subdir = os.path.join("videos", "b-roll")
                else:
                    subdir = os.path.join("videos", "main")
            elif ext in (".wav", ".mp3", ".flac", ".ogg", ".m4a"):
                subdir = "music"
            elif ext in (".png", ".jpg", ".jpeg", ".webp"):
                subdir = "images"
            elif ext in (".txt", ".json"):
                subdir = "lyrics"
            elif ext in (".srt",):
                subdir = "srt"
            else:
                copied_urls.append(url)
                continue
            
            target_dir = os.path.join(project_path, subdir)
            os.makedirs(target_dir, exist_ok=True)
            try:
                filename = os.path.basename(local_path)
                dest = os.path.join(target_dir, filename)
                shutil.copy2(local_path, dest)
                logger.info("Copied generated asset %s to project path %s", local_path, dest)
                copied_urls.append(f"project://{subdir}/{filename}")
            except Exception as e:
                logger.error("Failed to copy generated asset to project: %s", e)
                copied_urls.append(url)
        else:
            copied_urls.append(url)
    return copied_urls


class CombineRequest(BaseModel):
    video_url: Union[str, list[str]]
    audio_url: str
    project_path: Optional[str] = None
    b_roll_urls: Optional[list[str]] = []

@app.post("/api/generate/combine")
async def generate_combine(req: CombineRequest):
    """Combine video and audio using ffmpeg."""
    import urllib.parse
    import subprocess
    import shutil
    import time
    
    def resolve_path(url: str) -> str:
        if url.startswith("project://") and req.project_path:
            rel = url[len("project://"):]
            return os.path.realpath(os.path.join(req.project_path, rel))
        if url.startswith("http://") or url.startswith("https://"):
            parsed = urllib.parse.urlparse(url)
            path_part = parsed.path
            if path_part.startswith("/output/"):
                rel = path_part[len("/output/"):]
                return os.path.realpath(os.path.join(OUTPUT_DIR, urllib.parse.unquote(rel)))
            if path_part.startswith("/input/"):
                rel = path_part[len("/input/"):]
                return os.path.realpath(os.path.join(COMFYUI_INPUT_DIR, urllib.parse.unquote(rel)))
            if "/api/projects/asset" in path_part or "asset" in parsed.query:
                query_params = urllib.parse.parse_qs(parsed.query)
                proj = query_params.get("project_path", [""])[0] or query_params.get("projectPath", [""])[0]
                asset = query_params.get("asset", [""])[0] or query_params.get("name", [""])[0]
                if proj and asset:
                    return os.path.realpath(os.path.join(proj, asset))
        if os.path.isabs(url):
            return url
        p_out = os.path.join(OUTPUT_DIR, url)
        if os.path.exists(p_out):
            return p_out
        p_in = os.path.join(COMFYUI_INPUT_DIR, url)
        if os.path.exists(p_in):
            return p_in
        return url

    if isinstance(req.video_url, list):
        v_paths = [resolve_path(v) for v in req.video_url]
    else:
        v_paths = [resolve_path(req.video_url)]

    b_paths = [resolve_path(b) for b in (req.b_roll_urls or [])]
    
    logger.info(f"COMBINER CALLED! v_paths: {len(v_paths)} | b_paths: {len(b_paths)}")

    import random
    
    def get_duration(path: str) -> float:
        try:
            cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', path]
            return float(subprocess.check_output(cmd).decode().strip())
        except Exception:
            return 3.0  # Fallback duration if ffprobe fails

    a_path = resolve_path(req.audio_url)
    
    for vp in v_paths:
        if not os.path.exists(vp):
            raise HTTPException(status_code=400, detail=f"Video file not found: {vp}")
    if not os.path.exists(a_path):
        raise HTTPException(status_code=400, detail=f"Audio file not found: {a_path}")

    audio_duration = get_duration(a_path)
    
    # Calculate cuts to fill audio duration
    final_cuts = []
    current_time = 0.0
    
    # We must concatenate the main videos in sequence to preserve music sync!
    for clip in v_paths:
        clip_duration = get_duration(clip)
        
        # If adding this clip exceeds audio, trim it to exact fit
        if current_time + clip_duration > audio_duration:
            clip_duration = max(0.1, audio_duration - current_time)
            
        final_cuts.append({
            "path": clip,
            "duration": clip_duration
        })
        
        current_time += clip_duration
        
        if current_time >= audio_duration:
            break
            
    # For now, we are concatenating the main videos in order to fix the bug where
    # the combiner randomly chopped up the video. B-roll intercutting can be added later
    # using a more complex ffmpeg overlay if needed.

    stem, ext = os.path.splitext(os.path.basename(v_paths[0]))
    out_name = f"{stem}_combined_{int(time.time())}{ext}"
    out_path = os.path.join(OUTPUT_DIR, out_name)
    
    if not shutil.which("ffmpeg"):
        raise HTTPException(status_code=500, detail="ffmpeg not found on server system")
        
    list_file = os.path.join(OUTPUT_DIR, f"concat_list_{int(time.time())}.txt")
    with open(list_file, "w", encoding="utf-8") as f:
        for cut in final_cuts:
            safe_vp = cut["path"].replace("'", "'\\''")
            f.write(f"file '{safe_vp}'\n")
            f.write("inpoint 0.0\n")
            f.write(f"outpoint {cut['duration']}\n")
    
    logger.info(f"FINAL CUTS LIST: {final_cuts}")
    
    cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", list_file,
        "-i", a_path,
        "-filter_complex",
        f"[0:v]fade=t=out:st={max(0, audio_duration - 2)}:d=2[vout];[1:a]afade=t=out:st={max(0, audio_duration - 2)}:d=2[aout]",
        "-map", "[vout]",
        "-map", "[aout]",
        "-shortest",
        out_path
    ]
    logger.info(f"FFMPEG CMD: {' '.join(cmd)}")
    
    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await proc.communicate()
    try:
        os.remove(list_file)
    except OSError:
        pass
        
    if proc.returncode != 0:
        logger.error("FFmpeg merge failed: %s", stderr.decode())
        raise HTTPException(status_code=500, detail=f"FFmpeg error: {stderr.decode()}")
        
    out_url = f"/output/{out_name}"
    if req.project_path:
        _copy_assets_to_project({"project_path": req.project_path, "is_combine": True}, [out_url])
    return {"status": "ok", "url": out_url, "video_url": out_url}


def _suggest_actions(message: str, history: list[dict]) -> list[str]:
    """Suggest UI action buttons based on conversation keywords."""
    text = (message + " " + " ".join(m.get("content", "") for m in history[-6:])).lower()
    actions = []
    if any(w in text for w in ["new video", "music video", "create video", "start"]):
        actions.append("New Video")
    if any(w in text for w in ["cover", "remix", "rework", "cover song"]):
        actions.append("Cover Song")
    if any(w in text for w in ["generate lyrics", "write lyrics", "create lyrics", "theme", "story", "song about"]):
        actions.append("Generate Lyrics")
    if any(w in text for w in ["generate music", "make music", "create audio", "produce track", "make a song"]):
        actions.append("Generate Music")
    if any(w in text for w in ["edit lyrics", "change lyrics", "modify lyrics"]):
        actions.append("Edit Lyrics")
    if any(w in text for w in ["generate concepts", "create concepts", "visual prompts", "scene ideas"]):
        actions.append("Generate Concepts")
    if any(w in text for w in ["generate video", "make video", "create video", "render", "animate"]):
        actions.append("Generate Video")
    if any(w in text for w in ["timeline", "publish", "upload", "youtube", "export"]):
        actions.append("Open Timeline")
    return actions[:3]


@app.post("/api/chat")
async def chat(req: ChatRequest) -> dict:
    """Send a chat message and get an AI response with suggested actions."""
    try:
        params = req.model_dump()
        response = await pipeline_runner.run_chat(params)
        actions = _suggest_actions(params.get("message", ""), params.get("history", []))
        return {"status": "ok", "response": response, "actions": actions}
    except Exception as e:
        logger.error("Chat failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


class SubtitlesRequest(BaseModel):
    """Request to generate subtitles from lyrics."""
    lyrics: str = ""
    source: str = "lyrics"  # 'lyrics' or 'audio'


class ThumbnailPromptsRequest(BaseModel):
    """Request to generate thumbnail prompts from video context."""
    context: str = ""
    count: int = 3


@app.post("/api/generate/subtitles")
async def generate_subtitles(req: SubtitlesRequest) -> dict:
    """Generate SRT subtitle content from lyrics with estimated timing."""
    try:
        lines = [l.strip() for l in req.lyrics.split("\n") if l.strip()]
        srt_parts = []
        idx = 1
        current_time = 0.0
        for line in lines:
            words = len(line.split())
            if words <= 2:
                duration = 2.0
            elif words <= 6:
                duration = 3.0
            elif words <= 12:
                duration = 4.5
            else:
                duration = 6.0
            start_h = int(current_time // 3600)
            start_m = int((current_time % 3600) // 60)
            start_s = int(current_time % 60)
            start_ms = int((current_time - int(current_time)) * 1000)
            end_time = current_time + duration
            end_h = int(end_time // 3600)
            end_m = int((end_time % 3600) // 60)
            end_s = int(end_time % 60)
            end_ms = int((end_time - int(end_time)) * 1000)
            srt_parts.append(f"{idx}\n{start_h:02d}:{start_m:02d}:{start_s:02d},{start_ms:03d} --> {end_h:02d}:{end_m:02d}:{end_s:02d},{end_ms:03d}\n{line}\n")
            idx += 1
            current_time = end_time
        srt_content = "\n".join(srt_parts)
        return {"status": "ok", "srt": srt_content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate/thumbnail-prompts")
async def generate_thumbnail_prompts(req: ThumbnailPromptsRequest) -> dict:
    """Generate viral thumbnail prompt ideas using the LLM."""
    try:
        params = {"message": f"Generate {req.count} viral YouTube thumbnail prompt ideas for a music video about: {req.context}. Return each as a concise image generation prompt.", "history": []}
        response = await pipeline_runner.run_chat(params)
        prompts = [line.strip("- ").strip() for line in response.split("\n") if line.strip() and not line.startswith("I'll")]
        return {"status": "ok", "prompts": prompts[:req.count]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/settings")
async def get_settings() -> dict:
    stored = _load_settings()
    defaults = {
        "mode": "local",
        "comfyuiHost": COMFYUI_HOST,
        "comfyuiPort": COMFYUI_PORT,
        "comfyuiCloudUrl": "",
        "comfyuiCloudKey": "",
        "falApiKey": "",
        "falModelEndpoint": "",
        "defaultWidth": 1920,
        "defaultHeight": 1080,
        "defaultFps": 24,
        "defaultSteps": 30,
        "defaultCfg": 1.0,
    }
    defaults.update(stored)
    return {"settings": defaults}


@app.post("/api/settings")
async def update_settings(req: UpdateSettingsRequest) -> dict:
    _save_settings(req.settings)
    return {"status": "ok", "settings": req.settings}


@app.post("/api/projects/create")
async def create_project(req: CreateProjectRequest) -> dict:
    project_path = os.path.join(req.parent_path, req.name)
    if os.path.exists(project_path):
        raise HTTPException(status_code=400, detail=f"Project folder already exists: {project_path}")
    os.makedirs(project_path, exist_ok=True)
    for subdir in PROJECT_DIRS:
        os.makedirs(os.path.join(project_path, subdir), exist_ok=True)
    metadata = {
        "name": req.name,
        "path": project_path,
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "lastOpened": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "version": "1.0.0",
    }
    meta_path = os.path.join(project_path, "project.json")
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)
    return {"status": "ok", "project": metadata}


@app.post("/api/projects/open")
async def open_project(req: OpenProjectRequest) -> dict:
    project_path = req.path
    meta_path = os.path.join(project_path, "project.json")
    if not os.path.exists(meta_path):
        raise HTTPException(status_code=400, detail="Not a valid project folder (no project.json found)")
    try:
        with open(meta_path, "r") as f:
            metadata = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read project.json: {e}")
    metadata["lastOpened"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)
    for subdir in PROJECT_DIRS:
        os.makedirs(os.path.join(project_path, subdir), exist_ok=True)
    return {"status": "ok", "project": metadata}


@app.get("/api/projects/current")
async def get_current_project() -> dict:
    return {"project": None}


@app.post("/api/projects/save-workflow")
async def save_project_workflow(req: SaveWorkflowRequest) -> dict:
    if not req.project_path:
        raise HTTPException(status_code=400, detail="Missing project path")
    
    workflow_path = os.path.join(req.project_path, "workflow.json")
    try:
        os.makedirs(req.project_path, exist_ok=True)
        for subdir in PROJECT_DIRS:
            os.makedirs(os.path.join(req.project_path, subdir), exist_ok=True)
        
        with open(workflow_path, "w", encoding="utf-8") as f:
            json.dump(req.workflow, f, indent=2)
        return {"status": "ok", "message": "Workflow saved successfully"}
    except Exception as e:
        logger.error("Failed to save workflow: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/projects/save-as")
async def save_project_as(req: SaveProjectAsRequest) -> dict:
    import shutil
    if not req.project_path:
        raise HTTPException(status_code=400, detail="Missing source project path")
    if not req.new_name or not req.new_name.strip():
        raise HTTPException(status_code=400, detail="Missing new project name")
    
    # Sanitize new project folder name (keep alphanumeric, space, hyphens, underscores)
    sanitized_name = "".join(c for c in req.new_name if c.isalnum() or c in (" ", "-", "_")).strip()
    if not sanitized_name:
        raise HTTPException(status_code=400, detail="Invalid characters in project name")
        
    parent_path = os.path.dirname(os.path.abspath(req.project_path))
    new_project_path = os.path.join(parent_path, sanitized_name)
    
    if os.path.exists(new_project_path):
        raise HTTPException(status_code=400, detail=f"Target project folder already exists: {new_project_path}")
        
    try:
        # Copy entire directory recursively
        shutil.copytree(req.project_path, new_project_path)
        
        # Write/Update project.json in the target directory
        meta_path = os.path.join(new_project_path, "project.json")
        metadata = {}
        if os.path.exists(meta_path):
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    metadata = json.load(f)
            except Exception:
                pass
        
        metadata["name"] = sanitized_name
        metadata["path"] = new_project_path
        metadata["lastOpened"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        if "createdAt" not in metadata:
            metadata["createdAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)
            
        # Update workflow.json in the target directory with the new name
        workflow_path = os.path.join(new_project_path, "workflow.json")
        workflow_data = req.workflow.copy()
        workflow_data["name"] = sanitized_name
        
        with open(workflow_path, "w", encoding="utf-8") as f:
            json.dump(workflow_data, f, indent=2)
            
        return {
            "status": "ok",
            "message": "Project copied and saved successfully",
            "project_path": new_project_path,
            "project_name": sanitized_name
        }
    except Exception as e:
        logger.error("Failed to Save As: %s", e)
        # Attempt to clean up new directory if it was partially created
        if os.path.exists(new_project_path):
            try:
                shutil.rmtree(new_project_path)
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/projects/open-folder")
async def open_project_folder(req: OpenFolderRequest) -> dict:
    if not req.path:
        raise HTTPException(status_code=400, detail="Missing folder path")
    
    workflow_path = os.path.join(req.path, "workflow.json")
    if not os.path.exists(workflow_path):
        return {"status": "ok", "workflow": None}
    try:
        with open(workflow_path, "r", encoding="utf-8") as f:
            workflow = json.load(f)
        return {"status": "ok", "workflow": workflow}
    except Exception as e:
        logger.error("Failed to load workflow: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/projects/reveal")
async def reveal_project_folder(req: OpenFolderRequest) -> dict:
    if not req.path:
        raise HTTPException(status_code=400, detail="Missing path")
    try:
        path = os.path.realpath(req.path)
        if os.path.isdir(path):
            import subprocess
            import sys
            if sys.platform == "win32":
                os.startfile(path)
            elif sys.platform == "darwin":
                subprocess.Popen(["open", path])
            else:
                subprocess.Popen(["xdg-open", path])
            return {"status": "ok"}
        else:
            raise HTTPException(status_code=400, detail="Path is not a directory")
    except Exception as e:
        logger.error("Failed to reveal project folder: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/projects/asset")
async def get_project_asset(path: str, asset: str):
    if not path or not asset:
        raise HTTPException(status_code=400, detail="Missing path or asset parameter")
    path = os.path.realpath(path)
    full_path = os.path.realpath(os.path.join(path, asset))
    if not full_path.startswith(path):
        raise HTTPException(status_code=403, detail="Access denied")
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(full_path)


@app.post("/api/projects/sync-assets")
async def sync_assets(req: SyncAssetsRequest) -> dict:
    project_path = req.project_path
    if not project_path:
        raise HTTPException(status_code=400, detail="Missing project path")
        
    for subdir in PROJECT_DIRS:
        os.makedirs(os.path.join(project_path, subdir), exist_ok=True)
        
    updated_nodes = []
    for node in req.nodes:
        node_id = node.get("id")
        node_type = node.get("type")
        data = node.get("data", {})
        
        # 1. Audio URLs (Music, Cover, TTS)
        if node_type in ("MusicGeneratorNode", "CoverGeneratorNode", "TTSGeneratorNode"):
            audio_url = data.get("audioUrl")
            if audio_url and not audio_url.startswith("project://"):
                copied = _copy_assets_to_project({"project_path": project_path}, [audio_url])
                if copied and copied[0].startswith("project://"):
                    data["audioUrl"] = copied[0]
        
        # 2. Lyrics text
        if node_type == "LyricsGeneratorNode":
            lyrics_text = data.get("lyrics")
            if lyrics_text:
                lyrics_dir = os.path.join(project_path, "lyrics")
                os.makedirs(lyrics_dir, exist_ok=True)
                with open(os.path.join(lyrics_dir, "full_lyrics.txt"), "w", encoding="utf-8") as f:
                    f.write(lyrics_text)
                    
        # 3. Prompt creator texts
        if node_type == "PromptCreatorNode":
            for text_key, filename in [("story_concept", "storyconcept.txt"), ("theme_style", "themestyle.txt"), ("subject_scenes", "subjectsandscenes.txt"), ("lyrics", "full_lyrics.txt")]:
                text_val = data.get(text_key)
                if text_val:
                    lyrics_dir = os.path.join(project_path, "lyrics")
                    os.makedirs(lyrics_dir, exist_ok=True)
                    with open(os.path.join(lyrics_dir, filename), "w", encoding="utf-8") as f:
                        f.write(text_val)
                        
        # 4. Video URLs
        if node_type in ("VideoPlayerNode", "VideoAudioCombinerNode", "T2VGeneratorNode", "I2VGeneratorNode"):
            video_url = data.get("videoUrl") or data.get("video")
            if video_url and not video_url.startswith("project://"):
                copied = _copy_assets_to_project({"project_path": project_path}, [video_url])
                if copied and copied[0].startswith("project://"):
                    if data.get("videoUrl") is not None:
                        data["videoUrl"] = copied[0]
                    if data.get("video") is not None:
                        data["video"] = copied[0]
                        
        # 5. Image URLs
        if node_type in ("ImagePreviewNode", "ImageGeneratorNode"):
            image_url = data.get("imageUrl") or data.get("image")
            if image_url and not image_url.startswith("project://"):
                copied = _copy_assets_to_project({"project_path": project_path}, [image_url])
                if copied and copied[0].startswith("project://"):
                    if data.get("imageUrl") is not None:
                        data["imageUrl"] = copied[0]
                    if data.get("image") is not None:
                        data["image"] = copied[0]
                        
        node["data"] = data
        updated_nodes.append(node)
        
    workflow_path = os.path.join(project_path, "workflow.json")
    try:
        workflow_data = {
            "nodes": updated_nodes,
            "edges": req.edges,
            "workflowName": req.workflow_name or "Project Workflow"
        }
        with open(workflow_path, "w", encoding="utf-8") as f:
            json.dump(workflow_data, f, indent=2)
    except Exception as e:
        logger.error("Sync: Failed to save updated workflow: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to save workflow: {e}")
        
    return {"status": "ok", "nodes": updated_nodes}


@app.get("/api/status")
async def get_status() -> dict:
    """Return ComfyUI queue status."""
    try:
        queue = await comfy_client.get_queue()
        return {"status": "ok", "queue": queue}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"ComfyUI unreachable: {e}")


@app.post("/api/debug/inject/{workflow_name}")
async def debug_inject(workflow_name: str, body: dict) -> dict:
    """Return the workflow JSON after parameter injection (does NOT enqueue)."""
    params = body.get("params", {}) if isinstance(body, dict) else {}
    try:
        workflow = pipeline_runner.editor.get_workflow(workflow_name)
    except ValueError:
        return {"status": "error", "detail": f"Workflow '{workflow_name}' not found"}
    pipeline_runner.editor.inject_ace_text2music_params(workflow, params)
    # summarize what was set
    summary = {}
    for nid, node in workflow.items():
        if "inputs" in node:
            summary[nid] = {k: v for k, v in node["inputs"].items() if k != "seed"}
    return {"status": "ok", "workflow_name": workflow_name, "params_received": params, "node_inputs": summary}


@app.post("/api/debug/workflow")
async def debug_workflow(request: Request) -> dict:
    """Return the modified ComfyUI workflow JSON after parameter injection (does NOT enqueue)."""
    try:
        body = await request.json()
        gen_type = body.get("type") or body.get("mode") or "t2v"
        params = body.get("params") or {}
        
        workflow_name = params.get("workflow", gen_type)
        if gen_type == "t2v":
            workflow = workflow_editor.get_workflow(workflow_name or "t2v")
            workflow_editor.inject_t2v_params(workflow, params)
        elif gen_type == "i2v":
            workflow = workflow_editor.get_workflow(workflow_name or "i2v")
            workflow_editor.inject_i2v_params(workflow, params)
        elif gen_type == "prompt_creator":
            workflow = workflow_editor.get_workflow(workflow_name or "prompt_creator")
            workflow_editor.inject_prompt_creator_params(workflow, params)
        elif gen_type in ("ace_text2music_v2", "text2audio", "music_generator"):
            workflow_name = params.get("workflow", "ace_text2music_v2")
            workflow = workflow_editor.get_workflow(workflow_name)
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
                "seed": params.get("seed", 0),
            }
            for key in ("bpm", "cfg_scale", "temperature", "top_p", "top_k", "min_p", "keyscale", "steps", "sampling_shift"):
                if key in params:
                    inject_params[key] = params[key]
            if is_v2:
                workflow_editor.inject_ace_text2music_v2_params(workflow, inject_params)
            else:
                workflow_editor.inject_ace_text2music_params(workflow, inject_params)
        elif gen_type in ("ace_audio_cover", "audio_cover", "cover_generator"):
            workflow = workflow_editor.get_workflow("ace_audio_cover")
            inject_params = {
                "genre": params.get("genre", ""),
                "language": params.get("language", "en"),
                "duration": params.get("duration", 30),
                "seed": params.get("seed", 0),
            }
            for key in ("bpm", "cfg_scale", "temperature", "top_p", "top_k", "min_p", "keyscale", "steps", "sampling_shift"):
                if key in params:
                    inject_params[key] = params[key]
            workflow_editor.inject_ace_cover_params(workflow, inject_params)
        elif gen_type == "tts":
            try:
                workflow = workflow_editor.get_workflow(params.get("workflow", "tts"))
            except ValueError:
                workflow = {}
            if "text" in params:
                text_node_id = next(
                    (nid for nid, node in workflow.items()
                     if node.get("class_type") == "TextGenerate"),
                    None
                )
                if text_node_id:
                    workflow_editor.set_node_input(
                        workflow, text_node_id, "prompt", params["text"]
                    )
        elif gen_type == "llm_audio_analysis":
            workflow = workflow_editor.get_workflow("llm_gemma4_text_gen_v1")
            workflow_editor.inject_llm_text_gen_params(workflow, params)
        else:
            workflow = workflow_editor.get_workflow(gen_type)
            
        return {"workflow": workflow}
    except Exception as e:
        logger.error("Failed to build debug workflow: %s", e)
        raise HTTPException(status_code=500, detail=str(e))





@app.post("/api/generate")
async def generate(
    request: Request,
    type: Optional[str] = Form(None),
    audio_file: Optional[UploadFile] = File(None),
    image_files: Optional[list[UploadFile]] = File(None),
    video_file: Optional[UploadFile] = File(None),
    prompt: Optional[str] = Form(None),
    temperature: Optional[str] = Form(None),
    top_k: Optional[str] = Form(None),
    top_p: Optional[str] = Form(None),
    max_length: Optional[str] = Form(None),
    seed: Optional[str] = Form(None),
    mode: Optional[str] = Form(None),
) -> dict:
    """Submit a generation job.

    Accepts JSON body OR multipart form data. The `type` field
    determines the pipeline step; file uploads are saved and their paths
    injected into params.

    Returns the prompt_id(s) for polling.
    """
    params: dict[str, Any] = {}
    gen_type: Optional[str] = None

    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body = await request.json()
            if isinstance(body, dict):
                gen_type = body.get("type") or body.get("mode")
                raw_params = body.get("params") or {}
                if isinstance(raw_params, dict):
                    params.update(raw_params)
                for k, v in body.items():
                    if k not in ("type", "mode", "params"):
                        params[k] = v
        except Exception:
            pass
    else:
        gen_type = type
        for key in ("prompt", "temperature", "top_k", "top_p", "max_length", "seed", "mode"):
            val = locals().get(key)
            if val is not None:
                try:
                    params[key] = json.loads(val)
                except (json.JSONDecodeError, TypeError):
                    params[key] = val

    if gen_type is None:
        raise HTTPException(
            status_code=400,
            detail="Missing 'type' field. Must be one of: text2audio, "
            "audio_cover, tts, prompt_creator, llm_audio_analysis, i2v, t2v, upscale, full_pipeline",
        )

    # Handle file uploads — sanitize filenames to prevent path traversal
    if audio_file is not None:
        safe_name = os.path.basename(audio_file.filename)
        save_path = os.path.join(COMFYUI_INPUT_DIR, safe_name)
        content = await audio_file.read()
        with open(save_path, "wb") as f:
            f.write(content)
        params.setdefault("audio_path", save_path)
        params.setdefault("audio_file", safe_name)

    if image_files:
        image_paths = []
        for img in image_files:
            safe_name = os.path.basename(img.filename)
            save_path = os.path.join(COMFYUI_INPUT_DIR, safe_name)
            content = await img.read()
            with open(save_path, "wb") as f:
                f.write(content)
            image_paths.append(save_path)
        params.setdefault("images", image_paths)

    if video_file is not None:
        safe_name = os.path.basename(video_file.filename)
        save_path = os.path.join(COMFYUI_INPUT_DIR, safe_name)
        content = await video_file.read()
        with open(save_path, "wb") as f:
            f.write(content)
        params.setdefault("video_path", save_path)
        params.setdefault("video_file", video_file.filename)

    try:
        # Record timestamp before enqueueing, then scan for new files after completion
        start_time = time.time()
        base_url = str(request.base_url).rstrip("/")

        def abs_urls(urls: list[str]) -> list[str]:
            return [f"{base_url}{u}" for u in urls]

        if gen_type == "text2audio":
            prompt_id = await pipeline_runner.run_text2audio(params)
            history = await comfy_client.wait_for_job(prompt_id, timeout=params.get("timeout", 1800))
            output_urls = abs_urls(_scan_output_dir(OUTPUT_DIR, start_time, (".wav", ".mp3", ".flac", ".ogg", ".m4a")))
            output_urls = _copy_assets_to_project(params, output_urls)
            return {"status": "completed", "prompt_id": prompt_id, "outputs": output_urls, "url": (output_urls + [""])[0], "audio_url": output_urls[0] if output_urls else None}

        elif gen_type == "audio_cover":
            prompt_id = await pipeline_runner.run_audio_cover(params)
            history = await comfy_client.wait_for_job(prompt_id, timeout=params.get("timeout", 1800))
            output_urls = abs_urls(_scan_output_dir(OUTPUT_DIR, start_time, (".wav", ".mp3", ".flac", ".ogg", ".m4a")))
            output_urls = _copy_assets_to_project(params, output_urls)
            return {"status": "completed", "prompt_id": prompt_id, "outputs": output_urls, "url": (output_urls + [""])[0], "audio_url": output_urls[0] if output_urls else None}

        elif gen_type == "tts":
            prompt_id = await pipeline_runner.run_tts(params)
            history = await comfy_client.wait_for_job(prompt_id, timeout=params.get("timeout", 1800))
            output_urls = abs_urls(_scan_output_dir(OUTPUT_DIR, start_time, (".wav", ".mp3", ".flac", ".ogg", ".m4a")))
            output_urls = _copy_assets_to_project(params, output_urls)
            return {"status": "completed", "prompt_id": prompt_id, "outputs": output_urls, "url": (output_urls + [""])[0], "audio_url": output_urls[0] if output_urls else None}

        elif gen_type == "llm_audio_analysis":
            result = await pipeline_runner.run_llm_audio_analysis(params)
            return {"status": "completed", **result}

        elif gen_type == "prompt_creator":
            logger.info("prompt_creator endpoint params: %s", params)
            project_path = params.get("project_path") or params.get("projectPath")
            if project_path:
                fallbacks = {
                    "lyrics": "lyrics/full_lyrics.txt",
                    "theme_style": "lyrics/themestyle.txt",
                    "story_concept": "lyrics/storyconcept.txt",
                    "subject_scenes": "lyrics/subjectsandscenes.txt",
                }
                for key, rel_path in fallbacks.items():
                    if not params.get(key):
                        file_path = os.path.join(project_path, rel_path)
                        if os.path.exists(file_path):
                            try:
                                with open(file_path, "r", encoding="utf-8") as f:
                                    params[key] = f.read()
                                logger.info("Backend fallback loaded %s from %s", key, file_path)
                            except Exception as e:
                                logger.warning("Failed to load fallback for %s from %s: %s", key, file_path, e)
            audio_path = params.get("audio_path") or params.get("audio_file") or params.get("audio")
            if audio_path:
                if audio_path.startswith("project://"):
                    project_path = params.get("project_path") or params.get("projectPath")
                    if project_path:
                        rel = audio_path[len("project://"):]
                        audio_path = os.path.realpath(os.path.join(project_path, rel))
                elif audio_path.startswith("http://") or audio_path.startswith("https://") or audio_path.startswith("/output/") or audio_path.startswith("/input/"):
                    import urllib.parse
                    path_part = urllib.parse.urlparse(audio_path).path if audio_path.startswith("http") else audio_path
                    if path_part.startswith("/output/"):
                        rel = path_part[len("/output/"):]
                        audio_path = os.path.realpath(os.path.join(OUTPUT_DIR, urllib.parse.unquote(rel)))
                    elif path_part.startswith("/input/"):
                        rel = path_part[len("/input/"):]
                        audio_path = os.path.realpath(os.path.join(COMFYUI_INPUT_DIR, urllib.parse.unquote(rel)))
                params["audio_path"] = audio_path

            prompt_id = await pipeline_runner.run_prompt_creator(params)
            history = await comfy_client.wait_for_job(prompt_id, timeout=params.get("timeout", 1800))
            
            # 1. Try to extract output files from ComfyUI job history
            job_paths = pipeline_runner._extract_output_paths(history, COMFYUI_OUTPUT_DIR)
            output_urls = []
            for path in job_paths:
                if path.lower().endswith((".txt", ".json")):
                    rel = os.path.relpath(path, COMFYUI_OUTPUT_DIR).replace("\\", "/")
                    output_urls.append(f"/output/{rel}")
            
            # 2. Try scanning the output directory with a safety buffer
            if not output_urls:
                output_urls = _scan_output_dir(OUTPUT_DIR, start_time - 300.0, (".txt", ".json"))
            
            # 3. Direct path fallback if ComfyUI caching or skew skipped writing a new file
            if not output_urls:
                if params.get("workflow") == "b_roll_prompt_creator":
                    fallback_rel = "VRGDG_TEMP/TextFiles/BRollPrompts/BRollPrompts.txt"
                else:
                    fallback_rel = "VRGDG_TEMP/TextFiles/ConceptPrompts/ConceptPrompts.txt"
                fallback_path = os.path.join(OUTPUT_DIR, os.path.normpath(fallback_rel))
                if os.path.exists(fallback_path):
                    output_urls = [f"/output/{fallback_rel}"]
            
            output_urls = abs_urls(output_urls)
            output_urls = _copy_assets_to_project(params, output_urls)
            return {"status": "completed", "prompt_id": prompt_id, "outputs": output_urls}

        elif gen_type in ("i2v", "t2v"):
            import re
            import shutil
            
            # Clear previous run cache/files in the song output folder for a clean slate
            audio_path = params.get("audio_path") or params.get("audio_file") or params.get("audio")
            if audio_path:
                # Resolve URLs and project:// paths to local filesystem paths
                if audio_path.startswith("project://"):
                    project_path = params.get("project_path") or params.get("projectPath")
                    if project_path:
                        rel = audio_path[len("project://"):]
                        audio_path = os.path.realpath(os.path.join(project_path, rel))
                elif audio_path.startswith("http://") or audio_path.startswith("https://") or audio_path.startswith("/output/") or audio_path.startswith("/input/"):
                    import urllib.parse
                    path_part = urllib.parse.urlparse(audio_path).path if audio_path.startswith("http") else audio_path
                    if path_part.startswith("/output/"):
                        rel = path_part[len("/output/"):]
                        audio_path = os.path.realpath(os.path.join(OUTPUT_DIR, urllib.parse.unquote(rel)))
                    elif path_part.startswith("/input/"):
                        rel = path_part[len("/input/"):]
                        audio_path = os.path.realpath(os.path.join(COMFYUI_INPUT_DIR, urllib.parse.unquote(rel)))
                
                params["audio_path"] = audio_path
                base_name = os.path.splitext(os.path.basename(audio_path))[0]
                if os.path.isdir(COMFYUI_OUTPUT_DIR) and not params.get("skip_clear", False):
                    for folder_name in os.listdir(COMFYUI_OUTPUT_DIR):
                        if folder_name == base_name or folder_name.startswith(base_name + "_"):
                            run_folder = os.path.join(COMFYUI_OUTPUT_DIR, folder_name)
                            if os.path.isdir(run_folder):
                                logger.info("Clearing previous run folder for clean slate: %s", run_folder)
                                temp_dir = os.path.join(run_folder, "vrgdg_temp")
                                if os.path.exists(temp_dir):
                                    try:
                                        shutil.rmtree(temp_dir)
                                    except Exception as e:
                                        logger.error("Failed to delete temp dir: %s", e)
                                remake_dir = os.path.join(run_folder, "remake")
                                if os.path.exists(remake_dir):
                                    try:
                                        shutil.rmtree(remake_dir)
                                    except Exception as e:
                                        logger.error("Failed to delete remake dir: %s", e)
                                for f in os.listdir(run_folder):
                                    f_path = os.path.join(run_folder, f)
                                    if os.path.isfile(f_path):
                                        if f.lower().endswith((".mp4", ".webm", ".avi", ".mov", ".png", ".jpg", ".jpeg", ".json", ".txt")):
                                            try:
                                                os.remove(f_path)
                                            except Exception as e:
                                                logger.error("Failed to remove old file %s: %s", f_path, e)

            # Enqueue the first chunk
            if gen_type == "t2v":
                prompt_id = await pipeline_runner.run_t2v(params)
            else:
                prompt_id = await pipeline_runner.run_i2v(params)

            current_prompt_id = prompt_id
            run_folder = None

            while True:
                # Wait for the current job to complete
                history_entry = await comfy_client.wait_for_job(current_prompt_id, timeout=params.get("timeout", 3600))
                
                # Extract output file paths for this job
                job_paths = pipeline_runner._extract_output_paths(history_entry, COMFYUI_OUTPUT_DIR)
                
                # Find the run folder
                for path in job_paths:
                    rel = os.path.relpath(path, COMFYUI_OUTPUT_DIR)
                    parts = rel.split(os.sep)
                    if len(parts) > 1 and parts[0] != "..":
                        run_folder = os.path.join(COMFYUI_OUTPUT_DIR, parts[0])
                        break
                
                if not run_folder:
                    logger.warning("Could not resolve run folder from job paths: %s", job_paths)
                    break
                
                # Determine if we need to loop
                should_loop = False
                
                # Check for remake mode
                use_remake = params.get("use_remake_folder", False)
                if isinstance(use_remake, str):
                    use_remake = use_remake.upper() in ("ON", "TRUE", "1")
                
                if use_remake:
                    # Remake mode: loop if there are still files in the remake directory
                    remake_dir = os.path.join(run_folder, "remake")
                    if os.path.isdir(remake_dir):
                        remake_files = [f for f in os.listdir(remake_dir) if os.path.isfile(os.path.join(remake_dir, f))]
                        if remake_files:
                            should_loop = True
                            logger.info("Remake folder still contains files: %s. Looping...", remake_files)
                else:
                    # Normal mode: check srt_autoqueue.json for total_sets and count output files
                    autoqueue_path = os.path.join(run_folder, "vrgdg_temp", "srt_autoqueue.json")
                    if os.path.exists(autoqueue_path):
                        try:
                            with open(autoqueue_path, "r", encoding="utf-8") as f:
                                state = json.load(f)
                            total_sets = state.get("total_sets", 1)
                            
                            # Count output files to find next index
                            indices = []
                            video_files_count = 0
                            for f in os.listdir(run_folder):
                                # Skip auxiliary files like audio mux or png
                                if f.lower().endswith(("-audio.mp4", "-audio.webm", "-audio.mov", "-audio.avi")):
                                    continue
                                if not f.lower().endswith((".mp4", ".webm", ".mov", ".avi", ".gif")):
                                    continue
                                
                                video_files_count += 1
                                
                                # Match standard patterns:
                                # - video_[seq]_[chunk_idx]_[counter].[ext] (three digit sequences)
                                # - video_[chunk_idx]_[counter].[ext] (two digit sequences)
                                m = re.match(r"^.*_(\d+)_(\d+)(?:_(\d+))?\.(?:mp4|webm|mov|avi|gif)$", f.lower())
                                if m:
                                    g1, g2, g3 = m.groups()
                                    if g3 is not None:
                                        indices.append(int(g2))
                                    else:
                                        indices.append(int(g1))
                            
                            if indices:
                                next_index = max(indices) + 1
                            else:
                                next_index = video_files_count
                            
                            if next_index < total_sets:
                                should_loop = True
                                logger.info("Completed chunk %d of %d. Looping for next chunk...", next_index, total_sets)
                        except Exception as e:
                            logger.error("Failed to parse autoqueue state: %s", e)
                
                if should_loop:
                    # Enqueue the next chunk
                    if gen_type == "t2v":
                        current_prompt_id = await pipeline_runner.run_t2v(params)
                    else:
                        current_prompt_id = await pipeline_runner.run_i2v(params)
                else:
                    break

            # Scan the run folder for all output video files and return them
            output_urls = []
            if run_folder:
                for root, _, files in os.walk(run_folder):
                    for file in files:
                        if file.lower().endswith((".mp4", ".webm", ".mov", ".avi", ".gif")):
                            if "-audio." in file.lower():
                                continue
                            rel_path = os.path.relpath(os.path.join(root, file), COMFYUI_OUTPUT_DIR)
                            url_path = f"/output/{rel_path.replace(os.sep, '/')}"
                            output_urls.append(url_path)
            
            output_urls = abs_urls(output_urls)
            output_urls = _copy_assets_to_project(params, output_urls)
            return {
                "status": "completed",
                "prompt_id": prompt_id,
                "outputs": output_urls,
                "url": (output_urls + [""])[0],
                "video_url": output_urls[0] if output_urls else None
            }

        elif gen_type == "upscale":
            video_path = params.get("video_path") or params.get("video_file") or params.get("video")
            if video_path:
                if video_path.startswith("project://"):
                    project_path = params.get("project_path") or params.get("projectPath")
                    if project_path:
                        rel = video_path[len("project://"):]
                        video_path = os.path.realpath(os.path.join(project_path, rel))
                elif video_path.startswith("http://") or video_path.startswith("https://") or video_path.startswith("/output/") or video_path.startswith("/input/"):
                    import urllib.parse
                    path_part = urllib.parse.urlparse(video_path).path if video_path.startswith("http") else video_path
                    if path_part.startswith("/output/"):
                        rel = path_part[len("/output/"):]
                        video_path = os.path.realpath(os.path.join(OUTPUT_DIR, urllib.parse.unquote(rel)))
                    elif path_part.startswith("/input/"):
                        rel = path_part[len("/input/"):]
                        video_path = os.path.realpath(os.path.join(COMFYUI_INPUT_DIR, urllib.parse.unquote(rel)))
                params["video_path"] = video_path

            prompt_id = await pipeline_runner.run_upscale(params)
            history = await comfy_client.wait_for_job(prompt_id, timeout=params.get("timeout", 1800))
            output_urls = abs_urls(_scan_output_dir(OUTPUT_DIR, start_time, (".mp4", ".webm", ".mov", ".avi")))
            output_urls = _copy_assets_to_project(params, output_urls)
            return {
                "status": "completed",
                "prompt_id": prompt_id,
                "outputs": output_urls,
                "url": (output_urls + [""])[0],
                "video_url": output_urls[0] if output_urls else None
            }

        elif gen_type == "full_pipeline":
            fp_params = FullPipelineParams(**params.get("pipeline", params))
            result = await pipeline_runner.run_full_pipeline(fp_params.model_dump())
            return result

        else:
            raise HTTPException(
                status_code=400,
            detail=f"Unknown generation type '{gen_type}'. Valid types: "
            f"text2audio, audio_cover, tts, prompt_creator, "
            f"llm_audio_analysis, i2v, t2v, upscale, full_pipeline",
            )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except TimeoutError as e:
        raise HTTPException(status_code=504, detail=str(e))
    except Exception as e:
        logger.error("Generation failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/jobs/{prompt_id}")
async def get_job_status(prompt_id: str) -> dict:
    """Check the status of a previously submitted job."""
    try:
        history = await comfy_client.get_history(prompt_id)
        if not history or prompt_id not in history:
            # Not yet in history — check queue
            queue = await comfy_client.get_queue()
            running = queue.get("queue_running", [])
            pending = queue.get("queue_pending", [])
            is_running = any(
                item[1] == prompt_id
                for item in (running or [])
                if isinstance(item, list) and len(item) > 1
            )
            is_pending = any(
                item[1] == prompt_id
                for item in (pending or [])
                if isinstance(item, list) and len(item) > 1
            )
            return {
                "prompt_id": prompt_id,
                "status": "running" if is_running else (
                    "pending" if is_pending else "unknown"
                ),
                "history": None,
            }

        entry = history[prompt_id]
        status = entry.get("status", {})
        if status.get("completed") or status.get("done"):
            outputs = entry.get("outputs", {})
            return {
                "prompt_id": prompt_id,
                "status": "completed",
                "outputs": outputs,
            }
        elif status.get("failed") or status.get("error"):
            return {
                "prompt_id": prompt_id,
                "status": "failed",
                "error": entry.get("error", "Unknown error"),
            }
        else:
            return {
                "prompt_id": prompt_id,
                "status": "running",
                "history": entry,
            }

    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.post("/api/cancel/{prompt_id}")
async def cancel_job(prompt_id: str) -> dict:
    """Cancel a running or pending job by prompt_id, or cancel all active jobs if prompt_id is 'active'."""
    try:
        # Cancel all active async video jobs in background
        cancelled_video_jobs = []
        for jid, job in video_jobs.items():
            if job.get("status") in ("running", "pending"):
                job["status"] = "cancelled"
                job["message"] = "Job cancelled by user"
                cancelled_video_jobs.append(jid)

        if prompt_id in ("active", "current", "all"):
            cancelled_ids = await comfy_client.cancel_all_prompts()
            return {
                "status": "ok",
                "cancelled_prompts": cancelled_ids,
                "cancelled_video_jobs": cancelled_video_jobs,
                "message": "All active and pending jobs cancelled"
            }
        else:
            await comfy_client.cancel_prompt(prompt_id)
            await comfy_client.interrupt()
            return {
                "status": "ok",
                "prompt_id": prompt_id,
                "cancelled_video_jobs": cancelled_video_jobs,
                "message": f"Job {prompt_id} cancelled"
            }
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.post("/api/generate/video/cancel/{job_id}")
async def cancel_video_job(job_id: str) -> dict:
    """Cancel an active async multi-chunk video generation job."""
    job = video_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    
    job["status"] = "cancelled"
    job["message"] = "Job cancellation requested"
    
    prompt_id = job.get("prompt_id")
    if prompt_id:
        try:
            await comfy_client.cancel_prompt(prompt_id)
            await comfy_client.interrupt()
        except Exception as e:
            logger.error("Failed to cancel prompt %s: %s", prompt_id, e)
            
    return {"status": "ok", "job_id": job_id, "message": "Video job cancellation initiated"}



# ---------------------------------------------------------------------------
# Async video generation endpoints (non-blocking)
# ---------------------------------------------------------------------------

class VideoStartRequest(BaseModel):
    """Request to start an async video generation job."""
    type: str  # 't2v' or 'i2v'
    params: dict[str, Any] = Field(default_factory=dict)


async def _run_video_job(job_id: str, gen_type: str, params: dict, base_url: str) -> None:
    """Background task that runs the full multi-chunk video generation loop."""
    import re
    import shutil

    video_jobs[job_id]["status"] = "running"
    video_jobs[job_id]["message"] = "Starting video generation..."

    try:
        start_time = time.time()

        if gen_type == "upscale":
            video_path = params.get("video_path") or params.get("video_file") or params.get("video")
            logger.info(f"DEBUG upscale input video_path: {video_path}")
            
            if not video_path:
                video_jobs[job_id].update({
                    "status": "failed",
                    "error": "No input video provided. Please connect a video to the Upscaler node.",
                    "message": "Failed: Missing input video"
                })
                return

            if video_path.startswith("project://"):
                project_path = params.get("project_path") or params.get("projectPath")
                if project_path:
                    rel = video_path[len("project://"):]
                    video_path = os.path.realpath(os.path.join(project_path, rel))
            elif video_path.startswith("http://") or video_path.startswith("https://") or video_path.startswith("/output/") or video_path.startswith("/input/") or video_path.startswith("/api/projects/asset"):
                import urllib.parse
                parsed = urllib.parse.urlparse(video_path)
                path_part = parsed.path if video_path.startswith("http") else parsed.path or video_path
                if path_part.startswith("/output/"):
                    rel = path_part[len("/output/"):]
                    video_path = os.path.realpath(os.path.join(OUTPUT_DIR, urllib.parse.unquote(rel)))
                elif path_part.startswith("/input/"):
                    rel = path_part[len("/input/"):]
                    video_path = os.path.realpath(os.path.join(COMFYUI_INPUT_DIR, urllib.parse.unquote(rel)))
                elif path_part.startswith("/api/projects/asset"):
                    query = urllib.parse.parse_qs(parsed.query)
                    if "path" in query:
                        video_path = urllib.parse.unquote(query["path"][0])
            
            logger.info(f"DEBUG upscale resolved video_path: {video_path}")

            if video_path and os.path.exists(video_path):
                video_basename = os.path.basename(video_path)
                target_video = os.path.join(COMFYUI_INPUT_DIR, video_basename)
                if os.path.realpath(video_path) != os.path.realpath(target_video):
                    import shutil
                    try:
                        shutil.copy2(video_path, target_video)
                        logger.info(f"Copied video to ComfyUI input: {target_video}")
                    except Exception as e:
                        logger.warning(f"Failed to copy video {video_path} to input dir: {e}")
                params["video_path"] = video_basename
            else:
                params["video_path"] = os.path.basename(video_path) if video_path else ""

            prompt_id = await pipeline_runner.run_upscale(params)
            video_jobs[job_id]["prompt_id"] = prompt_id
            history = await comfy_client.wait_for_job(prompt_id, timeout=params.get("timeout", 3600), check_cancelled=lambda: video_jobs[job_id].get("status") == "cancelled")
            
            if video_jobs[job_id].get("status") == "cancelled":
                return
            
            output_urls = abs_urls(_scan_output_dir(OUTPUT_DIR, start_time, (".mp4", ".webm", ".mov", ".avi")))
            output_urls = _copy_assets_to_project(params, output_urls)
            
            video_jobs[job_id].update({
                "status": "completed",
                "message": "Upscale completed successfully",
                "outputs": output_urls,
                "video_url": output_urls[0] if output_urls else None
            })
            return

        # Resolve audio_path URL -> local path
        audio_path = params.get("audio_path") or params.get("audio_file") or params.get("audio")
        if audio_path:
            if audio_path.startswith("project://"):
                project_path = params.get("project_path") or params.get("projectPath")
                if project_path:
                    rel = audio_path[len("project://"):]
                    audio_path = os.path.realpath(os.path.join(project_path, rel))
            elif audio_path.startswith("http://") or audio_path.startswith("https://") or audio_path.startswith("/output/") or audio_path.startswith("/input/") or audio_path.startswith("/api/projects/asset"):
                import urllib.parse
                parsed = urllib.parse.urlparse(audio_path)
                path_part = parsed.path if audio_path.startswith("http") else parsed.path or audio_path
                if path_part.startswith("/output/"):
                    rel = path_part[len("/output/"):]
                    audio_path = os.path.realpath(os.path.join(OUTPUT_DIR, urllib.parse.unquote(rel)))
                elif path_part.startswith("/input/"):
                    rel = path_part[len("/input/"):]
                    audio_path = os.path.realpath(os.path.join(COMFYUI_INPUT_DIR, urllib.parse.unquote(rel)))
                elif path_part.startswith("/api/projects/asset"):
                    query = urllib.parse.parse_qs(parsed.query)
                    if "path" in query and "asset" in query:
                        audio_path = os.path.realpath(os.path.join(query["path"][0], query["asset"][0]))
            params["audio_path"] = audio_path

            # Clear previous run folder for clean slate
            base_name = os.path.splitext(os.path.basename(audio_path))[0]
            if os.path.isdir(COMFYUI_OUTPUT_DIR) and not params.get("skip_clear", False):
                for folder_name in os.listdir(COMFYUI_OUTPUT_DIR):
                    if folder_name == base_name or folder_name.startswith(base_name + "_"):
                        run_folder = os.path.join(COMFYUI_OUTPUT_DIR, folder_name)
                        if os.path.isdir(run_folder):
                            logger.info("[job %s] Clearing previous run folder: %s", job_id, run_folder)
                            for sub in ("vrgdg_temp", "remake"):
                                sub_path = os.path.join(run_folder, sub)
                                if os.path.exists(sub_path):
                                    try:
                                        shutil.rmtree(sub_path)
                                    except Exception as e:
                                        logger.error("Failed to delete %s: %s", sub_path, e)
                            for f in os.listdir(run_folder):
                                f_path = os.path.join(run_folder, f)
                                if os.path.isfile(f_path) and f.lower().endswith((".mp4", ".webm", ".avi", ".mov", ".png", ".jpg", ".jpeg", ".json", ".txt")):
                                    try:
                                        os.remove(f_path)
                                    except Exception as e:
                                        logger.error("Failed to remove %s: %s", f_path, e)

        # Enqueue first chunk
        if gen_type == "t2v":
            current_prompt_id = await pipeline_runner.run_t2v(params)
        else:
            current_prompt_id = await pipeline_runner.run_i2v(params)

        video_jobs[job_id]["prompt_id"] = current_prompt_id

        run_folder = None
        chunk_num = 1

        while True:
            # Check for cancellation before processing
            if video_jobs[job_id].get("status") == "cancelled":
                logger.info("[job %s] Cancellation detected in loop start. Exiting.", job_id)
                break

            video_jobs[job_id]["message"] = f"Processing chunk {chunk_num}..."
            logger.info("[job %s] Waiting for chunk %d (prompt_id=%s)", job_id, chunk_num, current_prompt_id)

            # Wait up to 1 hour per chunk
            history_entry = await comfy_client.wait_for_job(
                current_prompt_id,
                timeout=params.get("timeout", 3600),
                check_cancelled=lambda: video_jobs[job_id].get("status") == "cancelled"
            )

            job_paths = pipeline_runner._extract_output_paths(history_entry, COMFYUI_OUTPUT_DIR)

            # Locate run folder
            for path in job_paths:
                rel = os.path.relpath(path, COMFYUI_OUTPUT_DIR)
                parts = rel.split(os.sep)
                if len(parts) > 1 and parts[0] != "..":
                    run_folder = os.path.join(COMFYUI_OUTPUT_DIR, parts[0])
                    break

            if not run_folder:
                logger.warning("[job %s] Could not resolve run folder from job paths: %s", job_id, job_paths)
                break

            # Check if more chunks needed
            should_loop = False
            use_remake = params.get("use_remake_folder", False)
            if isinstance(use_remake, str):
                use_remake = use_remake.upper() in ("ON", "TRUE", "1")

            if use_remake:
                remake_dir = os.path.join(run_folder, "remake")
                if os.path.isdir(remake_dir):
                    remake_files = [f for f in os.listdir(remake_dir) if os.path.isfile(os.path.join(remake_dir, f))]
                    if remake_files:
                        should_loop = True
            else:
                autoqueue_path = os.path.join(run_folder, "vrgdg_temp", "srt_autoqueue.json")
                if os.path.exists(autoqueue_path):
                    try:
                        with open(autoqueue_path, "r", encoding="utf-8") as f:
                            state = json.load(f)
                        total_sets = state.get("total_sets", 1)
                        indices = []
                        video_files_count = 0
                        for f in os.listdir(run_folder):
                            if f.lower().endswith(("-audio.mp4", "-audio.webm", "-audio.mov", "-audio.avi")):
                                continue
                            if not f.lower().endswith((".mp4", ".webm", ".mov", ".avi", ".gif")):
                                continue
                            video_files_count += 1
                            m = re.match(r"^.*_(\d+)_(\d+)(?:_(\d+))?\.(?:mp4|webm|mov|avi|gif)$", f.lower())
                            if m:
                                g1, g2, g3 = m.groups()
                                indices.append(int(g2) if g3 is not None else int(g1))
                        next_index = max(indices) + 1 if indices else video_files_count
                        if next_index < total_sets:
                            should_loop = True
                            logger.info("[job %s] Completed chunk %d/%d. Looping...", job_id, next_index, total_sets)
                    except Exception as e:
                        logger.error("[job %s] Failed to parse autoqueue state: %s", job_id, e)

            if should_loop:
                if video_jobs[job_id].get("status") == "cancelled":
                    logger.info("[job %s] Cancellation detected. Exiting before enqueueing next chunk.", job_id)
                    break
                chunk_num += 1
                if gen_type == "t2v":
                    current_prompt_id = await pipeline_runner.run_t2v(params)
                else:
                    current_prompt_id = await pipeline_runner.run_i2v(params)
                video_jobs[job_id]["prompt_id"] = current_prompt_id
            else:
                break

        # Collect output video URLs
        output_urls = []
        if run_folder:
            for root, _, files in os.walk(run_folder):
                for file in files:
                    if file.lower().endswith((".mp4", ".webm", ".mov", ".avi", ".gif")):
                        if "-audio." in file.lower():
                            continue
                        rel_path = os.path.relpath(os.path.join(root, file), COMFYUI_OUTPUT_DIR)
                        url_path = f"{base_url}/output/{rel_path.replace(os.sep, '/')}"
                        output_urls.append(url_path)

        output_urls = _copy_assets_to_project(params, output_urls)

        video_jobs[job_id].update({
            "status": "completed",
            "message": f"Done! Generated {len(output_urls)} clip(s).",
            "outputs": output_urls,
            "url": output_urls[0] if output_urls else "",
            "video_url": output_urls[0] if output_urls else None,
            "prompt_id": current_prompt_id,
        })
        logger.info("[job %s] Completed. %d output(s).", job_id, len(output_urls))

    except Exception as e:
        logger.error("[job %s] Failed: %s", job_id, e, exc_info=True)
        if video_jobs[job_id].get("status") == "cancelled":
            video_jobs[job_id].update({
                "message": "Job cancelled by user",
                "error": None,
                "outputs": [],
            })
        else:
            video_jobs[job_id].update({
                "status": "failed",
                "message": str(e),
                "error": str(e),
                "outputs": [],
            })


@app.post("/api/generate/video/start")
async def start_video_job(req: VideoStartRequest, request: Request) -> dict:
    """Start a video generation job asynchronously and return a job_id immediately.
    
    The client should poll /api/generate/video/status/{job_id} to track progress.
    """
    gen_type = req.type
    if gen_type not in ("t2v", "i2v", "upscale"):
        raise HTTPException(status_code=400, detail="type must be 't2v', 'i2v', or 'upscale'")

    params = dict(req.params)
    job_id = str(uuid.uuid4())
    base_url = str(request.base_url).rstrip("/")

    video_jobs[job_id] = {
        "status": "pending",
        "message": "Job queued...",
        "outputs": [],
        "error": None,
    }

    # Fire and forget — run the generation loop in the background
    task = asyncio.create_task(_run_video_job(job_id, gen_type, params, base_url))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)

    return {"status": "ok", "job_id": job_id, "message": "Video generation started"}


@app.get("/api/generate/video/status/{job_id}")
async def get_video_job_status(job_id: str) -> dict:
    """Poll the status of an async video generation job."""
    job = video_jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    return {"job_id": job_id, **job}


@app.get("/api/projects/list-video-outputs")
async def list_video_outputs(video_url: str, project_path: Optional[str] = None) -> dict:
    """Scan and list all video output files in the same folder as the provided video_url."""
    import urllib.parse
    
    local_path = None
    if video_url.startswith("project://"):
        if project_path:
            rel = video_url[len("project://"):]
            local_path = os.path.realpath(os.path.join(project_path, rel))
    elif video_url.startswith("/output/") or "comfyui/output" in video_url or "/output" in video_url:
        path_part = urllib.parse.urlparse(video_url).path if video_url.startswith("http") else video_url
        if path_part.startswith("/output/"):
            rel = path_part[len("/output/"):]
            local_path = os.path.realpath(os.path.join(OUTPUT_DIR, urllib.parse.unquote(rel)))
    elif "/api/projects/asset" in video_url:
        query_params = urllib.parse.parse_qs(urllib.parse.urlparse(video_url).query)
        proj = query_params.get("project_path", [""])[0] or query_params.get("projectPath", [""])[0]
        asset = query_params.get("asset", [""])[0] or query_params.get("name", [""])[0]
        if proj and asset:
            local_path = os.path.realpath(os.path.join(proj, asset))

    if not local_path or not os.path.exists(local_path):
        return {"outputs": []}
        
    resolved_dir = os.path.dirname(local_path)
    is_project_videos_dir = project_path and os.path.realpath(resolved_dir) == os.path.realpath(os.path.join(project_path, "videos"))
    
    target_dir = None
    if is_project_videos_dir:
        # Fall back to scanning COMFYUI_OUTPUT_DIR for the latest generation run folder containing video chunks
        latest_run_dir = None
        latest_mtime = 0
        if os.path.isdir(COMFYUI_OUTPUT_DIR):
            for entry in os.listdir(COMFYUI_OUTPUT_DIR):
                entry_path = os.path.join(COMFYUI_OUTPUT_DIR, entry)
                if os.path.isdir(entry_path):
                    try:
                        # Check if it has video chunks
                        has_chunks = False
                        for f in os.listdir(entry_path):
                            if f.lower().startswith("video_") and f.lower().endswith((".mp4", ".webm", ".mov", ".avi")):
                                has_chunks = True
                                break
                        if has_chunks:
                            mtime = os.path.getmtime(entry_path)
                            if mtime > latest_mtime:
                                latest_mtime = mtime
                                latest_run_dir = entry_path
                    except OSError:
                        continue
        if latest_run_dir:
            target_dir = latest_run_dir
            
    if not target_dir:
        target_dir = resolved_dir
        
    if not os.path.isdir(target_dir):
        return {"outputs": []}
        
    outputs = []
    is_project_file = project_path and os.path.realpath(target_dir).startswith(os.path.realpath(project_path))
    
    for file in os.listdir(target_dir):
        if file.lower().endswith((".mp4", ".webm", ".mov", ".avi", ".gif")):
            if "-audio." in file.lower():
                continue
            if is_project_file:
                rel = os.path.relpath(os.path.join(target_dir, file), project_path).replace(os.sep, "/")
                outputs.append(f"project://{rel}")
            else:
                rel = os.path.relpath(os.path.join(target_dir, file), COMFYUI_OUTPUT_DIR).replace(os.sep, "/")
                outputs.append(f"/output/{rel}")
                
    return {"outputs": sorted(outputs)}


@app.get("/api/outputs")
async def list_outputs(limit: int = 50, pattern: Optional[str] = None) -> dict:
    """List generated output files.

    Args:
        limit: Maximum number of files to return (default 50).
        pattern: Optional filename substring filter.

    Returns:
        Dict with 'files' list, each with name, size, modified, path.
    """
    if not os.path.isdir(OUTPUT_DIR):
        return {"files": []}

    files = []
    for root, _dirs, filenames in os.walk(OUTPUT_DIR):
        for fname in filenames:
            if pattern and pattern.lower() not in fname.lower():
                continue
            full_path = os.path.join(root, fname)
            try:
                stat = os.stat(full_path)
                rel_path = os.path.relpath(full_path, OUTPUT_DIR)
                files.append({
                    "name": fname,
                    "path": rel_path,
                    "size": stat.st_size,
                    "modified": stat.st_mtime,
                })
            except OSError:
                continue

    files.sort(key=lambda f: f["modified"], reverse=True)
    files = files[:limit]

    return {"files": files}


@app.get("/api/workflows")
async def list_workflows() -> dict:
    """List available workflows and their metadata."""
    info = workflow_editor.get_workflow_info()
    return {"workflows": info}


@app.get("/api/workflows/category/{category}")
async def get_workflows_by_category(category: str) -> dict:
    """Get all workflows in a specific category.

    Args:
        category: Category name (e.g., 'text-to-audio', 'image-to-video').

    Returns:
        Dict with 'category' and 'workflows' list.
    """
    workflows = workflow_editor.get_workflows_by_category(category)
    default_workflow = workflow_editor.get_default_workflow(category)
    return {
        "category": category,
        "workflows": workflows,
        "default": default_workflow,
    }


@app.post("/api/workflows/reload")
async def reload_workflows() -> dict:
    """Rescan the workflows directory and reload all workflow JSONs."""
    return workflow_editor.reload()


@app.post("/api/workflows/upload")
async def upload_workflow(
    file: UploadFile = File(...),
    category: str = Form("uncategorized"),
) -> dict:
    """Upload a new workflow JSON file.

    Args:
        file: The workflow JSON file to upload.
        category: Category for the workflow (text-to-audio, cover-audio, image, etc.).

    Returns:
        Dict with upload status and workflow info.
    """
    if not file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="Only .json files are allowed")

    try:
        content = await file.read()
        workflow_data = json.loads(content)
        
        if not isinstance(workflow_data, dict):
            raise HTTPException(status_code=400, detail="Invalid workflow format")

        filename = file.filename
        filepath = os.path.join(WORKFLOWS_DIR, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(workflow_data, f, indent=2)

        workflow_editor.reload()
        
        return {
            "status": "uploaded",
            "filename": filename,
            "category": category,
            "message": f"Workflow '{filename}' uploaded successfully",
        }
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/models/loras")
async def get_loras() -> dict:
    """Fetch the list of available LoRAs from ComfyUI or scan the local directory."""
    import requests
    try:
        url = f"http://{COMFYUI_HOST}:{COMFYUI_PORT}/models/loras"
        resp = requests.get(url, timeout=3)
        if resp.status_code == 200:
            return {"status": "ok", "loras": resp.json()}
    except Exception:
        pass

    loras = []
    local_path = os.path.join(PROJECT_ROOT, "comfyui", "models", "loras")
    if os.path.exists(local_path):
        for root, _, files in os.walk(local_path):
            for file in files:
                if file.endswith((".safetensors", ".ckpt", ".pt", ".bin", ".sft")):
                    rel = os.path.relpath(os.path.join(root, file), local_path)
                    # Normalize backslashes to forward slashes or double backslashes
                    loras.append(rel)
    return {"status": "ok", "loras": sorted(loras)}

