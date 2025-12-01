"""
Healer Endpoints

Provides AI-powered bug diagnosis and fix suggestions.
"""

from fastapi import APIRouter, Query
from typing import Optional, List
from pydantic import BaseModel

from app.dashboard import HealerService

router = APIRouter()

_service: Optional[HealerService] = None


def get_service() -> HealerService:
    global _service
    if _service is None:
        _service = HealerService()
    return _service


class DiagnoseRequest(BaseModel):
    """Request body for diagnosis operations."""
    function_name: str
    lookback_minutes: int = 60


class BatchDiagnoseRequest(BaseModel):
    """Request body for batch diagnosis."""
    function_names: List[str]
    lookback_minutes: int = 60


@router.get("/functions")
async def get_healable_functions(
    time_range: int = Query(1440, description="Time range in minutes (default: 24h)")
):
    """
    Returns functions that have recent errors and are candidates for healing.
    
    Response:
        - items: List of { function_name, error_count, error_codes, latest_error_time }
        - total: int
        - time_range_minutes: int
    """
    service = get_service()
    return service.get_healable_functions(time_range_minutes=time_range)


@router.post("/diagnose")
async def diagnose_and_heal(request: DiagnoseRequest):
    """
    Diagnoses errors for a function and suggests fixes using LLM.
    
    Request Body:
        - function_name: Name of the function to diagnose
        - lookback_minutes: Time range to look for errors
    
    Response:
        - function_name: str
        - diagnosis: str
        - suggested_fix: str (code) or None
        - lookback_minutes: int
        - status: str ('success', 'no_errors', 'error')
    """
    service = get_service()
    return service.diagnose_and_heal(
        function_name=request.function_name,
        lookback_minutes=request.lookback_minutes
    )


@router.post("/diagnose/batch")
async def batch_diagnose(request: BatchDiagnoseRequest):
    """
    Diagnoses multiple functions in batch.
    
    Request Body:
        - function_names: List of function names
        - lookback_minutes: Time range for each
    
    Response:
        - results: List of { function_name, status, diagnosis_preview }
        - total: int
        - succeeded: int
        - failed: int
    """
    service = get_service()
    return service.batch_diagnose(
        function_names=request.function_names,
        lookback_minutes=request.lookback_minutes
    )


@router.get("/diagnose/{function_name}")
async def diagnose_function(
    function_name: str,
    lookback: int = Query(60, description="Lookback time in minutes")
):
    """
    GET endpoint for quick diagnosis (convenience method).
    
    Parameters:
        - function_name: Name of the function to diagnose
        - lookback: Time range in minutes
    """
    service = get_service()
    return service.diagnose_and_heal(
        function_name=function_name,
        lookback_minutes=lookback
    )
