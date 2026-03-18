from sqlalchemy import Boolean, Column, Integer, String, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from uuid import uuid4

from .database import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    data_type = Column(String, default="image")
    annotation_type = Column(String, default="bbox")
    schema = Column(JSON, default=dict)
    settings = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    images = relationship("ImageRecord", back_populates="project")


class ImageRecord(Base):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, unique=True, index=True)
    width = Column(Integer)
    height = Column(Integer)
    is_sample = Column(Boolean, default=False, server_default="0")
    ocr_status = Column(String, default="pending", server_default="pending")
    is_annotated = Column(Boolean, default=False, server_default="0")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)

    project = relationship("Project", back_populates="images")
