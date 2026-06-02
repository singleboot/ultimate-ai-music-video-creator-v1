import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_endpoints():
    print("1. Testing Video/Audio Combiner Endpoint...")
    # Check that combiner behaves correctly when file is missing
    combine_payload = {
        "video_url": "nonexistent_video.mp4",
        "audio_url": "nonexistent_audio.wav"
    }
    resp = requests.post(f"{BASE_URL}/api/generate/combine", json=combine_payload)
    print(f"Combiner Status Code: {resp.status_code}")
    print(f"Combiner Response: {resp.text}")
    
    # We expect a 400 bad request due to missing files, which proves the route is wired correctly and checks files.
    if resp.status_code == 400:
        print("Success: Combiner endpoint is wired and validating input files correctly.")
    else:
        print("Warning: Combiner endpoint returned unexpected status.")

    print("\n2. Testing /api/models/loras Endpoint...")
    resp = requests.get(f"{BASE_URL}/api/models/loras")
    print(f"LoRAs Status Code: {resp.status_code}")
    if resp.status_code == 200:
        print(f"LoRAs List: {resp.json().get('loras', [])[:5]}... (total {len(resp.json().get('loras', []))} found)")
        print("Success: LoRAs endpoint is working.")
    else:
        print("Error: LoRAs endpoint failed.")

if __name__ == "__main__":
    test_endpoints()
