"""
Error Service

Provides error analysis and semantic error search.
Based on: test_ex/advanced_search.py (Scenario 5), test_ex/check_all_errors.py
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List

from vectorwave.database.db_search import search_executions, search_errors_by_message
from vectorwave.search.execution_search import find_executions, find_recent_errors
from vectorwave.models.db_config import get_weaviate_settings

logger = logging.getLogger(__name__)


class ErrorService:
    """
    Provides error management and analysis for the dashboard.
    """

    def __init__(self):
        self.settings = get_weaviate_settings()

    def get_errors(
        self,
        limit: int = 50,
        function_name: Optional[str] = None,
        error_code: Optional[str] = None,
        error_codes: Optional[List[str]] = None,
        team: Optional[str] = None,
        time_range_minutes: Optional[int] = None,
        sort_by: str = "timestamp_utc",
        sort_ascending: bool = False
    ) -> Dict[str, Any]:
        """
        Returns error logs with optional filtering.
        Based on: test_ex/check_all_errors.py
        
        Args:
            limit: Maximum number of results
            function_name: Filter by function name
            error_code: Filter by single error code
            error_codes: Filter by multiple error codes
            team: Filter by team
            time_range_minutes: Filter by time range
            sort_by: Field to sort by
            sort_ascending: Sort direction
            
        Returns:
            {
                "items": [...],
                "total": int,
                "filters_applied": dict
            }
        """
        try:
            filters = {"status": "ERROR"}
            
            if function_name:
                filters["function_name"] = function_name
            if error_code:
                filters["error_code"] = error_code
            elif error_codes:
                filters["error_code"] = error_codes
            if team:
                filters["team"] = team
            if time_range_minutes:
                time_limit = (datetime.now(timezone.utc) - timedelta(minutes=time_range_minutes)).isoformat()
                filters["timestamp_utc__gte"] = time_limit
            
            errors = find_executions(
                filters=filters,
                limit=limit,
                sort_by=sort_by,
                sort_ascending=sort_ascending
            )
            
            items = [self._serialize_error(e) for e in errors]
            
            return {
                "items": items,
                "total": len(items),
                "filters_applied": {
                    "function_name": function_name,
                    "error_code": error_code or error_codes,
                    "team": team,
                    "time_range_minutes": time_range_minutes
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get errors: {e}")
            return {
                "items": [],
                "total": 0,
                "error": str(e)
            }

    def search_errors_semantic(
        self,
        query: str,
        limit: int = 10,
        function_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Searches errors using semantic/vector similarity.
        Based on: test_ex/advanced_search.py - Scenario 5
        
        Args:
            query: Natural language description of the error
            limit: Maximum number of results
            function_name: Optional function name filter
            
        Returns:
            {
                "query": str,
                "items": [...],
                "total": int
            }
        """
        try:
            filters = {}
            if function_name:
                filters["function_name"] = function_name
            
            results = search_errors_by_message(
                query=query,
                limit=limit,
                filters=filters if filters else None
            )
            
            items = []
            for result in results:
                error_msg = result['properties'].get('error_message', '')
                # Extract last line (actual error) from full traceback
                simple_msg = error_msg.strip().split('\n')[-1] if error_msg else 'N/A'
                
                items.append({
                    "uuid": str(result.get('uuid', '')),
                    "function_name": result['properties'].get('function_name'),
                    "error_code": result['properties'].get('error_code'),
                    "error_message": simple_msg,
                    "error_message_full": error_msg,
                    "timestamp_utc": result['properties'].get('timestamp_utc'),
                    "trace_id": result['properties'].get('trace_id'),
                    "span_id": result['properties'].get('span_id'),
                    "distance": result['metadata'].distance if result.get('metadata') else None
                })
            
            return {
                "query": query,
                "items": items,
                "total": len(items)
            }
            
        except Exception as e:
            logger.error(f"Failed to search errors semantically: {e}")
            return {
                "query": query,
                "items": [],
                "total": 0,
                "error": str(e)
            }

    def get_error_summary(self, time_range_minutes: int = 1440) -> Dict[str, Any]:
        """
        Returns a summary of errors for the specified time range.
        
        Args:
            time_range_minutes: Time range in minutes (default: 24 hours)
            
        Returns:
            {
                "total_errors": int,
                "by_error_code": [...],
                "by_function": [...],
                "by_team": [...],
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
            
            # Aggregate by error_code
            code_counts: Dict[str, int] = {}
            func_counts: Dict[str, int] = {}
            team_counts: Dict[str, int] = {}
            
            for error in errors:
                code = error.get('error_code', 'UNKNOWN')
                func = error.get('function_name', 'unknown')
                team = error.get('team', 'unassigned')
                
                code_counts[code] = code_counts.get(code, 0) + 1
                func_counts[func] = func_counts.get(func, 0) + 1
                team_counts[team] = team_counts.get(team, 0) + 1
            
            return {
                "total_errors": len(errors),
                "by_error_code": [
                    {"error_code": k, "count": v}
                    for k, v in sorted(code_counts.items(), key=lambda x: x[1], reverse=True)
                ],
                "by_function": [
                    {"function_name": k, "count": v}
                    for k, v in sorted(func_counts.items(), key=lambda x: x[1], reverse=True)[:10]
                ],
                "by_team": [
                    {"team": k, "count": v}
                    for k, v in sorted(team_counts.items(), key=lambda x: x[1], reverse=True)
                ],
                "time_range_minutes": time_range_minutes
            }
            
        except Exception as e:
            logger.error(f"Failed to get error summary: {e}")
            return {
                "total_errors": 0,
                "by_error_code": [],
                "by_function": [],
                "by_team": [],
                "time_range_minutes": time_range_minutes,
                "error": str(e)
            }

    def get_error_trends(
        self,
        time_range_minutes: int = 1440,
        bucket_size_minutes: int = 60
    ) -> List[Dict[str, Any]]:
        """
        Returns error counts over time for trend visualization.
        
        Args:
            time_range_minutes: Total time range
            bucket_size_minutes: Size of each time bucket
            
        Returns:
            [
                {"timestamp": str, "count": int, "error_codes": {...}},
                ...
            ]
        """
        try:
            now = datetime.now(timezone.utc)
            time_limit = now - timedelta(minutes=time_range_minutes)
            
            errors = find_executions(
                filters={
                    "status": "ERROR",
                    "timestamp_utc__gte": time_limit.isoformat()
                },
                limit=10000,
                sort_by="timestamp_utc",
                sort_ascending=True
            )
            
            # Create time buckets
            num_buckets = time_range_minutes // bucket_size_minutes
            buckets = []
            
            for i in range(num_buckets):
                bucket_start = time_limit + timedelta(minutes=i * bucket_size_minutes)
                bucket_end = bucket_start + timedelta(minutes=bucket_size_minutes)
                
                bucket_errors = []
                for error in errors:
                    timestamp_str = error.get('timestamp_utc', '')
                    if not timestamp_str:
                        continue
                    
                    if isinstance(timestamp_str, str):
                        try:
                            timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                        except ValueError:
                            continue
                    else:
                        timestamp = timestamp_str
                    
                    if bucket_start <= timestamp < bucket_end:
                        bucket_errors.append(error)
                
                # Count by error_code within bucket
                code_counts = {}
                for error in bucket_errors:
                    code = error.get('error_code', 'UNKNOWN')
                    code_counts[code] = code_counts.get(code, 0) + 1
                
                buckets.append({
                    "timestamp": bucket_start.isoformat(),
                    "count": len(bucket_errors),
                    "error_codes": code_counts
                })
            
            return buckets
            
        except Exception as e:
            logger.error(f"Failed to get error trends: {e}")
            return []

    def _serialize_error(self, error: Dict[str, Any]) -> Dict[str, Any]:
        """
        Serializes an error log for JSON response.
        Extracts and simplifies error message.
        """
        error_msg = error.get('error_message', '')
        simple_msg = error_msg.strip().split('\n')[-1] if error_msg else 'N/A'
        
        return {
            "span_id": error.get('span_id'),
            "trace_id": error.get('trace_id'),
            "function_name": error.get('function_name'),
            "error_code": error.get('error_code'),
            "error_message": simple_msg,
            "error_message_full": error_msg,
            "timestamp_utc": error.get('timestamp_utc'),
            "duration_ms": error.get('duration_ms'),
            "team": error.get('team'),
            "run_id": error.get('run_id')
        }
