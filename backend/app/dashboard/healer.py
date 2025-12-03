"""
Healer Service

Provides AI-powered bug diagnosis and fix suggestions.
Based on: test_ex/healing.py
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List

from vectorwave.utils.healer import VectorWaveHealer
from vectorwave.search.execution_search import find_executions
from vectorwave.models.db_config import get_weaviate_settings

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
        
        Args:
            time_range_minutes: Time range to look for errors (default: 24 hours)
            
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
            time_limit = (datetime.now(timezone.utc) - timedelta(minutes=time_range_minutes)).isoformat()
            
            errors = find_executions(
                filters={
                    "status": "ERROR",
                    "timestamp_utc__gte": time_limit
                },
                limit=10000,
                sort_by="timestamp_utc",
                sort_ascending=False
            )
            
            # Group by function
            func_map: Dict[str, Dict] = {}
            for error in errors:
                func_name = error.get('function_name')
                if not func_name:
                    continue
                
                if func_name not in func_map:
                    func_map[func_name] = {
                        "function_name": func_name,
                        "error_count": 0,
                        "error_codes": set(),
                        "latest_error_time": error.get('timestamp_utc')
                    }
                
                func_map[func_name]["error_count"] += 1
                error_code = error.get('error_code')
                if error_code:
                    func_map[func_name]["error_codes"].add(error_code)
            
            # Convert sets to lists
            items = []
            for func_data in func_map.values():
                func_data["error_codes"] = list(func_data["error_codes"])
                items.append(func_data)
            
            # Sort by error count
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
        Diagnoses multiple functions in batch.
        
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
