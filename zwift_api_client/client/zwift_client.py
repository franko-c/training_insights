#!/usr/bin/env python3
"""
Unified Zwift API Client

Main client that coordinates all specialized API clients.
"""

import logging
from typing import Dict, List, Optional, Any
from ..auth import ZwiftAuthManager
from .profile_client import ProfileClient
from .power_client import PowerClient
from .rankings_client import RankingsClient
from ..data import RiderDataManager


class ZwiftAPIClient:
    """Unified API client for all ZwiftPower data"""
    
    def __init__(self, auth_manager: Optional[ZwiftAuthManager] = None):
        """
        Initialize unified client
        
        Args:
            auth_manager: Optional auth manager instance
        """
        self.logger = logging.getLogger("ZwiftAPI.UnifiedClient")
        
        # Use provided auth manager or create new one
        self.auth_manager = auth_manager or ZwiftAuthManager()
        
        # Initialize specialized clients
        self.profile = ProfileClient(self.auth_manager)
        self.power = PowerClient(self.auth_manager)
        self.rankings = RankingsClient(self.auth_manager)
        
        # Initialize data manager
        self.data_manager = RiderDataManager(self)
        
        self.logger.info("Unified ZwiftAPI client initialized")
    
    def authenticate(self, username: str = None, password: str = None) -> bool:
        """
        Authenticate with ZwiftPower
        
        Args:
            username: ZwiftPower username (optional if using config)
            password: ZwiftPower password (optional if using config)
            
        Returns:
            True if authentication successful
        """
        try:
            # Update credentials if provided
            if username:
                self.auth_manager.email = username
            if password:
                self.auth_manager.password = password
            
            # Test authentication by getting a session
            session = self.auth_manager.get_session()
            return session is not None
        except Exception as e:
            self.logger.error(f"Authentication failed: {e}")
            return False
    
    def is_authenticated(self) -> bool:
        """Check if currently authenticated"""
        return self.auth_manager.check_session_valid()
    
    def get_rider_complete_data(self, rider_id: str, use_cache: bool = True) -> Dict[str, Any]:
        """
        Get complete rider data (profile + power + rankings)
        
        Args:
            rider_id: Zwift rider ID
            use_cache: Whether to use cached data
            
        Returns:
            Combined rider data
        """
        self.logger.info(f"Fetching complete data for rider {rider_id}")
        
        result = {
            'rider_id': rider_id,
            'profile': {},
            'power': {},
            'rankings': {},
            'success': True,
            'errors': []
        }
        
        try:
            # Get profile data
            profile_result = self.profile.get_rider_profile(rider_id, use_cache)
            if profile_result.get('success'):
                result['profile'] = profile_result.get('data', {})
            else:
                result['errors'].append(f"Profile: {profile_result.get('error', 'Unknown error')}")
            
            # Get power data
            power_result = self.power.get_power_profile(rider_id, use_cache)
            if power_result.get('success'):
                result['power'] = power_result.get('data', {})
            else:
                result['errors'].append(f"Power: {power_result.get('error', 'Unknown error')}")
            
            # Get rider rankings
            rankings_result = self.rankings.get_rider_rankings(rider_id, use_cache=use_cache)
            if rankings_result.get('success'):
                result['rankings'] = rankings_result.get('data', {})
            else:
                result['errors'].append(f"Rankings: {rankings_result.get('error', 'Unknown error')}")
            
            # Overall success if we got at least one data type
            result['success'] = bool(result['profile'] or result['power'] or result['rankings'])
            
        except Exception as e:
            self.logger.error(f"Error fetching complete data for rider {rider_id}: {e}")
            result['success'] = False
            result['errors'].append(str(e))
        
        return result
    
    def get_team_analysis(self, team_id: str, use_cache: bool = True) -> Dict[str, Any]:
        """
        Get comprehensive team analysis
        
        Args:
            team_id: Team identifier
            use_cache: Whether to use cached data
            
        Returns:
            Team analysis data
        """
        self.logger.info(f"Fetching team analysis for team {team_id}")
        
        result = {
            'team_id': team_id,
            'team_info': {},
            'team_rankings': {},
            'rider_profiles': {},
            'power_analysis': {},
            'success': True,
            'errors': []
        }
        
        try:
            # Get team rankings/info
            team_result = self.rankings.get_team_rankings(team_id, use_cache)
            if team_result.get('success'):
                result['team_info'] = team_result.get('data', {})
                
                # Extract rider IDs from team data
                rider_ids = self._extract_rider_ids_from_team(result['team_info'])
                
                if rider_ids:
                    # Get profile and power data for team riders
                    profiles = self.profile.batch_get_profiles(rider_ids[:10])  # Limit to 10 for efficiency
                    powers = self.power.batch_get_power_profiles(rider_ids[:10])
                    
                    result['rider_profiles'] = profiles
                    result['power_analysis'] = powers
            else:
                result['errors'].append(f"Team data: {team_result.get('error', 'Unknown error')}")
                result['success'] = False
        
        except Exception as e:
            self.logger.error(f"Error in team analysis for {team_id}: {e}")
            result['success'] = False
            result['errors'].append(str(e))
        
        return result
    
    def get_league_insights(self, league_id: str, use_cache: bool = True) -> Dict[str, Any]:
        """
        Get comprehensive league insights
        
        Args:
            league_id: League identifier
            use_cache: Whether to use cached data
            
        Returns:
            League insights data
        """
        self.logger.info(f"Fetching league insights for league {league_id}")
        
        result = {
            'league_id': league_id,
            'standings': {},
            'top_performers': {},
            'competitive_analysis': {},
            'success': True,
            'errors': []
        }
        
        try:
            # Get league standings
            standings_result = self.rankings.get_league_standings(league_id, use_cache)
            if standings_result.get('success'):
                result['standings'] = standings_result.get('data', {})
            else:
                result['errors'].append(f"Standings: {standings_result.get('error', 'Unknown error')}")
            
            # Get top performers in different categories
            for category in ['A', 'B', 'C', 'D']:
                performers = self.rankings.get_top_performers(
                    metric='power', 
                    category=category, 
                    use_cache=use_cache
                )
                if performers.get('success'):
                    result['top_performers'][category] = performers.get('data', {})
        
        except Exception as e:
            self.logger.error(f"Error in league insights for {league_id}: {e}")
            result['success'] = False
            result['errors'].append(str(e))
        
        return result
    
    def search_and_analyze(self, 
                          search_term: str, 
                          search_type: str = 'rider',
                          analysis_depth: str = 'basic') -> Dict[str, Any]:
        """
        Search for entities and perform analysis
        
        Args:
            search_term: Term to search for
            search_type: Type of search ('rider', 'team', 'league')
            analysis_depth: Depth of analysis ('basic', 'detailed', 'comprehensive')
            
        Returns:
            Search results with analysis
        """
        self.logger.info(f"Searching for {search_type}: {search_term}")
        
        result = {
            'search_term': search_term,
            'search_type': search_type,
            'results': [],
            'analysis': {},
            'success': True,
            'errors': []
        }
        
        try:
            if search_type == 'rider':
                search_result = self.profile.search_riders(name=search_term)
                if search_result.get('success') and search_result.get('data'):
                    riders = search_result['data'][:5]  # Limit results
                    result['results'] = riders
                    
                    # Perform analysis based on depth
                    if analysis_depth in ['detailed', 'comprehensive']:
                        for rider in riders:
                            rider_id = rider.get('zwid')
                            if rider_id:
                                if analysis_depth == 'comprehensive':
                                    analysis = self.get_rider_complete_data(rider_id)
                                else:
                                    analysis = self.power.get_critical_power(rider_id)
                                result['analysis'][rider_id] = analysis
            
            elif search_type == 'league':
                search_result = self.rankings.search_leagues(name=search_term)
                if search_result.get('success'):
                    result['results'] = search_result.get('data', [])
            
            elif search_type == 'team':
                search_result = self.rankings.get_team_rankings()
                if search_result.get('success'):
                    # Filter teams by search term
                    teams = search_result.get('data', [])
                    filtered_teams = [t for t in teams if search_term.lower() in t.get('name', '').lower()]
                    result['results'] = filtered_teams[:5]
        
        except Exception as e:
            self.logger.error(f"Error in search and analyze: {e}")
            result['success'] = False
            result['errors'].append(str(e))
        
        return result
    
    def _extract_rider_ids_from_team(self, team_data: Dict) -> List[str]:
        """Extract rider IDs from team data structure"""
        rider_ids = []
        
        try:
            if 'riders' in team_data:
                for rider in team_data['riders']:
                    if 'zwid' in rider:
                        rider_ids.append(str(rider['zwid']))
            elif 'members' in team_data:
                for member in team_data['members']:
                    if 'zwid' in member:
                        rider_ids.append(str(member['zwid']))
        except Exception as e:
            self.logger.warning(f"Error extracting rider IDs: {e}")
        
        return rider_ids
    
    def get_status(self) -> Dict[str, Any]:
        """Get client status and health"""
        return {
            'authenticated': self.is_authenticated(),
            'cache_stats': self.auth_manager.cache_manager.get_stats() if hasattr(self.auth_manager, 'cache_manager') else {},
            'clients': {
                'profile': bool(self.profile),
                'power': bool(self.power),
                'rankings': bool(self.rankings)
            }
        }
