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
        Uses RAG to answer questions about functions.
        Based on: test_ex/rag.py - search_and_answer
        
        Args:
            query: Natural language question about a function
            language: Response language ('en' or 'ko')
            
        Returns:
            {
                "query": str,
                "answer": str,
                "language": str
            }
        """
        try:
            answer = search_and_answer(
                query=query,
                language=language
            )
            
            return {
                "query": query,
                "answer": answer,
                "language": language
            }
            
        except Exception as e:
            logger.error(f"Failed to answer question: {e}")
            return {
                "query": query,
                "answer": f"Failed to generate answer: {str(e)}",
                "language": language,
                "error": str(e)
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
