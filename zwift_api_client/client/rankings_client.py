#!/usr/bin/env python3
"""
Rankings API Client

Specialized client for rankings and competitive data from ZwiftPower.
"""

import logging
from typing import Dict, List, Optional, Any
from .base_client import BaseAPIClient
from ..auth import ZwiftAuthManager


class RankingsClient(BaseAPIClient):
    """Client for rankings and competitive data endpoints"""
    
    def __init__(self, auth_manager: Optional[ZwiftAuthManager] = None):
        super().__init__(auth_manager)
        self.logger = logging.getLogger("ZwiftAPI.RankingsClient")
    
    def get_league_standings(self, league_id: str, use_cache: bool = True) -> Dict[str, Any]:
        """
        Get league standings
        
        Args:
            league_id: League identifier
            use_cache: Whether to use cached data
            
        Returns:
            League standings data
        """
        params = {
            'do': 'league_view',
            'id': league_id
        }
        
        # League standings update frequently, cache for 30 minutes
        return self.get('api3.php', params, use_cache=use_cache, cache_ttl=1800)
    
    def get_team_rankings(self, team_id: str = None, use_cache: bool = True) -> Dict[str, Any]:
        """
        Get team rankings
        
        Args:
            team_id: Specific team ID (optional)
            use_cache: Whether to use cached data
            
        Returns:
            Team rankings data
        """
        params = {'do': 'team_list'}
        
        if team_id:
            params['id'] = team_id
        
        # Team rankings change daily, cache for 2 hours
        return self.get('api3.php', params, use_cache=use_cache, cache_ttl=7200)
    
    def get_category_rankings(self, 
                            category: str = 'A',
                            gender: str = None,
                            limit: int = 100,
                            use_cache: bool = True) -> Dict[str, Any]:
        """
        Get category-based rankings
        
        Args:
            category: Category (A, B, C, D)
            gender: Gender filter ('M', 'F')
            limit: Number of results to return
            use_cache: Whether to use cached data
            
        Returns:
            Category rankings data
        """
        params = {
            'do': 'category_rankings',
            'cat': category,
            'limit': limit
        }
        
        if gender:
            params['gender'] = gender
        
        # Rankings update daily, cache for 4 hours
        return self.get('api3.php', params, use_cache=use_cache, cache_ttl=14400)
    
    def get_race_results(self, race_id: str, use_cache: bool = True) -> Dict[str, Any]:
        """
        Get race results
        
        Args:
            race_id: Race identifier
            use_cache: Whether to use cached data
            
        Returns:
            Race results data
        """
        params = {
            'do': 'race_results',
            'id': race_id
        }
        
        # Race results are final, cache for 24 hours
        return self.get('api3.php', params, use_cache=use_cache, cache_ttl=86400)
    
    def get_upcoming_races(self, 
                          category: str = None,
                          series: str = None,
                          use_cache: bool = True) -> Dict[str, Any]:
        """
        Get upcoming races
        
        Args:
            category: Category filter
            series: Series filter
            use_cache: Whether to use cached data
            
        Returns:
            Upcoming races data
        """
        params = {'do': 'upcoming_races'}
        
        if category:
            params['cat'] = category
        if series:
            params['series'] = series
        
        # Upcoming races change frequently, cache for 15 minutes
        return self.get('api3.php', params, use_cache=use_cache, cache_ttl=900)
    
    def get_series_standings(self, series_id: str, use_cache: bool = True) -> Dict[str, Any]:
        """
        Get series standings (e.g., ZRL, WTRL)
        
        Args:
            series_id: Series identifier
            use_cache: Whether to use cached data
            
        Returns:
            Series standings data
        """
        params = {
            'do': 'series_standings',
            'id': series_id
        }
        
        # Series standings update weekly, cache for 2 hours
        return self.get('api3.php', params, use_cache=use_cache, cache_ttl=7200)
    
    def search_leagues(self, 
                      name: str = None,
                      status: str = 'active',
                      use_cache: bool = True) -> Dict[str, Any]:
        """
        Search for leagues
        
        Args:
            name: League name to search for
            status: League status filter
            use_cache: Whether to use cached data
            
        Returns:
            League search results
        """
        params = {
            'do': 'league_search',
            'status': status
        }
        
        if name:
            params['name'] = name
        
        # League list changes occasionally, cache for 1 hour
        return self.get('api3.php', params, use_cache=use_cache, cache_ttl=3600)
    
    def get_rider_rankings(self, 
                          rider_id: str,
                          ranking_type: str = 'overall',
                          use_cache: bool = True) -> Dict[str, Any]:
        """
        Get specific rider's rankings
        
        Args:
            rider_id: Zwift rider ID
            ranking_type: Type of ranking ('overall', 'category', 'power')
            use_cache: Whether to use cached data
            
        Returns:
            Rider ranking data
        """
        params = {
            'do': 'rider_rankings',
            'zwid': rider_id,
            'type': ranking_type
        }
        
        # Rider rankings update daily, cache for 2 hours
        return self.get('api3.php', params, use_cache=use_cache, cache_ttl=7200)
    
    def get_top_performers(self, 
                          metric: str = 'power',
                          category: str = None,
                          timeframe: str = 'month',
                          limit: int = 50,
                          use_cache: bool = True) -> Dict[str, Any]:
        """
        Get top performers by various metrics
        
        Args:
            metric: Performance metric ('power', 'speed', 'ftp')
            category: Category filter
            timeframe: Time period ('week', 'month', 'year')
            limit: Number of results
            use_cache: Whether to use cached data
            
        Returns:
            Top performers data
        """
        params = {
            'do': 'top_performers',
            'metric': metric,
            'timeframe': timeframe,
            'limit': limit
        }
        
        if category:
            params['cat'] = category
        
        # Performance rankings change daily, cache for 4 hours
        return self.get('api3.php', params, use_cache=use_cache, cache_ttl=14400)
    
    def get_competitive_analysis(self, 
                               rider_id: str,
                               comparison_riders: List[str] = None,
                               use_cache: bool = True) -> Dict[str, Any]:
        """
        Get competitive analysis comparing riders
        
        Args:
            rider_id: Primary rider ID
            comparison_riders: List of rider IDs to compare against
            use_cache: Whether to use cached data
            
        Returns:
            Competitive analysis data
        """
        params = {
            'do': 'competitive_analysis',
            'zwid': rider_id
        }
        
        if comparison_riders:
            params['compare'] = ','.join(comparison_riders)
        
        # Competitive analysis is computationally expensive, cache for 6 hours
        return self.get('api3.php', params, use_cache=use_cache, cache_ttl=21600)
