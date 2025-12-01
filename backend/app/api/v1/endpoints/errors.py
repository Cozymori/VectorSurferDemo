"""
Errors Endpoints

Provides error analysis and semantic error search.
"""

from fastapi import APIRouter, Query
from typing import Optional, List

from app.dashboard import ErrorService

router = APIRouter()

_service: Optional[ErrorService] = None


def get_service() -> ErrorService:
    global _service
    if _service is None:
        _service = ErrorService()
    return _service


@router.get("")
async def get_errors(
    limit: int = Query(50, le=500, description="Maximum results"),
    function_name: Optional[str] = Query(None, description="Filter by function"),
    error_code: Optional[str] = Query(None, description="Filter by error code"),
    team: Optional[str] = Query(None, description="Filter by team"),
    time_range: Optional[int] = Query(None, description="Time range in minutes")
):
    """
    Returns error logs with optional filtering.
    
    Response:
        - items: List of error logs
        - total: int
        - filters_applied: dict
    """
    service = get_service()
    return service.get_errors(
        limit=limit,
        function_name=function_name,
        error_code=error_code,
        team=team,
        time_range_minutes=time_range
    )


@router.get("/search")
async def search_errors_semantic(
    q: str = Query(..., description="Error description to search"),
    limit: int = Query(10, le=50, description="Maximum results"),
    function_name: Optional[str] = Query(None, description="Filter by function")
):
    """
    Searches errors using semantic/vector similarity.
    
    Parameters:
        - q: Natural language description of the error
        - limit: Maximum results
        - function_name: Optional function filter
    
    Response:
        - query: str
        - items: List of matching errors with distance scores
        - total: int
    """
    service = get_service()
    return service.search_errors_semantic(
        query=q,
        limit=limit,
        function_name=function_name
    )


@router.get("/summary")
async def get_error_summary(
    time_range: int = Query(1440, description="Time range in minutes (default: 24h)")
):
    """
    Returns a summary of errors for the specified time range.
    
    Response:
        - total_errors: int
        - by_error_code: List of { error_code, count }
        - by_function: List of { function_name, count }
        - by_team: List of { team, count }
        - time_range_minutes: int
    """
    service = get_service()
    return service.get_error_summary(time_range_minutes=time_range)


@router.get("/trends")
async def get_error_trends(
    time_range: int = Query(1440, description="Time range in minutes"),
    bucket: int = Query(60, description="Bucket size in minutes")
):
    """
    Returns error counts over time for trend visualization.
    
    Response:
        List of { timestamp, count, error_codes: {...} }
    """
    service = get_service()
    return service.get_error_trends(
        time_range_minutes=time_range,
        bucket_size_minutes=bucket
    )
