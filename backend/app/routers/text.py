from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from fastapi.responses import PlainTextResponse
from pathlib import Path
from typing import List, Optional
import os
import shutil
import json

from ..config import settings
from ..schemas import TextDocumentItem, TextUploadResponse
from ..database import SessionLocal
from ..models import TextRecord

router = APIRouter(prefix="/api/text", tags=["text"])


def _is_valid_text(filename: str) -> bool:
    ext = Path(filename).suffix.lower()
    return ext in settings.text_allowed_extensions


def _safe_text_path(filename: str) -> Path:
    """Resolve filepath and guard against path traversal attacks."""
    text_dir = Path(settings.text_dir).resolve()
    filepath = (text_dir / filename).resolve()
    if not filepath.is_relative_to(text_dir):
        raise HTTPException(status_code=400, detail="Invalid filename")
    return filepath


@router.get("/", response_model=list[TextDocumentItem])
async def list_text_docs(project_id: Optional[str] = Query(None)):
    """List text documents, optionally filtered by project_id."""
    text_dir = Path(settings.text_dir)
    if not text_dir.exists():
        text_dir.mkdir(parents=True, exist_ok=True)
        return []

    db = SessionLocal()
    try:
        result = []
        for filename in sorted(os.listdir(text_dir)):
            if Path(filename).suffix.lower() != ".txt":
                continue
            filepath = text_dir / filename
            if not filepath.is_file():
                continue

            record = db.query(TextRecord).filter(TextRecord.filename == filename).first()

            if record:
                if project_id and record.project_id != project_id:
                    continue
                result.append(TextDocumentItem(
                    filename=record.filename,
                    char_count=record.char_count or 0,
                    is_annotated=record.is_annotated or False,
                    project_id=record.project_id,
                ))
            else:
                try:
                    char_count = filepath.stat().st_size
                    record = TextRecord(filename=filename, char_count=char_count)
                    db.add(record)
                    db.commit()
                except Exception:
                    continue
                if project_id:
                    continue
                result.append(TextDocumentItem(
                    filename=filename,
                    char_count=char_count,
                    is_annotated=False,
                    project_id=None,
                ))

        return result
    finally:
        db.close()


@router.post("/upload", response_model=TextUploadResponse)
async def upload_text_files(
    files: List[UploadFile] = File(...),
    project_id: Optional[str] = Query(None),
):
    """Upload .txt or .jsonl files. JSONL lines are split into separate .txt files."""
    text_dir = Path(settings.text_dir)
    text_dir.mkdir(parents=True, exist_ok=True)

    uploaded = []
    failed = []

    for file in files:
        if not file.filename:
            continue

        ext = Path(file.filename).suffix.lower()
        if ext not in settings.text_allowed_extensions:
            failed.append({"filename": file.filename, "error": "Invalid file type"})
            continue

        try:
            content = await file.read()
            text = content.decode("utf-8")
        except Exception as e:
            failed.append({"filename": file.filename, "error": f"Could not read file: {e}"})
            continue

        stem = Path(file.filename).stem

        if ext == ".jsonl":
            # Split each line into a separate .txt file
            lines = [l.strip() for l in text.splitlines() if l.strip()]
            for i, line in enumerate(lines):
                try:
                    obj = json.loads(line)
                    line_text = obj.get("text", line)
                except json.JSONDecodeError:
                    line_text = line

                out_filename = f"{stem}_line{i + 1}.txt"
                out_path = text_dir / out_filename
                counter = 1
                while out_path.exists():
                    out_filename = f"{stem}_line{i + 1}_{counter}.txt"
                    out_path = text_dir / out_filename
                    counter += 1

                out_path.write_text(line_text, encoding="utf-8")
                char_count = len(line_text)

                db = SessionLocal()
                try:
                    record = TextRecord(
                        filename=out_filename,
                        char_count=char_count,
                        project_id=project_id,
                    )
                    db.add(record)
                    db.commit()
                finally:
                    db.close()

                uploaded.append(out_filename)
        else:
            # Plain .txt file
            out_filename = f"{stem}.txt"
            out_path = text_dir / out_filename
            counter = 1
            while out_path.exists():
                out_filename = f"{stem}_{counter}.txt"
                out_path = text_dir / out_filename
                counter += 1

            out_path.write_text(text, encoding="utf-8")
            char_count = len(text)

            db = SessionLocal()
            try:
                record = TextRecord(
                    filename=out_filename,
                    char_count=char_count,
                    project_id=project_id,
                )
                db.add(record)
                db.commit()
            finally:
                db.close()

            uploaded.append(out_filename)

    return TextUploadResponse(
        uploaded=uploaded,
        failed=failed,
        total_uploaded=len(uploaded),
        total_failed=len(failed),
    )


@router.get("/{filename}", response_class=PlainTextResponse)
async def get_text_content(filename: str):
    """Serve raw text content of a document."""
    filepath = _safe_text_path(filename)
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Text document not found")
    return filepath.read_text(encoding="utf-8")


@router.delete("/{filename}")
async def delete_text_doc(filename: str):
    """Delete a text document, its annotation file, and DB record."""
    filepath = _safe_text_path(filename)
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Text document not found")

    stem = Path(filename).stem

    db = SessionLocal()
    try:
        record = db.query(TextRecord).filter(TextRecord.filename == filename).first()
        if record:
            db.delete(record)
            db.commit()
    finally:
        db.close()

    filepath.unlink()

    ann_path = Path(settings.annotations_dir) / f"{stem}.json"
    if ann_path.exists():
        ann_path.unlink()

    return {"status": "deleted", "filename": filename}
