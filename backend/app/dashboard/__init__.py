"""
VectorWave Dashboard Service Layer

This module provides high-level APIs for building monitoring dashboards.
All functions are designed to return JSON-serializable dictionaries.
"""

from .overview import DashboardOverviewService
from .executions import ExecutionService
from .traces import TraceService
from .functions import FunctionService
from .errors import ErrorService
from .replay import ReplayService
from .healer import HealerService

__all__ = [
    'DashboardOverviewService',
    'ExecutionService',
    'TraceService',
    'FunctionService',
    'ErrorService',
    'ReplayService',
    'HealerService',
]
