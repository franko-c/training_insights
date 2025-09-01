#!/usr/bin/env python3
"""
Base API Client for ZwiftPower

Provides core functionality for making authenticated API requests
with unified caching and error handling.
"""

import time
import logging
import requests
from typing import Dict, Any, Optional, Union
from auth import ZwiftAuthManager
from cache import get_cache_manager


class BaseAPIClient:
    """Base client for ZwiftPower API interactions"""
    
    def __init__(self, auth_manager: Optional[ZwiftAuthManager] = None):
        """
        Initialize base API client
        
        Args:
            auth_manager: Authentication manager instance
        """
        self.auth_manager = auth_manager or ZwiftAuthManager()
        self.cache_manager = get_cache_manager()
        self.base_url = "https://zwiftpower.com"
        
        # Setup logging
        self.logger = logging.getLogger(f"ZwiftAPI.{self.__class__.__name__}")
        
        # Rate limiting
        self.last_request_time = 0
        self.min_request_interval = 1.0  # 1 second between requests
    
    def _rate_limit(self):
        """Ensure minimum interval between requests"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.min_request_interval:
            sleep_time = self.min_request_interval - time_since_last
            time.sleep(sleep_time)
        
        self.last_request_time = time.time()
    
    def _make_request(self, 
                     endpoint: str,
                     params: Dict = None,
                     method: str = 'GET',
                     use_cache: bool = True,
                     cache_ttl: int = 3600) -> Dict[str, Any]:
        """
        Make authenticated API request with caching
        
        Args:
            endpoint: API endpoint (e.g., 'api3.php')
            params: Request parameters
            method: HTTP method
            use_cache: Whether to use caching
            cache_ttl: Cache time-to-live in seconds
            
        Returns:
            Dict containing response data and metadata
        """
        params = params or {}
        
        # Generate cache key
        cache_key = f"{endpoint}_{method}"
        
        # Try cache first
        if use_cache:
            cached_data = self.cache_manager.get(cache_key, params, cache_ttl)
            if cached_data is not None:
                self.logger.debug(f"Cache hit for {endpoint}")
                return {
                    'data': cached_data,
                    'cached': True,
                    'status_code': 200
                }
        
        # Rate limiting
        self._rate_limit()
        
        # Get authenticated session
        session = self.auth_manager.get_session()
        
        # Build URL
        url = f"{self.base_url}/{endpoint}"
        
        # Log request
        self.logger.info(f"Making {method} request to {endpoint}")
        if params:
            self.logger.debug(f"Parameters: {params}")
        
        try:
            # Make request
            if method.upper() == 'GET':
                response = session.get(url, params=params, timeout=30)
            else:
                response = session.post(url, data=params, timeout=30)
            
            # Check response
            response.raise_for_status()
            
            # Parse response
            result = {
                'status_code': response.status_code,
                'cached': False
            }
            
            # Try to parse as JSON
            try:
                data = response.json()
                result['data'] = data
                result['content_type'] = 'json'
                
                # Cache successful JSON responses
                if use_cache and response.status_code == 200:
                    self.cache_manager.set(cache_key, data, params, {
                        'status_code': response.status_code,
                        'content_type': 'json'
                    })
                
            except ValueError:
                # Not JSON, store as text
                result['data'] = response.text
                result['content_type'] = response.headers.get('content-type', 'text/html')
                
                # Don't cache non-JSON responses by default
                if use_cache and response.status_code == 200 and len(response.text) > 0:
                    self.cache_manager.set(cache_key, response.text, params, {
                        'status_code': response.status_code,
                        'content_type': result['content_type']
                    })
            
            self.logger.debug(f"Request successful: {response.status_code}")
            return result
            
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Request failed for {endpoint}: {e}")
            return {
                'error': str(e),
                'status_code': getattr(e.response, 'status_code', None) if hasattr(e, 'response') else None,
                'cached': False
            }
        
        except Exception as e:
            self.logger.error(f"Unexpected error for {endpoint}: {e}")
            return {
                'error': str(e),
                'status_code': None,
                'cached': False
            }
    
    def get(self, endpoint: str, params: Dict = None, **kwargs) -> Dict[str, Any]:
        """
        Make GET request
        
        Args:
            endpoint: API endpoint
            params: Request parameters
            **kwargs: Additional options for _make_request
            
        Returns:
            Response data
        """
        return self._make_request(endpoint, params, 'GET', **kwargs)
    
    def post(self, endpoint: str, params: Dict = None, **kwargs) -> Dict[str, Any]:
        """
        Make POST request
        
        Args:
            endpoint: API endpoint
            params: Request parameters  
            **kwargs: Additional options for _make_request
            
        Returns:
            Response data
        """
        return self._make_request(endpoint, params, 'POST', **kwargs)
    
    def clear_cache(self, endpoint: str = None, params: Dict = None):
        """
        Clear cache for specific endpoint or all cache
        
        Args:
            endpoint: Specific endpoint to clear (None for all)
            params: Specific parameters to clear
        """
        if endpoint:
            self.cache_manager.invalidate(f"{endpoint}_GET", params)
        else:
            self.cache_manager.clear_all()
    
    def get_cache_stats(self) -> Dict:
        """Get cache statistics"""
        return self.cache_manager.get_cache_stats()


# Convenience function for quick API access
def get_api_client(auth_manager: Optional[ZwiftAuthManager] = None) -> BaseAPIClient:
    """
    Get a configured API client instance
    
    Args:
        auth_manager: Optional authentication manager
        
    Returns:
        BaseAPIClient: Ready-to-use API client
    """
    return BaseAPIClient(auth_manager)
