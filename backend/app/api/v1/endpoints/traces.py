"""
Traces Endpoints

Provides distributed tracing and workflow visualization.
"""

from fastapi import APIRouter, Query
from typing import Optional

from app.dashboard import TraceService

router = APIRouter()

_service: Optional[TraceService] = None


def get_service() -> TraceService:
    global _service
    if _service is None:
        _service = TraceService()
    return _service


@router.get("")
async def get_recent_traces(
    limit: int = Query(20, le=100, description="Maximum traces")
):
    """
    Returns a list of recent unique traces.
    
    Response:
        List of {
            trace_id, root_function, start_time,
            total_duration_ms, span_count, status
        }
    """
    service = get_service()
    return service.get_recent_traces(limit=limit)


@router.get("/{trace_id}")
async def get_trace(trace_id: str):
    """
    Returns all spans for a specific trace ID (waterfall view data).
    
    Response:
        - trace_id: str
        - spans: List of processed spans
        - span_count: int
        - total_duration_ms: float
        - start_time: str
        - status: str (SUCCESS, ERROR, PARTIAL, NOT_FOUND)
    """
    service = get_service()
    return service.get_trace(trace_id)


@router.get("/{trace_id}/tree")
async def get_trace_tree(trace_id: str):
    """
    Returns spans organized as a hierarchical tree.
    Useful for tree-view UI components.
    
    Response:
        - trace_id: str
        - tree: Nested list with 'children' field
    """
    service = get_service()
    trace = service.get_trace(trace_id)
    
    if trace["status"] == "NOT_FOUND":
        return {"trace_id": trace_id, "tree": [], "error": "Trace not found"}
    
    tree = service.build_span_tree(trace["spans"])
    
    return {
        "trace_id": trace_id,
        "tree": tree,
        "total_duration_ms": trace["total_duration_ms"],
        "status": trace["status"]
    }


@router.get("/{trace_id}/analyze")
async def analyze_trace(
    trace_id: str,
    language: str = Query("en", description="Response language: 'en' or 'ko'")
):
    """
    Uses LLM to analyze a trace and provide insights.
    
    Parameters:
        - trace_id: The trace to analyze
        - language: Response language ('en' or 'ko')
    
    Response:
        - trace_id: str
        - analysis: str (LLM-generated analysis)
        - language: str
    """
    service = get_service()
    return service.analyze_trace(trace_id=trace_id, language=language)
