#!/usr/bin/env python3
"""
Data Manager

Handles data aggregation, processing, and business logic above the API layer.
"""

import logging
from typing import Dict, List, Optional, Any, TYPE_CHECKING
from ..cache import CacheManager

if TYPE_CHECKING:
    from ..client import ZwiftAPIClient


class DataManager:
    """
    Manages data operations and business logic
    
    This layer sits above the API clients and provides:
    - Data aggregation from multiple sources
    - Business logic processing
    - Data enrichment and calculations
    - Standardized data formats
    """
    
    def __init__(self, api_client: Optional['ZwiftAPIClient'] = None):
        """
        Initialize data manager
        
        Args:
            api_client: Optional API client instance
        """
        """Initialize data manager"""
        self.logger = logging.getLogger("ZwiftAPI.DataManager")
        self.api_client = api_client
        self.cache_manager = CacheManager()
        
        self.logger.info("Data manager initialized")
    
    def get_rider_dashboard_data(self, rider_id: str, include_comparisons: bool = True) -> Dict[str, Any]:
        """
        Get comprehensive rider data for dashboard display
        
        Args:
            rider_id: Zwift rider ID
            include_comparisons: Whether to include category comparisons
            
        Returns:
            Dashboard-ready rider data
        """
        self.logger.info(f"Building dashboard data for rider {rider_id}")
        
        # Get complete rider data from API
        rider_data = self.api_client.get_rider_complete_data(rider_id)
        
        if not rider_data.get('success'):
            return rider_data
        
        # Process and enrich the data
        dashboard_data = {
            'rider_id': rider_id,
            'profile': self._process_profile_data(rider_data.get('profile', {})),
            'power_analysis': self._process_power_data(rider_data.get('power', {})),
            'performance_metrics': self._calculate_performance_metrics(rider_data),
            'training_insights': self._generate_training_insights(rider_data),
            'competitive_position': self._analyze_competitive_position(rider_data),
            'last_updated': self._get_current_timestamp()
        }
        
        # Add category comparisons if requested
        if include_comparisons:
            dashboard_data['comparisons'] = self._get_category_comparisons(rider_data)
        
        return {'success': True, 'data': dashboard_data}
    
    def get_power_curve_data(self, rider_id: str, data_sources: List[str] = None) -> Dict[str, Any]:
        """
        Get power curve data formatted for visualization
        
        Args:
            rider_id: Zwift rider ID
            data_sources: Sources to include ('season', 'recent', 'best')
            
        Returns:
            Power curve data formatted for charts
        """
        if data_sources is None:
            data_sources = ['season', 'recent', 'best']
        
        self.logger.info(f"Building power curve data for rider {rider_id}")
        
        # Get raw power data
        power_result = self.api_client.power.get_power_profile(rider_id)
        
        if not power_result.get('success'):
            return power_result
        
        power_data = power_result.get('data', {})
        
        # Process into chart-ready format
        curve_data = {
            'rider_id': rider_id,
            'datasets': {},
            'intervals': self._get_standard_intervals(),
            'metadata': {
                'last_updated': power_data.get('last_updated', ''),
                'data_sources': data_sources
            }
        }
        
        # Process each requested data source
        for source in data_sources:
            curve_data['datasets'][source] = self._process_power_curve_source(power_data, source)
        
        return {'success': True, 'data': curve_data}
    
    def get_team_performance_summary(self, team_id: str) -> Dict[str, Any]:
        """
        Get team performance summary
        
        Args:
            team_id: Team identifier
            
        Returns:
            Team performance data
        """
        self.logger.info(f"Building team performance summary for team {team_id}")
        
        # Get team analysis from API
        team_data = self.api_client.get_team_analysis(team_id)
        
        if not team_data.get('success'):
            return team_data
        
        # Process team data
        summary = {
            'team_id': team_id,
            'team_info': self._process_team_info(team_data.get('team_info', {})),
            'rider_count': len(team_data.get('rider_profiles', {})),
            'power_distribution': self._analyze_team_power_distribution(team_data),
            'category_breakdown': self._analyze_team_categories(team_data),
            'top_performers': self._identify_team_top_performers(team_data),
            'improvement_opportunities': self._identify_improvement_opportunities(team_data),
            'last_updated': self._get_current_timestamp()
        }
        
        return {'success': True, 'data': summary}
    
    def get_competitive_insights(self, rider_id: str, context: str = 'category') -> Dict[str, Any]:
        """
        Get competitive insights for a rider
        
        Args:
            rider_id: Zwift rider ID
            context: Context for comparison ('category', 'age_group', 'weight_class')
            
        Returns:
            Competitive insights data
        """
        self.logger.info(f"Building competitive insights for rider {rider_id}")
        
        # Get rider data
        rider_data = self.api_client.get_rider_complete_data(rider_id)
        
        if not rider_data.get('success'):
            return rider_data
        
        # Build insights
        insights = {
            'rider_id': rider_id,
            'context': context,
            'strengths': self._identify_strengths(rider_data),
            'weaknesses': self._identify_weaknesses(rider_data),
            'opportunities': self._identify_opportunities(rider_data),
            'training_recommendations': self._generate_training_recommendations(rider_data),
            'race_strategy': self._suggest_race_strategy(rider_data),
            'goal_setting': self._suggest_goals(rider_data),
            'last_updated': self._get_current_timestamp()
        }
        
        return {'success': True, 'data': insights}
    
    def _process_profile_data(self, profile_data: Dict) -> Dict[str, Any]:
        """Process raw profile data into standardized format"""
        return {
            'name': profile_data.get('name', 'Unknown'),
            'category': profile_data.get('category', 'Unknown'),
            'ftp': profile_data.get('ftp', 0),
            'weight': profile_data.get('weight', 0),
            'height': profile_data.get('height', 0),
            'age': profile_data.get('age', 0),
            'country': profile_data.get('country', ''),
            'team': profile_data.get('team', ''),
            'racing_score': profile_data.get('racing_score', 0),
            'join_date': profile_data.get('join_date', ''),
            'last_active': profile_data.get('last_active', '')
        }
    
    def _process_power_data(self, power_data: Dict) -> Dict[str, Any]:
        """Process raw power data into analysis format"""
        analysis = {
            'critical_power': {},
            'power_curve': [],
            'ftp_history': [],
            'recent_bests': {},
            'power_profile_type': 'Unknown'
        }
        
        try:
            if 'power_curve' in power_data:
                analysis['power_curve'] = power_data['power_curve']
                analysis['critical_power'] = self._extract_critical_power_values(power_data['power_curve'])
                analysis['power_profile_type'] = self._classify_power_profile(analysis['critical_power'])
            
            if 'ftp_history' in power_data:
                analysis['ftp_history'] = power_data['ftp_history']
            
            if 'recent_bests' in power_data:
                analysis['recent_bests'] = power_data['recent_bests']
        
        except Exception as e:
            self.logger.warning(f"Error processing power data: {e}")
        
        return analysis
    
    def _calculate_performance_metrics(self, rider_data: Dict) -> Dict[str, Any]:
        """Calculate performance metrics from rider data"""
        profile = rider_data.get('profile', {})
        power = rider_data.get('power', {})
        
        metrics = {
            'w_kg_ftp': 0,
            'power_to_weight_ratio': 0,
            'category_strength': 'Unknown',
            'training_load': 0,
            'consistency_score': 0,
            'improvement_rate': 0
        }
        
        try:
            ftp = profile.get('ftp', 0)
            weight = profile.get('weight', 0)
            
            if ftp > 0 and weight > 0:
                metrics['w_kg_ftp'] = round(ftp / weight, 2)
                metrics['power_to_weight_ratio'] = metrics['w_kg_ftp']
            
            # Calculate category strength based on power curve
            if 'power_curve' in power:
                metrics['category_strength'] = self._assess_category_strength(power['power_curve'], profile.get('category'))
        
        except Exception as e:
            self.logger.warning(f"Error calculating performance metrics: {e}")
        
        return metrics
    
    def _generate_training_insights(self, rider_data: Dict) -> Dict[str, Any]:
        """Generate training insights from rider data"""
        insights = {
            'focus_areas': [],
            'training_zones': {},
            'volume_recommendations': {},
            'intensity_distribution': {},
            'periodization_suggestions': []
        }
        
        try:
            power_data = rider_data.get('power', {})
            profile_data = rider_data.get('profile', {})
            
            # Generate training zones based on FTP
            ftp = profile_data.get('ftp', 0)
            if ftp > 0:
                insights['training_zones'] = self._calculate_training_zones(ftp)
            
            # Identify focus areas based on power curve
            if 'power_curve' in power_data:
                insights['focus_areas'] = self._identify_training_focus_areas(power_data['power_curve'])
        
        except Exception as e:
            self.logger.warning(f"Error generating training insights: {e}")
        
        return insights
    
    def _analyze_competitive_position(self, rider_data: Dict) -> Dict[str, Any]:
        """Analyze rider's competitive position"""
        position = {
            'category_ranking': 'Unknown',
            'percentile': 0,
            'upgrade_potential': False,
            'competitive_strengths': [],
            'areas_for_improvement': []
        }
        
        try:
            rankings = rider_data.get('rankings', {})
            if rankings:
                position['category_ranking'] = rankings.get('category_rank', 'Unknown')
                position['percentile'] = rankings.get('percentile', 0)
        
        except Exception as e:
            self.logger.warning(f"Error analyzing competitive position: {e}")
        
        return position
    
    def _get_standard_intervals(self) -> List[int]:
        """Get standard power curve intervals"""
        return [5, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600]
    
    def _get_current_timestamp(self) -> str:
        """Get current timestamp in ISO format"""
        from datetime import datetime
        return datetime.now().isoformat()
    
    def _extract_critical_power_values(self, power_curve: List) -> Dict[str, Any]:
        """Extract critical power values from power curve data"""
        # Implementation would extract specific interval values
        return {}
    
    def _classify_power_profile(self, critical_power: Dict) -> str:
        """Classify power profile type (sprinter, time trialist, etc.)"""
        # Implementation would analyze power distribution
        return "Balanced"
    
    def _assess_category_strength(self, power_curve: List, category: str) -> str:
        """Assess strength within category"""
        # Implementation would compare against category standards
        return "Average"
    
    def _calculate_training_zones(self, ftp: int) -> Dict[str, Dict]:
        """Calculate training zones based on FTP"""
        return {
            'active_recovery': {'min': int(ftp * 0.0), 'max': int(ftp * 0.55)},
            'endurance': {'min': int(ftp * 0.56), 'max': int(ftp * 0.75)},
            'tempo': {'min': int(ftp * 0.76), 'max': int(ftp * 0.90)},
            'lactate_threshold': {'min': int(ftp * 0.91), 'max': int(ftp * 1.05)},
            'vo2_max': {'min': int(ftp * 1.06), 'max': int(ftp * 1.20)},
            'anaerobic': {'min': int(ftp * 1.21), 'max': int(ftp * 1.50)},
            'neuromuscular': {'min': int(ftp * 1.51), 'max': 9999}
        }
    
    def _identify_training_focus_areas(self, power_curve: List) -> List[str]:
        """Identify training focus areas from power curve"""
        # Implementation would analyze curve weaknesses
        return ["Endurance", "Sprint Power"]
    
    # Additional helper methods would be implemented here...
