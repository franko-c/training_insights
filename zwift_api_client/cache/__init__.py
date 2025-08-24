"""
Cache Management Module

Provides unified caching strategy for API responses.
"""

from .cache_manager import CacheManager, get_cache_manager

__all__ = ['CacheManager', 'get_cache_manager']
