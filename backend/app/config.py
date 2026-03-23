from pydantic_settings import BaseSettings
from pathlib import Path
from typing import Optional


class Settings(BaseSettings):
    app_name: str = "Invoice Annotation Tool"
    images_dir: Path = Path("../dataset/images")
    annotations_dir: Path = Path("../dataset/annotations")
    ocr_dir: Path = Path("../dataset/ocr")
    exports_dir: Path = Path("../dataset/exports")
    database_url: str = "sqlite:///./annotations.db"
    allowed_extensions: list[str] = [".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"]
    text_dir: Path = Path("../dataset/text")
    text_allowed_extensions: list[str] = [".txt", ".jsonl"]
    audio_dir: Path = Path("../dataset/audio")
    audio_allowed_extensions: list[str] = [".mp3", ".wav", ".ogg", ".flac", ".m4a"]
    video_dir: Path = Path("../dataset/video")
    video_allowed_extensions: list[str] = [".mp4", ".webm", ".mov"]
    thumbnail_size: tuple[int, int] = (150, 150)
    anthropic_api_key: Optional[str] = None
    claude_model: str = "claude-opus-4-6"

    class Config:
        env_file = ".env"


settings = Settings()
