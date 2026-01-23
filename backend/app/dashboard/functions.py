"""
Function Service

Provides registered function management and search.
Based on: test_ex/search.py, test_ex/hybrid_search.py, test_ex/check.py
"""

import logging
from typing import Dict, Any, Optional, List

from vectorwave.database.db_search import search_functions, search_functions_hybrid
from vectorwave.utils.status import get_registered_functions
from vectorwave.models.db_config import get_weaviate_settings
from vectorwave.search.rag_search import search_and_answer
from vectorwave.search.execution_search import find_executions
from vectorwave.core.llm.factory import get_llm_client

logger = logging.getLogger(__name__)


class FunctionService:
    """
    Provides function metadata management for the dashboard.
    """

    def __init__(self):
        self.settings = get_weaviate_settings()

    def get_all_functions(self) -> Dict[str, Any]:
        """
        Returns all registered functions.
        Based on: test_ex/check.py
        
        Returns:
            {
                "items": [...],
                "total": int
            }
        """
        try:
            functions = get_registered_functions()
            
            return {
                "items": functions,
                "total": len(functions)
            }
            
        except Exception as e:
            logger.error(f"Failed to get all functions: {e}")
            return {
                "items": [],
                "total": 0,
                "error": str(e)
            }

    def search_functions_semantic(
        self,
        query: str,
        limit: int = 10,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Searches functions using semantic/vector similarity.
        Based on: test_ex/search.py - Scenario 1
        
        Args:
            query: Natural language query
            limit: Maximum number of results
            filters: Additional filters (e.g., {"team": "billing"})
            
        Returns:
            {
                "query": str,
                "items": [...],
                "total": int
            }
        """
        try:
            results = search_functions(
                query=query,
                limit=limit,
                filters=filters
            )
            
            # Process results for response
            items = []
            for result in results:
                items.append({
                    "uuid": str(result.get('uuid', '')),
                    "function_name": result['properties'].get('function_name'),
                    "module_name": result['properties'].get('module_name'),
                    "search_description": result['properties'].get('search_description'),
                    "sequence_narrative": result['properties'].get('sequence_narrative'),
                    "docstring": result['properties'].get('docstring'),
                    "source_code": result['properties'].get('source_code'),
                    "distance": result['metadata'].distance if result.get('metadata') else None,
                    # Custom properties
                    "team": result['properties'].get('team'),
                    "priority": result['properties'].get('priority')
                })
            
            return {
                "query": query,
                "items": items,
                "total": len(items)
            }
            
        except Exception as e:
            logger.error(f"Failed to search functions: {e}")
            return {
                "query": query,
                "items": [],
                "total": 0,
                "error": str(e)
            }

    def search_functions_hybrid_mode(
        self,
        query: str,
        limit: int = 10,
        alpha: float = 0.5,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Searches functions using hybrid search (keyword + vector).
        Based on: test_ex/hybrid_search.py
        
        Args:
            query: Search query
            limit: Maximum number of results
            alpha: Balance between keyword (0) and vector (1) search
            filters: Additional filters
            
        Returns:
            {
                "query": str,
                "alpha": float,
                "items": [...],
                "total": int
            }
        """
        try:
            results = search_functions_hybrid(
                query=query,
                limit=limit,
                alpha=alpha,
                filters=filters
            )
            
            items = []
            for result in results:
                items.append({
                    "uuid": str(result.get('uuid', '')),
                    "function_name": result['properties'].get('function_name'),
                    "module_name": result['properties'].get('module_name'),
                    "search_description": result['properties'].get('search_description'),
                    "docstring": result['properties'].get('docstring'),
                    "score": result['metadata'].score if result.get('metadata') else None,
                    "distance": result['metadata'].distance if result.get('metadata') else None,
                    "team": result['properties'].get('team')
                })
            
            return {
                "query": query,
                "alpha": alpha,
                "items": items,
                "total": len(items)
            }
            
        except Exception as e:
            logger.error(f"Failed to hybrid search functions: {e}")
            return {
                "query": query,
                "alpha": alpha,
                "items": [],
                "total": 0,
                "error": str(e)
            }

    def ask_about_function(
            self,
            query: str,
            language: str = "en"
        ) -> Dict[str, Any]:
            """
            AI에게 함수에 대해 질문합니다. (실행 상태 컨텍스트 포함)
            """
            try:
                # 1. 함수 정의 검색
                search_results = search_functions(query=query, limit=1)

                if not search_results:
                    msg = "관련 함수를 찾을 수 없습니다." if language == 'ko' else "No relevant function found."
                    return {"query": query, "answer": msg, "language": language}

                best_match = search_results[0]
                props = best_match['properties']
                function_name = props.get('function_name')

                # 2. 실행 정보 검색 (Runtime Context)
                # 2-1. 최근 에러 조회 (최근 24시간 or 최근 5개)
                recent_errors = find_executions(
                    filters={"function_name": function_name, "status": "ERROR"},
                    sort_by="timestamp_utc",
                    sort_ascending=False,
                    limit=3
                )

                # 2-2. 최근 성공/성능 조회
                recent_success = find_executions(
                    filters={"function_name": function_name, "status": "SUCCESS"},
                    sort_by="timestamp_utc",
                    sort_ascending=False,
                    limit=5
                )

                # 3. 프롬프트 컨텍스트 구성 (Augmentation)
                context = f"""
                [Target Function]: {function_name}
                [Docstring]: {props.get('docstring')}

                [Source Code]:
                ```python
                {props.get('source_code')}
                ```

                [Runtime Analysis - Recent Activity]:
                """

                # 에러 정보 주입
                if recent_errors:
                    context += f"\n- ⚠️ WARNING: {len(recent_errors)} recent errors found."
                    context += f"\n- Latest Error Message: {recent_errors[0].get('error_message')}"
                else:
                    context += "\n- ✅ No recent errors found."

                # 성능 정보 주입
                if recent_success:
                    total_duration = sum(float(r.get('duration_ms', 0)) for r in recent_success)
                    avg_duration = total_duration / len(recent_success)
                    context += f"\n- Recent Performance: Avg duration {avg_duration:.2f}ms (based on last {len(recent_success)} runs)."

                # 4. LLM 호출
                client = get_llm_client()
                if not client:
                    return {"query": query, "answer": "LLM Client not initialized.", "language": language}

                # 언어 설정
                lang_instruction = "Korean" if language == 'ko' else "English"

                system_instruction = (
                    "You are an intelligent DevOps assistant for VectorWave. "
                    "Analyze the provided function code AND its recent runtime status. "
                    "If there are errors in the runtime analysis, explain why they might be happening based on the code logic. "
                    f"Please answer in **{lang_instruction}**."
                )

                response_text = client.create_chat_completion(
                    model="gpt-4-turbo",
                    messages=[
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {query}"}
                    ],
                    temperature=0.2
                )

                return {
                    "query": query,
                    "answer": response_text,
                    "language": language
                }

            except Exception as e:
                logger.error(f"Failed to answer question: {e}")
                return {
                    "query": query,
                    "answer": f"Error occurred during analysis: {str(e)}",
                    "language": language
                }

    def get_function_by_name(self, function_name: str) -> Optional[Dict[str, Any]]:
        """
        Returns detailed information about a specific function.
        
        Args:
            function_name: The function name to look up
            
        Returns:
            Function details or None if not found
        """
        try:
            # Use hybrid search with very low alpha to prioritize exact match
            results = search_functions_hybrid(
                query=function_name,
                limit=5,
                alpha=0.1  # Keyword-centric
            )
            
            # Find exact match
            for result in results:
                if result['properties'].get('function_name') == function_name:
                    return {
                        "uuid": str(result.get('uuid', '')),
                        "function_name": result['properties'].get('function_name'),
                        "module_name": result['properties'].get('module_name'),
                        "search_description": result['properties'].get('search_description'),
                        "sequence_narrative": result['properties'].get('sequence_narrative'),
                        "docstring": result['properties'].get('docstring'),
                        "source_code": result['properties'].get('source_code'),
                        "team": result['properties'].get('team'),
                        "priority": result['properties'].get('priority')
                    }
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get function {function_name}: {e}")
            return None

    def get_functions_by_team(self, team: str) -> Dict[str, Any]:
        """
        Returns all functions belonging to a specific team.
        
        Args:
            team: Team name filter
            
        Returns:
            {
                "team": str,
                "items": [...],
                "total": int
            }
        """
        try:
            # Search with team filter
            results = search_functions_hybrid(
                query="*",  # Match all
                limit=100,
                alpha=0.0,  # Pure keyword
                filters={"team": team}
            )
            
            items = []
            for result in results:
                items.append({
                    "function_name": result['properties'].get('function_name'),
                    "module_name": result['properties'].get('module_name'),
                    "search_description": result['properties'].get('search_description')
                })
            
            return {
                "team": team,
                "items": items,
                "total": len(items)
            }
            
        except Exception as e:
            logger.error(f"Failed to get functions by team {team}: {e}")
            return {
                "team": team,
                "items": [],
                "total": 0,
                "error": str(e)
            }
