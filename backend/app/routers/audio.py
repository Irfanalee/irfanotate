from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from fastapi.responses import FileResponse
from pathlib import Path
from typing import List, Optional
import os
import shutil

from ..config import settings
from ..schemas import AudioFileItem, MediaUploadResponse
from ..database import SessionLocal
from ..models import AudioRecord

router = APIRouter(prefix="/api/audio", tags=["audio"])

_MEDIA_TYPES = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
    ".m4a": "audio/mp4",
}


def _safe_audio_path(filename: str) -> Path:
    audio_dir = Path(settings.audio_dir).resolve()
    filepath = (audio_dir / filename).resolve()
    if not filepath.is_relative_to(audio_dir):
        raise HTTPException(status_code=400, detail="Invalid filename")
    return filepath


@router.get("/", response_model=list[AudioFileItem])
async def list_audio_files(project_id: Optional[str] = Query(None)):
    audio_dir = Path(settings.audio_dir)
    if not audio_dir.exists():
        audio_dir.mkdir(parents=True, exist_ok=True)
        return []

    db = SessionLocal()
    try:
        result = []
        for filename in sorted(os.listdir(audio_dir)):
            ext = Path(filename).suffix.lower()
            if ext not in settings.audio_allowed_extensions:
                continue
            filepath = audio_dir / filename
            if not filepath.is_file():
                continue

            record = db.query(AudioRecord).filter(AudioRecord.filename == filename).first()

            if record:
                if project_id and record.project_id != project_id:
                    continue
                result.append(AudioFileItem(
                    filename=record.filename,
                    duration_ms=record.duration_ms or 0,
                    is_annotated=record.is_annotated or False,
                    project_id=record.project_id,
                ))
            else:
                duration_ms = 0
                try:
                    import mutagen
                    f = mutagen.File(str(filepath))
                    if f and hasattr(f, 'info') and hasattr(f.info, 'length'):
                        duration_ms = int(f.info.length * 1000)
                except Exception:
                    pass

                record = AudioRecord(filename=filename, duration_ms=duration_ms)
                db.add(record)
                db.commit()

                if project_id:
                    continue
                result.append(AudioFileItem(
                    filename=filename,
                    duration_ms=duration_ms,
                    is_annotated=False,
                    project_id=None,
                ))

        return result
    finally:
        db.close()


@router.post("/upload", response_model=MediaUploadResponse)
async def upload_audio_files(
    files: List[UploadFile] = File(...),
    project_id: Optional[str] = Query(None),
):
    audio_dir = Path(settings.audio_dir)
    audio_dir.mkdir(parents=True, exist_ok=True)

    uploaded = []
    failed = []

    for file in files:
        if not file.filename:
            continue

        ext = Path(file.filename).suffix.lower()
        if ext not in settings.audio_allowed_extensions:
            failed.append({"filename": file.filename, "error": "Invalid file type"})
            continue

        stem = Path(file.filename).stem
        out_filename = file.filename
        out_path = audio_dir / out_filename
        counter = 1
        while out_path.exists():
            out_filename = f"{stem}_{counter}{ext}"
            out_path = audio_dir / out_filename
            counter += 1

        try:
            with open(out_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
        except Exception as e:
            failed.append({"filename": file.filename, "error": f"Could not save file: {e}"})
            continue

        duration_ms = 0
        try:
            import mutagen
            mf = mutagen.File(str(out_path))
            if mf and hasattr(mf, 'info') and hasattr(mf.info, 'length'):
                duration_ms = int(mf.info.length * 1000)
        except Exception:
            pass

        db = SessionLocal()
        try:
            record = AudioRecord(
                filename=out_filename,
                duration_ms=duration_ms,
                project_id=project_id,
            )
            db.add(record)
            db.commit()
        finally:
            db.close()

        uploaded.append(out_filename)

    return MediaUploadResponse(
        uploaded=uploaded,
        failed=failed,
        total_uploaded=len(uploaded),
        total_failed=len(failed),
    )


@router.get("/{filename}")
async def get_audio_file(filename: str):
    filepath = _safe_audio_path(filename)
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    ext = filepath.suffix.lower()
    media_type = _MEDIA_TYPES.get(ext, "application/octet-stream")
    return FileResponse(str(filepath), media_type=media_type)


@router.delete("/{filename}")
async def delete_audio_file(filename: str):
    filepath = _safe_audio_path(filename)
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")

    stem = Path(filename).stem

    db = SessionLocal()
    try:
        record = db.query(AudioRecord).filter(AudioRecord.filename == filename).first()
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
