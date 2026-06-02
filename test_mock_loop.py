import unittest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
import os
import sys
import json

# Add app to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "app")))

os.environ["COMFYUI_HOST"] = "127.0.0.1"
os.environ["COMFYUI_PORT"] = "8188"

from app.main import app

class TestVideoLoop(unittest.TestCase):
    @patch("app.main.comfy_client")
    @patch("app.main.pipeline_runner")
    def test_t2v_loop(self, mock_pipeline, mock_comfy):
        client = TestClient(app)
        
        # Mock run_t2v to return prompt_ids for subsequent chunks
        mock_pipeline.run_t2v = AsyncMock(side_effect=["prompt_1", "prompt_2", "prompt_3"])
        
        # Mock extraction of paths to return path containing the run folder name
        mock_pipeline._extract_output_paths = MagicMock(return_value=[
            os.path.join("comfyui", "output", "Heartbeat_Concrete", "video_0001_0000_00001.mp4")
        ])
        
        # Mock wait_for_job to return a fake history entry dict
        mock_comfy.wait_for_job = AsyncMock(return_value={"outputs": {}})
        
        # Mock file system actions so that:
        # - srt_autoqueue.json is found and has 3 sets
        # - listdir returns matching chunk index suffixes so the loop progresses index-wise
        with patch("os.path.exists", return_value=True), \
             patch("os.path.isdir", return_value=True), \
             patch("builtins.open", unittest.mock.mock_open(read_data=json.dumps({
                 "total_sets": 3,
                 "start_index": 0,
                 "run_folder": "Heartbeat_Concrete"
             }))), \
             patch("os.listdir", side_effect=[
                 ["video_0001_0000_0000.mp4"], # index 0 completed
                 ["video_0001_0000_0000.mp4", "video_0002_0001_0001.mp4"], # index 1 completed
                 ["video_0001_0000_0000.mp4", "video_0002_0001_0001.mp4", "video_0003_0002_0002.mp4"], # index 2 completed
             ]), \
             patch("os.walk", return_value=[
                 ("comfyui/output/Heartbeat_Concrete", [], ["video_0001_0000_0000.mp4", "video_0002_0001_0001.mp4", "video_0003_0002_0002.mp4"])
             ]):
            
            resp = client.post("/api/generate", json={
                "type": "t2v",
                "params": {
                    "prompt": "Test prompt"
                }
            })
            
            print("Response Status Code:", resp.status_code)
            print("Response JSON:", json.dumps(resp.json(), indent=2))
            
            # Verify the call counts and outcomes
            self.assertEqual(resp.status_code, 200)
            self.assertEqual(mock_pipeline.run_t2v.call_count, 3)
            self.assertEqual(len(resp.json()["outputs"]), 3)
            print("\nSUCCESS: Loop generation enqueued all 3 sets sequentially!")

if __name__ == "__main__":
    unittest.main()
