from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/templates", tags=["templates"])

TEMPLATES = {
    "invoice_extraction": {
        "id": "invoice_extraction",
        "name": "Invoice Extraction",
        "description": "Extract structured data from invoice documents",
        "data_type": "image",
        "annotation_type": "bbox",
        "schema": {
            "labels": [
                {"name": "description", "color": "#3B82F6", "attributes": []},
                {"name": "quantity", "color": "#10B981", "attributes": []},
                {"name": "unit_measure", "color": "#8B5CF6", "attributes": []},
                {"name": "net_price", "color": "#F59E0B", "attributes": []},
                {"name": "net_worth", "color": "#EF4444", "attributes": []},
                {"name": "vat", "color": "#EC4899", "attributes": []},
                {"name": "gross_worth", "color": "#14B8A6", "attributes": []},
                {"name": "invoice_number", "color": "#F97316", "attributes": []},
                {"name": "invoice_date", "color": "#6366F1", "attributes": []},
                {"name": "vendor_name", "color": "#84CC16", "attributes": []},
                {"name": "total_gross", "color": "#06B6D4", "attributes": []},
            ]
        },
    },
    "object_detection": {
        "id": "object_detection",
        "name": "Object Detection",
        "description": "Detect and classify objects in images (COCO-style)",
        "data_type": "image",
        "annotation_type": "bbox",
        "schema": {
            "labels": [
                {"name": "person", "color": "#EF4444", "attributes": []},
                {"name": "car", "color": "#3B82F6", "attributes": []},
                {"name": "bicycle", "color": "#10B981", "attributes": []},
                {"name": "dog", "color": "#F59E0B", "attributes": []},
            ]
        },
    },
    "document_layout": {
        "id": "document_layout",
        "name": "Document Layout",
        "description": "Segment document regions by layout type",
        "data_type": "image",
        "annotation_type": "bbox",
        "schema": {
            "labels": [
                {"name": "title", "color": "#6366F1", "attributes": []},
                {"name": "paragraph", "color": "#6B7280", "attributes": []},
                {"name": "table", "color": "#F59E0B", "attributes": []},
                {"name": "figure", "color": "#10B981", "attributes": []},
                {"name": "header", "color": "#3B82F6", "attributes": []},
                {"name": "footer", "color": "#8B5CF6", "attributes": []},
            ]
        },
    },
    "custom": {
        "id": "custom",
        "name": "Custom",
        "description": "Start from scratch with your own labels",
        "data_type": "image",
        "annotation_type": "bbox",
        "schema": {"labels": []},
    },
}


@router.get("/")
async def list_templates():
    """List all available schema templates."""
    return [
        {
            "id": t["id"],
            "name": t["name"],
            "description": t["description"],
            "data_type": t["data_type"],
            "annotation_type": t["annotation_type"],
            "label_count": len(t["schema"]["labels"]),
        }
        for t in TEMPLATES.values()
    ]


@router.get("/{template_id}")
async def get_template(template_id: str):
    """Get full template schema by ID."""
    template = TEMPLATES.get(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template
