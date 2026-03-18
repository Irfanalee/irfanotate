# DataForge

A universal data annotation platform for machine learning. Import your data — images, text, audio, or video — define a labeling schema, annotate with AI assistance, and export to any ML framework.

DataForge ships as a local-first tool you run on your own machine. No cloud account required, no data leaves your computer.

## What it does

DataForge takes a folder of raw data, helps you (and Claude) annotate it with structured labels, and exports training-ready datasets in formats like COCO, YOLO, HuggingFace, TFRecord, and more.

**Image annotation** — bounding boxes, polygons, segmentation masks, keypoints, and whole-image classification. Includes OCR for document workflows.

**Text annotation** — named entity recognition (NER), text classification, sentiment labeling, relation extraction, and Q&A pair creation.

**Audio annotation** — waveform-based segment labeling, speaker diarization, and transcription editing with Whisper auto-transcription.

**Video annotation** — frame-by-frame object annotation with tracking interpolation between keyframes, temporal segment labeling.

**AI-powered** — Claude auto-annotates your data using your schema and a few human examples. Active learning surfaces only the uncertain cases for human review, so you label less and ship faster.

## Features

- **Schema-driven projects** — Define your own labels, colors, keyboard shortcuts, and per-label attributes. No hardcoded field types.
- **Project templates** — Start instantly with pre-built schemas for invoice extraction, COCO object detection, document layout, NER, medical imaging, and more.
- **Auto OCR** — EasyOCR runs on document images automatically, overlaying detected text as interactive bounding boxes.
- **Claude auto-annotation** — AI labels your data using few-shot examples from your own annotations. Adapts to any schema.
- **Active learning** — AI confidence scoring prioritizes the hardest samples for human review. You only touch what matters.
- **Universal export** — COCO, YOLO, Pascal VOC, HuggingFace, TFRecord, Label Studio, CVAT, CreateML, CoNLL, Claude fine-tuning JSONL, Datumaro, and custom schemas.
- **Dataset splitting** — Random, stratified, or grouped train/val/test splits built into the export flow.
- **Pipeline builder** — A Claude skill that scaffolds entire annotation-to-training workflows from a natural language description.
- **Quality auditor** — Checks for labeling inconsistencies, missing annotations, class imbalance, and generates quality reports.
- **Full canvas tools** — Draw, select, resize, polygon, brush, keypoint, and magic-wand tools with zoom, pan, and keyboard shortcuts.
- **Undo/redo** — Full history stack for all annotation actions.
- **Auto-save** — Annotations save automatically when navigating between items.

## Tech Stack

- **Frontend**: React 18, TypeScript (strict), Vite, Tailwind CSS, Zustand
- **Backend**: FastAPI, SQLAlchemy 2.0, Pydantic v2, Python 3.12+
- **Database**: SQLite (local) / PostgreSQL (cloud)
- **OCR**: EasyOCR (local, GPU optional)
- **AI**: Anthropic Claude API (schema-driven prompts)
- **Audio**: wavesurfer.js (frontend), Whisper (transcription)
- **Video**: OpenCV / FFmpeg (frame extraction)

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

API runs at `http://localhost:8000`

First install downloads EasyOCR + PyTorch (~800 MB). First OCR run per session takes 5–15 seconds to load the model; subsequent runs are 1–3 seconds.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

UI runs at `http://localhost:5173`

### Docker (full stack)

```bash
docker-compose -f docker-compose.local.yml up
```

## How It Works

### 1. Create a project

Choose your data type (image, text, audio, video) and annotation type (bounding box, polygon, NER, classification, etc.). Pick a template or define your own label schema with names, colors, shortcuts, and attributes.

### 2. Import data

Upload files through the UI or point to a folder on disk. Supported formats: JPG, PNG, BMP, TIFF, WebP (images), TXT, CSV, JSON, JSONL (text), WAV, MP3, FLAC (audio), MP4, AVI, MOV (video).

### 3. Annotate

Open any item and start labeling. Use the toolbar to switch between annotation tools (bbox, polygon, brush, keypoint, select). Click or draw to create annotations, then assign a label from your schema. Keyboard shortcuts (1–9) assign labels instantly.

For document images, OCR runs automatically and overlays detected text regions. Click a region to assign its label.

### 4. Let AI help

Run Claude auto-annotation on your project. It reads your schema, loads a few human-annotated examples for context, and labels the rest. Low-confidence items are queued for human review — you only fix the hard cases.

### 5. Export

Choose a format (COCO, YOLO, HuggingFace, etc.), configure your train/val/test split, and export. The dataset is ready for training.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `S` | Select mode |
| `D` | Draw box mode |
| `P` | Polygon mode |
| `B` | Brush (segmentation) mode |
| `K` | Keypoint mode |
| `G` | Group selected boxes (line item) |
| `1`–`9` | Assign label by shortcut |
| `Delete` / `Backspace` | Delete selected annotation(s) |
| `Escape` | Clear selection |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+S` | Save |
| `← →` | Previous / next item (auto-saves) |
| `Ctrl+Scroll` | Zoom in / out |
| `Scroll` | Pan |
| `Middle mouse drag` | Pan |

## Project Structure

```
dataforge/
├── CLAUDE.md                    # Project briefing for Claude
├── .claude/
│   ├── skills/                  # Dev workflow skills
│   └── settings.json
├── docs/
│   ├── architecture.md          # System design decisions
│   ├── annotation-format.md     # Universal annotation spec
│   ├── schema-system.md         # Project schema reference
│   ├── export-formats.md        # Export format details
│   ├── ai-pipeline.md           # AI annotation architecture
│   ├── runbooks.md              # Operational procedures
│   └── team-decisions.md        # ADRs and trade-offs
├── backend/
│   ├── CLAUDE.md
│   ├── app/
│   │   ├── main.py              # FastAPI app + CORS + startup
│   │   ├── config.py            # Settings via environment variables
│   │   ├── database.py          # SQLAlchemy engine + session
│   │   ├── models/              # ORM models (Project, ImageRecord, etc.)
│   │   ├── schemas/             # Pydantic request/response models
│   │   ├── routers/             # API endpoints
│   │   ├── services/            # Business logic layer
│   │   ├── exporters/           # Export format implementations
│   │   ├── ai/                  # Claude prompt templates + parsers
│   │   └── storage/             # Storage backend abstraction
│   ├── migrations/              # Alembic database migrations
│   ├── tests/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── run.py
├── frontend/
│   ├── CLAUDE.md
│   ├── src/
│   │   ├── components/
│   │   │   ├── core/            # Shared UI primitives
│   │   │   ├── project/         # Project dashboard + wizard
│   │   │   ├── annotators/      # Image, text, audio, video annotators
│   │   │   ├── ai/              # Auto-annotation controls
│   │   │   ├── export/          # Export wizard + format selector
│   │   │   └── analytics/       # Stats + quality dashboard
│   │   ├── stores/              # Zustand state management
│   │   ├── api/                 # Backend API client layer
│   │   ├── hooks/               # Custom React hooks
│   │   └── types/               # TypeScript type definitions
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── claude-skills/
│   ├── dataforge-annotator/     # AI auto-annotation skill
│   ├── dataforge-pipeline/      # Project scaffolding skill
│   └── dataforge-quality/       # Quality audit skill
├── dataset/                     # Default data directory
│   ├── images/
│   ├── annotations/
│   ├── ocr/
│   └── exports/
├── docker-compose.yml
├── docker-compose.local.yml
└── .env.example
```

## API Endpoints

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects` | Create project with schema |
| GET | `/api/projects` | List all projects |
| GET | `/api/projects/{id}` | Get project details + schema |
| PATCH | `/api/projects/{id}` | Update schema or settings |
| DELETE | `/api/projects/{id}` | Archive project |
| POST | `/api/projects/{id}/import` | Import data folder into project |

### Data Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/images/` | List data items with status |
| GET | `/api/images/{filename}` | Serve data file |
| POST | `/api/images/upload` | Upload files |
| DELETE | `/api/images/{filename}` | Delete item + OCR + annotations |

### Annotations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/annotations/{filename}` | Load annotations for item |
| POST | `/api/annotations/{filename}` | Save annotations |
| DELETE | `/api/annotations/{filename}` | Delete annotations |

### OCR

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ocr/{filename}` | Get cached OCR result |
| POST | `/api/ocr/{filename}` | Run OCR (or return cache) |

### AI

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/auto-annotate` | Run AI annotation (SSE stream) |

### Export

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/export/formats` | List available export formats |
| POST | `/api/export/{format}` | Generate export |
| GET | `/api/export/download/{format}` | Download exported dataset |

## Export Formats

| Format | Use Case |
|--------|----------|
| COCO JSON | Object detection, segmentation, keypoints |
| YOLO | YOLOv5/v8/v9 training |
| Pascal VOC | Classic object detection pipelines |
| HuggingFace | Any HuggingFace model or Hub upload |
| TFRecord | TensorFlow / Keras training |
| Label Studio | Import into Label Studio |
| CVAT | Import into CVAT |
| CreateML | Apple Core ML training |
| CoNLL | NER model training |
| JSONL (Claude) | Claude / LLM fine-tuning |
| Datumaro | Intel format, universal converter |
| Custom | User-defined template-based export |

## Claude Skills

DataForge includes three Claude skills that can be installed into Claude Code:

**dataforge-annotator** — Auto-annotates your data using Claude's vision and language capabilities. Reads the project schema, loads human examples for few-shot learning, and labels items with confidence scores. Supports active learning to minimize manual review.

**dataforge-pipeline** — Scaffolds entire annotation projects from a natural language description. Analyzes sample data, suggests a schema, creates the project, and generates training scripts and Dockerfiles for popular frameworks (YOLOv8, Detectron2, HuggingFace Transformers).

**dataforge-quality** — Audits annotation quality across a project. Checks for inconsistent labeling, missing annotations, bbox quality issues, class imbalance, and generates an HTML report with actionable fix suggestions.

Install by copying the skill folders to `~/.claude/skills/`.

## Roadmap

See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for the full 8-phase build plan.

- **Phase 1–2**: Generalize core + text annotation (schema-driven projects, polygon tools, NER)
- **Phase 3**: Audio and video annotation modules
- **Phase 4**: AI pipeline (generalized auto-annotation, active learning, pipeline builder)
- **Phase 5**: Universal export engine (12+ formats, custom schemas, dataset splitting)
- **Phase 6**: Frontend redesign (distinctive UI, undo/redo, review mode, analytics)
- **Phase 7–8**: Cloud-ready architecture (PostgreSQL, S3, teams, Docker) + packaged Claude skills

## License

MIT
