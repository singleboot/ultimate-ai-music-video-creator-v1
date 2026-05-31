"""FastAPI backend for Ultimate Music Video Creator.

Provides a REST API bridge between a Next.js frontend and a running ComfyUI
instance for AI-powered music video generation.
"""

import logging
import os
import sys
import time
from contextlib import asynccontextmanager
from typing import Any, Optional

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
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
COMFYUI_INPUT_DIR = os.environ.get(
    "COMFYUI_INPUT_DIR",
    os.path.join(PROJECT_ROOT, "input"),
)
COMFYUI_OUTPUT_DIR = os.environ.get(
    "COMFYUI_OUTPUT_DIR",
    os.path.join(PROJECT_ROOT, "comfyui", "output"),
)
OUTPUT_DIR = COMFYUI_OUTPUT_DIR

# ---------------------------------------------------------------------------
# Global state (set up during lifespan)
# ---------------------------------------------------------------------------
comfy_client: ComfyUIClient = None
workflow_editor: WorkflowEditor = None
input_manager: InputManager = None
pipeline_runner: PipelineRunner = None


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

    available = comfy_client.is_available()
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


class UpdateSettingsRequest(BaseModel):
    """Request to update app settings."""
    settings: dict[str, Any]


PROJECT_DIRS = ["music", "images", "videos", "lyrics"]


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
    connected = comfy_client.is_available() if comfy_client else False
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
        except Exception:
            pass
    return {}


def _save_settings(data: dict) -> None:
    with open(SETTINGS_FILE, "w") as f:
        json.dump(data, f, indent=2)


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


@app.get("/api/status")
async def get_status() -> dict:
    """Return ComfyUI queue status."""
    try:
        queue = await comfy_client.get_queue()
        return {"status": "ok", "queue": queue}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"ComfyUI unreachable: {e}")


@app.post("/api/generate")
async def generate(
    request: Request,
    type: str = Form(None),
    audio_file: UploadFile = File(None),
    image_files: list[UploadFile] = File(None),
) -> dict:
    """Submit a generation job.

    Accepts JSON body OR multipart form data. The `type` field
    determines the pipeline step; file uploads are saved and their paths
    injected into params.

    Returns the prompt_id(s) for polling.
    """
    params: dict[str, Any] = {}
    gen_type: Optional[str] = None

    # Try to parse JSON body
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
    elif type is not None:
        gen_type = type

    if gen_type is None:
        raise HTTPException(
            status_code=400,
            detail="Missing 'type' field. Must be one of: text2audio, "
                   "audio_cover, tts, prompt_creator, i2v, t2v, full_pipeline",
        )

    # Handle file uploads
    if audio_file is not None:
        save_path = os.path.join(COMFYUI_INPUT_DIR, audio_file.filename)
        content = await audio_file.read()
        with open(save_path, "wb") as f:
            f.write(content)
        params.setdefault("audio_path", save_path)
        params.setdefault("audio_file", audio_file.filename)

    if image_files:
        image_paths = []
        for img in image_files:
            save_path = os.path.join(COMFYUI_INPUT_DIR, img.filename)
            content = await img.read()
            with open(save_path, "wb") as f:
                f.write(content)
            image_paths.append(save_path)
        params.setdefault("images", image_paths)

    try:
        # Record timestamp before enqueueing, then scan for new files after completion
        start_time = time.time()
        base_url = str(request.base_url).rstrip("/")

        def abs_urls(urls: list[str]) -> list[str]:
            return [f"{base_url}{u}" for u in urls]

        if gen_type == "text2audio":
            prompt_id = await pipeline_runner.run_text2audio(params)
            history = await comfy_client.wait_for_job(prompt_id, timeout=params.get("timeout", 300))
            output_urls = abs_urls(_scan_output_dir(OUTPUT_DIR, start_time, (".wav", ".mp3", ".flac", ".ogg", ".m4a")))
            return {"status": "completed", "prompt_id": prompt_id, "outputs": output_urls, "url": (output_urls + [""])[0], "audio_url": output_urls[0] if output_urls else None}

        elif gen_type == "audio_cover":
            prompt_id = await pipeline_runner.run_audio_cover(params)
            history = await comfy_client.wait_for_job(prompt_id, timeout=params.get("timeout", 300))
            output_urls = abs_urls(_scan_output_dir(OUTPUT_DIR, start_time, (".wav", ".mp3", ".flac", ".ogg", ".m4a")))
            return {"status": "completed", "prompt_id": prompt_id, "outputs": output_urls, "url": (output_urls + [""])[0], "audio_url": output_urls[0] if output_urls else None}

        elif gen_type == "tts":
            prompt_id = await pipeline_runner.run_tts(params)
            history = await comfy_client.wait_for_job(prompt_id, timeout=params.get("timeout", 300))
            output_urls = abs_urls(_scan_output_dir(OUTPUT_DIR, start_time, (".wav", ".mp3", ".flac", ".ogg", ".m4a")))
            return {"status": "completed", "prompt_id": prompt_id, "outputs": output_urls, "url": (output_urls + [""])[0], "audio_url": output_urls[0] if output_urls else None}

        elif gen_type == "prompt_creator":
            prompt_id = await pipeline_runner.run_prompt_creator(params)
            history = await comfy_client.wait_for_job(prompt_id, timeout=params.get("timeout", 300))
            output_urls = abs_urls(_scan_output_dir(OUTPUT_DIR, start_time, (".txt", ".json")))
            return {"status": "completed", "prompt_id": prompt_id, "outputs": output_urls}

        elif gen_type == "i2v":
            prompt_id = await pipeline_runner.run_i2v(params)
            history = await comfy_client.wait_for_job(prompt_id, timeout=params.get("timeout", 600))
            output_urls = abs_urls(_scan_output_dir(OUTPUT_DIR, start_time, (".mp4", ".webm", ".mov", ".avi", ".gif")))
            return {"status": "completed", "prompt_id": prompt_id, "outputs": output_urls, "url": (output_urls + [""])[0], "video_url": output_urls[0] if output_urls else None}

        elif gen_type == "t2v":
            prompt_id = await pipeline_runner.run_t2v(params)
            history = await comfy_client.wait_for_job(prompt_id, timeout=params.get("timeout", 600))
            output_urls = abs_urls(_scan_output_dir(OUTPUT_DIR, start_time, (".mp4", ".webm", ".mov", ".avi", ".gif")))
            return {"status": "completed", "prompt_id": prompt_id, "outputs": output_urls, "url": (output_urls + [""])[0], "video_url": output_urls[0] if output_urls else None}

        elif gen_type == "full_pipeline":
            fp_params = FullPipelineParams(**params.get("pipeline", params))
            result = await pipeline_runner.run_full_pipeline(fp_params.model_dump())
            return result

        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown generation type '{gen_type}'. Valid types: "
                       f"text2audio, audio_cover, tts, prompt_creator, i2v, "
                       f"t2v, full_pipeline",
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
                item.get("prompt_id") == prompt_id
                for item in (running or [])
                if isinstance(item, dict)
            )
            is_pending = any(
                item.get("prompt_id") == prompt_id
                for item in (pending or [])
                if isinstance(item, dict)
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
    """Cancel a running or pending job by prompt_id."""
    try:
        await comfy_client.cancel_prompt(prompt_id)
        await comfy_client.interrupt()
        return {"status": "ok", "prompt_id": prompt_id, "message": "Job cancelled"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


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
