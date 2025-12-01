"""
Replay Service

Provides regression testing (replay) functionality.
Based on: test_ex/replay.py, test_ex/replayer_semantic.py
"""

import logging
from typing import Dict, Any, Optional, List

from vectorwave.utils.replayer import VectorWaveReplayer
from vectorwave.utils.replayer_semantic import SemanticReplayer
from vectorwave.models.db_config import get_weaviate_settings

logger = logging.getLogger(__name__)


class ReplayService:
    """
    Provides regression testing for the dashboard.
    """

    def __init__(self):
        self.settings = get_weaviate_settings()
        self._replayer: Optional[VectorWaveReplayer] = None
        self._semantic_replayer: Optional[SemanticReplayer] = None

    def _get_replayer(self) -> VectorWaveReplayer:
        """Lazy initialization of replayer."""
        if self._replayer is None:
            self._replayer = VectorWaveReplayer()
        return self._replayer

    def _get_semantic_replayer(self) -> SemanticReplayer:
        """Lazy initialization of semantic replayer."""
        if self._semantic_replayer is None:
            self._semantic_replayer = SemanticReplayer()
        return self._semantic_replayer

    def run_replay(
        self,
        function_full_name: str,
        limit: int = 10,
        update_baseline: bool = False
    ) -> Dict[str, Any]:
        """
        Runs basic replay (exact match comparison) for a function.
        Based on: test_ex/replay.py
        
        Args:
            function_full_name: Full module path (e.g., 'module.function_name')
            limit: Maximum number of test cases
            update_baseline: Whether to update baseline on mismatch
            
        Returns:
            {
                "function": str,
                "total": int,
                "passed": int,
                "failed": int,
                "updated": int,
                "failures": [
                    {
                        "uuid": str,
                        "inputs": dict,
                        "expected": any,
                        "actual": any,
                        "diff_html": str
                    },
                    ...
                ]
            }
        """
        try:
            replayer = self._get_replayer()
            
            result = replayer.replay(
                function_full_name=function_full_name,
                limit=limit,
                update_baseline=update_baseline
            )
            
            # Ensure JSON serializable
            return self._serialize_replay_result(result)
            
        except Exception as e:
            logger.error(f"Failed to run replay for {function_full_name}: {e}")
            return {
                "function": function_full_name,
                "total": 0,
                "passed": 0,
                "failed": 0,
                "updated": 0,
                "failures": [],
                "error": str(e)
            }

    def run_semantic_replay(
        self,
        function_full_name: str,
        limit: int = 10,
        update_baseline: bool = False,
        similarity_threshold: Optional[float] = None,
        semantic_eval: bool = False
    ) -> Dict[str, Any]:
        """
        Runs semantic replay (vector/LLM comparison) for a function.
        Based on: test_ex/replayer_semantic.py
        
        Args:
            function_full_name: Full module path
            limit: Maximum number of test cases
            update_baseline: Whether to update baseline on mismatch
            similarity_threshold: Vector similarity threshold (0-1)
            semantic_eval: Whether to use LLM for semantic comparison
            
        Returns:
            {
                "function": str,
                "mode": str ('vector' or 'llm'),
                "total": int,
                "passed": int,
                "failed": int,
                "updated": int,
                "failures": [...]
            }
        """
        try:
            replayer = self._get_semantic_replayer()
            
            result = replayer.replay(
                function_full_name=function_full_name,
                limit=limit,
                update_baseline=update_baseline,
                similarity_threshold=similarity_threshold,
                semantic_eval=semantic_eval
            )
            
            # Add mode indicator
            mode = "llm" if semantic_eval else "vector" if similarity_threshold else "exact"
            serialized = self._serialize_replay_result(result)
            serialized["mode"] = mode
            serialized["similarity_threshold"] = similarity_threshold
            serialized["semantic_eval"] = semantic_eval
            
            return serialized
            
        except Exception as e:
            logger.error(f"Failed to run semantic replay for {function_full_name}: {e}")
            return {
                "function": function_full_name,
                "mode": "error",
                "total": 0,
                "passed": 0,
                "failed": 0,
                "updated": 0,
                "failures": [],
                "error": str(e)
            }

    def get_replayable_functions(self) -> Dict[str, Any]:
        """
        Returns a list of functions that have replay-enabled logs.
        Functions with `replay=True` in @vectorize decorator and SUCCESS logs.
        
        Returns:
            {
                "items": [
                    {
                        "function_name": str,
                        "log_count": int,
                        "latest_timestamp": str
                    },
                    ...
                ],
                "total": int
            }
        """
        try:
            from ..database.db_search import search_executions
            
            # Get all successful executions with return values
            executions = search_executions(
                limit=10000,
                filters={"status": "SUCCESS"},
                sort_by="timestamp_utc",
                sort_ascending=False
            )
            
            # Group by function name
            func_map: Dict[str, Dict] = {}
            for execution in executions:
                func_name = execution.get('function_name')
                return_value = execution.get('return_value')
                
                # Only include functions with logged return values (replay=True)
                if func_name and return_value is not None:
                    if func_name not in func_map:
                        func_map[func_name] = {
                            "function_name": func_name,
                            "log_count": 0,
                            "latest_timestamp": execution.get('timestamp_utc')
                        }
                    func_map[func_name]["log_count"] += 1
            
            items = sorted(
                func_map.values(),
                key=lambda x: x["log_count"],
                reverse=True
            )
            
            return {
                "items": items,
                "total": len(items)
            }
            
        except Exception as e:
            logger.error(f"Failed to get replayable functions: {e}")
            return {
                "items": [],
                "total": 0,
                "error": str(e)
            }

    def _serialize_replay_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Ensures replay result is JSON-serializable.
        """
        if "error" in result:
            return result
        
        # Serialize failures
        failures = []
        for failure in result.get("failures", []):
            serialized_failure = {
                "uuid": str(failure.get("uuid", "")),
                "inputs": self._safe_serialize(failure.get("inputs")),
                "expected": self._safe_serialize(failure.get("expected")),
                "actual": self._safe_serialize(failure.get("actual")),
                "diff_html": failure.get("diff_html", ""),
                "reason": failure.get("reason", ""),
            }
            
            if "error" in failure:
                serialized_failure["error"] = failure["error"]
            if "traceback" in failure:
                serialized_failure["traceback"] = failure["traceback"]
            
            failures.append(serialized_failure)
        
        return {
            "function": result.get("function", ""),
            "total": result.get("total", 0),
            "passed": result.get("passed", 0),
            "failed": result.get("failed", 0),
            "updated": result.get("updated", 0),
            "failures": failures
        }

    def _safe_serialize(self, value: Any) -> Any:
        """
        Safely serializes a value for JSON.
        """
        if value is None:
            return None
        if isinstance(value, (str, int, float, bool)):
            return value
        if isinstance(value, (list, tuple)):
            return [self._safe_serialize(v) for v in value]
        if isinstance(value, dict):
            return {k: self._safe_serialize(v) for k, v in value.items()}
        return str(value)
