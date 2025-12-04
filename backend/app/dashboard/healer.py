"""
Healer Service

Provides AI-powered bug diagnosis and fix suggestions.
Based on: test_ex/healing.py

[수정사항]
- get_healable_functions: limit=10000 메모리 집계 → Weaviate Aggregate API 사용
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List

from vectorwave.utils.healer import VectorWaveHealer
from vectorwave.database.db import get_cached_client
from vectorwave.database.db_search import search_executions
from vectorwave.search.execution_search import find_executions
from vectorwave.models.db_config import get_weaviate_settings

import weaviate.classes.query as wvc_query
from weaviate.classes.aggregate import GroupByAggregate

logger = logging.getLogger(__name__)


class HealerService:
    """
    Provides AI-powered healing functionality for the dashboard.
    """

    def __init__(self, model: str = "gpt-4-turbo"):
        self.settings = get_weaviate_settings()
        self.model = model
        self._healer: Optional[VectorWaveHealer] = None

    def _get_healer(self) -> VectorWaveHealer:
        """Lazy initialization of healer."""
        if self._healer is None:
            self._healer = VectorWaveHealer(model=self.model)
        return self._healer

    def _get_execution_collection(self):
        """Returns the execution collection for aggregate queries."""
        client = get_cached_client()
        return client.collections.get(self.settings.EXECUTION_COLLECTION_NAME)

    def diagnose_and_heal(
            self,
            function_name: str,
            lookback_minutes: int = 60
    ) -> Dict[str, Any]:
        """
        Diagnoses errors for a function and suggests fixes.
        Based on: test_ex/healing.py
        
        Args:
            function_name: Name of the function to diagnose
            lookback_minutes: Time range to look for errors
            
        Returns:
            {
                "function_name": str,
                "diagnosis": str,
                "suggested_fix": str (code),
                "lookback_minutes": int,
                "status": str ('success', 'no_errors', 'error')
            }
        """
        try:
            healer = self._get_healer()

            result = healer.diagnose_and_heal(
                function_name=function_name,
                lookback_minutes=lookback_minutes
            )

            # Parse result to determine status
            if "No errors found" in result or "✅" in result:
                status = "no_errors"
                diagnosis = result
                suggested_fix = None
            elif "❌" in result or "Error" in result.split('\n')[0]:
                status = "error"
                diagnosis = result
                suggested_fix = None
            else:
                status = "success"
                # Extract code block if present
                diagnosis = "Analysis complete. See suggested fix."
                suggested_fix = result

            return {
                "function_name": function_name,
                "diagnosis": diagnosis,
                "suggested_fix": suggested_fix,
                "lookback_minutes": lookback_minutes,
                "status": status
            }

        except Exception as e:
            logger.error(f"Failed to diagnose {function_name}: {e}")
            return {
                "function_name": function_name,
                "diagnosis": f"Diagnosis failed: {str(e)}",
                "suggested_fix": None,
                "lookback_minutes": lookback_minutes,
                "status": "error",
                "error": str(e)
            }

    def get_healable_functions(
            self,
            time_range_minutes: int = 1440
    ) -> Dict[str, Any]:
        """
        Returns functions that have recent errors and are candidates for healing.
        [수정] Weaviate Aggregate API 사용하여 DB 레벨에서 집계
        
        Args:
            time_range_minutes: Time range to look for errors (default: 24 hours).
                              If <= 0, fetches all errors without time limit.

        Returns:
            {
                "items": [
                    {
                        "function_name": str,
                        "error_count": int,
                        "error_codes": [str, ...],
                        "latest_error_time": str
                    },
                    ...
                ],
                "total": int,
                "time_range_minutes": int
            }
        """
        try:
            collection = self._get_execution_collection()
            
            # 기본 필터: ERROR 상태
            base_filter = wvc_query.Filter.by_property("status").equal("ERROR")
            
            # time_range_minutes가 양수일 때만 시간 필터 적용
            if time_range_minutes > 0:
                time_limit = (datetime.now(timezone.utc) - timedelta(minutes=time_range_minutes))
                base_filter = base_filter & wvc_query.Filter.by_property("timestamp_utc").greater_or_equal(time_limit)
            
            # 1. function_name별 에러 카운트 (Aggregate)
            func_result = collection.aggregate.over_all(
                filters=base_filter,
                group_by=GroupByAggregate(prop="function_name"),
                total_count=True
            )
            
            # function별 에러 카운트 맵 생성
            func_error_counts: Dict[str, int] = {}
            for group in func_result.groups:
                func_name = group.grouped_by.value
                if func_name:
                    func_error_counts[func_name] = group.total_count or 0
            
            # 2. 각 함수별 error_codes와 latest_error_time 조회
            # (이 부분은 추가 쿼리 필요 - Aggregate만으로는 error_codes 목록을 얻기 어려움)
            items = []
            
            for func_name, error_count in func_error_counts.items():
                # 해당 함수의 최근 에러 로그 몇 개만 조회하여 error_codes 수집
                func_filter = base_filter & wvc_query.Filter.by_property("function_name").equal(func_name)
                
                # error_code별 집계
                code_result = collection.aggregate.over_all(
                    filters=func_filter,
                    group_by=GroupByAggregate(prop="error_code"),
                    total_count=True
                )
                
                error_codes = set()
                for group in code_result.groups:
                    code = group.grouped_by.value
                    if code:
                        error_codes.add(code)
                
                # 최신 에러 시간 조회 (1개만)
                latest_errors = search_executions(
                    limit=1,
                    filters={
                        "function_name": func_name,
                        "status": "ERROR"
                    },
                    sort_by="timestamp_utc",
                    sort_ascending=False
                )
                
                latest_time = None
                if latest_errors:
                    latest_time = latest_errors[0].get('timestamp_utc')
                
                items.append({
                    "function_name": func_name,
                    "error_count": error_count,
                    "error_codes": list(error_codes),
                    "latest_error_time": latest_time
                })
            
            # error_count 기준 내림차순 정렬
            items.sort(key=lambda x: x["error_count"], reverse=True)

            return {
                "items": items,
                "total": len(items),
                "time_range_minutes": time_range_minutes
            }

        except Exception as e:
            logger.error(f"Failed to get healable functions: {e}")
            return {
                "items": [],
                "total": 0,
                "time_range_minutes": time_range_minutes,
                "error": str(e)
            }

    def batch_diagnose(
            self,
            function_names: List[str],
            lookback_minutes: int = 60
    ) -> Dict[str, Any]:
        """
        Diagnoses multiple functions in batch (synchronous version).

        Args:
            function_names: List of function names to diagnose
            lookback_minutes: Time range to look for errors

        Returns:
            {
                "results": [
                    {
                        "function_name": str,
                        "status": str,
                        "diagnosis_preview": str (first 200 chars)
                    },
                    ...
                ],
                "total": int,
                "succeeded": int,
                "failed": int
            }
        """
        results = []
        succeeded = 0
        failed = 0

        for func_name in function_names:
            try:
                diagnosis_result = self.diagnose_and_heal(
                    function_name=func_name,
                    lookback_minutes=lookback_minutes
                )

                results.append({
                    "function_name": func_name,
                    "status": diagnosis_result["status"],
                    "diagnosis_preview": (diagnosis_result.get("diagnosis", "")[:200] + "...")
                    if diagnosis_result.get("diagnosis") else ""
                })

                if diagnosis_result["status"] in ["success", "no_errors"]:
                    succeeded += 1
                else:
                    failed += 1

            except Exception as e:
                logger.error(f"Batch diagnosis failed for {func_name}: {e}")
                results.append({
                    "function_name": func_name,
                    "status": "error",
                    "diagnosis_preview": str(e)
                })
                failed += 1

        return {
            "results": results,
            "total": len(function_names),
            "succeeded": succeeded,
            "failed": failed
        }

    async def batch_diagnose_async(
            self,
            function_names: List[str],
            lookback_minutes: int = 60,
            max_concurrent: int = 3,
            timeout_seconds: int = 60
    ) -> Dict[str, Any]:
        """
        Diagnoses multiple functions in batch with async parallel processing.
        
        [High Priority Fix] 동기식 순차 처리 → 비동기 병렬 처리
        - asyncio.gather로 병렬 실행
        - Semaphore로 동시 실행 수 제한 (기본 3개)
        - 개별 타임아웃 적용 (기본 60초)

        Args:
            function_names: List of function names to diagnose
            lookback_minutes: Time range to look for errors
            max_concurrent: Maximum concurrent diagnoses (default: 3)
            timeout_seconds: Timeout per diagnosis in seconds (default: 60)

        Returns:
            {
                "results": [...],
                "total": int,
                "succeeded": int,
                "failed": int
            }
        """
        import asyncio
        from concurrent.futures import ThreadPoolExecutor
        
        semaphore = asyncio.Semaphore(max_concurrent)
        executor = ThreadPoolExecutor(max_workers=max_concurrent)
        
        async def diagnose_with_limit(func_name: str) -> Dict[str, Any]:
            """단일 함수 진단 (세마포어 + 타임아웃 적용)"""
            async with semaphore:
                try:
                    loop = asyncio.get_event_loop()
                    # 동기 함수를 executor에서 실행
                    diagnosis_result = await asyncio.wait_for(
                        loop.run_in_executor(
                            executor,
                            lambda: self.diagnose_and_heal(
                                function_name=func_name,
                                lookback_minutes=lookback_minutes
                            )
                        ),
                        timeout=timeout_seconds
                    )
                    
                    return {
                        "function_name": func_name,
                        "status": diagnosis_result["status"],
                        "diagnosis": diagnosis_result.get("diagnosis", ""),
                        "diagnosis_preview": (diagnosis_result.get("diagnosis", "")[:200] + "...")
                        if diagnosis_result.get("diagnosis") else ""
                    }
                    
                except asyncio.TimeoutError:
                    logger.warning(f"Diagnosis timeout for {func_name} after {timeout_seconds}s")
                    return {
                        "function_name": func_name,
                        "status": "error",
                        "diagnosis": f"Diagnosis timed out after {timeout_seconds} seconds",
                        "diagnosis_preview": f"Timeout after {timeout_seconds}s"
                    }
                except Exception as e:
                    logger.error(f"Batch diagnosis failed for {func_name}: {e}")
                    return {
                        "function_name": func_name,
                        "status": "error",
                        "diagnosis": str(e),
                        "diagnosis_preview": str(e)[:200]
                    }
        
        try:
            # 모든 진단을 병렬로 실행
            tasks = [diagnose_with_limit(fn) for fn in function_names]
            results = await asyncio.gather(*tasks, return_exceptions=False)
            
            # 결과 집계
            succeeded = sum(1 for r in results if r["status"] in ["success", "no_errors"])
            failed = len(results) - succeeded
            
            return {
                "results": results,
                "total": len(function_names),
                "succeeded": succeeded,
                "failed": failed
            }
            
        finally:
            executor.shutdown(wait=False)
