#!/usr/bin/env python3
"""
Power API Client

Specialized client for power data from ZwiftPower.
"""

import logging
from typing import Dict, List, Optional, Any
from .base_client import BaseAPIClient
from ..auth import ZwiftAuthManager


class PowerClient(BaseAPIClient):
    """Client for power-related API endpoints"""
    
    def __init__(self, auth_manager: Optional[ZwiftAuthManager] = None):
        super().__init__(auth_manager)
        self.logger = logging.getLogger("ZwiftAPI.PowerClient")
    
    def get_power_profile(self, rider_id: str, use_cache: bool = True) -> Dict[str, Any]:
        """
        Get rider power profile/curve data
        
        Args:
            rider_id: Zwift rider ID
            use_cache: Whether to use cached data
            
        Returns:
            Power profile data or error information
        """
        params = {
            'do': 'power',
            'z': rider_id
        }
        
        # Power data changes infrequently, cache for 1 hour
        return self.get('cache3.php', params, use_cache=use_cache, cache_ttl=3600)
    
    def get_power_analysis(self, rider_id: str, use_cache: bool = True) -> Dict[str, Any]:
        """
        Get detailed power analysis
        
        Args:
            rider_id: Zwift rider ID
            use_cache: Whether to use cached data
            
        Returns:
            Power analysis data
        """
        params = {
            'do': 'power_analysis',
            'zwid': rider_id
        }
        
        # Analysis data changes less frequently, cache for 2 hours
        return self.get('api3.php', params, use_cache=use_cache, cache_ttl=7200)
    
    def get_critical_power(self, rider_id: str, use_cache: bool = True) -> Dict[str, Any]:
        """
        Get critical power data for standard intervals
        
        Args:
            rider_id: Zwift rider ID
            use_cache: Whether to use cached data
            
        Returns:
            Critical power data
        """
        power_data = self.get_power_profile(rider_id, use_cache)
        
        # Extract critical power values if available
        if power_data.get('success') and 'data' in power_data:
            cp_data = self._extract_critical_power(power_data['data'])
            return {'success': True, 'data': cp_data}
        
        return power_data
    
    def get_race_power(self, rider_id: str, race_id: str = None, use_cache: bool = True) -> Dict[str, Any]:
        """
        Get power data from specific race
        
        Args:
            rider_id: Zwift rider ID
            race_id: Specific race ID (optional)
            use_cache: Whether to use cached data
            
        Returns:
            Race power data
        """
        params = {
            'do': 'race_power',
            'zwid': rider_id
        }
        
        if race_id:
            params['race_id'] = race_id
        
        # Race power data is specific, cache for 24 hours
        return self.get('api3.php', params, use_cache=use_cache, cache_ttl=86400)
    
    def get_ftp_history(self, rider_id: str, use_cache: bool = True) -> Dict[str, Any]:
        """
        Get FTP history over time
        
        Args:
            rider_id: Zwift rider ID
            use_cache: Whether to use cached data
            
        Returns:
            FTP history data
        """
        params = {
            'do': 'ftp',
            'z': rider_id
        }
        
        # FTP changes rarely, cache for 12 hours
        return self.get('cache3.php', params, use_cache=use_cache, cache_ttl=43200)
    
    def _extract_critical_power(self, power_data: Dict) -> Dict[str, Any]:
        """
        Extract critical power values from raw power data
        
        Args:
            power_data: Raw power data from API
            
        Returns:
            Structured critical power data
        """
        # Standard intervals for critical power analysis
        intervals = [5, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600]
        
        cp_values = {}
        
        try:
            # Extract based on known API structure
            if 'power_curve' in power_data:
                curve = power_data['power_curve']
                
                for interval in intervals:
                    # Look for matching interval in curve data
                    for entry in curve:
                        if entry.get('secs') == interval:
                            cp_values[f'{interval}s'] = {
                                'power': entry.get('watts', 0),
                                'time': interval,
                                'date': entry.get('date', ''),
                                'w_kg': entry.get('w_kg', 0)
                            }
            
            # Add calculated metrics
            cp_values['ftp'] = self._calculate_ftp(cp_values)
            cp_values['pmax'] = self._find_peak_power(cp_values)
            
        except Exception as e:
            self.logger.warning(f"Error extracting critical power: {e}")
        
        return cp_values
    
    def _calculate_ftp(self, cp_values: Dict) -> Dict[str, Any]:
        """Calculate FTP from critical power data"""
        # FTP is typically 95% of 20-minute power or 105% of 60-minute power
        if '1200s' in cp_values:  # 20 minutes
            ftp = cp_values['1200s']['power'] * 0.95
        elif '3600s' in cp_values:  # 60 minutes
            ftp = cp_values['3600s']['power'] * 1.05
        else:
            return {'power': 0, 'estimated': True}
        
        return {
            'power': round(ftp),
            'estimated': True,
            'method': '20min' if '1200s' in cp_values else '60min'
        }
    
    def _find_peak_power(self, cp_values: Dict) -> Dict[str, Any]:
        """Find peak power from available intervals"""
        peak = {'power': 0, 'duration': 0}
        
        for key, value in cp_values.items():
            if isinstance(value, dict) and 'power' in value:
                if value['power'] > peak['power']:
                    peak = {
                        'power': value['power'],
                        'duration': value.get('time', 0),
                        'w_kg': value.get('w_kg', 0)
                    }
        
        return peak
    
    def batch_get_power_profiles(self, rider_ids: List[str], delay: float = 1.0) -> Dict[str, Dict]:
        """
        Get multiple rider power profiles with rate limiting
        
        Args:
            rider_ids: List of rider IDs
            delay: Delay between requests in seconds
            
        Returns:
            Dict mapping rider_id to power data
        """
        import time
        
        results = {}
        
        for i, rider_id in enumerate(rider_ids):
            self.logger.info(f"Fetching power profile {i+1}/{len(rider_ids)}: {rider_id}")
            
            result = self.get_power_profile(rider_id)
            results[rider_id] = result
            
            # Rate limiting delay (except for last request)
            if i < len(rider_ids) - 1:
                time.sleep(delay)
        
        return results
