"""
Execution Service

Provides execution log querying with filtering, sorting, and pagination.
Based on: test_ex/search.py, test_ex/advanced_search.py
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List

from vectorwave.database.db_search import search_executions
from vectorwave.search.execution_search import (
    find_executions,
    find_recent_errors,
    find_slowest_executions
)
from vectorwave.models.db_config import get_weaviate_settings

logger = logging.getLogger(__name__)


class ExecutionService:
    """
    Provides execution log management for the dashboard.
    """

    def __init__(self):
        self.settings = get_weaviate_settings()

    def get_executions(
        self,
        limit: int = 50,
        offset: int = 0,
        status: Optional[str] = None,
        function_name: Optional[str] = None,
        team: Optional[str] = None,
        error_code: Optional[str] = None,
        time_range_minutes: Optional[int] = None,
        sort_by: str = "timestamp_utc",
        sort_ascending: bool = False
    ) -> Dict[str, Any]:
        """
        Returns paginated execution logs with optional filtering.
        
        Args:
            limit: Maximum number of results
            offset: Number of results to skip (for pagination)
            status: Filter by status ('SUCCESS', 'ERROR', 'CACHE_HIT')
            function_name: Filter by function name
            team: Filter by team tag
            error_code: Filter by error code
            time_range_minutes: Filter by time range
            sort_by: Field to sort by
            sort_ascending: Sort direction
            
        Returns:
            {
                "items": [...],
                "total": int (estimated),
                "limit": int,
                "offset": int
            }
        """
        try:
            filters = {}
            
            if status:
                filters["status"] = status
            if function_name:
                filters["function_name"] = function_name
            if team:
                filters["team"] = team
            if error_code:
                filters["error_code"] = error_code
            if time_range_minutes:
                time_limit = (datetime.now(timezone.utc) - timedelta(minutes=time_range_minutes)).isoformat()
                filters["timestamp_utc__gte"] = time_limit
            
            # Note: Weaviate doesn't support true offset pagination
            # We fetch more and slice (not ideal for large datasets)
            fetch_limit = limit + offset
            
            executions = find_executions(
                filters=filters if filters else None,
                limit=fetch_limit,
                sort_by=sort_by,
                sort_ascending=sort_ascending
            )
            
            # Apply offset
            paginated = executions[offset:offset + limit]
            
            # Serialize for JSON response
            items = [self._serialize_execution(e) for e in paginated]
            
            return {
                "items": items,
                "total": len(executions),  # This is an estimate
                "limit": limit,
                "offset": offset
            }
            
        except Exception as e:
            logger.error(f"Failed to get executions: {e}")
            return {
                "items": [],
                "total": 0,
                "limit": limit,
                "offset": offset,
                "error": str(e)
            }

    def get_recent_errors(
        self,
        minutes_ago: int = 60,
        limit: int = 20,
        error_codes: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Returns recent error logs.
        Based on: test_ex/advanced_search.py - find_recent_errors
        
        Args:
            minutes_ago: Time range in minutes
            limit: Maximum number of results
            error_codes: Filter by specific error codes
            
        Returns:
            {
                "items": [...],
                "total": int,
                "time_range_minutes": int
            }
        """
        try:
            errors = find_recent_errors(
                minutes_ago=minutes_ago,
                limit=limit,
                error_codes=error_codes
            )
            
            items = [self._serialize_execution(e) for e in errors]
            
            return {
                "items": items,
                "total": len(items),
                "time_range_minutes": minutes_ago
            }
            
        except Exception as e:
            logger.error(f"Failed to get recent errors: {e}")
            return {
                "items": [],
                "total": 0,
                "time_range_minutes": minutes_ago,
                "error": str(e)
            }

    def get_slowest_executions(
        self,
        limit: int = 10,
        min_duration_ms: float = 0.0
    ) -> Dict[str, Any]:
        """
        Returns the slowest execution logs.
        Based on: test_ex/advanced_search.py - find_slowest_executions
        
        Args:
            limit: Maximum number of results
            min_duration_ms: Minimum duration threshold
            
        Returns:
            {
                "items": [...],
                "total": int
            }
        """
        try:
            slowest = find_slowest_executions(
                limit=limit,
                min_duration_ms=min_duration_ms
            )
            
            items = [self._serialize_execution(e) for e in slowest]
            
            return {
                "items": items,
                "total": len(items)
            }
            
        except Exception as e:
            logger.error(f"Failed to get slowest executions: {e}")
            return {
                "items": [],
                "total": 0,
                "error": str(e)
            }

    def get_execution_by_id(self, span_id: str) -> Optional[Dict[str, Any]]:
        """
        Returns a single execution log by span_id.
        
        Args:
            span_id: The span ID to look up
            
        Returns:
            Execution log dict or None if not found
        """
        try:
            executions = search_executions(
                limit=1,
                filters={"span_id": span_id}
            )
            
            if executions:
                return self._serialize_execution(executions[0])
            return None
            
        except Exception as e:
            logger.error(f"Failed to get execution by ID: {e}")
            return None

    def _serialize_execution(self, execution: Dict[str, Any]) -> Dict[str, Any]:
        """
        Ensures execution data is JSON-serializable.
        """
        serialized = {}
        
        for key, value in execution.items():
            if isinstance(value, datetime):
                serialized[key] = value.isoformat()
            elif hasattr(value, '__str__'):
                serialized[key] = str(value)
            else:
                serialized[key] = value
        
        return serialized
