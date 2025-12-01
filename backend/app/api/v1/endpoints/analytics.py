"""
Analytics Endpoints

Provides KPI metrics, timelines, and overview data for the dashboard.
"""

from fastapi import APIRouter, Query
from typing import Optional
from app.dashboard import DashboardOverviewService

router = APIRouter()

# Service instance (singleton pattern)
_service: Optional[DashboardOverviewService] = None


def get_service() -> DashboardOverviewService:
    """Lazy initialization of service."""
    global _service
    if _service is None:
        _service = DashboardOverviewService()
    return _service


@router.get("/status")
async def get_system_status():
    """
    Returns the overall system health status.
    
    Response:
        - db_connected: bool
        - registered_functions_count: int
        - last_checked: str (ISO format)
    """
    service = get_service()
    return service.get_system_status()


@router.get("/kpi")
async def get_kpi_metrics(
    range: int = Query(60, alias="range", description="Time range in minutes")
):
    """
    Returns key performance indicators (KPIs).
    
    Parameters:
        - range: Time range in minutes (default: 60)
    
    Response:
        - total_executions: int
        - success_count: int
        - error_count: int
        - cache_hit_count: int
        - success_rate: float (0-100)
        - avg_duration_ms: float
    """
    service = get_service()
    return service.get_kpi_metrics(time_range_minutes=range)


@router.get("/tokens")
async def get_token_usage():
    """
    Returns token usage statistics.
    
    Response:
        - total_tokens: int
        - by_category: { category_name: int, ... }
    """
    service = get_service()
    return service.get_token_usage()


@router.get("/timeline")
async def get_execution_timeline(
    range: int = Query(60, description="Time range in minutes"),
    bucket: int = Query(5, description="Bucket size in minutes")
):
    """
    Returns execution counts over time for timeline charts.
    
    Parameters:
        - range: Total time range in minutes
        - bucket: Size of each time bucket in minutes
    
    Response:
        List of { timestamp, success, error, cache_hit }
    """
    service = get_service()
    return service.get_execution_timeline(
        time_range_minutes=range,
        bucket_size_minutes=bucket
    )


@router.get("/distribution/functions")
async def get_function_distribution(
    limit: int = Query(10, description="Maximum number of functions")
):
    """
    Returns execution count by function name for pie/donut charts.
    
    Response:
        List of { function_name, count, percentage }
    """
    service = get_service()
    return service.get_function_distribution(limit=limit)


@router.get("/distribution/errors")
async def get_error_code_distribution(
    range: int = Query(1440, description="Time range in minutes (default: 24h)")
):
    """
    Returns error count by error_code.
    
    Response:
        List of { error_code, count, percentage }
    """
    service = get_service()
    return service.get_error_code_distribution(time_range_minutes=range)
