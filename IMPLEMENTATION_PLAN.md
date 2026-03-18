# DataForge — Universal Data Annotation Platform
## Implementation Plan

**Current state:** Invoice-specific annotation tool (FastAPI + React/TS + EasyOCR + Claude)
**Target state:** Industry-grade, multi-modal annotation platform for ML training data

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DataForge Platform                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Image      │  │    Text      │  │  Audio/Video │              │
│  │  Annotator   │  │  Annotator   │  │  Annotator   │              │
│  │             │  │              │  │              │              │
│  │ • Bbox      │  │ • NER spans  │  │ • Segments   │              │
│  │ • Polygon   │  │ • Relations  │  │ • Timestamps │              │
│  │ • Segment   │  │ • Classify   │  │ • Classify   │              │
│  │ • Keypoint  │  │ • Sentiment  │  │ • Transcribe │              │
│  │ • Classify  │  │ • Q&A pairs  │  │ • Events     │              │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                │                  │                       │
│  ┌──────▼────────────────▼──────────────────▼───────┐              │
│  │              Unified Annotation Engine            │              │
│  │    (Project schemas, label configs, validators)   │              │
│  └──────────────────────┬───────────────────────────┘              │
│                         │                                           │
│  ┌──────────────────────▼───────────────────────────┐              │
│  │                   Core Services                   │              │
│  │  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌────────┐ │              │
│  │  │ Project │ │   AI     │ │ Export │ │  OCR   │ │              │
│  │  │ Manager │ │ Pipeline │ │ Engine │ │ Engine │ │              │
│  │  └─────────┘ └──────────┘ └────────┘ └────────┘ │              │
│  └──────────────────────┬───────────────────────────┘              │
│                         │                                           │
│  ┌──────────────────────▼───────────────────────────┐              │
│  │              Storage & Data Layer                 │              │
│  │  SQLite (local) → PostgreSQL (cloud)              │              │
│  │  File-based annotations → Object storage (cloud)  │              │
│  └──────────────────────────────────────────────────┘              │
│                                                                     │
│  ┌──────────────────────────────────────────────────┐              │
│  │              Claude Skills Layer                  │              │
│  │  • Auto-Annotator Skill (vision + NER + audio)   │              │
│  │  • Pipeline Builder Skill (project scaffolding)  │              │
│  │  • Quality Auditor Skill (consistency checks)    │              │
│  └──────────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1 — Generalize the Core (Weeks 1–3)

**Goal:** Transform the invoice-specific tool into a schema-driven, multi-purpose image annotation platform.

### 1.1 — Dynamic Project & Schema System

**Problem:** Field types (`invoice_number`, `description`, etc.), colors, and label categories are all hardcoded across 6+ files.

**Solution:** Introduce a **Project** abstraction with user-defined schemas.

#### Backend Changes

**New model: `Project`**
```python
# backend/app/models.py
class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    data_type = Column(String, nullable=False)       # "image" | "text" | "audio" | "video"
    annotation_type = Column(String, nullable=False)  # "bbox" | "polygon" | "segmentation" | "ner" | "classification" | etc.
    schema = Column(JSON, nullable=False)             # Label definitions (see below)
    settings = Column(JSON, default=dict)             # Project-specific settings
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # relationships
    images = relationship("ImageRecord", back_populates="project")
```

**Schema definition format:**
```json
{
  "labels": [
    {
      "name": "person",
      "color": "#FF6B6B",
      "shortcut": "1",
      "group": "object",
      "attributes": [
        { "name": "occluded", "type": "boolean" },
        { "name": "pose", "type": "enum", "options": ["standing", "sitting", "lying"] }
      ]
    },
    {
      "name": "car",
      "color": "#4ECDC4",
      "shortcut": "2",
      "group": "object"
    }
  ],
  "label_groups": ["object", "background", "meta"],
  "annotation_config": {
    "allow_overlapping": true,
    "require_attributes": false,
    "min_bbox_size": 10
  }
}
```

**New router: `/api/projects`**
```
POST   /api/projects              — Create project with schema
GET    /api/projects              — List projects
GET    /api/projects/{id}         — Get project details + schema
PATCH  /api/projects/{id}         — Update schema/settings
DELETE /api/projects/{id}         — Archive project
POST   /api/projects/{id}/import  — Import folder of data into project
```

**Modify `ImageRecord`:**
```python
class ImageRecord(Base):
    # ... existing fields ...
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    project = relationship("Project", back_populates="images")
```

#### Frontend Changes

**New pages/flows:**
- **Project Dashboard** (`/`) — Grid of project cards with stats
- **New Project Wizard** (`/projects/new`) — Step-by-step project creation
  - Step 1: Name + data type (image/text/audio/video)
  - Step 2: Annotation type (bbox/polygon/segmentation/NER/classification)
  - Step 3: Define labels (name, color, shortcut, attributes)
  - Step 4: Import data source (folder path or upload)
- **Project Workspace** (`/projects/{id}`) — The annotation interface (current app, made generic)

**Replace hardcoded types:**
- `types/index.ts`: Replace `FieldType`, `HeaderFieldType`, `LineItemFieldType` with a dynamic `Label` type loaded from the project schema
- `FIELD_COLORS`: Replaced by colors from schema
- `invoiceStore.ts` → `annotationStore.ts`: Generic labeled boxes, no more invoice-specific header/line-item logic

**New store: `projectStore.ts`**
```typescript
interface ProjectStore {
  projects: Project[]
  currentProject: Project | null
  labels: Label[]           // derived from schema
  labelGroups: string[]
  fetchProjects: () => Promise<void>
  setCurrentProject: (id: string) => Promise<void>
  createProject: (data: CreateProjectRequest) => Promise<Project>
}
```

### 1.2 — Enhanced Image Annotation Types

**Problem:** Only bounding boxes are supported.

**Solution:** Add polygon, segmentation, keypoint, and classification tools.

#### Canvas Enhancements

**New tool modes:**
```typescript
type ToolMode =
  | 'select'
  | 'bbox'           // existing draw mode renamed
  | 'polygon'        // click-to-place vertices, close to finish
  | 'brush'          // paint segmentation masks
  | 'eraser'         // erase segmentation
  | 'keypoint'       // click to place named keypoints
  | 'magic_wand'     // AI-assisted selection (SAM integration)
```

**Annotation geometry types:**
```typescript
type Geometry =
  | { type: 'bbox'; bbox: [number, number, number, number] }
  | { type: 'polygon'; points: [number, number][] }
  | { type: 'mask'; rle: string; width: number; height: number }  // run-length encoded
  | { type: 'keypoints'; points: { name: string; x: number; y: number; visible: boolean }[] }
  | { type: 'classification' }  // whole-image label, no geometry
```

**Updated annotation model:**
```typescript
interface Annotation {
  id: string
  label: string           // from project schema
  geometry: Geometry
  attributes: Record<string, any>   // from label attribute definitions
  text?: string           // OCR text if applicable
  confidence?: number     // AI-predicted confidence
  created_by: 'human' | 'ai' | 'ocr'
  reviewed: boolean
}
```

#### Backend: SAM Integration (Optional, Phase 1.5)

For magic-wand / smart-select:
```python
# backend/app/routers/segmentation.py
@router.post("/{project_id}/segment")
async def segment_image(project_id: str, request: SegmentRequest):
    """Run SAM (Segment Anything Model) on click point or bbox."""
    # Uses lightweight SAM (mobile_sam or FastSAM) locally
    # Returns polygon or mask for the selected region
```

### 1.3 — Refactored Annotation Storage

**Problem:** Annotations stored as invoice-specific JSON. Not extensible.

**New universal format:**
```json
{
  "version": "2.0",
  "project_id": "proj_abc123",
  "document_id": "img_001",
  "source_path": "images/photo_001.jpg",
  "metadata": {
    "width": 1920,
    "height": 1080,
    "ocr_engine": "easyocr",
    "ocr_ran_at": "2026-03-18T10:00:00Z"
  },
  "annotations": [
    {
      "id": "ann_0",
      "label": "person",
      "geometry": { "type": "bbox", "bbox": [100, 200, 300, 500] },
      "attributes": { "occluded": false, "pose": "standing" },
      "text": null,
      "confidence": null,
      "created_by": "human",
      "reviewed": true
    }
  ],
  "relations": [
    { "from": "ann_0", "to": "ann_3", "type": "contains" }
  ]
}
```

**Migration:** Write a one-time script to convert existing invoice annotations to the new format.

### 1.4 — Schema Templates (Quick Start)

Pre-built templates so users can start annotating in seconds:

| Template | Data Type | Annotation Type | Labels |
|----------|-----------|-----------------|--------|
| Invoice Extraction | Image | Bbox | invoice_number, date, vendor, line items... (your current schema) |
| Object Detection (COCO) | Image | Bbox | 80 COCO categories |
| Face Detection | Image | Bbox + Keypoints | face, left_eye, right_eye, nose, mouth |
| Document Layout | Image | Bbox | title, paragraph, table, figure, header, footer |
| Satellite/Aerial | Image | Polygon + Segmentation | building, road, vegetation, water |
| Medical Imaging | Image | Polygon | tumor, organ, anomaly (customizable) |
| Scene Classification | Image | Classification | indoor, outdoor, urban, rural... |
| Custom | Any | Any | User-defined |

---

## Phase 2 — Text Annotation Module (Weeks 4–5)

**Goal:** Add NER, text classification, relation extraction, and Q&A annotation.

### 2.1 — Text Annotator Component

**New component: `TextAnnotator.tsx`**

Unlike the canvas-based image annotator, text annotation uses an inline HTML renderer:

```
┌─────────────────────────────────────────────────────────────┐
│  The patient John Smith visited Dr. Williams on March 15    │
│            ──────────          ────────────   ────────       │
│            PERSON              PERSON         DATE           │
│                                                              │
│  for treatment of chronic back pain at Memorial Hospital.    │
│                     ─────────────────    ─────────────────   │
│                     CONDITION            ORGANIZATION        │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Click-drag to select text spans → assign entity label
- Overlapping/nested entity support
- Relation arrows between entities (drag from entity A to entity B)
- Token-level or character-level selection modes
- Keyboard shortcuts for common labels (1-9)

**Data model:**
```typescript
interface TextAnnotation {
  id: string
  label: string
  start_offset: number    // character offset
  end_offset: number
  text: string            // the selected text
  attributes: Record<string, any>
}

interface TextRelation {
  id: string
  from_id: string
  to_id: string
  relation_type: string   // "treats", "located_at", "works_for", etc.
}
```

### 2.2 — Text Data Ingestion

**Supported inputs:**
- Plain text files (.txt)
- CSV/TSV (annotate specific columns)
- JSON/JSONL (configurable text field)
- PDF text extraction (via existing PDF pipeline)
- Pre-tokenized formats (CoNLL, BIO)

**Backend router: `/api/text`**
```
POST /api/projects/{id}/text/upload     — Upload text files
GET  /api/projects/{id}/text/{doc_id}   — Get document with annotations
POST /api/projects/{id}/text/{doc_id}   — Save text annotations
```

### 2.3 — Text Schema Templates

| Template | Labels | Relations |
|----------|--------|-----------|
| NER (General) | PERSON, ORG, LOC, DATE, MONEY, MISC | — |
| NER (Medical) | DISEASE, DRUG, SYMPTOM, PROCEDURE, ANATOMY | treats, causes, contraindicated |
| NER (Legal) | PARTY, CLAUSE, DATE, JURISDICTION, AMOUNT | references, amends, supersedes |
| Sentiment | POSITIVE, NEGATIVE, NEUTRAL | — |
| Intent Classification | QUESTION, COMMAND, STATEMENT, REQUEST | — |
| Q&A Pairs | QUESTION, ANSWER, CONTEXT | answers, references |

---

## Phase 3 — Audio & Video Annotation (Weeks 6–8)

### 3.1 — Audio Annotator

**New component: `AudioAnnotator.tsx`**

```
┌──────────────────────────────────────────────────────────────┐
│  ▁▂▃▅▇█▇▅▃▂▁▁▂▅▇███▇▅▂▁▁▂▃▅▇█▇▅▃▂▁                       │
│  │  Speech  │ Silence │  Music  │ Speech │                    │
│  0:00       0:15      0:22      0:45     1:02                 │
│                                                                │
│  ▶  ■  ◀◀  ▶▶    Speed: 1x    🔊 ──●──── 80%                │
│                                                                │
│  Segments:                                                     │
│  [0:00 - 0:15] Speech — "Hello, welcome to..."  SPEAKER_1     │
│  [0:15 - 0:22] Silence                                         │
│  [0:22 - 0:45] Music — Background                              │
│  [0:45 - 1:02] Speech — "Today we'll discuss..." SPEAKER_2    │
└──────────────────────────────────────────────────────────────┘
```

**Features:**
- Waveform visualization (wavesurfer.js)
- Click-drag on waveform to create time segments
- Label segments with categories (speech, music, noise, silence)
- Speaker diarization labels
- Transcription editing per segment
- Playback controls with speed adjustment

**Backend:**
- Audio processing via `librosa` or `pydub`
- Whisper integration for auto-transcription
- Waveform data pre-computation for fast rendering

### 3.2 — Video Annotator

**New component: `VideoAnnotator.tsx`**

**Features:**
- Frame-by-frame navigation with timeline
- Bbox/polygon annotation per frame
- Object tracking across frames (interpolation between keyframes)
- Temporal segment labeling (action recognition)
- Thumbnail strip for quick navigation

**Implementation approach:**
- Extract frames server-side at configurable FPS
- Reuse the image canvas annotator per frame
- Track annotations include `frame_start`, `frame_end`, `interpolation_method`
- Keyframe-based: annotate every Nth frame, interpolate between

**Backend:**
- Frame extraction via `opencv-python` or `ffmpeg`
- Pre-computed frame thumbnails for timeline
- Efficient frame serving (seek to frame, return JPEG)

---

## Phase 4 — AI-Powered Annotation Pipeline (Weeks 9–11)

### 4.1 — Claude Auto-Annotator Skill (Generalized)

**Problem:** Current `claude.py` has a hardcoded invoice-specific prompt.

**Solution:** A generalized AI annotation engine that adapts to any project schema.

**Skill architecture:**
```
claude-skills/
└── auto-annotator/
    ├── SKILL.md                 # Skill definition + instructions
    ├── prompts/
    │   ├── image_bbox.py        # Prompt templates for image bbox
    │   ├── image_polygon.py     # Prompt templates for polygon
    │   ├── image_classify.py    # Prompt templates for classification
    │   ├── text_ner.py          # Prompt templates for NER
    │   ├── text_classify.py     # Prompt templates for text classification
    │   └── base.py              # Shared prompt logic
    ├── strategies/
    │   ├── few_shot.py          # Few-shot from existing annotations
    │   ├── zero_shot.py         # Zero-shot from schema descriptions
    │   └── active_learning.py   # Prioritize uncertain samples
    └── parsers/
        ├── bbox_parser.py       # Parse Claude bbox responses
        ├── ner_parser.py        # Parse Claude NER responses
        └── classification_parser.py
```

**Dynamic prompt generation:**
```python
def build_annotation_prompt(project: Project, examples: list[Annotation]) -> str:
    """Generate a Claude prompt from the project schema + examples."""
    schema = project.schema
    labels_desc = "\n".join(
        f"- {l['name']}: {l.get('description', 'No description')}"
        for l in schema['labels']
    )

    prompt = f"""You are annotating {project.data_type} data for the project "{project.name}".

Task: {project.annotation_type} annotation

Available labels:
{labels_desc}

Rules:
- Only use the labels listed above
- Return annotations as a JSON array
- Each annotation must include: label, geometry (type + coordinates), and any required attributes
{schema.get('annotation_config', {}).get('custom_instructions', '')}
"""

    if examples:
        prompt += "\n\nHere are example annotations for reference:\n"
        for ex in examples[:5]:
            prompt += f"\n{json.dumps(ex, indent=2)}"

    return prompt
```

**SSE streaming (enhanced):**
```
Event types:
- project_start    { total_items: 150 }
- item_start       { item_id: "img_042", index: 23 }
- item_complete    { item_id: "img_042", annotations: 8, confidence_avg: 0.87 }
- item_skipped     { item_id: "img_042", reason: "already_annotated" }
- item_error       { item_id: "img_042", error: "API rate limit" }
- batch_progress   { completed: 23, total: 150, eta_seconds: 340 }
- project_complete { annotated: 142, skipped: 5, errors: 3 }
```

### 4.2 — Pipeline Builder Skill

A Claude skill that scaffolds entire annotation projects:

```
claude-skills/
└── pipeline-builder/
    ├── SKILL.md
    ├── templates/
    │   ├── object_detection.json    # Pre-configured project schemas
    │   ├── document_extraction.json
    │   ├── ner_medical.json
    │   └── ...
    ├── analyzers/
    │   ├── data_analyzer.py         # Analyze uploaded data, suggest schema
    │   └── format_detector.py       # Detect existing annotation formats
    └── generators/
        ├── training_script.py       # Generate model training code
        ├── evaluation_script.py     # Generate evaluation pipelines
        └── dockerfile.py            # Generate Docker training environments
```

**User interaction flow:**
```
User: "I have 5000 photos of street scenes. I want to train a model
       to detect cars, pedestrians, and traffic signs."

Pipeline Builder Skill:
1. Analyzes sample images
2. Suggests schema: bbox annotation, 3 labels, COCO-compatible
3. Creates project with pre-configured schema
4. Estimates annotation time (manual vs AI-assisted)
5. Generates export configuration for YOLO + COCO
6. Optionally generates a training script (YOLOv8 or Detectron2)
```

### 4.3 — Quality Auditor

Runs post-annotation to catch issues:

**Checks:**
- Missing labels on images that clearly contain objects
- Inconsistent labeling (same object labeled differently across images)
- Bbox quality (too tight, too loose, aspect ratio anomalies)
- Label distribution imbalance warnings
- Annotation coverage (% of dataset annotated)
- Inter-annotator agreement (if multiple annotators)

**Output:** HTML report + actionable fix suggestions

### 4.4 — Active Learning Loop

Instead of annotating randomly, prioritize the most informative samples:

```
1. Auto-annotate a batch with Claude
2. Score each annotation by confidence
3. Surface low-confidence items for human review
4. Human corrects → feeds back as few-shot examples
5. Re-run on remaining items with improved examples
6. Repeat until quality threshold met
```

This dramatically reduces the human effort needed — users only review the hard cases.

---

## Phase 5 — Universal Export Engine (Weeks 12–13)

### 5.1 — Export Format Registry

**Architecture:**
```python
# backend/app/exporters/registry.py
class ExporterRegistry:
    _exporters: dict[str, BaseExporter] = {}

    @classmethod
    def register(cls, format_name: str, exporter: BaseExporter):
        cls._exporters[format_name] = exporter

    @classmethod
    def export(cls, format_name: str, project: Project, annotations: list) -> Path:
        return cls._exporters[format_name].export(project, annotations)
```

### 5.2 — Supported Formats

| Format | Use Case | Output Structure |
|--------|----------|------------------|
| **COCO JSON** | Object detection, segmentation, keypoints | `annotations.json` + `images/` |
| **YOLO** | YOLOv5/v8 training | `labels/*.txt` + `images/` + `data.yaml` |
| **Pascal VOC** | Classic object detection | `Annotations/*.xml` + `JPEGImages/` |
| **HuggingFace** | Any HF-compatible model | `dataset_dict/` with Arrow files |
| **TFRecord** | TensorFlow training | `.tfrecord` files + `label_map.pbtxt` |
| **Label Studio** | Import into Label Studio | `tasks.json` |
| **CVAT** | Import into CVAT | `annotations.xml` |
| **CreateML** | Apple Core ML training | `annotations.json` (Apple format) |
| **CoNLL** | NER model training | `train.conll` + `dev.conll` |
| **JSONL (Claude fine-tune)** | Claude/LLM fine-tuning | `train.jsonl` with messages format |
| **Datumaro** | Intel format, converts to anything | Datumaro dataset directory |
| **Custom Schema** | User-defined | JSON/CSV/XML per user template |

### 5.3 — Custom Export Schemas

Users can define their own export format via a template:

```json
{
  "format_name": "my_custom_format",
  "file_type": "jsonl",
  "template": {
    "image_file": "{{source_path}}",
    "objects": "{{#each annotations}}{ \"class\": \"{{label}}\", \"box\": {{geometry.bbox}} }{{/each}}"
  }
}
```

### 5.4 — Dataset Splitting

Built-in train/val/test splitting:
- Random split (configurable ratios, e.g., 70/20/10)
- Stratified split (balanced label distribution)
- Group split (keep related images together)
- Custom split (user assigns split manually)

---

## Phase 6 — Frontend Redesign (Weeks 14–16)

### 6.1 — Design Direction (Using Frontend Design Skill)

Apply the frontend-design skill principles to create a distinctive, professional annotation UI.

**Aesthetic direction:** Industrial precision meets creative tooling — think Figma's clean utility crossed with a professional color grading suite. Dark theme by default with sharp accent colors. Dense but breathable.

**Design tokens:**
- **Typography:** JetBrains Mono for labels/data, Plus Jakarta Sans for UI text
- **Colors:** Dark slate base (#0F1419), electric blue primary (#3B82F6), success green (#10B981), warning amber (#F59E0B), each label gets a vivid, saturated color
- **Motion:** Snappy 150ms transitions, staggered panel loads, smooth canvas zoom
- **Layout:** Three-panel (sidebar + canvas/annotator + properties panel), resizable via drag handles

### 6.2 — New Page Structure

```
/                               → Project dashboard (grid of project cards)
/projects/new                   → New project wizard
/projects/{id}                  → Project workspace
/projects/{id}/settings         → Project schema & settings editor
/projects/{id}/export           → Export configuration & download
/projects/{id}/analytics        → Annotation stats & quality dashboard
/projects/{id}/ai               → AI auto-annotation controls
```

### 6.3 — Component Architecture

```
src/
├── components/
│   ├── core/                    # Shared UI primitives
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   ├── Dropdown.tsx
│   │   ├── Tooltip.tsx
│   │   ├── Tabs.tsx
│   │   └── ResizablePanel.tsx
│   │
│   ├── project/                 # Project management
│   │   ├── ProjectDashboard.tsx
│   │   ├── ProjectCard.tsx
│   │   ├── ProjectWizard.tsx
│   │   ├── SchemaEditor.tsx     # Visual label/schema builder
│   │   └── ProjectSettings.tsx
│   │
│   ├── annotators/              # Data-type-specific annotators
│   │   ├── image/
│   │   │   ├── ImageAnnotator.tsx       # Orchestrator
│   │   │   ├── AnnotationCanvas.tsx     # Enhanced canvas (refactored)
│   │   │   ├── ToolPalette.tsx          # Bbox/polygon/brush/keypoint tools
│   │   │   ├── LabelSelector.tsx        # Dynamic from schema
│   │   │   └── AttributePanel.tsx       # Per-annotation attributes
│   │   ├── text/
│   │   │   ├── TextAnnotator.tsx        # NER/classification annotator
│   │   │   ├── EntityHighlighter.tsx    # Inline span highlighting
│   │   │   └── RelationEditor.tsx       # Draw relations between entities
│   │   ├── audio/
│   │   │   ├── AudioAnnotator.tsx       # Waveform + segments
│   │   │   ├── WaveformView.tsx         # wavesurfer.js wrapper
│   │   │   └── TranscriptEditor.tsx     # Edit transcriptions
│   │   └── video/
│   │       ├── VideoAnnotator.tsx       # Frame-by-frame + timeline
│   │       ├── FrameCanvas.tsx          # Reuses image canvas per frame
│   │       └── TrackingTimeline.tsx     # Object tracks across frames
│   │
│   ├── ai/                      # AI-assisted features
│   │   ├── AutoAnnotatePanel.tsx        # Controls for AI annotation
│   │   ├── ActiveLearningQueue.tsx      # Review AI suggestions
│   │   ├── ConfidenceOverlay.tsx        # Visual confidence indicators
│   │   └── SuggestionBanner.tsx         # "AI suggests: person (92%)"
│   │
│   ├── export/                  # Export management
│   │   ├── ExportWizard.tsx
│   │   ├── FormatSelector.tsx
│   │   ├── SplitConfigurator.tsx
│   │   └── ExportPreview.tsx    # Preview output structure
│   │
│   └── analytics/               # Stats & quality
│       ├── AnnotationStats.tsx
│       ├── LabelDistribution.tsx
│       ├── ProgressChart.tsx
│       └── QualityReport.tsx
│
├── stores/
│   ├── projectStore.ts          # Projects list, current project
│   ├── annotationStore.ts       # Generic annotations (replaces invoiceStore)
│   ├── canvasStore.ts           # Canvas state (enhanced)
│   ├── imageStore.ts            # Data items list (renamed from imageStore)
│   ├── aiStore.ts               # AI annotation state & progress
│   └── exportStore.ts           # Export configuration state
│
├── api/
│   ├── client.ts                # HTTP client (keep)
│   ├── projects.ts              # Project CRUD
│   ├── annotations.ts           # Generic annotation API (replaces invoice.ts)
│   ├── images.ts                # Image/data management (keep, extend)
│   ├── ocr.ts                   # OCR (keep)
│   ├── ai.ts                    # AI auto-annotation (replaces claude.ts)
│   └── export.ts                # Export operations (extend)
│
├── hooks/
│   ├── useKeyboardShortcuts.ts  # Dynamic from project schema
│   ├── useAutoSave.ts           # Debounced auto-save
│   ├── useAnnotationHistory.ts  # Undo/redo stack
│   └── useHotkeys.ts            # Label shortcut registration
│
└── types/
    ├── project.ts               # Project, Schema, Label types
    ├── annotation.ts            # Geometry, Annotation, Relation types
    ├── export.ts                # Export format types
    └── ai.ts                    # AI pipeline types
```

### 6.4 — Key UX Improvements

**Undo/Redo:** Full history stack for all annotation actions (from your "Future Improvements" list).

**Smart Shortcuts:** Labels are assigned keyboard shortcuts (1-9) dynamically from the schema. Users can customize.

**Annotation Queue:** Configurable item ordering — sequential, random, by AI confidence (active learning), or by custom priority.

**Review Mode:** Side-by-side original vs annotated for QA (from your "Future Improvements" list).

**Batch Operations:** Select multiple items, apply same label, delete, or send to AI.

**Search & Filter:** Filter data items by label count, annotation status, AI confidence, split assignment.

---

## Phase 7 — Cloud-Ready Architecture (Weeks 17–19)

### 7.1 — Database Migration (SQLite → PostgreSQL)

**Strategy:** Use SQLAlchemy's dialect-agnostic ORM. Current code already uses SQLAlchemy, so the migration is mostly connection string + migration tooling.

**Add Alembic** for proper schema migrations (replace the inline ALTER TABLE approach).

### 7.2 — User & Team Model (Prepare for SaaS)

```python
class User(Base):
    id = Column(String, primary_key=True)
    email = Column(String, unique=True)
    name = Column(String)
    role = Column(String)  # admin, manager, annotator, viewer

class Team(Base):
    id = Column(String, primary_key=True)
    name = Column(String)

class ProjectMember(Base):
    project_id = Column(String, ForeignKey("projects.id"))
    user_id = Column(String, ForeignKey("users.id"))
    role = Column(String)  # owner, editor, annotator, viewer
```

**For local mode:** Single implicit user, no auth. All team/user features hidden.

**For cloud mode:** JWT auth, team management, role-based access.

### 7.3 — Storage Abstraction

```python
class StorageBackend(ABC):
    @abstractmethod
    async def save_file(self, path: str, data: bytes) -> str: ...
    @abstractmethod
    async def read_file(self, path: str) -> bytes: ...
    @abstractmethod
    async def list_files(self, prefix: str) -> list[str]: ...
    @abstractmethod
    async def delete_file(self, path: str) -> None: ...

class LocalStorage(StorageBackend):
    """File system storage (current behavior)."""

class S3Storage(StorageBackend):
    """AWS S3 / MinIO storage for cloud deployment."""
```

### 7.4 — Task Queue

Replace the in-memory `_annotate_lock` with a proper job queue:

- **Local:** `asyncio` tasks with SQLite-backed status
- **Cloud:** Celery + Redis (or AWS SQS)

### 7.5 — Deployment Options

| Mode | Database | Storage | Auth | Queue |
|------|----------|---------|------|-------|
| **Local** | SQLite | Filesystem | None | asyncio |
| **Docker** | PostgreSQL | Local volumes | Optional | Celery + Redis |
| **Cloud** | RDS/Cloud SQL | S3/GCS | JWT + OAuth | SQS/Cloud Tasks |

**Docker Compose** for the full stack:
```yaml
services:
  backend:
    build: ./backend
    environment:
      - DATABASE_URL=postgresql://...
      - STORAGE_BACKEND=s3
  frontend:
    build: ./frontend
  redis:
    image: redis:7
  worker:
    build: ./backend
    command: celery worker
  postgres:
    image: postgres:16
```

---

## Phase 8 — Claude Skills Integration (Weeks 20–21)

### 8.1 — Skill Package Structure

Following the pattern from `my-claude-skills`:

```
claude-skills/
├── dataforge-annotator/
│   ├── SKILL.md                    # Auto-annotation skill
│   ├── annotate.py                 # Main entry point
│   ├── prompts/                    # Prompt templates per data type
│   └── parsers/                    # Response parsers
│
├── dataforge-pipeline/
│   ├── SKILL.md                    # Pipeline scaffolding skill
│   ├── scaffold.py                 # Project creation from description
│   ├── templates/                  # Pre-built project templates
│   └── generators/                 # Training script generators
│
└── dataforge-quality/
    ├── SKILL.md                    # Quality audit skill
    ├── audit.py                    # Main auditor
    ├── checks/                     # Individual quality checks
    └── report.py                   # HTML report generator
```

### 8.2 — Skill: dataforge-annotator

**SKILL.md excerpt:**
```markdown
---
name: dataforge-annotator
description: AI-powered auto-annotation for any data type. Reads project
  schema, loads examples, and annotates images/text/audio using Claude vision
  and language capabilities. Supports few-shot learning and active learning.
---

## Capabilities
- Image: bounding box, polygon, classification, keypoint detection
- Text: named entity recognition, classification, relation extraction
- Audio: transcription, speaker diarization, segment classification
- Few-shot: learns from existing human annotations
- Active learning: prioritizes uncertain samples for human review
```

### 8.3 — Skill: dataforge-pipeline

Creates end-to-end annotation-to-training pipelines:

```
User: "I need to train a YOLOv8 model to detect PPE (helmets, vests, gloves)
       in construction site photos. I have 3000 images."

Pipeline Builder:
1. Creates project with schema: bbox, labels=[helmet, vest, gloves, no_ppe]
2. Imports images from specified folder
3. Runs auto-annotation on 100 samples
4. Surfaces 20 low-confidence items for human review
5. After review, re-runs on remaining 2900 images
6. Exports to YOLO format with 80/10/10 split
7. Generates YOLOv8 training script + Dockerfile
8. Generates evaluation script with mAP metrics
```

---

## Implementation Priority & Milestones

### Milestone 1: "Generalized Annotator" (Weeks 1–5)
- [ ] Project & schema system (dynamic labels, colors, attributes)
- [ ] Schema templates (invoice, COCO, document layout, etc.)
- [ ] Polygon + classification tools on canvas
- [ ] Universal annotation storage format
- [ ] Text NER annotator (basic)
- [ ] Migrate existing invoice logic to a project template
- **Demo:** Create a COCO-style object detection project and annotate 10 images

### Milestone 2: "AI-Powered" (Weeks 6–11)
- [ ] Generalized Claude auto-annotator (schema-driven prompts)
- [ ] Active learning loop (confidence scoring + human review queue)
- [ ] Audio annotator with Whisper auto-transcription
- [ ] Video frame-by-frame annotator (basic)
- [ ] Pipeline builder skill (project scaffolding from description)
- **Demo:** Auto-annotate 500 street scene images, review 50 manually, export to YOLO

### Milestone 3: "Export Everything" (Weeks 12–13)
- [ ] Universal export engine with all 12 formats
- [ ] Custom export schema support
- [ ] Dataset splitting (random, stratified, group)
- [ ] Export preview and validation
- **Demo:** Export same dataset to COCO, YOLO, HuggingFace, and TFRecord

### Milestone 4: "Beautiful & Polished" (Weeks 14–16)
- [ ] Full frontend redesign using frontend-design skill principles
- [ ] Project dashboard with stats
- [ ] Undo/redo, keyboard shortcuts, annotation queue
- [ ] Review mode, batch operations, search & filter
- [ ] Quality analytics dashboard
- **Demo:** End-to-end workflow: create project → import → auto-annotate → review → export

### Milestone 5: "Cloud Ready" (Weeks 17–21)
- [ ] Database migration to PostgreSQL (with SQLite fallback)
- [ ] Storage abstraction (local + S3)
- [ ] User/team model (hidden in local mode)
- [ ] Docker Compose deployment
- [ ] Claude skills packaged and published
- [ ] Task queue for background jobs
- **Demo:** Deploy to cloud, create team, assign annotation tasks, export

---

## Tech Stack Summary

| Layer | Current | Target |
|-------|---------|--------|
| **Frontend** | React + TS + Vite + Tailwind + Zustand | Same + React Router + wavesurfer.js + recharts |
| **Backend** | FastAPI + SQLAlchemy + SQLite | Same + Alembic + Celery (optional) + PostgreSQL (optional) |
| **OCR** | EasyOCR | EasyOCR + Tesseract (option) + PaddleOCR (option) |
| **AI** | Claude (hardcoded invoice prompt) | Claude (schema-driven) + SAM (segmentation) + Whisper (audio) |
| **Storage** | Local filesystem | Local + S3/GCS abstraction |
| **Export** | JSONL + HuggingFace ZIP | 12+ formats + custom schemas |
| **Skills** | Single claude.py router | 3 packaged Claude skills |
| **Deploy** | `python run.py` + `npm run dev` | Docker Compose + cloud-ready |

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Scope creep (too many annotation types) | High | Phase 1 locks image bbox+polygon+classification. Text NER in Phase 2. Audio/video in Phase 3. Each phase is independently shippable. |
| Canvas performance with large images | Medium | Virtual rendering (only draw visible region). Web Workers for heavy computation. Consider OffscreenCanvas. |
| Claude API costs for auto-annotation | Medium | Few-shot learning reduces calls. Batch similar items. Cache responses. Allow users to set budget limits. |
| Video annotation complexity | High | Start with frame-by-frame (reuse image annotator). Object tracking interpolation is Phase 3.5, not blocking. |
| Migration breaks existing users | Medium | Keep backward compatibility: old invoice JSON auto-imports as a project. Migration script included. |

---

## What Makes This "Industry Choice" Material

1. **Schema-driven everything** — Unlike competitors that have fixed annotation types, DataForge lets users define exactly what they need
2. **AI-first workflow** — Claude auto-annotation + active learning means 10x less manual work than Label Studio or CVAT
3. **Claude Skills ecosystem** — The pipeline builder skill means you go from "I have data" to "I have a trained model" in one tool
4. **Universal export** — Export to literally any ML framework, no conversion scripts needed
5. **Beautiful UX** — Following the frontend-design skill principles, this won't look like every other annotation tool
6. **Local-first, cloud-ready** — No vendor lock-in, run on your laptop or scale to a team of 50

---

*Plan version: 1.0 | Created: 2026-03-18 | Author: Claude + Irfan*
