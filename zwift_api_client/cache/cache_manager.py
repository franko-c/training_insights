#!/usr/bin/env python3
"""
Unified Cache Manager for Zwift API Client

Provides consistent caching strategy across all API endpoints.
Handles TTL, content hashing, and cache invalidation.
"""

import os
import json
import time
import hashlib
import logging
from pathlib import Path
from datetime import datetime
from typing import Any, Optional, Dict, Union


class CacheManager:
    """Unified cache management for API responses"""
    
    def __init__(self, cache_dir: Optional[Path] = None):
        """
        Initialize cache manager
        
        Args:
            cache_dir: Directory for cache storage (default: module_dir/cache)
        """
        self.module_dir = Path(__file__).parent.parent.absolute()
        
        if cache_dir:
            self.cache_dir = Path(cache_dir)
        else:
            self.cache_dir = self.module_dir / "cache" / "data"
        
        # Ensure cache directory exists
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Setup logging
        self.logger = logging.getLogger("CacheManager")
        
    def _generate_cache_key(self, endpoint: str, params: Dict = None) -> str:
        """
        Generate cache key from endpoint and parameters
        
        Args:
            endpoint: API endpoint name
            params: Request parameters
            
        Returns:
            str: Cache key
        """
        cache_data = {
            'endpoint': endpoint,
            'params': params or {}
        }
        
        cache_string = json.dumps(cache_data, sort_keys=True)
        return hashlib.md5(cache_string.encode()).hexdigest()
    
    def _get_cache_file(self, cache_key: str) -> Path:
        """Get cache file path for given key"""
        return self.cache_dir / f"{cache_key}.json"
    
    def get(self, endpoint: str, params: Dict = None, ttl: int = 3600) -> Optional[Any]:
        """
        Get cached data if available and not expired
        
        Args:
            endpoint: API endpoint name
            params: Request parameters
            ttl: Time to live in seconds
            
        Returns:
            Cached data or None if not available/expired
        """
        cache_key = self._generate_cache_key(endpoint, params)
        cache_file = self._get_cache_file(cache_key)
        
        if not cache_file.exists():
            return None
        
        try:
            with open(cache_file, 'r') as f:
                cache_entry = json.load(f)
            
            # Check if cache is expired
            cache_time = cache_entry.get('timestamp', 0)
            age = time.time() - cache_time
            
            if age > ttl:
                self.logger.debug(f"Cache expired for {endpoint} (age: {age:.0f}s, ttl: {ttl}s)")
                return None
            
            self.logger.debug(f"Cache hit for {endpoint} (age: {age:.0f}s)")
            return cache_entry.get('data')
            
        except Exception as e:
            self.logger.warning(f"Failed to read cache for {endpoint}: {e}")
            return None
    
    def set(self, endpoint: str, data: Any, params: Dict = None, metadata: Dict = None) -> bool:
        """
        Store data in cache
        
        Args:
            endpoint: API endpoint name
            data: Data to cache
            params: Request parameters
            metadata: Additional metadata to store
            
        Returns:
            bool: Success status
        """
        cache_key = self._generate_cache_key(endpoint, params)
        cache_file = self._get_cache_file(cache_key)
        
        cache_entry = {
            'timestamp': time.time(),
            'endpoint': endpoint,
            'params': params or {},
            'data': data,
            'metadata': metadata or {}
        }
        
        try:
            with open(cache_file, 'w') as f:
                json.dump(cache_entry, f, indent=2, default=str)
            
            self.logger.debug(f"Cached data for {endpoint}")
            return True
            
        except Exception as e:
            self.logger.warning(f"Failed to cache data for {endpoint}: {e}")
            return False
    
    def invalidate(self, endpoint: str, params: Dict = None) -> bool:
        """
        Invalidate specific cache entry
        
        Args:
            endpoint: API endpoint name
            params: Request parameters
            
        Returns:
            bool: Success status
        """
        cache_key = self._generate_cache_key(endpoint, params)
        cache_file = self._get_cache_file(cache_key)
        
        try:
            if cache_file.exists():
                cache_file.unlink()
                self.logger.debug(f"Invalidated cache for {endpoint}")
            return True
            
        except Exception as e:
            self.logger.warning(f"Failed to invalidate cache for {endpoint}: {e}")
            return False
    
    def clear_all(self) -> bool:
        """
        Clear all cache entries
        
        Returns:
            bool: Success status
        """
        try:
            for cache_file in self.cache_dir.glob("*.json"):
                cache_file.unlink()
            
            self.logger.info("Cleared all cache entries")
            return True
            
        except Exception as e:
            self.logger.warning(f"Failed to clear cache: {e}")
            return False
    
    def get_cache_stats(self) -> Dict:
        """
        Get cache statistics
        
        Returns:
            Dict: Cache statistics
        """
        cache_files = list(self.cache_dir.glob("*.json"))
        total_size = sum(f.stat().st_size for f in cache_files)
        
        return {
            'total_entries': len(cache_files),
            'total_size_bytes': total_size,
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'cache_dir': str(self.cache_dir)
        }
    
    def cleanup_expired(self, default_ttl: int = 86400) -> int:
        """
        Clean up expired cache entries
        
        Args:
            default_ttl: Default TTL for entries without explicit TTL
            
        Returns:
            int: Number of entries cleaned up
        """
        cleaned = 0
        current_time = time.time()
        
        for cache_file in self.cache_dir.glob("*.json"):
            try:
                with open(cache_file, 'r') as f:
                    cache_entry = json.load(f)
                
                cache_time = cache_entry.get('timestamp', 0)
                age = current_time - cache_time
                
                if age > default_ttl:
                    cache_file.unlink()
                    cleaned += 1
                    
            except Exception as e:
                self.logger.warning(f"Error checking cache file {cache_file}: {e}")
                # Remove corrupted cache files
                try:
                    cache_file.unlink()
                    cleaned += 1
                except:
                    pass
        
        if cleaned > 0:
            self.logger.info(f"Cleaned up {cleaned} expired cache entries")
        
        return cleaned


# Global cache instance
_cache_manager = None

def get_cache_manager() -> CacheManager:
    """Get the global cache manager instance"""
    global _cache_manager
    if _cache_manager is None:
        _cache_manager = CacheManager()
    return _cache_manager
