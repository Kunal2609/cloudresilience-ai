"""CloudResilience AI - FastAPI Main Application Server."""
from contextlib import asynccontextmanager
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.database import engine, Base, SessionLocal
from app.db.models import ArchitectureModel
from app.db.sample_data import get_sample_architecture_unmitigated, get_sample_architecture_mitigated
from app.api.v1.router import api_router

def seed_sample_data():
    db = SessionLocal()
    try:
        sample_unmit = get_sample_architecture_unmitigated()
        rec_unmit = db.query(ArchitectureModel).filter(ArchitectureModel.id == sample_unmit.id).first()
        if not rec_unmit:
            db.add(ArchitectureModel(
                id=sample_unmit.id,
                name=sample_unmit.name,
                description=sample_unmit.description,
                graph_json=sample_unmit.model_dump_json(),
                version=1,
            ))

        sample_mit = get_sample_architecture_mitigated()
        rec_mit = db.query(ArchitectureModel).filter(ArchitectureModel.id == sample_mit.id).first()
        if not rec_mit:
            db.add(ArchitectureModel(
                id=sample_mit.id,
                name=sample_mit.name,
                description=sample_mit.description,
                graph_json=sample_mit.model_dump_json(),
                version=1,
            ))
        db.commit()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Keep database work inside application startup so importing the module
    # does not open connections or contend with test runners and tooling.
    Base.metadata.create_all(bind=engine)
    seed_sample_data()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Interactive Cloud Attack-Path & Failure-Impact Simulation Platform",
    lifespan=lifespan,
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 routes
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
