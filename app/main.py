"""FastAPI backend for Ultimate Music Video Creator.

Provides a REST API bridge between a Next.js frontend and a running ComfyUI
instance for AI-powered music video generation.
"""

import logging
import os
import sys
from contextlib import asynccontextmanager
from typing import Any, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from modules import ComfyUIClient, InputManager, PipelineRunner, WorkflowEditor

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("main")

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
WORKFLOWS_DIR = os.path.join(PROJECT_ROOT, "workflows")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "output")
COMFYUI_HOST = os.environ.get("COMFYUI_HOST", "127.0.0.1")
COMFYUI_PORT = int(os.environ.get("COMFYUI_PORT", "8188"))
COMFYUI_INPUT_DIR = os.environ.get(
    "COMFYUI_INPUT_DIR",
    os.path.join(PROJECT_ROOT, "input"),
)
COMFYUI_OUTPUT_DIR = os.environ.get(
    "COMFYUI_OUTPUT_DIR",
    os.path.join(PROJECT_ROOT, "output"),
)

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

class GenerateRequest(BaseModel):
    """Request body for POST /api/generate."""
    type: str = Field(
        ...,
        description="Generation type: text2audio, audio_cover, tts, "
                    "prompt_creator, i2v, t2v, full_pipeline",
    )
    params: dict[str, Any] = Field(default_factory=dict)


class FullPipelineParams(BaseModel):
    """Structured params for full_pipeline generation type."""
    audio_mode: str = "text2audio"
    audio_params: dict[str, Any] = Field(default_factory=dict)
    prompt_params: dict[str, Any] = Field(default_factory=dict)
    video_mode: str = "t2v"
    video_params: dict[str, Any] = Field(default_factory=dict)
    comfy_output_dir: Optional[str] = None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/health")
async def health_check() -> dict:
    """Health check endpoint — reports API and ComfyUI connectivity status."""
    connected = comfy_client.is_available() if comfy_client else False
    return {
        "status": "ok",
        "comfyui_connected": connected,
        "comfyui_url": f"http://{COMFYUI_HOST}:{COMFYUI_PORT}",
    }


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
    request: Optional[GenerateRequest] = None,
    type: str = Form(None),
    audio_file: UploadFile = File(None),
    image_files: list[UploadFile] = File(None),
) -> dict:
    """Submit a generation job.

    Accepts JSON body OR multipart form data. For multipart, the `type` field
    determines the pipeline step; file uploads are saved and their paths
    injected into params.

    Returns the prompt_id(s) for polling.
    """
    # Merge JSON + form params
    params: dict[str, Any] = {}

    if request is not None:
        gen_type = request.type
        params.update(request.params)
    elif type is not None:
        gen_type = type
    else:
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
        if gen_type == "text2audio":
            prompt_id = await pipeline_runner.run_text2audio(params)
            return {"status": "queued", "prompt_id": prompt_id}

        elif gen_type == "audio_cover":
            prompt_id = await pipeline_runner.run_audio_cover(params)
            return {"status": "queued", "prompt_id": prompt_id}

        elif gen_type == "tts":
            prompt_id = await pipeline_runner.run_tts(params)
            return {"status": "queued", "prompt_id": prompt_id}

        elif gen_type == "prompt_creator":
            prompt_id = await pipeline_runner.run_prompt_creator(params)
            return {"status": "queued", "prompt_id": prompt_id}

        elif gen_type == "i2v":
            prompt_id = await pipeline_runner.run_i2v(params)
            return {"status": "queued", "prompt_id": prompt_id}

        elif gen_type == "t2v":
            prompt_id = await pipeline_runner.run_t2v(params)
            return {"status": "queued", "prompt_id": prompt_id}

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
