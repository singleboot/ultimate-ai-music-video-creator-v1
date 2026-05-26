"""ComfyUI HTTP API client for workflow execution and file management."""

import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Optional

import aiohttp
import requests

logger = logging.getLogger(__name__)


class ComfyUIClient:
    """Client for interacting with a ComfyUI instance via its HTTP API."""

    def __init__(self, host: str = "127.0.0.1", port: int = 8188):
        self.host = host
        self.port = port
        self.base_url = f"http://{host}:{port}"
        self._session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session

    async def close(self) -> None:
        """Close the underlying aiohttp session."""
        if self._session and not self._session.closed:
            await self._session.close()

    def is_available(self) -> bool:
        """Check if ComfyUI is reachable by querying /system_stats."""
        try:
            resp = requests.get(f"{self.base_url}/system_stats", timeout=5)
            return resp.status_code == 200
        except requests.RequestException:
            return False

    async def get_queue(self) -> dict:
        """Get the current execution queue from ComfyUI."""
        session = await self._get_session()
        async with session.get(f"{self.base_url}/queue") as resp:
            resp.raise_for_status()
            return await resp.json()

    async def get_history(self, prompt_id: str) -> dict:
        """Get the execution history for a specific prompt_id."""
        session = await self._get_session()
        async with session.get(f"{self.base_url}/history/{prompt_id}") as resp:
            if resp.status == 404:
                return {}
            resp.raise_for_status()
            return await resp.json()

    async def enqueue_workflow(self, workflow: dict) -> str:
        """Enqueue a workflow for execution and return the prompt_id.

        Args:
            workflow: ComfyUI API-format workflow JSON.

        Returns:
            The prompt_id string assigned by ComfyUI.

        Raises:
            RuntimeError: If the server rejects the prompt.
        """
        session = await self._get_session()
        payload = {"prompt": workflow}
        async with session.post(f"{self.base_url}/prompt", json=payload) as resp:
            resp.raise_for_status()
            data = await resp.json()
            if "prompt_id" not in data:
                raise RuntimeError(f"ComfyUI did not return a prompt_id: {data}")
            return data["prompt_id"]

    async def upload_image(self, image_path: str) -> str:
        """Upload an image file to ComfyUI's input directory.

        Args:
            image_path: Local path to the image file.

        Returns:
            The filename as stored in ComfyUI's input directory.

        Raises:
            FileNotFoundError: If the image file does not exist.
            RuntimeError: If the upload fails.
        """
        path = Path(image_path)
        if not path.exists():
            raise FileNotFoundError(f"Image not found: {image_path}")

        session = await self._get_session()
        data = aiohttp.FormData()
        data.add_field("image", path.open("rb"), filename=path.name)
        data.add_field("overwrite", "true")
        data.add_field("type", "input")

        async with session.post(f"{self.base_url}/upload/image", data=data) as resp:
            if resp.status not in (200, 201):
                text = await resp.text()
                raise RuntimeError(f"Image upload failed ({resp.status}): {text}")
            result = await resp.json()
            return result.get("name", path.name)

    async def upload_audio(self, audio_path: str) -> str:
        """Upload an audio file to ComfyUI's input directory.

        Uses the same /upload/image endpoint since ComfyUI treats audio files
        similarly for input directory storage.

        Args:
            audio_path: Local path to the audio file.

        Returns:
            The filename as stored in ComfyUI's input directory.

        Raises:
            FileNotFoundError: If the audio file does not exist.
            RuntimeError: If the upload fails.
        """
        path = Path(audio_path)
        if not path.exists():
            raise FileNotFoundError(f"Audio not found: {audio_path}")

        session = await self._get_session()
        data = aiohttp.FormData()
        data.add_field("image", path.open("rb"), filename=path.name)
        data.add_field("overwrite", "true")
        data.add_field("type", "input")

        async with session.post(f"{self.base_url}/upload/image", data=data) as resp:
            if resp.status not in (200, 201):
                text = await resp.text()
                raise RuntimeError(f"Audio upload failed ({resp.status}): {text}")
            result = await resp.json()
            return result.get("name", path.name)

    async def wait_for_job(self, prompt_id: str, timeout: int = 600) -> dict:
        """Poll ComfyUI until a job completes or the timeout is reached.

        Args:
            prompt_id: The prompt_id to wait for.
            timeout: Maximum seconds to wait (default 600).

        Returns:
            The full history entry for the completed job.

        Raises:
            TimeoutError: If the job does not complete within the timeout.
            RuntimeError: If the job fails (contains error info).
        """
        poll_interval = 2.0
        elapsed = 0.0

        while elapsed < timeout:
            history = await self.get_history(prompt_id)
            if history and prompt_id in history:
                entry = history[prompt_id]
                status = entry.get("status", {})
                if status.get("completed") or status.get("done"):
                    return entry
                if status.get("failed") or status.get("error"):
                    error_info = entry.get("error", "Unknown error")
                    raise RuntimeError(f"Job {prompt_id} failed: {error_info}")

            await asyncio.sleep(poll_interval)
            elapsed += poll_interval

        raise TimeoutError(f"Job {prompt_id} did not complete within {timeout}s")
