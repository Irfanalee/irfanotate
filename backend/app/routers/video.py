from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from fastapi.responses import FileResponse
from pathlib import Path
from typing import List, Optional
import os
import shutil

from ..config import settings
from ..schemas import VideoFileItem, MediaUploadResponse
from ..database import SessionLocal
from ..models import VideoRecord

router = APIRouter(prefix="/api/video", tags=["video"])

_MEDIA_TYPES = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
}


def _safe_video_path(filename: str) -> Path:
    video_dir = Path(settings.video_dir).resolve()
    filepath = (video_dir / filename).resolve()
    if not filepath.is_relative_to(video_dir):
        raise HTTPException(status_code=400, detail="Invalid filename")
    return filepath


@router.get("/", response_model=list[VideoFileItem])
async def list_video_files(project_id: Optional[str] = Query(None)):
    video_dir = Path(settings.video_dir)
    if not video_dir.exists():
        video_dir.mkdir(parents=True, exist_ok=True)
        return []

    db = SessionLocal()
    try:
        result = []
        for filename in sorted(os.listdir(video_dir)):
            ext = Path(filename).suffix.lower()
            if ext not in settings.video_allowed_extensions:
                continue
            filepath = video_dir / filename
            if not filepath.is_file():
                continue

            record = db.query(VideoRecord).filter(VideoRecord.filename == filename).first()

            if record:
                if project_id and record.project_id != project_id:
                    continue
                result.append(VideoFileItem(
                    filename=record.filename,
                    duration_ms=record.duration_ms or 0,
                    width=record.width or 0,
                    height=record.height or 0,
                    is_annotated=record.is_annotated or False,
                    project_id=record.project_id,
                ))
            else:
                duration_ms, width, height = 0, 0, 0
                try:
                    from moviepy.editor import VideoFileClip
                    clip = VideoFileClip(str(filepath))
                    duration_ms = int(clip.duration * 1000)
                    width = clip.w
                    height = clip.h
                    clip.close()
                except Exception:
                    pass

                record = VideoRecord(
                    filename=filename,
                    duration_ms=duration_ms,
                    width=width,
                    height=height,
                )
                db.add(record)
                db.commit()

                if project_id:
                    continue
                result.append(VideoFileItem(
                    filename=filename,
                    duration_ms=duration_ms,
                    width=width,
                    height=height,
                    is_annotated=False,
                    project_id=None,
                ))

        return result
    finally:
        db.close()


@router.post("/upload", response_model=MediaUploadResponse)
async def upload_video_files(
    files: List[UploadFile] = File(...),
    project_id: Optional[str] = Query(None),
):
    video_dir = Path(settings.video_dir)
    video_dir.mkdir(parents=True, exist_ok=True)

    uploaded = []
    failed = []

    for file in files:
        if not file.filename:
            continue

        ext = Path(file.filename).suffix.lower()
        if ext not in settings.video_allowed_extensions:
            failed.append({"filename": file.filename, "error": "Invalid file type"})
            continue

        stem = Path(file.filename).stem
        out_filename = file.filename
        out_path = video_dir / out_filename
        counter = 1
        while out_path.exists():
            out_filename = f"{stem}_{counter}{ext}"
            out_path = video_dir / out_filename
            counter += 1

        try:
            with open(out_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
        except Exception as e:
            failed.append({"filename": file.filename, "error": f"Could not save file: {e}"})
            continue

        duration_ms, width, height = 0, 0, 0
        try:
            from moviepy.editor import VideoFileClip
            clip = VideoFileClip(str(out_path))
            duration_ms = int(clip.duration * 1000)
            width = clip.w
            height = clip.h
            clip.close()
        except Exception:
            pass

        db = SessionLocal()
        try:
            record = VideoRecord(
                filename=out_filename,
                duration_ms=duration_ms,
                width=width,
                height=height,
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
async def get_video_file(filename: str):
    filepath = _safe_video_path(filename)
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Video file not found")
    ext = filepath.suffix.lower()
    media_type = _MEDIA_TYPES.get(ext, "application/octet-stream")
    return FileResponse(str(filepath), media_type=media_type)


@router.delete("/{filename}")
async def delete_video_file(filename: str):
    filepath = _safe_video_path(filename)
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Video file not found")

    stem = Path(filename).stem

    db = SessionLocal()
    try:
        record = db.query(VideoRecord).filter(VideoRecord.filename == filename).first()
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
