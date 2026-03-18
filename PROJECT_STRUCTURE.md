# DataForge — Project Structure Reference

This document defines the target project structure following the Claude Code convention
with `CLAUDE.md` briefing docs at each level. Apply this structure when starting Phase 1.

---

## Target Structure

```
dataforge/
│
├── CLAUDE.md                          # Main briefing doc (project overview, tech stack,
│                                      # dev setup, coding conventions, key commands)
│
├── .claude/
│   ├── skills/
│   │   ├── code-review.md             # How we review code in this project
│   │   ├── debugging-flow.md          # Step-by-step debugging process
│   │   ├── release-procedure.md       # Release checklist
│   │   ├── annotation-testing.md      # How to test annotation features
│   │   └── export-validation.md       # How to validate export formats
│   └── settings.json                  # Hooks, MCP config, etc.
│
├── docs/
│   ├── architecture.md                # System design: backend, frontend, storage,
│   │                                  # AI pipeline, export engine decisions
│   ├── annotation-format.md           # Universal annotation JSON format spec (v2.0)
│   ├── schema-system.md              # How project schemas work, label definitions,
│   │                                  # attribute types, validation rules
│   ├── export-formats.md             # All supported export formats, their structure,
│   │                                  # and how to add new ones
│   ├── ai-pipeline.md                # Claude auto-annotation architecture, prompt
│   │                                  # templates, active learning, few-shot strategy
│   ├── runbooks.md                    # Operational procedures (deploy, migrate DB,
│   │                                  # add export format, add annotation type)
│   └── team-decisions.md             # ADRs and trade-offs
│
├── backend/
│   ├── CLAUDE.md                      # Backend rules: FastAPI conventions, router
│   │                                  # patterns, error handling, DB access patterns,
│   │                                  # "always use async", testing requirements
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   │
│   │   ├── models/
│   │   │   ├── CLAUDE.md              # DB layer constraints: naming conventions,
│   │   │   │                          # migration rules, relationship patterns
│   │   │   ├── __init__.py
│   │   │   ├── project.py             # Project model
│   │   │   ├── image.py               # ImageRecord (renamed from models.py)
│   │   │   ├── text_document.py       # TextDocument model (Phase 2)
│   │   │   ├── audio_document.py      # AudioDocument model (Phase 3)
│   │   │   └── user.py                # User/Team models (Phase 7)
│   │   │
│   │   ├── schemas/
│   │   │   ├── CLAUDE.md              # Pydantic schema rules: always use v2 syntax,
│   │   │   │                          # validation patterns, response envelope format
│   │   │   ├── __init__.py
│   │   │   ├── project.py
│   │   │   ├── annotation.py
│   │   │   ├── export.py
│   │   │   └── ai.py
│   │   │
│   │   ├── routers/
│   │   │   ├── CLAUDE.md              # Router rules: always return JSON, use
│   │   │   │                          # dependency injection for DB sessions,
│   │   │   │                          # SSE pattern for long-running tasks
│   │   │   ├── __init__.py
│   │   │   ├── projects.py            # Project CRUD
│   │   │   ├── images.py              # Image management (refactored)
│   │   │   ├── annotations.py         # Generic annotation CRUD (replaces invoice.py)
│   │   │   ├── ocr.py                 # OCR engine (keep, extend)
│   │   │   ├── ai.py                  # AI auto-annotation (replaces claude.py)
│   │   │   ├── export.py              # Universal export (replaces export_dataset.py)
│   │   │   ├── text.py                # Text document management (Phase 2)
│   │   │   └── audio.py               # Audio document management (Phase 3)
│   │   │
│   │   ├── services/
│   │   │   ├── CLAUDE.md              # Service layer rules: business logic lives here
│   │   │   │                          # not in routers, always inject dependencies
│   │   │   ├── __init__.py
│   │   │   ├── annotation_service.py  # Annotation business logic
│   │   │   ├── ai_service.py          # Claude auto-annotation logic
│   │   │   ├── ocr_service.py         # OCR engine abstraction
│   │   │   └── export_service.py      # Export orchestration
│   │   │
│   │   ├── exporters/
│   │   │   ├── CLAUDE.md              # Export rules: all exporters inherit BaseExporter,
│   │   │   │                          # must implement validate() and export(),
│   │   │   │                          # register in ExporterRegistry
│   │   │   ├── __init__.py
│   │   │   ├── registry.py            # ExporterRegistry
│   │   │   ├── base.py                # BaseExporter ABC
│   │   │   ├── coco.py
│   │   │   ├── yolo.py
│   │   │   ├── pascal_voc.py
│   │   │   ├── huggingface.py
│   │   │   ├── tfrecord.py
│   │   │   ├── label_studio.py
│   │   │   ├── cvat.py
│   │   │   ├── createml.py
│   │   │   ├── conll.py
│   │   │   ├── jsonl_finetune.py      # Claude/LLM fine-tuning format
│   │   │   ├── datumaro.py
│   │   │   └── custom.py              # User-defined template-based export
│   │   │
│   │   ├── ai/
│   │   │   ├── CLAUDE.md              # AI rules: prompt templates must be schema-driven,
│   │   │   │                          # never hardcode labels, always include confidence
│   │   │   │                          # scores, respect rate limits
│   │   │   ├── __init__.py
│   │   │   ├── prompts/
│   │   │   │   ├── base.py            # Shared prompt builder
│   │   │   │   ├── image_bbox.py
│   │   │   │   ├── image_polygon.py
│   │   │   │   ├── image_classify.py
│   │   │   │   ├── text_ner.py
│   │   │   │   └── text_classify.py
│   │   │   ├── strategies/
│   │   │   │   ├── few_shot.py
│   │   │   │   ├── zero_shot.py
│   │   │   │   └── active_learning.py
│   │   │   └── parsers/
│   │   │       ├── bbox_parser.py
│   │   │       ├── ner_parser.py
│   │   │       └── classification_parser.py
│   │   │
│   │   └── storage/
│   │       ├── CLAUDE.md              # Storage rules: always use StorageBackend ABC,
│   │       │                          # never access filesystem directly from routers
│   │       ├── __init__.py
│   │       ├── base.py               # StorageBackend ABC
│   │       ├── local.py              # LocalStorage (current filesystem approach)
│   │       └── s3.py                 # S3Storage (Phase 7)
│   │
│   ├── migrations/                    # Alembic migrations
│   │   ├── alembic.ini
│   │   ├── env.py
│   │   └── versions/
│   │
│   ├── tests/
│   │   ├── CLAUDE.md                  # Testing rules: pytest, fixtures for DB + storage,
│   │   │                              # every router gets integration tests,
│   │   │                              # every exporter gets unit tests
│   │   ├── conftest.py
│   │   ├── test_projects.py
│   │   ├── test_annotations.py
│   │   ├── test_exporters/
│   │   │   ├── test_coco.py
│   │   │   ├── test_yolo.py
│   │   │   └── ...
│   │   └── test_ai/
│   │       └── test_prompt_builder.py
│   │
│   ├── requirements.txt
│   ├── Dockerfile
│   └── run.py
│
├── frontend/
│   ├── CLAUDE.md                      # Frontend rules: React 18 + TS strict mode,
│   │                                  # Zustand for state, Tailwind for styling,
│   │                                  # no inline styles, all API calls in api/ layer,
│   │                                  # components are pure, hooks handle logic
│   ├── src/
│   │   ├── types/
│   │   │   ├── CLAUDE.md              # Type rules: no 'any', all API responses typed,
│   │   │   │                          # geometry types are discriminated unions
│   │   │   ├── project.ts
│   │   │   ├── annotation.ts          # Geometry, Annotation, Relation types
│   │   │   ├── export.ts
│   │   │   └── ai.ts
│   │   │
│   │   ├── stores/
│   │   │   ├── CLAUDE.md              # Store rules: Zustand only, no Redux,
│   │   │   │                          # stores are thin (no API calls inside),
│   │   │   │                          # computed values use selectors
│   │   │   ├── projectStore.ts
│   │   │   ├── annotationStore.ts     # Generic (replaces invoiceStore)
│   │   │   ├── canvasStore.ts         # Enhanced with new tools
│   │   │   ├── dataStore.ts           # Data items (replaces imageStore)
│   │   │   ├── aiStore.ts
│   │   │   └── exportStore.ts
│   │   │
│   │   ├── api/
│   │   │   ├── CLAUDE.md              # API rules: all calls through fetchJSON helper,
│   │   │   │                          # always handle errors, use TypeScript generics
│   │   │   ├── client.ts
│   │   │   ├── projects.ts
│   │   │   ├── annotations.ts
│   │   │   ├── images.ts
│   │   │   ├── ocr.ts
│   │   │   ├── ai.ts
│   │   │   └── export.ts
│   │   │
│   │   ├── components/
│   │   │   ├── core/                  # Shared UI primitives
│   │   │   │   ├── CLAUDE.md          # Core component rules: accessible, keyboard
│   │   │   │   │                      # navigable, no hardcoded colors (use CSS vars)
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Dropdown.tsx
│   │   │   │   ├── Tooltip.tsx
│   │   │   │   ├── Tabs.tsx
│   │   │   │   └── ResizablePanel.tsx
│   │   │   │
│   │   │   ├── project/               # Project management UI
│   │   │   │   ├── ProjectDashboard.tsx
│   │   │   │   ├── ProjectCard.tsx
│   │   │   │   ├── ProjectWizard.tsx
│   │   │   │   ├── SchemaEditor.tsx
│   │   │   │   └── ProjectSettings.tsx
│   │   │   │
│   │   │   ├── annotators/
│   │   │   │   ├── CLAUDE.md          # Annotator rules: each annotator is self-contained,
│   │   │   │   │                      # reads labels from projectStore, writes to
│   │   │   │   │                      # annotationStore, never imports from sibling annotators
│   │   │   │   ├── image/
│   │   │   │   │   ├── ImageAnnotator.tsx
│   │   │   │   │   ├── AnnotationCanvas.tsx
│   │   │   │   │   ├── ToolPalette.tsx
│   │   │   │   │   ├── LabelSelector.tsx
│   │   │   │   │   └── AttributePanel.tsx
│   │   │   │   ├── text/
│   │   │   │   │   ├── TextAnnotator.tsx
│   │   │   │   │   ├── EntityHighlighter.tsx
│   │   │   │   │   └── RelationEditor.tsx
│   │   │   │   ├── audio/
│   │   │   │   │   ├── AudioAnnotator.tsx
│   │   │   │   │   ├── WaveformView.tsx
│   │   │   │   │   └── TranscriptEditor.tsx
│   │   │   │   └── video/
│   │   │   │       ├── VideoAnnotator.tsx
│   │   │   │       ├── FrameCanvas.tsx
│   │   │   │       └── TrackingTimeline.tsx
│   │   │   │
│   │   │   ├── ai/
│   │   │   │   ├── AutoAnnotatePanel.tsx
│   │   │   │   ├── ActiveLearningQueue.tsx
│   │   │   │   ├── ConfidenceOverlay.tsx
│   │   │   │   └── SuggestionBanner.tsx
│   │   │   │
│   │   │   ├── export/
│   │   │   │   ├── ExportWizard.tsx
│   │   │   │   ├── FormatSelector.tsx
│   │   │   │   ├── SplitConfigurator.tsx
│   │   │   │   └── ExportPreview.tsx
│   │   │   │
│   │   │   └── analytics/
│   │   │       ├── AnnotationStats.tsx
│   │   │       ├── LabelDistribution.tsx
│   │   │       ├── ProgressChart.tsx
│   │   │       └── QualityReport.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useKeyboardShortcuts.ts
│   │   │   ├── useAutoSave.ts
│   │   │   ├── useAnnotationHistory.ts  # Undo/redo
│   │   │   └── useHotkeys.ts
│   │   │
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   │
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── Dockerfile
│
├── claude-skills/                     # Packaged Claude skills
│   ├── dataforge-annotator/
│   │   ├── SKILL.md
│   │   ├── annotate.py
│   │   ├── prompts/
│   │   └── parsers/
│   ├── dataforge-pipeline/
│   │   ├── SKILL.md
│   │   ├── scaffold.py
│   │   ├── templates/
│   │   └── generators/
│   └── dataforge-quality/
│       ├── SKILL.md
│       ├── audit.py
│       ├── checks/
│       └── report.py
│
├── dataset/                           # Default data directory (configurable)
│   ├── images/
│   ├── annotations/
│   ├── ocr/
│   └── exports/
│
├── docker-compose.yml                 # Full stack deployment
├── docker-compose.local.yml           # Local dev (SQLite, no Redis)
├── .env.example
├── .gitignore
└── README.md
```

---

## CLAUDE.md Content Guide

### Root `CLAUDE.md` — What goes in it:

```markdown
# DataForge — Universal Data Annotation Platform

## Overview
Multi-modal annotation platform for ML training data. Supports image (bbox,
polygon, segmentation, keypoints, classification), text (NER, classification,
relations), audio (segments, transcription), and video (frame-by-frame tracking).

## Tech Stack
- Backend: FastAPI 0.109+, SQLAlchemy 2.0+, Pydantic v2, Python 3.12+
- Frontend: React 18, TypeScript (strict), Vite, Tailwind CSS, Zustand
- AI: Anthropic Claude API (schema-driven prompts), EasyOCR
- Database: SQLite (local) / PostgreSQL (cloud)
- Storage: Local filesystem / S3 (cloud)

## Quick Start
  backend:  cd backend && pip install -r requirements.txt && python run.py
  frontend: cd frontend && npm install && npm run dev
  full:     docker-compose -f docker-compose.local.yml up

## Key Commands
  pytest backend/tests/                     # Run backend tests
  npm run test --prefix frontend            # Run frontend tests
  npm run lint --prefix frontend            # Lint frontend
  alembic upgrade head                      # Run DB migrations

## Architecture Decisions
- Schema-driven: All annotation types, labels, and colors come from the project
  schema. NEVER hardcode field types or label names in components.
- File-based annotations: Annotation JSON files live alongside data, not in the
  DB. The DB only stores metadata and indexes.
- Storage abstraction: All file I/O goes through StorageBackend. Never use
  open()/Path() directly in routers or services.
- Export registry: New export formats are registered via ExporterRegistry.
  Never add export logic to routers.

## Coding Conventions
- Python: Black formatter, 88 char lines, type hints on all public functions
- TypeScript: Strict mode, no 'any', named exports, functional components only
- API responses: Always wrapped in a consistent envelope
- Errors: HTTP exceptions with structured error codes, not just string messages
- Commits: Conventional commits (feat:, fix:, refactor:, docs:)
```

### Module-level CLAUDE.md — Pattern:

Each module's `CLAUDE.md` should contain:
1. **Purpose** — What this module does (2-3 sentences)
2. **Key rules** — Constraints that MUST be followed (bullet list)
3. **Patterns** — Code patterns to follow with mini-examples
4. **Warnings** — Common mistakes to avoid
5. **Dependencies** — What this module depends on and what depends on it

### Example: `backend/app/exporters/CLAUDE.md`

```markdown
# Exporters Module

Converts annotations from DataForge's universal format to ML framework-specific
formats (COCO, YOLO, VOC, HuggingFace, etc.)

## Rules
- Every exporter MUST inherit from BaseExporter
- Every exporter MUST implement validate() and export()
- Every exporter MUST be registered in ExporterRegistry.__init__
- Every exporter MUST have a corresponding test in tests/test_exporters/
- NEVER access the database from exporters — they receive annotation data as input
- NEVER hardcode label names — read them from the project schema

## Pattern: Adding a new exporter

  class MyFormatExporter(BaseExporter):
      format_name = "my_format"
      file_extension = ".json"

      def validate(self, project: Project, annotations: list[Annotation]) -> list[str]:
          """Return list of validation warnings (empty = valid)."""
          warnings = []
          if not annotations:
              warnings.append("No annotations to export")
          return warnings

      def export(self, project: Project, annotations: list[Annotation],
                 output_dir: Path, split: DatasetSplit) -> ExportResult:
          """Write files to output_dir, return ExportResult with stats."""
          ...

  # Register in registry.py:
  ExporterRegistry.register("my_format", MyFormatExporter())

## Warnings
- COCO format uses 1-indexed category IDs (not 0-indexed)
- YOLO format uses normalized coordinates (0-1), not pixel values
- VOC format requires one XML file per image, not one global file
- HuggingFace export must include a dataset_info.json for the Hub
```

### Example: `frontend/src/components/annotators/CLAUDE.md`

```markdown
# Annotators Module

Self-contained annotation interfaces for each data type (image, text, audio, video).

## Rules
- Each annotator is FULLY self-contained — no imports between sibling annotators
- All annotators read labels from projectStore.labels (never hardcoded)
- All annotators write to annotationStore (unified annotation state)
- Canvas coordinates are always in IMAGE space, not screen space
- All annotators must support keyboard shortcuts for label assignment (1-9)
- All annotators must call annotationStore.setDirty(true) on any change

## Pattern: Annotator component structure

  function ImageAnnotator() {
    const labels = useProjectStore(s => s.labels)
    const annotations = useAnnotationStore(s => s.annotations)
    const addAnnotation = useAnnotationStore(s => s.addAnnotation)

    // Annotator-specific logic here
    // NEVER fetch data directly — use stores
    // NEVER manage annotation state locally — use annotationStore
  }

## Warnings
- Canvas must handle high-DPI displays (multiply by devicePixelRatio)
- Always cleanup event listeners in useEffect return
- Polygon tool: close polygon on double-click OR clicking first point
- Text annotator: handle overlapping entities (render order matters)
```

---

## When to Apply This Structure

Apply this structure at the START of Phase 1 implementation:
1. Create all directories
2. Write root CLAUDE.md with full project context
3. Write module CLAUDE.md files as you build each module
4. Move existing code into the new structure (backend/app/models/ split, etc.)
5. Add .claude/skills/ and docs/ as conventions are established

The CLAUDE.md files are living documents — update them as patterns evolve.
