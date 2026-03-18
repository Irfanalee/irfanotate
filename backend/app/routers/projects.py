from fastapi import APIRouter, HTTPException
from pathlib import Path
import json

from ..config import settings
from ..schemas import ProjectCreate, ProjectResponse, ProjectUpdate
from ..database import SessionLocal
from ..models import Project, ImageRecord

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _project_to_response(project: Project, db) -> dict:
    image_count = db.query(ImageRecord).filter(ImageRecord.project_id == project.id).count()
    annotated_count = db.query(ImageRecord).filter(
        ImageRecord.project_id == project.id,
        ImageRecord.is_annotated == True,
    ).count()
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description or "",
        "data_type": project.data_type or "image",
        "annotation_type": project.annotation_type or "bbox",
        "schema": project.schema,
        "settings": project.settings,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
        "image_count": image_count,
        "annotated_count": annotated_count,
    }


@router.post("/", response_model=ProjectResponse, status_code=201)
async def create_project(body: ProjectCreate):
    db = SessionLocal()
    try:
        project = Project(
            name=body.name,
            description=body.description,
            data_type=body.data_type,
            annotation_type=body.annotation_type,
            schema=body.schema or {},
            settings=body.settings or {},
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        return _project_to_response(project, db)
    finally:
        db.close()


@router.get("/", response_model=list[ProjectResponse])
async def list_projects():
    db = SessionLocal()
    try:
        projects = db.query(Project).order_by(Project.created_at.desc()).all()
        return [_project_to_response(p, db) for p in projects]
    finally:
        db.close()


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str):
    db = SessionLocal()
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        return _project_to_response(project, db)
    finally:
        db.close()


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, body: ProjectUpdate):
    db = SessionLocal()
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        if body.name is not None:
            project.name = body.name
        if body.description is not None:
            project.description = body.description
        if body.schema is not None:
            project.schema = body.schema
        if body.settings is not None:
            project.settings = body.settings
        db.commit()
        db.refresh(project)
        return _project_to_response(project, db)
    finally:
        db.close()


@router.delete("/{project_id}")
async def delete_project(project_id: str):
    db = SessionLocal()
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        # Nullify image project_ids rather than deleting images
        db.query(ImageRecord).filter(ImageRecord.project_id == project_id).update(
            {ImageRecord.project_id: None}
        )
        db.delete(project)
        db.commit()
        return {"status": "deleted", "id": project_id}
    finally:
        db.close()


@router.post("/{project_id}/import-invoice")
async def import_invoice_annotations(project_id: str):
    """Batch migrate all v1 invoice JSONs into this project (sets project_id + converts to v2.0)."""
    db = SessionLocal()
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        annotations_dir = Path(settings.annotations_dir)
        converted = 0
        skipped = 0

        for ann_file in annotations_dir.glob("*.json"):
            try:
                with open(ann_file) as f:
                    data = json.load(f)

                # Skip already v2.0
                if data.get("version") == "2.0":
                    skipped += 1
                    continue

                # Only migrate v1 invoice files
                if "line_items" not in data and "header_fields" not in data:
                    skipped += 1
                    continue

                v2 = _migrate_v1_to_v2(data)
                v2["project_id"] = project_id

                with open(ann_file, "w") as f:
                    json.dump(v2, f, indent=2)

                # Update image record
                stem = ann_file.stem
                # filename could be stem + any extension; find matching record
                image_record = db.query(ImageRecord).filter(
                    ImageRecord.filename.like(f"{stem}.%")
                ).first()
                if image_record:
                    image_record.project_id = project_id
                    image_record.is_annotated = True

                converted += 1
            except Exception:
                skipped += 1

        db.commit()
        return {"converted": converted, "skipped": skipped}
    finally:
        db.close()


def _migrate_v1_to_v2(v1: dict) -> dict:
    """Convert v1 invoice annotation to v2.0 format."""
    annotations = []

    for label, field in v1.get("header_fields", {}).items():
        annotations.append({
            "id": f"migrated_{label}",
            "label": label,
            "geometry": {"type": "bbox", "coordinates": field.get("bbox", [0, 0, 0, 0])},
            "attributes": {"text": field.get("text", ""), "ocr_id": field.get("ocr_id")},
        })

    for li in v1.get("line_items", []):
        li_id = li.get("line_item_id", 0)
        for label, field in li.get("fields", {}).items():
            annotations.append({
                "id": f"migrated_li{li_id}_{label}",
                "label": label,
                "geometry": {"type": "bbox", "coordinates": field.get("bbox", [0, 0, 0, 0])},
                "attributes": {
                    "text": field.get("text", ""),
                    "ocr_id": field.get("ocr_id"),
                    "line_item_id": li_id,
                },
            })

    return {
        "version": "2.0",
        "document_id": v1.get("document_id", ""),
        "source_path": v1.get("image_path", ""),
        "project_id": None,
        "annotations": annotations,
        "relations": [],
        "metadata": {"ocr_raw": v1.get("ocr_raw", [])},
    }
