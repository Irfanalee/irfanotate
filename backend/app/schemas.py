from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class ImageListItem(BaseModel):
    filename: str
    width: int
    height: int
    annotation_count: int
    is_sample: bool = False
    ocr_status: str = "pending"
    is_annotated: bool = False


class UploadedImage(BaseModel):
    filename: str
    width: int
    height: int


class UploadError(BaseModel):
    filename: str
    error: str


class UploadResponse(BaseModel):
    uploaded: list[UploadedImage]
    failed: list[UploadError]
    total_uploaded: int
    total_failed: int


class SetSampleRequest(BaseModel):
    is_sample: bool


class OcrBox(BaseModel):
    ocr_id: str
    text: str
    bbox: list[int]
    confidence: float


class OcrResult(BaseModel):
    filename: str
    ocr_boxes: list[OcrBox]


class InvoiceField(BaseModel):
    text: str
    bbox: list[int]
    ocr_id: Optional[str] = None


class LineItem(BaseModel):
    line_item_id: int
    fields: dict[str, InvoiceField]


class InvoiceAnnotation(BaseModel):
    document_id: str
    image_path: str
    ocr_raw: list[OcrBox]
    line_items: list[LineItem]
    header_fields: dict[str, InvoiceField]


class SaveInvoiceRequest(BaseModel):
    line_items: list[LineItem]
    header_fields: dict[str, InvoiceField]


# ---- Project schemas ----

class LabelAttribute(BaseModel):
    name: str
    type: str = "text"
    options: Optional[list[str]] = None


class SchemaLabel(BaseModel):
    name: str
    color: str = "#6B7280"
    attributes: list[LabelAttribute] = []


class ProjectSchema(BaseModel):
    labels: list[SchemaLabel] = []


class ProjectSettings(BaseModel):
    allow_overlap: bool = True
    require_label: bool = False


class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    data_type: str = "image"
    annotation_type: str = "bbox"
    schema: Optional[dict] = None
    settings: Optional[dict] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str
    data_type: str
    annotation_type: str
    schema: Optional[dict] = None
    settings: Optional[dict] = None
    created_at: datetime
    updated_at: datetime
    image_count: int = 0
    annotated_count: int = 0

    class Config:
        from_attributes = True


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    schema: Optional[dict] = None
    settings: Optional[dict] = None


# ---- v2.0 annotation schemas ----

class AnnotationGeometry(BaseModel):
    type: str  # "bbox" | "polygon" | "classification"
    coordinates: list[Any]  # [x1,y1,x2,y2] for bbox; [[x,y],...] for polygon


class AnnotationItem(BaseModel):
    id: str
    label: str
    geometry: AnnotationGeometry
    attributes: dict = {}
    created_at: Optional[str] = None


class AnnotationRelation(BaseModel):
    id: str
    type: str
    from_id: str
    to_id: str


class AnnotationDocumentV2(BaseModel):
    version: str = "2.0"
    document_id: str
    source_path: str
    project_id: Optional[str] = None
    annotations: list[AnnotationItem] = []
    relations: list[AnnotationRelation] = []
    metadata: dict = {}


class TextDocumentItem(BaseModel):
    filename: str
    char_count: int
    is_annotated: bool = False
    project_id: Optional[str] = None


class TextUploadResponse(BaseModel):
    uploaded: list[str]
    failed: list[dict]
    total_uploaded: int
    total_failed: int


class SaveAnnotationsRequest(BaseModel):
    version: str = "2.0"
    document_id: str
    source_path: str
    project_id: Optional[str] = None
    annotations: list[AnnotationItem] = []
    relations: list[AnnotationRelation] = []
    metadata: dict = {}
