"""
API Router Integration

Combines all endpoint routers into a single API router.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    analytics,
    executions,
    traces,
    functions,
    errors,
    replay,
    healer
)

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(
    analytics.router,
    prefix="/analytics",
    tags=["Analytics"]
)

api_router.include_router(
    executions.router,
    prefix="/executions",
    tags=["Executions"]
)

api_router.include_router(
    traces.router,
    prefix="/traces",
    tags=["Traces"]
)

api_router.include_router(
    functions.router,
    prefix="/functions",
    tags=["Functions"]
)

api_router.include_router(
    errors.router,
    prefix="/errors",
    tags=["Errors"]
)

api_router.include_router(
    replay.router,
    prefix="/replay",
    tags=["Replay"]
)

api_router.include_router(
    healer.router,
    prefix="/healer",
    tags=["Healer"]
)
