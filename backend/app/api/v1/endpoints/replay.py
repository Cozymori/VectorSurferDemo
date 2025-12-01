"""
Replay Endpoints

Provides regression testing (replay) functionality.
"""

from fastapi import APIRouter, Query
from typing import Optional
from pydantic import BaseModel

from app.dashboard import ReplayService

router = APIRouter()

_service: Optional[ReplayService] = None


def get_service() -> ReplayService:
    global _service
    if _service is None:
        _service = ReplayService()
    return _service


class ReplayRequest(BaseModel):
    """Request body for replay operations."""
    function_full_name: str
    limit: int = 10
    update_baseline: bool = False


class SemanticReplayRequest(BaseModel):
    """Request body for semantic replay operations."""
    function_full_name: str
    limit: int = 10
    update_baseline: bool = False
    similarity_threshold: Optional[float] = None
    semantic_eval: bool = False


@router.get("/functions")
async def get_replayable_functions():
    """
    Returns a list of functions that have replay-enabled logs.
    
    Response:
        - items: List of { function_name, log_count, latest_timestamp }
        - total: int
    """
    service = get_service()
    return service.get_replayable_functions()


@router.post("/run")
async def run_replay(request: ReplayRequest):
    """
    Runs basic replay (exact match comparison) for a function.
    
    Request Body:
        - function_full_name: Full module path (e.g., 'module.function_name')
        - limit: Maximum number of test cases
        - update_baseline: Whether to update baseline on mismatch
    
    Response:
        - function: str
        - total: int
        - passed: int
        - failed: int
        - updated: int
        - failures: List of failure details
    """
    service = get_service()
    return service.run_replay(
        function_full_name=request.function_full_name,
        limit=request.limit,
        update_baseline=request.update_baseline
    )


@router.post("/run/semantic")
async def run_semantic_replay(request: SemanticReplayRequest):
    """
    Runs semantic replay (vector/LLM comparison) for a function.
    
    Request Body:
        - function_full_name: Full module path
        - limit: Maximum test cases
        - update_baseline: Update on mismatch
        - similarity_threshold: Vector similarity threshold (0-1)
        - semantic_eval: Use LLM for comparison
    
    Response:
        - function: str
        - mode: str ('exact', 'vector', 'llm')
        - total: int
        - passed: int
        - failed: int
        - updated: int
        - failures: List of failure details with diff_html
    """
    service = get_service()
    return service.run_semantic_replay(
        function_full_name=request.function_full_name,
        limit=request.limit,
        update_baseline=request.update_baseline,
        similarity_threshold=request.similarity_threshold,
        semantic_eval=request.semantic_eval
    )
