"""
Functions Endpoints

Provides registered function metadata and search.
"""

from fastapi import APIRouter, Query
from typing import Optional

from app.dashboard import FunctionService

router = APIRouter()

_service: Optional[FunctionService] = None


def get_service() -> FunctionService:
    global _service
    if _service is None:
        _service = FunctionService()
    return _service


@router.get("")
async def get_all_functions():
    """
    Returns all registered functions.
    
    Response:
        - items: List of function metadata
        - total: int
    """
    service = get_service()
    return service.get_all_functions()


@router.get("/search")
async def search_functions(
    q: str = Query(..., description="Search query"),
    limit: int = Query(10, le=50, description="Maximum results"),
    team: Optional[str] = Query(None, description="Filter by team")
):
    """
    Searches functions using semantic/vector similarity.
    
    Parameters:
        - q: Natural language query
        - limit: Maximum results
        - team: Optional team filter
    
    Response:
        - query: str
        - items: List of matching functions with distance scores
        - total: int
    """
    service = get_service()
    
    filters = {"team": team} if team else None
    
    return service.search_functions_semantic(
        query=q,
        limit=limit,
        filters=filters
    )


@router.get("/search/hybrid")
async def search_functions_hybrid(
    q: str = Query(..., description="Search query"),
    limit: int = Query(10, le=50, description="Maximum results"),
    alpha: float = Query(0.5, ge=0, le=1, description="0=keyword, 1=vector"),
    team: Optional[str] = Query(None, description="Filter by team")
):
    """
    Searches functions using hybrid search (keyword + vector).
    
    Parameters:
        - q: Search query
        - limit: Maximum results
        - alpha: Balance (0=keyword-centric, 1=vector-centric)
        - team: Optional team filter
    
    Response:
        - query: str
        - alpha: float
        - items: List of matching functions with scores
        - total: int
    """
    service = get_service()
    
    filters = {"team": team} if team else None
    
    return service.search_functions_hybrid_mode(
        query=q,
        limit=limit,
        alpha=alpha,
        filters=filters
    )


@router.get("/ask")
async def ask_about_function(
    q: str = Query(..., description="Question about a function"),
    language: str = Query("en", description="Response language: 'en' or 'ko'")
):
    """
    Uses RAG to answer questions about functions.
    
    Parameters:
        - q: Natural language question
        - language: Response language
    
    Response:
        - query: str
        - answer: str (LLM-generated)
        - language: str
    """
    service = get_service()
    return service.ask_about_function(query=q, language=language)


@router.get("/by-team/{team}")
async def get_functions_by_team(team: str):
    """
    Returns all functions belonging to a specific team.
    
    Response:
        - team: str
        - items: List of functions
        - total: int
    """
    service = get_service()
    return service.get_functions_by_team(team=team)


@router.get("/{function_name}")
async def get_function_by_name(function_name: str):
    """
    Returns detailed information about a specific function.
    
    Returns 404-like response if not found.
    """
    service = get_service()
    result = service.get_function_by_name(function_name)
    
    if result is None:
        return {"error": "Function not found", "function_name": function_name}
    
    return result
