from fastapi import APIRouter, HTTPException
from pathlib import Path
import json

from ..config import settings
from ..schemas import AnnotationDocumentV2, SaveAnnotationsRequest
from ..database import SessionLocal
from ..models import ImageRecord

router = APIRouter(prefix="/api/annotations", tags=["annotations"])


def _annotation_path(filename: str) -> Path:
    stem = Path(filename).stem
    return Path(settings.annotations_dir) / f"{stem}.json"


def _migrate_v1_to_v2(v1: dict) -> dict:
    """Convert v1 invoice annotation to v2.0 format (in-memory, does NOT write file)."""
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


@router.get("/{filename}", response_model=AnnotationDocumentV2)
async def get_annotation(filename: str):
    """Load annotation, auto-converting v1 format to v2.0 on the fly."""
    ann_path = _annotation_path(filename)
    if not ann_path.exists():
        raise HTTPException(status_code=404, detail="Annotation not found")

    try:
        with open(ann_path) as f:
            data = json.load(f)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to read annotation file")

    # Detect v1 by presence of line_items key
    if data.get("version") != "2.0" and "line_items" in data:
        data = _migrate_v1_to_v2(data)

    return data


@router.post("/{filename}", response_model=AnnotationDocumentV2)
async def save_annotation(filename: str, body: SaveAnnotationsRequest):
    """Save v2.0 annotation to disk and mark image as annotated."""
    ann_path = _annotation_path(filename)
    ann_path.parent.mkdir(parents=True, exist_ok=True)

    payload = body.model_dump()
    payload["version"] = "2.0"

    try:
        with open(ann_path, "w") as f:
            json.dump(payload, f, indent=2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save annotation: {e}")

    # Mark image as annotated in DB
    db = SessionLocal()
    try:
        image_record = db.query(ImageRecord).filter(
            ImageRecord.filename == filename
        ).first()
        if image_record:
            image_record.is_annotated = True
            if body.project_id and not image_record.project_id:
                image_record.project_id = body.project_id
            db.commit()
    finally:
        db.close()

    return payload


@router.delete("/{filename}")
async def delete_annotation(filename: str):
    """Delete annotation file and mark image as unannotated."""
    ann_path = _annotation_path(filename)
    if not ann_path.exists():
        raise HTTPException(status_code=404, detail="Annotation not found")

    ann_path.unlink()

    db = SessionLocal()
    try:
        image_record = db.query(ImageRecord).filter(
            ImageRecord.filename == filename
        ).first()
        if image_record:
            image_record.is_annotated = False
            db.commit()
    finally:
        db.close()

    return {"status": "deleted", "filename": filename}
