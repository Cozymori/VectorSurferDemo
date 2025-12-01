"""
Dashboard Overview Service

Provides aggregated statistics and KPIs for the dashboard overview page.
Based on: test_ex/token_usage_demo.py, test_ex/advanced_search.py
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List

from vectorwave.database.db import get_cached_client
from vectorwave.database.db_search import search_executions, get_token_usage_stats
from vectorwave.models.db_config import get_weaviate_settings
from vectorwave.utils.status import get_db_status, get_registered_functions

logger = logging.getLogger(__name__)


class DashboardOverviewService:
    """
    Provides aggregated metrics and KPIs for the dashboard overview.
    """

    def __init__(self):
        self.settings = get_weaviate_settings()

    def get_system_status(self) -> Dict[str, Any]:
        """
        Returns the overall system health status.
        
        Returns:
            {
                "db_connected": bool,
                "registered_functions_count": int,
                "last_checked": str (ISO format)
            }
        """
        try:
            db_status = get_db_status()
            functions = get_registered_functions() if db_status else []
            
            return {
                "db_connected": db_status,
                "registered_functions_count": len(functions),
                "last_checked": datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"Failed to get system status: {e}")
            return {
                "db_connected": False,
                "registered_functions_count": 0,
                "last_checked": datetime.now(timezone.utc).isoformat(),
                "error": str(e)
            }

    def get_kpi_metrics(self, time_range_minutes: int = 60) -> Dict[str, Any]:
        """
        Returns key performance indicators for the specified time range.
        
        Args:
            time_range_minutes: Time range in minutes (default: 60)
            
        Returns:
            {
                "total_executions": int,
                "success_count": int,
                "error_count": int,
                "success_rate": float (0-100),
                "avg_duration_ms": float,
                "time_range_minutes": int
            }
        """
        try:
            time_limit = (datetime.now(timezone.utc) - timedelta(minutes=time_range_minutes)).isoformat()
            
            # Get all executions in time range
            all_executions = search_executions(
                limit=10000,
                filters={"timestamp_utc__gte": time_limit},
                sort_by="timestamp_utc",
                sort_ascending=False
            )
            
            total = len(all_executions)
            success_count = sum(1 for e in all_executions if e.get('status') == 'SUCCESS')
            error_count = sum(1 for e in all_executions if e.get('status') == 'ERROR')
            cache_hit_count = sum(1 for e in all_executions if e.get('status') == 'CACHE_HIT')
            
            # Calculate average duration (excluding cache hits which have 0 duration)
            durations = [e.get('duration_ms', 0) for e in all_executions if e.get('status') != 'CACHE_HIT']
            avg_duration = sum(durations) / len(durations) if durations else 0
            
            success_rate = (success_count / total * 100) if total > 0 else 0
            
            return {
                "total_executions": total,
                "success_count": success_count,
                "error_count": error_count,
                "cache_hit_count": cache_hit_count,
                "success_rate": round(success_rate, 2),
                "avg_duration_ms": round(avg_duration, 2),
                "time_range_minutes": time_range_minutes
            }
            
        except Exception as e:
            logger.error(f"Failed to get KPI metrics: {e}")
            return {
                "total_executions": 0,
                "success_count": 0,
                "error_count": 0,
                "cache_hit_count": 0,
                "success_rate": 0,
                "avg_duration_ms": 0,
                "time_range_minutes": time_range_minutes,
                "error": str(e)
            }

    def get_token_usage(self) -> Dict[str, Any]:
        """
        Returns token usage statistics.
        Based on: test_ex/token_usage_demo.py
        
        Returns:
            {
                "total_tokens": int,
                "by_category": { "category_name": int, ... }
            }
        """
        try:
            stats = get_token_usage_stats()
            
            # Separate total from category breakdown
            total = stats.pop('total_tokens', 0)
            
            return {
                "total_tokens": total,
                "by_category": stats
            }
        except Exception as e:
            logger.error(f"Failed to get token usage: {e}")
            return {
                "total_tokens": 0,
                "by_category": {},
                "error": str(e)
            }

    def get_execution_timeline(
        self, 
        time_range_minutes: int = 60,
        bucket_size_minutes: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Returns execution counts grouped by time buckets for timeline charts.
        
        Args:
            time_range_minutes: Total time range to query
            bucket_size_minutes: Size of each time bucket
            
        Returns:
            [
                {
                    "timestamp": str (ISO format),
                    "success": int,
                    "error": int,
                    "cache_hit": int
                },
                ...
            ]
        """
        try:
            now = datetime.now(timezone.utc)
            time_limit = now - timedelta(minutes=time_range_minutes)
            
            all_executions = search_executions(
                limit=10000,
                filters={"timestamp_utc__gte": time_limit.isoformat()},
                sort_by="timestamp_utc",
                sort_ascending=True
            )
            
            # Create time buckets
            num_buckets = time_range_minutes // bucket_size_minutes
            buckets = []
            
            for i in range(num_buckets):
                bucket_start = time_limit + timedelta(minutes=i * bucket_size_minutes)
                bucket_end = bucket_start + timedelta(minutes=bucket_size_minutes)
                
                bucket_data = {
                    "timestamp": bucket_start.isoformat(),
                    "success": 0,
                    "error": 0,
                    "cache_hit": 0
                }
                
                for execution in all_executions:
                    exec_time_str = execution.get('timestamp_utc', '')
                    if not exec_time_str:
                        continue
                    
                    # Parse timestamp (handle both string and datetime)
                    if isinstance(exec_time_str, str):
                        try:
                            exec_time = datetime.fromisoformat(exec_time_str.replace('Z', '+00:00'))
                        except ValueError:
                            continue
                    else:
                        exec_time = exec_time_str
                    
                    if bucket_start <= exec_time < bucket_end:
                        status = execution.get('status', '')
                        if status == 'SUCCESS':
                            bucket_data['success'] += 1
                        elif status == 'ERROR':
                            bucket_data['error'] += 1
                        elif status == 'CACHE_HIT':
                            bucket_data['cache_hit'] += 1
                
                buckets.append(bucket_data)
            
            return buckets
            
        except Exception as e:
            logger.error(f"Failed to get execution timeline: {e}")
            return []

    def get_function_distribution(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Returns execution count by function name for pie/donut charts.
        
        Returns:
            [
                {"function_name": str, "count": int, "percentage": float},
                ...
            ]
        """
        try:
            # Get recent executions
            all_executions = search_executions(
                limit=10000,
                sort_by="timestamp_utc",
                sort_ascending=False
            )
            
            # Count by function
            func_counts: Dict[str, int] = {}
            for execution in all_executions:
                func_name = execution.get('function_name', 'unknown')
                func_counts[func_name] = func_counts.get(func_name, 0) + 1
            
            # Sort by count and limit
            sorted_funcs = sorted(func_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
            
            total = sum(count for _, count in sorted_funcs)
            
            return [
                {
                    "function_name": name,
                    "count": count,
                    "percentage": round(count / total * 100, 2) if total > 0 else 0
                }
                for name, count in sorted_funcs
            ]
            
        except Exception as e:
            logger.error(f"Failed to get function distribution: {e}")
            return []

    def get_error_code_distribution(self, time_range_minutes: int = 1440) -> List[Dict[str, Any]]:
        """
        Returns error count by error_code for the specified time range.
        
        Returns:
            [
                {"error_code": str, "count": int, "percentage": float},
                ...
            ]
        """
        try:
            time_limit = (datetime.now(timezone.utc) - timedelta(minutes=time_range_minutes)).isoformat()
            
            error_executions = search_executions(
                limit=10000,
                filters={
                    "status": "ERROR",
                    "timestamp_utc__gte": time_limit
                },
                sort_by="timestamp_utc",
                sort_ascending=False
            )
            
            # Count by error_code
            code_counts: Dict[str, int] = {}
            for execution in error_executions:
                code = execution.get('error_code', 'UNKNOWN')
                code_counts[code] = code_counts.get(code, 0) + 1
            
            # Sort by count
            sorted_codes = sorted(code_counts.items(), key=lambda x: x[1], reverse=True)
            
            total = sum(count for _, count in sorted_codes)
            
            return [
                {
                    "error_code": code,
                    "count": count,
                    "percentage": round(count / total * 100, 2) if total > 0 else 0
                }
                for code, count in sorted_codes
            ]
            
        except Exception as e:
            logger.error(f"Failed to get error code distribution: {e}")
            return []
