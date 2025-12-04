"""
Healer Endpoints

Provides AI-powered bug diagnosis and fix suggestions.

[수정사항]
1. batch_diagnose 엔드포인트를 async로 변경하여 병렬 처리 활용
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
    Diagnoses multiple functions in batch using parallel processing.
    
    [수정사항]
    - 비동기 병렬 처리로 성능 개선
    - 동시 실행 수 제한으로 rate limit 방지
    - 개별 진단에 타임아웃 적용
    
    Request Body:
        - function_names: List of function names
        - lookback_minutes: Time range for each
    
    Response:
        - results: List of { function_name, status, diagnosis_preview }
        - total: int
        - succeeded: int
        - failed: int
        - execution_mode: str ('parallel_async')
        - max_concurrent: int
    """
    service = get_service()
    # [수정] 직접 async 메서드 호출
    return await service.batch_diagnose_async(
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
