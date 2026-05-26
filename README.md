# Ultimate Music Video Creator v1

> *Where Music Meets Cinema*

A portable desktop app that transforms text, audio, and images into cinematic music videos — powered by ComfyUI, ACE Step 1.5, LTX Video, and SuperGemma AI.

## Features

### 7 Creative Modes

| Mode | What It Does |
|------|-------------|
| **🎵 Text→Audio** | Generate full songs from text + lyrics using ACE Step 1.5 |
| **🎤 Audio Cover** | Transform any song into an AI-powered cover with stem separation |
| **🗣️ TTS Voiceover** | Text-to-Speech with multilingual support (Hindi, Tamil, Bengali, +60 more) |
| **🎬 Prompt Creator** | Convert lyrics into per-segment cinematic visual concepts |
| **🖼️ Image→Video** | Generate video clips from images + concept prompts using LTXV |
| **📝 Text→Video** | Generate video clips from text prompts with camera motion control |
| **⚡ Full Pipeline** | One-click: Theme → Lyrics → Audio → Concepts → Video → Final |

### Indian Language Support

Full multilingual support for audio generation and transcription:
- **Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Urdu, Kannada, Malayalam, Punjabi**
- ACE Audio: hi, bn, ta, te, pa, ur, ne, sa + 50+ languages
- Fish Speech TTS: hi, bn, ta, te, kn, ml, ur + 60+ languages
- Whisper transcription: all major Indian languages supported

### AI Models Used

| Model | Purpose | Source |
|-------|---------|--------|
| ACE Step 1.5 Turbo | Text-to-audio & audio cover generation | ryanonyheinside nodes |
| SuperGemma 26B GGUF | Lyrics generation & visual concept creation | VRGDG nodes |
| LTX 2.3 22B | Image-to-video & text-to-video generation | ComfyUI-LTXVideo |
| Fish Speech S2 | Multilingual text-to-speech | Fish Audio |
| Gemma4 CLIP | Audio lyric transcription | ryanonyheinside nodes |

## Quick Start

### Prerequisites
- Windows 10/11
- Existing ComfyUI installation with models and custom nodes
- Python 3.10+
- Node.js 18+

### First Time Setup

1. **Double-click `setup.bat`**
   - Detects your existing ComfyUI installation
   - Creates directory junctions (no file duplication)
   - Installs Python and Node.js dependencies
   - Creates input/output directories

2. **Double-click `LAUNCH.bat`**
   - Starts ComfyUI (if not already running)
   - Starts the FastAPI backend server
   - Starts the Next.js frontend
   - Opens the app in your browser

3. **Or use `LAUNCH.vbs`** for silent background launch (no console window)

### Architecture

```
Ultimate Music Video Creator v1/
├── LAUNCH.bat              ← One-click launcher
├── LAUNCH.vbs              ← Silent launcher
├── setup.bat               ← First-time setup
├── config.json             ← App configuration
│
├── workflows/              ← 4 ComfyUI workflow JSONs
│   ├── ace_audio_cover.json     # ACE audio generation
│   ├── prompt_creator.json      # VRGDG prompt generation
│   ├── i2v.json                 # LTXV image-to-video
│   └── t2v.json                 # LTXV text-to-video
│
├── app/                    ← Python FastAPI backend
│   ├── main.py                  # API entry point
│   ├── modules/
│   │   ├── comfy_api.py         # ComfyUI HTTP client
│   │   ├── workflow_editor.py   # Workflow parameter injection
│   │   ├── pipeline.py          # Pipeline orchestrator
│   │   └── input_manager.py     # VRGDG text file manager
│   └── requirements.txt
│
├── frontend/               ← Next.js cinematic UI
│   ├── pages/index.js           # Main app with 7 sections
│   ├── components/              # UI components
│   ├── styles/globals.css       # Arcane-themed styles
│   └── lib/api.js               # API client
│
├── input/                  ← VRGDG text file directories
├── output/                 ← Generated content
└── comfyui/               ← Portable ComfyUI (linked via junction)
```

## API Reference

### Backend Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health + ComfyUI connection status |
| GET | `/api/status` | ComfyUI queue status |
| POST | `/api/generate` | Start a generation job |
| GET | `/api/jobs/{prompt_id}` | Job status and result |
| GET | `/api/outputs` | List generated files |
| GET | `/api/workflows` | List available workflows |

### Generation Modes

```
POST /api/generate
{
  "mode": "text2audio" | "audio_cover" | "tts" | "prompt_creator" | "i2v" | "t2v" | "full_pipeline",
  "params": { ... }
}
```

## Tech Stack

- **Backend:** Python, FastAPI, uvicorn
- **Frontend:** Next.js, React, TailwindCSS, Framer Motion
- **AI Engine:** ComfyUI API
- **Audio Models:** ACE Step 1.5, Fish Speech S2
- **Video Models:** LTX 2.3
- **LLM:** SuperGemma 26B GGUF, Gemma4

## Credits

- ComfyUI by comfyanonymous
- ACE Step 1.5 by ryanOntheInside
- VRGDG custom nodes by VRGameDevGirl
- LTX Video by Lightricks
- Fish Speech by Fish Audio

---

*Built with ❤️ for creators who dream in neon.*
