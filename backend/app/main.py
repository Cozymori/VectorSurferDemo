"""
VectorSurfer 0.0.1 Backend - FastAPI Application

This backend serves the VectorWave monitoring dashboard.
All endpoints return JSON-serializable data from the Dashboard Service Layer.

[수정사항]
- OPENAI_API_KEY 검증 로직 추가 (Healer 기능 필수)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.api.v1.api import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan events for startup and shutdown.
    """
    # Startup: Initialize VectorWave connection
    print("🚀 Starting VectorSurfer 0.0.1 Backend...")
    
    # [추가] Check for OPENAI_API_KEY (required for Healer feature)
    if not settings.OPENAI_API_KEY:
        print("⚠️  WARNING: OPENAI_API_KEY is not set!")
        print("   └─ Healer (AI diagnosis) feature will not work without it.")
        print("   └─ Set OPENAI_API_KEY in your .env file or environment variables.")
    else:
        print("✅ OPENAI_API_KEY is configured")
    
    try:
        from vectorwave import initialize_database
        client = initialize_database()
        if client:
            print("✅ VectorWave database connected")
        else:
            print("⚠️ VectorWave database connection failed (will retry on requests)")
    except Exception as e:
        print(f"⚠️ VectorWave initialization error: {e}")
    
    yield
    
    # Shutdown: Cleanup
    print("👋 Shutting down VectorSurfer 0.0.1 Backend...")
    try:
        from vectorwave.database.db import get_cached_client
        client = get_cached_client()
        if client:
            client.close()
            print("✅ VectorWave connection closed")
    except Exception:
        pass


app = FastAPI(
    title="VectorSurfer 0.0.1",
    description="VectorWave Monitoring Dashboard API",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "name": "VectorSurfer 0.0.1",
        "status": "running",
        "version": "2.0.0"
    }


@app.get("/health")
async def health():
    """Detailed health check with DB status."""
    from vectorwave.utils.status import get_db_status
    
    db_status = get_db_status()
    
    # [추가] Healer 기능 사용 가능 여부 체크
    healer_available = bool(settings.OPENAI_API_KEY)
    
    return {
        "status": "healthy" if db_status else "degraded",
        "db_connected": db_status,
        "healer_available": healer_available,
        "version": "2.0.0"
    }
