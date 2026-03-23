from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db
from .routers import images, ocr, invoice, claude, export_dataset
from .routers import projects, annotations, schema_templates, text, audio, video

app = FastAPI(
    title="DataForge API",
    description="Schema-driven multi-modal annotation platform",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "PATCH"],
    allow_headers=["Content-Type"],
)

app.include_router(images.router)
app.include_router(ocr.router)
app.include_router(invoice.router)
app.include_router(claude.router)
app.include_router(export_dataset.router)
app.include_router(projects.router)
app.include_router(annotations.router)
app.include_router(schema_templates.router)
app.include_router(text.router)
app.include_router(audio.router)
app.include_router(video.router)


@app.on_event("startup")
async def startup_event():
    init_db()


@app.get("/")
async def root():
    return {"message": "DataForge API", "docs": "/docs"}


@app.get("/api/health")
async def health():
    return {"status": "healthy"}
