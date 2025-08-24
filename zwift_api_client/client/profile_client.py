#!/usr/bin/env python3
"""
Profile API Client

Specialized client for rider profile data from ZwiftPower.
"""

import logging
from typing import Dict, List, Optional, Any
from .base_client import BaseAPIClient
from ..auth import ZwiftAuthManager


class ProfileClient(BaseAPIClient):
    """Client for profile-related API endpoints"""
    
    def __init__(self, auth_manager: Optional[ZwiftAuthManager] = None):
        super().__init__(auth_manager)
        self.logger = logging.getLogger("ZwiftAPI.ProfileClient")
    
    def get_rider_profile(self, rider_id: str, use_cache: bool = True) -> Dict[str, Any]:
        """
        Get rider profile data
        
        Args:
            rider_id: Zwift rider ID
            use_cache: Whether to use cached data
            
        Returns:
            Profile data or error information
        """
        params = {
            'do': 'profile_search',
            'type': 'rider',
            'zwid': rider_id
        }
        
        # Profile data changes infrequently, cache for 24 hours
        return self.get('api3.php', params, use_cache=use_cache, cache_ttl=86400)
    
    def search_riders(self, 
                     name: str = None,
                     team: str = None,
                     category: str = None,
                     use_cache: bool = True) -> Dict[str, Any]:
        """
        Search for riders by various criteria
        
        Args:
            name: Rider name to search for
            team: Team name to search for
            category: Category (A, B, C, D)
            use_cache: Whether to use cached data
            
        Returns:
            Search results
        """
        params = {'do': 'profile_search', 'type': 'rider'}
        
        if name:
            params['name'] = name
        if team:
            params['team'] = team
        if category:
            params['category'] = category
        
        # Search results change frequently, cache for 1 hour
        return self.get('api3.php', params, use_cache=use_cache, cache_ttl=3600)
    
    def get_rider_achievements(self, rider_id: str, use_cache: bool = True) -> Dict[str, Any]:
        """
        Get rider achievements
        
        Args:
            rider_id: Zwift rider ID
            use_cache: Whether to use cached data
            
        Returns:
            Achievement data
        """
        params = {
            'do': 'achievements',
            'zwid': rider_id
        }
        
        # Achievements change rarely, cache for 24 hours
        return self.get('api3.php', params, use_cache=use_cache, cache_ttl=86400)
    
    def get_cached_profile_data(self, rider_id: str, data_type: str = 'profile') -> Dict[str, Any]:
        """
        Get cached profile data (requires different endpoint)
        
        Args:
            rider_id: Zwift rider ID
            data_type: Type of cached data ('profile', 'power', 'ftp', 'weight')
            
        Returns:
            Cached data or error information
        """
        params = {
            'do': data_type,
            'z': rider_id
        }
        
        # Cached data updates vary by type
        cache_ttl = {
            'profile': 86400,  # 24 hours
            'power': 3600,     # 1 hour
            'ftp': 86400,      # 24 hours
            'weight': 86400    # 24 hours
        }.get(data_type, 3600)
        
        return self.get('cache3.php', params, cache_ttl=cache_ttl)
    
    def get_recent_races(self, rider_id: str, use_cache: bool = True) -> Dict[str, Any]:
        """
        Get rider's recent race results
        
        Args:
            rider_id: Zwift rider ID
            use_cache: Whether to use cached data
            
        Returns:
            Recent race data
        """
        return self.get_cached_profile_data(rider_id, 'recent_races')
    
    def batch_get_profiles(self, rider_ids: List[str], delay: float = 1.0) -> Dict[str, Dict]:
        """
        Get multiple rider profiles with rate limiting
        
        Args:
            rider_ids: List of rider IDs
            delay: Delay between requests in seconds
            
        Returns:
            Dict mapping rider_id to profile data
        """
        import time
        
        results = {}
        
        for i, rider_id in enumerate(rider_ids):
            self.logger.info(f"Fetching profile {i+1}/{len(rider_ids)}: {rider_id}")
            
            result = self.get_rider_profile(rider_id)
            results[rider_id] = result
            
            # Rate limiting delay (except for last request)
            if i < len(rider_ids) - 1:
                time.sleep(delay)
        
        return results
