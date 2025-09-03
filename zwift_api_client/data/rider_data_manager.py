#!/usr/bin/env python3
"""
Unified Rider Data Manager

Consolidates rider data pulling into a single, clean interface that eliminates
the old system's issues with scattered storage and team duplication.
"""

import json
import logging
import re
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any, Union, TYPE_CHECKING
import requests
from bs4 import BeautifulSoup
from ..cache import CacheManager

if TYPE_CHECKING:
    from ..client import ZwiftAPIClient


class RiderDataManager:
    """
    Unified manager for all rider data operations
    
    Key improvements over old system:
    - Single source of truth for rider data
    - No team-based folder duplication  
    - Unified caching strategy
    - Complete rider profiles in one call
    - Self-contained storage within API client
    """
    
    def __init__(self, api_client: Optional['ZwiftAPIClient'] = None):
        """Initialize the rider data manager"""
        self.logger = logging.getLogger("ZwiftAPI.RiderDataManager")
        self.api_client = api_client
        
        # Self-contained data directory
        self.data_dir = Path(__file__).parent.parent / "data" / "riders"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        self.logger.info("Unified Rider Data Manager initialized")
    
    def get_complete_rider_data(self, 
                              rider_id: str, 
                              force_refresh: bool = False,
                              include_power: bool = True,
                              include_rankings: bool = True,
                              include_recent_races: bool = True) -> Dict[str, Any]:
        """
        Get complete rider data - replaces old scattered fetching
        
        Args:
            rider_id: Zwift rider ID
            force_refresh: Skip cache and fetch fresh data
            include_power: Include power curve data
            include_rankings: Include ranking information
            include_recent_races: Include recent race results
            
        Returns:
            Complete rider data structure
        """
        self.logger.info(f"Fetching complete data for rider {rider_id}")
        
        # Check cache first (unless force refresh)
        if not force_refresh:
            cached_data = self._get_cached_rider_data(rider_id)
            if cached_data and self._is_cache_valid(cached_data):
                self.logger.info(f"Using cached data for rider {rider_id}")
                return cached_data
        
        self.logger.info(f"Fetching fresh data for rider {rider_id}")
        
        # Build complete rider profile
        rider_data = {
            "rider_id": rider_id,
            "extraction_date": datetime.now().isoformat(),
            "profile": {},
            "power": {},
            "rankings": {},
            "recent_races": [],
            "analysis": {},
            "metadata": {
                "last_updated": datetime.now().isoformat(),
                "data_sources": [],
                "fetch_duration": 0
            }
        }
        
        start_time = datetime.now()
        
        try:
            # 1. Get profile data (always included)
            profile_result = self.api_client.profile.get_rider_profile(rider_id)
            if profile_result.get('success'):
                rider_data['profile'] = self._process_profile_data(profile_result.get('data', {}))
                rider_data['metadata']['data_sources'].append('profile')
            else:
                self.logger.warning(f"Failed to get profile for {rider_id}: {profile_result.get('error')}")
            
            # 2. Get power data (if requested)
            if include_power:
                power_result = self.api_client.power.get_power_profile(rider_id)
                if power_result.get('success'):
                    rider_data['power'] = self._process_power_data(power_result.get('data', {}))
                    rider_data['metadata']['data_sources'].append('power')
                else:
                    self.logger.warning(f"Failed to get power data for {rider_id}: {power_result.get('error')}")
            
            # 3. Get rankings (if requested)
            if include_rankings:
                rankings_result = self.api_client.rankings.get_rider_rankings(rider_id)
                if rankings_result.get('success'):
                    rider_data['rankings'] = self._process_rankings_data(rankings_result.get('data', {}))
                    rider_data['metadata']['data_sources'].append('rankings')
            
            # 4. Get recent races (if requested)
            if include_recent_races:
                races_result = self.api_client.profile.get_recent_races(rider_id)
                if races_result.get('success'):
                    rider_data['recent_races'] = self._process_races_data(races_result.get('data', []))
                    rider_data['metadata']['data_sources'].append('recent_races')
            
            # 5. Generate analysis
            rider_data['analysis'] = self._generate_rider_analysis(rider_data)
            
            # Update metadata
            fetch_duration = (datetime.now() - start_time).total_seconds()
            rider_data['metadata']['fetch_duration'] = fetch_duration
            rider_data['success'] = True
            
            # Cache the result
            self._cache_rider_data(rider_id, rider_data)
            
            self.logger.info(f"Successfully fetched complete data for rider {rider_id} in {fetch_duration:.2f}s")
            
        except Exception as e:
            self.logger.error(f"Error fetching data for rider {rider_id}: {e}")
            rider_data['success'] = False
            rider_data['error'] = str(e)
        
        return rider_data
    
    def get_multiple_riders(self, 
                           rider_ids: List[str],
                           batch_size: int = 5,
                           delay_between_batches: float = 2.0,
                           **kwargs) -> Dict[str, Dict]:
        """
        Get data for multiple riders with intelligent batching
        
        Args:
            rider_ids: List of rider IDs
            batch_size: Number of riders to process simultaneously
            delay_between_batches: Delay between batches to respect rate limits
            **kwargs: Additional arguments passed to get_complete_rider_data
            
        Returns:
            Dict mapping rider_id to rider data
        """
        import time
        
        self.logger.info(f"Fetching data for {len(rider_ids)} riders in batches of {batch_size}")
        
        results = {}
        
        # Process in batches
        for i in range(0, len(rider_ids), batch_size):
            batch = rider_ids[i:i + batch_size]
            batch_num = (i // batch_size) + 1
            total_batches = (len(rider_ids) + batch_size - 1) // batch_size
            
            self.logger.info(f"Processing batch {batch_num}/{total_batches}: {batch}")
            
            # Process batch
            for rider_id in batch:
                try:
                    rider_data = self.get_complete_rider_data(rider_id, **kwargs)
                    results[rider_id] = rider_data
                    
                except Exception as e:
                    self.logger.error(f"Failed to fetch rider {rider_id}: {e}")
                    results[rider_id] = {
                        'rider_id': rider_id,
                        'success': False,
                        'error': str(e)
                    }
            
            # Delay between batches (except for last batch)
            if i + batch_size < len(rider_ids):
                self.logger.info(f"Waiting {delay_between_batches}s before next batch...")
                time.sleep(delay_between_batches)
        
        successful = sum(1 for r in results.values() if r.get('success', False))
        self.logger.info(f"Completed batch processing: {successful}/{len(rider_ids)} successful")
        
        return results
    
    def _process_profile_data(self, raw_data: Dict) -> Dict:
        """Process raw profile data into standardized format"""
        return {
            "name": raw_data.get('name', 'Unknown'),
            "zwift_id": raw_data.get('zwid', ''),
            "category": raw_data.get('category', 'Unknown'),
            "ftp": raw_data.get('ftp', 0),
            "weight": raw_data.get('weight', 0),
            "height": raw_data.get('height', 0),
            "country": raw_data.get('country', ''),
            "team": raw_data.get('team', ''),
            "team_id": raw_data.get('team_id', ''),
            "racing_score": raw_data.get('racing_score', 0),
            "join_date": raw_data.get('join_date', ''),
            "last_active": raw_data.get('last_active', ''),
            "total_races": raw_data.get('total_races', 0),
            "total_wins": raw_data.get('total_wins', 0)
        }
    
    def _process_power_data(self, raw_data: Dict) -> Dict:
        """Process raw power data into standardized format"""
        processed = {
            "ftp": 0,
            "intervals": [],
            "power_profile_type": "Unknown",
            "critical_power": {},
            "last_updated": raw_data.get('last_updated', '')
        }
        
        # Extract power curve intervals
        if 'power_curve' in raw_data:
            intervals = []
            for entry in raw_data['power_curve']:
                intervals.append({
                    "duration": entry.get('secs', 0),
                    "power": entry.get('watts', 0),
                    "watts_per_kg": entry.get('w_kg', 0),
                    "date": entry.get('date', '')
                })
            processed['intervals'] = sorted(intervals, key=lambda x: x['duration'])
        
        # Extract FTP
        if processed['intervals']:
            # FTP is typically around 20-minute power
            for interval in processed['intervals']:
                if interval['duration'] in [1200, 1800]:  # 20 or 30 minutes
                    processed['ftp'] = interval['power']
                    break
        
        return processed
    
    def _process_rankings_data(self, raw_data: Dict) -> Dict:
        """Process raw rankings data"""
        return {
            "category_rank": raw_data.get('category_rank', 'Unknown'),
            "overall_rank": raw_data.get('overall_rank', 'Unknown'),
            "percentile": raw_data.get('percentile', 0),
            "points": raw_data.get('points', 0),
            "category_points": raw_data.get('category_points', 0)
        }
    
    def _process_races_data(self, raw_data: List) -> List[Dict]:
        """Process recent races data"""
        races = []
        for race in raw_data[:10]:  # Limit to 10 most recent
            races.append({
                "race_id": race.get('id', ''),
                "name": race.get('name', ''),
                "date": race.get('date', ''),
                "category": race.get('category', ''),
                "position": race.get('position', 0),
                "power": {
                    "average": race.get('avg_power', 0),
                    "normalized": race.get('norm_power', 0),
                    "max": race.get('max_power', 0)
                },
                "duration": race.get('duration', 0),
                "distance": race.get('distance', 0)
            })
        return races
    
    def _generate_rider_analysis(self, rider_data: Dict) -> Dict:
        """Generate insights and analysis from rider data"""
        analysis = {
            "power_to_weight": 0,
            "profile_strengths": [],
            "training_recommendations": [],
            "competitive_position": "Unknown",
            "improvement_areas": []
        }
        
        # Calculate power-to-weight ratio
        profile = rider_data.get('profile', {})
        ftp = profile.get('ftp', 0)
        weight = profile.get('weight', 0)
        
        if ftp > 0 and weight > 0:
            analysis['power_to_weight'] = round(ftp / weight, 2)
        
        # Analyze power profile
        power_data = rider_data.get('power', {})
        if power_data.get('intervals'):
            analysis['profile_strengths'] = self._analyze_power_profile(power_data['intervals'])
        
        return analysis
    
    def _analyze_power_profile(self, intervals: List[Dict]) -> List[str]:
        """Analyze power profile to identify strengths"""
        strengths = []
        
        if not intervals:
            return strengths
        
        # Sort by duration for analysis
        sorted_intervals = sorted(intervals, key=lambda x: x['duration'])
        
        # Analyze short power (sprinting)
        short_power = [i for i in sorted_intervals if i['duration'] <= 30]
        if short_power:
            avg_short_wkg = sum(i['watts_per_kg'] for i in short_power) / len(short_power)
            if avg_short_wkg > 12:
                strengths.append("Exceptional Sprinter")
            elif avg_short_wkg > 10:
                strengths.append("Strong Sprinter")
        
        # Analyze endurance power
        long_power = [i for i in sorted_intervals if i['duration'] >= 1200]
        if long_power:
            avg_long_wkg = sum(i['watts_per_kg'] for i in long_power) / len(long_power)
            if avg_long_wkg > 4.5:
                strengths.append("Strong Endurance")
            elif avg_long_wkg > 3.5:
                strengths.append("Good Endurance")
        
        return strengths
    
    def _get_cached_rider_data(self, rider_id: str) -> Optional[Dict]:
        """Get cached rider data"""
        cache_file = self.data_dir / f"{rider_id}.json"
        
        try:
            if cache_file.exists():
                with open(cache_file, 'r') as f:
                    return json.load(f)
        except Exception as e:
            self.logger.warning(f"Failed to load cache for rider {rider_id}: {e}")
        
        return None
    
    def _cache_rider_data(self, rider_id: str, data: Dict):
        """Cache rider data"""
        cache_file = self.data_dir / f"{rider_id}.json"
        
        try:
            with open(cache_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            self.logger.warning(f"Failed to cache data for rider {rider_id}: {e}")
    
    def _is_cache_valid(self, cached_data: Dict, max_age_hours: int = 24) -> bool:
        """Check if cached data is still valid"""
        try:
            last_updated = cached_data.get('metadata', {}).get('last_updated', '')
            if not last_updated:
                return False
            
            cache_time = datetime.fromisoformat(last_updated.replace('Z', '+00:00'))
            age = datetime.now() - cache_time.replace(tzinfo=None)
            
            return age < timedelta(hours=max_age_hours)
            
        except Exception:
            return False
    
    def get_rider_summary(self, rider_id: str) -> Dict[str, Any]:
        """Get a quick summary of rider data (for dashboard/UI)"""
        data = self.get_complete_rider_data(rider_id, force_refresh=False)
        
        if not data.get('success'):
            return data
        
        return {
            "rider_id": rider_id,
            "name": data['profile']['name'],
            "category": data['profile']['category'],
            "ftp": data['profile']['ftp'],
            "power_to_weight": data['analysis']['power_to_weight'],
            "strengths": data['analysis']['profile_strengths'],
            "team": data['profile']['team'],
            "last_updated": data['metadata']['last_updated']
        }

    # ==========================================
    # PROVEN METHODS FROM OLD SYSTEM
    # ==========================================
    
    def _fetch_profile_via_html(self, rider_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch profile data via HTML scraping (proven method from old system)
        """
        try:
            session = self.api_client.auth_manager.get_session()
            profile_url = f"https://zwiftpower.com/profile.php?z={rider_id}"
            
            self.logger.info(f"🌐 Fetching profile HTML for rider {rider_id}")
            response = session.get(profile_url, timeout=30)
            response.raise_for_status()
            
            # Check for valid profile content
            if len(response.text) < 1000 or "Rider not found" in response.text:
                self.logger.error(f"❌ Rider {rider_id} not found")
                return None
            
            # Parse with BeautifulSoup
            soup = BeautifulSoup(response.text, 'html.parser')
            return self._extract_profile_from_html(soup, rider_id)
            
        except Exception as e:
            self.logger.error(f"❌ Profile HTML fetch failed for {rider_id}: {e}")
            return None
    
    def _extract_profile_from_html(self, soup: BeautifulSoup, rider_id: str) -> Dict[str, Any]:
        """
        Extract profile data from HTML (adapted from proven profile_fetcher.py)
        """
        profile = {
            "rider_id": rider_id,
            "extraction_date": datetime.now().isoformat(),
            "name": None,
            "athlete_id": None,
            "zwift_id": rider_id,
            "user_id": None,
            "profile_image": None,
            "team": None,
            "team_id": None,
            "category": None,
            "zwift_level": None,
            "country": None,
            "height": None,
            "weight": None,
            "ftp": None,
            "wkg": None,
            "zwift_racing_score": None,
            "strava_url": None,
            "age_group": None,
            "gender": None,
        }
        
        # Get rider name from title
        title = soup.title.string if soup.title else ""
        if title:
            title_match = re.search(r'ZwiftPower -\s*(.*?)\s*(?:\((.*?)\))?\s*$', title)
            if title_match:
                profile["name"] = self._normalize_name(title_match.group(1).strip())
        
        # Extract profile image
        og_image = soup.find('meta', property='og:image')
        if og_image and og_image.get('content'):
            profile["profile_image"] = og_image.get('content')
        
        # Extract data from JavaScript variables
        scripts = soup.find_all('script')
        for script in scripts:
            script_text = script.string if script.string else ""
            
            if "ZP_VARS" in script_text:
                # Extract IDs
                athlete_id_match = re.search(r'athlete_id\s*:\s*["\'](\d+)["\']', script_text)
                if athlete_id_match:
                    profile["athlete_id"] = athlete_id_match.group(1)
                    profile["strava_url"] = f"https://www.strava.com/athletes/{athlete_id_match.group(1)}"
                
                user_id_match = re.search(r'user_id\s*:\s*["\'](\d+)["\']', script_text)
                if user_id_match:
                    profile["user_id"] = user_id_match.group(1)
                
                # Extract team ID
                team_id_patterns = [
                    r'team_id\s*:\s*["\'](\d+)["\']',
                    r'team_id\s*=\s*["\']?(\d+)["\']?',
                    r'teamid\s*:\s*["\'](\d+)["\']',
                ]
                
                for pattern in team_id_patterns:
                    team_id_match = re.search(pattern, script_text)
                    if team_id_match:
                        profile["team_id"] = team_id_match.group(1)
                        break
        
        # Extract category - improved logic to find actual racing category
        # Look for category labels with single letter text (B, C, D, etc.)
        category_labels = soup.select("span.label[class*='label-cat-']")
        for label in category_labels:
            cat_classes = [cls for cls in label.get('class', []) if cls.startswith('label-cat-')]
            text = label.get_text(strip=True)
            
            # Racing categories are usually single letters or A+
            if cat_classes and text in ['A', 'A+', 'B', 'C', 'D', 'E']:
                cat_match = re.search(r'label-cat-([A-E])', cat_classes[0])
                if cat_match:
                    extracted_cat = cat_match.group(1)
                    # Verify the class matches the text content
                    if (text == extracted_cat) or (text == 'A+' and extracted_cat == 'A'):
                        profile["category"] = text  # Use text content, not class
                        self.logger.info(f"Found racing category: {text}")
                        break
        
        # Fallback: if no clear match, use first category class
        if not profile.get("category"):
            category_label = soup.select_one("span.label[class*='label-cat-']")
            if category_label:
                cat_class = [cls for cls in category_label.get('class', []) if cls.startswith('label-cat-')]
                if cat_class:
                    cat_match = re.search(r'label-cat-([A-E])', cat_class[0])
                    if cat_match:
                        profile["category"] = cat_match.group(1)
                        self.logger.warning(f"Using fallback category: {profile['category']}")
        
        # Extract profile data from table rows
        profile_rows = soup.select("tr")
        for row in profile_rows:
            header = row.select_one("th")
            value_cell = row.select_one("td")
            
            if not header or not value_cell:
                continue
                
            header_text = header.get_text(strip=True)
            value_text = value_cell.get_text(strip=True)
            
            # Extract specific data
            if "Racing Score" in header_text or "ZwiftPower Score" in header_text:
                score_match = re.search(r'(\d+(?:\.\d+)?)', value_text)
                if score_match:
                    profile["zwift_racing_score"] = float(score_match.group(1))
            elif "FTP" in header_text:
                ftp_match = re.search(r'(\d+)', value_text)
                if ftp_match:
                    profile["ftp"] = int(ftp_match.group(1))
            elif "Weight" in header_text:
                weight_match = re.search(r'(\d+(?:\.\d+)?)', value_text)
                if weight_match:
                    profile["weight"] = float(weight_match.group(1))
            elif "Height" in header_text:
                height_match = re.search(r'(\d+(?:\.\d+)?)', value_text)
                if height_match:
                    profile["height"] = float(height_match.group(1))
            elif "Team" in header_text and not profile["team"]:
                team_link = value_cell.select_one("a")
                if team_link:
                    profile["team"] = team_link.get_text(strip=True)
                    if not profile["team_id"] and team_link.has_attr('href'):
                        team_id_match = re.search(r'team(?:\.php)?\?(?:id=|team=)(\d+)', team_link['href'])
                        if team_id_match:
                            profile["team_id"] = team_id_match.group(1)
        
        # Calculate W/kg
        if profile["ftp"] is not None and profile["weight"] is not None and profile["weight"] > 0:
            profile["wkg"] = round(profile["ftp"] / profile["weight"], 2)
        
        # Extract power data from page
        profile = self._extract_power_from_profile_html(soup, profile)
        
        # Remove None values
        profile = {k: v for k, v in profile.items() if v is not None}
        
        return profile
    
    def _extract_power_from_profile_html(self, soup: BeautifulSoup, profile: Dict) -> Dict:
        """Extract power data visible on profile page"""
        try:
            if "power_summary" not in profile:
                profile["power_summary"] = {}
            
            # Look for spider chart data in JavaScript
            page_text = str(soup)
            spider_patterns = [
                (r"mean:'<b>15 seconds</b>: (\d+) <rsmall>watts</rsmall>'", "15s"),
                (r"mean:'<b>1 minute</b>: (\d+) <rsmall>watts</rsmall>'", "1min"),
                (r"mean:'<b>5 minutes</b>: (\d+) <rsmall>watts</rsmall>'", "5min"),
                (r"mean:'<b>20 minutes</b>: (\d+) <rsmall>watts</rsmall>'", "20min")
            ]
            
            for pattern, duration in spider_patterns:
                match = re.search(pattern, page_text)
                if match:
                    profile["power_summary"][duration] = int(match.group(1))
            
            # Clean up empty power summary
            if not profile["power_summary"]:
                del profile["power_summary"]
                
        except Exception as e:
            self.logger.warning(f"⚠️ Error extracting power data from HTML: {e}")
            
        return profile
    
    def _fetch_power_via_api(self, rider_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch power data via critical_power_profile API (proven method)
        """
        try:
            session = self.api_client.auth_manager.get_session()
            api_url = f"https://zwiftpower.com/api3.php?do=critical_power_profile&zwift_id={rider_id}&type=watts"
            
            headers = {
                'X-Requested-With': 'XMLHttpRequest',
                'Cache-Control': 'no-cache',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Referer': f'https://zwiftpower.com/profile.php?z={rider_id}'
            }
            
            self.logger.info(f"⚡ Fetching power data via API for rider {rider_id}")
            response = session.get(api_url, headers=headers, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            if not data or (isinstance(data, dict) and data.get('error') == 'zwiftId not found'):
                self.logger.warning(f"⚠️ No power data found for rider {rider_id}")
                return None
            
            return self._format_power_data(data)
            
        except Exception as e:
            self.logger.error(f"❌ Power API fetch failed for {rider_id}: {e}")
            return None
    
    def _format_power_data(self, raw_data: Dict) -> Dict[str, Any]:
        """Format raw power data into structured format (from old system)"""
        formatted = {}
        
        if not raw_data or 'efforts' not in raw_data:
            return formatted
        
        # Define periods
        periods = {
            'last_event': None,
            'recent': '30days',
            'season': '90days', 
            'year': 'year'
        }
        
        if isinstance(raw_data['efforts'], dict):
            # Find most recent event
            event_keys = [k for k in raw_data['efforts'].keys() if isinstance(k, str) and k.isdigit()]
            if event_keys:
                event_keys.sort(reverse=True)
                periods['last_event'] = event_keys[0]
            
            # Process each period
            for period_name, period_key in periods.items():
                if not period_key or period_key not in raw_data['efforts']:
                    continue
                
                period_data = raw_data['efforts'][period_key]
                if not isinstance(period_data, list):
                    continue
                
                for point in period_data:
                    try:
                        time_secs = point['x']
                        power_value = point['y']
                        timestamp = point.get('date')
                        
                        # Convert timestamp
                        if timestamp:
                            try:
                                date_str = datetime.fromtimestamp(timestamp).isoformat()
                            except:
                                date_str = str(timestamp)
                        else:
                            date_str = None
                        
                        # Initialize time entry
                        if f"time_{time_secs}" not in formatted:
                            formatted[f"time_{time_secs}"] = {}
                        
                        # Add data
                        formatted[f"time_{time_secs}"][f"peak_{period_name}"] = power_value
                        formatted[f"time_{time_secs}"][f"date_{period_name}"] = date_str
                        
                    except KeyError:
                        continue
                    except Exception as e:
                        self.logger.warning(f"⚠️ Error processing power point: {e}")
                        continue
        
        return formatted
    
    def _normalize_name(self, name: str) -> str:
        """Normalize rider name (from old system)"""
        if not name:
            return name
        
        try:
            if isinstance(name, bytes):
                name = name.decode('utf-8')
            
            if '\\u' in name:
                name = bytes(name, 'utf-8').decode('unicode_escape')
            
            # Replace HTML entities
            name = name.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"')
            
            # Clean whitespace
            name = ' '.join(name.split())
            
            return name
        except Exception as e:
            self.logger.warning(f"⚠️ Error normalizing name: {e}")
            return name
    
    def get_complete_rider_data_proven(self, rider_id: str, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Get complete rider data using proven methods from old system
        
        This method uses the working approaches:
        - HTML scraping for profile data
        - critical_power_profile API for power data  
        - Working API endpoints for rankings
        - Additional HTML sources for race history, segments, etc.
        """
        self.logger.info(f"🎯 Getting complete rider data (proven methods) for {rider_id}")
        
        if not force_refresh:
            cached_data = self._get_cached_rider_data(rider_id)
            if cached_data and self._is_cache_valid(cached_data):
                self.logger.info(f"📋 Using cached data for rider {rider_id}")
                return cached_data
        
        # Get authenticated session ONCE at the start
        session = self.api_client.auth_manager.get_session()
        
        # Collect data using proven methods
        rider_data = {
            "rider_id": rider_id,
            "extraction_date": datetime.now().isoformat(),
            "data_sources": [],
            "success": True,
            "error": None
        }
        
        start_time = datetime.now()
        
        try:
            # 1. Get profile via HTML scraping (proven) - reuse session
            profile_data = self._fetch_profile_via_html_with_session(rider_id, session)
            if profile_data:
                rider_data["profile"] = profile_data
                rider_data["data_sources"].append("profile_html")
                self.logger.info(f"✅ Profile data extracted for {rider_id}")
                
                # Save profile separately
                self._save_separate_data_file(rider_id, "profile", profile_data)
            else:
                self.logger.warning(f"⚠️ Failed to get profile for {rider_id}")
            
            # 2. Get power data via API (proven) - reuse session
            power_data = self._fetch_power_via_api_with_session(rider_id, session)
            if power_data:
                rider_data["power"] = power_data
                rider_data["data_sources"].append("power_api")
                self.logger.info(f"✅ Power data extracted for {rider_id}")
                
                # Save power separately
                self._save_separate_data_file(rider_id, "power", power_data)
            else:
                self.logger.warning(f"⚠️ Failed to get power data for {rider_id}")
            
            # 3. Get rankings from working endpoints - reuse session
            rankings_data = self._get_working_rankings_data_with_session(rider_id, session)
            if rankings_data:
                rider_data["rankings"] = rankings_data
                rider_data["data_sources"].append("rankings")
                self.logger.info(f"✅ Rankings data extracted for {rider_id}")
                
                # Save rankings separately
                self._save_separate_data_file(rider_id, "rankings", rankings_data)
            
            # 4. Get comprehensive event data and separate into specialized files - reuse session
            events_data = self._fetch_and_separate_events_with_session(rider_id, session)
            if events_data:
                # Add event data to main response for backwards compatibility
                rider_data["events"] = events_data
                rider_data["data_sources"].append("events_separated")
                self.logger.info(f"✅ Event data extracted and separated for {rider_id}")
                
                # Save each event type separately for optimal app performance
                self._save_separate_event_files(rider_id, events_data)
            
            # Note: achievements, activities, and segments currently return empty data
            # These sources are disabled until working API endpoints are found
            # self._fetch_achievements_with_session(rider_id, session)
            # self._fetch_segments_with_session(rider_id, session) 
            # self._fetch_activities_with_session(rider_id, session)
            
            self.logger.info(f"📊 Working data sources: {len(rider_data['data_sources'])}/4 active")
            
            # Calculate metadata
            duration = (datetime.now() - start_time).total_seconds()
            rider_data["metadata"] = {
                "last_updated": datetime.now().isoformat(),
                "fetch_duration": duration,
                "data_sources": rider_data["data_sources"],
                "separate_files": True,
                "file_structure": "modular"
            }
            
            # Cache the result (master index file)
            self._cache_rider_data(rider_id, rider_data)
            
            return rider_data
            
        except Exception as e:
            self.logger.error(f"❌ Error getting rider data for {rider_id}: {e}")
            return {
                "rider_id": rider_id,
                "success": False,
                "error": str(e),
                "extraction_date": datetime.now().isoformat()
            }
    
    def _get_working_rankings_data(self, rider_id: str) -> Optional[Dict[str, Any]]:
        """Get rankings data from working endpoints"""
        try:
            session = self.api_client.auth_manager.get_session()
            return self._get_working_rankings_data_with_session(rider_id, session)
        except Exception as e:
            self.logger.warning(f"⚠️ Error getting rankings data: {e}")
            return None

    def _fetch_profile_via_html_with_session(self, rider_id: str, session) -> Optional[Dict[str, Any]]:
        """Fetch profile data via HTML scraping using provided session"""
        try:
            profile_url = f"https://zwiftpower.com/profile.php?z={rider_id}"
            
            self.logger.info(f"🌐 Fetching profile HTML for rider {rider_id}")
            response = session.get(profile_url, timeout=30)
            response.raise_for_status()
            
            # Check for valid profile content
            if len(response.text) < 1000 or "Rider not found" in response.text:
                self.logger.error(f"❌ Rider {rider_id} not found")
                return None
            
            # Parse with BeautifulSoup
            soup = BeautifulSoup(response.text, 'html.parser')
            return self._extract_profile_from_html(soup, rider_id)
            
        except Exception as e:
            self.logger.error(f"❌ Profile HTML fetch failed for {rider_id}: {e}")
            return None

    def _fetch_power_via_api_with_session(self, rider_id: str, session) -> Optional[Dict[str, Any]]:
        """Fetch power data via critical_power_profile API using provided session"""
        try:
            api_url = f"https://zwiftpower.com/api3.php?do=critical_power_profile&zwift_id={rider_id}&type=watts"
            
            headers = {
                'X-Requested-With': 'XMLHttpRequest',
                'Cache-Control': 'no-cache',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Referer': f'https://zwiftpower.com/profile.php?z={rider_id}'
            }
            
            self.logger.info(f"⚡ Fetching power data via API for rider {rider_id}")
            response = session.get(api_url, headers=headers, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            if not data or (isinstance(data, dict) and data.get('error') == 'zwiftId not found'):
                self.logger.warning(f"⚠️ No power data found for rider {rider_id}")
                return None
            
            return self._format_power_data(data)
            
        except Exception as e:
            self.logger.error(f"❌ Power API fetch failed for {rider_id}: {e}")
            return None

    def _get_working_rankings_data_with_session(self, rider_id: str, session) -> Optional[Dict[str, Any]]:
        """Get rankings data from working endpoints using provided session"""
        try:
            # Try category rankings (we know this works)
            categories = ['A', 'B', 'C', 'D', 'E']
            for category in categories:
                url = f'https://zwiftpower.com/api3.php?do=rankings&category={category}'
                response = session.get(url, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    if 'data' in data and data['data']:
                        # Look for our rider in this category
                        for rider in data['data']:
                            if str(rider.get('zwid', '')) == str(rider_id):
                                return {
                                    "category": category,
                                    "position": rider.get('position'),
                                    "points": rider.get('points'),
                                    "name": rider.get('name'),
                                    "found_in_category": category
                                }
            
            return None
            
        except Exception as e:
            self.logger.warning(f"⚠️ Error getting rankings data: {e}")
            return None
    
    def _save_separate_data_file(self, rider_id: str, data_type: str, data: Dict[str, Any]) -> bool:
        """
        Save data as separate file within rider directory
        
        Creates structure like:
        - riders/RIDER_ID/profile.json
        - riders/RIDER_ID/power.json
        - riders/RIDER_ID/race_history.json
        etc.
        """
        try:
            # Create rider subdirectory
            rider_dir = self.data_dir / rider_id
            rider_dir.mkdir(parents=True, exist_ok=True)
            
            # Save as separate file
            file_path = rider_dir / f"{data_type}.json"
            
            with open(file_path, 'w') as f:
                json.dump(data, f, indent=2)
            
            self.logger.info(f"💾 Saved {data_type} data separately: {file_path}")
            return True
            
        except Exception as e:
            self.logger.warning(f"⚠️ Failed to save separate {data_type} file: {e}")
            return False
    
    def _fetch_and_separate_events_with_session(self, rider_id: str, session) -> Optional[Dict[str, Any]]:
        """
        Fetch all events and separate into specialized files for optimal app performance
        
        Creates separate files:
        - races.json: TYPE_RACE events only (competitive racing)
        - group_rides.json: TYPE_RIDE events only (social/training rides)  
        - workouts.json: TYPE_WORKOUT events only (structured training)
        - events_summary.json: Metadata and quick stats
        """
        self.logger.info(f"🏁 Fetching and separating event data for {rider_id}...")
        
        try:
            url = f"https://zwiftpower.com/api3.php?do=profile_results&z={rider_id}&type=race"
            
            headers = {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Referer': f'https://zwiftpower.com/profile.php?z={rider_id}'
            }
            
            response = session.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            if not data or 'data' not in data:
                self.logger.warning(f"⚠️ No event data found for rider {rider_id}")
                return None
            
            all_events = data['data']
            self.logger.info(f"📊 Processing {len(all_events)} total events for separation...")
            # Filter raw events to only those within the last 90 days to reduce payload
            from datetime import datetime, timedelta
            threshold_ts = int((datetime.now() - timedelta(days=90)).timestamp())
            original_count = len(all_events)
            # Use raw 'date' field (timestamp) to filter events from the last 90 days
            # Only include events within the last 90 days to recognize inactivity
            all_events = [e for e in all_events if int(e.get('date', 0)) >= threshold_ts]
            self.logger.info(f"🚀 Filtered events to last 90 days: {len(all_events)}/{original_count}")
            # If no recent events, return inactive flag and empty datasets
            if not all_events:
                from datetime import datetime
                self.logger.info(f"⚠️ No recent events for rider {rider_id}, marking inactive")
                return {
                    'extraction_date': datetime.now().isoformat(),
                    'total_events': 0,
                    'races': {'count': 0, 'events': [], 'latest_date': None},
                    'group_rides': {'count': 0, 'events': [], 'latest_date': None},
                    'workouts': {'count': 0, 'events': [], 'latest_date': None},
                    'source': 'profile_results_api_separated',
                    'inactive': True
                }
            
            # Separate events by type
            races = []
            group_rides = []
            workouts = []
            
            for event in all_events:
                try:
                    # Extract event data with consistent structure
                    event_data = self._parse_event_data(event)
                    
                    # Classify by event type
                    event_type = event_data.get('event_type', '').upper()
                    
                    if 'TYPE_RACE' in event_type:
                        races.append(event_data)
                    elif 'TYPE_RIDE' in event_type:
                        group_rides.append(event_data)
                    elif 'TYPE_WORKOUT' in event_type:
                        workouts.append(event_data)
                    else:
                        # Default classification based on category and structure
                        category = event_data.get('category', '').upper()
                        if category in ['A', 'B', 'C', 'D'] and event_data.get('position', 0) > 0:
                            races.append(event_data)
                        else:
                            group_rides.append(event_data)
                            
                except Exception as e:
                    self.logger.warning(f"⚠️ Error parsing event: {e}")
                    continue
            
            # Sort all event types by date (newest first)
            races.sort(key=lambda x: x.get('event_timestamp', 0), reverse=True)
            group_rides.sort(key=lambda x: x.get('event_timestamp', 0), reverse=True)
            workouts.sort(key=lambda x: x.get('event_timestamp', 0), reverse=True)
            
            # Create summary data
            events_data = {
                'extraction_date': datetime.now().isoformat(),
                'total_events': len(all_events),
                'races': {
                    'count': len(races),
                    'events': races,
                    'latest_date': races[0].get('event_date') if races else None
                },
                'group_rides': {
                    'count': len(group_rides),
                    'events': group_rides,
                    'latest_date': group_rides[0].get('event_date') if group_rides else None
                },
                'workouts': {
                    'count': len(workouts),
                    'events': workouts,
                    'latest_date': workouts[0].get('event_date') if workouts else None
                },
                'source': 'profile_results_api_separated'
            }
            
            self.logger.info(f"✅ Event separation complete:")
            self.logger.info(f"   🏆 Races: {len(races)} events")
            self.logger.info(f"   🚴 Group rides: {len(group_rides)} events") 
            self.logger.info(f"   💪 Workouts: {len(workouts)} events")
            
            return events_data
            
        except Exception as e:
            self.logger.error(f"❌ Error fetching event data for {rider_id}: {e}")
            return None

    def _parse_event_data(self, event: Dict) -> Dict[str, Any]:
        """Parse raw event data into consistent structure"""
        try:
            # Convert timestamp to readable date
            event_date = event.get('event_date', 0)
            date_str = ''
            if event_date:
                try:
                    dt = datetime.fromtimestamp(int(event_date))
                    date_str = dt.strftime('%Y-%m-%d')
                except:
                    date_str = str(event_date)
            
            # Handle fields that might be lists or single values
            def safe_get_value(data, key, default=''):
                value = data.get(key, default)
                if isinstance(value, list):
                    return value[0] if value else default
                return value
            
            def safe_int(value, default=0):
                try:
                    if isinstance(value, list):
                        value = value[0] if value else default
                    return int(value) if value not in ['', None] else default
                except (ValueError, TypeError):
                    return default
            
            def safe_float(value, default=0.0):
                try:
                    if isinstance(value, list):
                        value = value[0] if value else default
                    return float(value) if value not in ['', None] else default
                except (ValueError, TypeError):
                    return default
            
            return {
                'event_title': safe_get_value(event, 'name', '').strip(),
                'event_date': date_str,
                'event_timestamp': int(event_date) if event_date else 0,
                'position': safe_int(event.get('pos', 0)),
                'position_in_category': safe_int(event.get('pos_in_cat', 0)),
                'category': safe_get_value(event, 'category', '').strip(),
                'event_type': safe_get_value(event, 'f_t', '').strip(),
                'time': safe_float(event.get('time_in_secs', 0)),
                'avg_power': safe_int(event.get('avg_power', 0)),
                'avg_wkg': safe_get_value(event, 'avg_wkg', '').strip(),
                'team': safe_get_value(event, 'club', safe_get_value(event, 'tname', '')).strip(),
                'distance': safe_int(event.get('distance', 0)),
                'points': safe_get_value(event, 'points', safe_get_value(event, 'pts', '')).strip()
            }
        except Exception as e:
            self.logger.warning(f"⚠️ Error parsing event data: {e}")
            return {}

    def _save_separate_event_files(self, rider_id: str, events_data: Dict[str, Any]):
        """Save each event type to separate optimized files"""
        try:
            # Create races.json - competitive events only
            races_file = {
                'extraction_date': events_data['extraction_date'],
                'total_races': events_data['races']['count'],
                'latest_race_date': events_data['races']['latest_date'],
                'races': events_data['races']['events'],
                'source': 'profile_results_api',
                'note': 'Competitive racing events only - optimized for race performance analysis'
            }
            self._save_separate_data_file(rider_id, "races", races_file)
            
            # Create group_rides.json - social/training rides only  
            rides_file = {
                'extraction_date': events_data['extraction_date'],
                'total_group_rides': events_data['group_rides']['count'],
                'latest_ride_date': events_data['group_rides']['latest_date'],
                'group_rides': events_data['group_rides']['events'],
                'source': 'profile_results_api',
                'note': 'Social and training rides only - optimized for volume/activity analysis'
            }
            self._save_separate_data_file(rider_id, "group_rides", rides_file)
            
            # Create workouts.json - structured training only
            workouts_file = {
                'extraction_date': events_data['extraction_date'],
                'total_workouts': events_data['workouts']['count'],
                'latest_workout_date': events_data['workouts']['latest_date'],
                'workouts': events_data['workouts']['events'],
                'source': 'profile_results_api',
                'note': 'Structured training workouts only - optimized for training analysis'
            }
            self._save_separate_data_file(rider_id, "workouts", workouts_file)
            
            # Create events_summary.json - metadata and quick stats
            summary_file = {
                'extraction_date': events_data['extraction_date'],
                'total_events': events_data['total_events'],
                'summary': {
                    'races': {
                        'count': events_data['races']['count'],
                        'latest_date': events_data['races']['latest_date'],
                        'file': 'races.json'
                    },
                    'group_rides': {
                        'count': events_data['group_rides']['count'], 
                        'latest_date': events_data['group_rides']['latest_date'],
                        'file': 'group_rides.json'
                    },
                    'workouts': {
                        'count': events_data['workouts']['count'],
                        'latest_date': events_data['workouts']['latest_date'],
                        'file': 'workouts.json'
                    }
                },
                'source': 'profile_results_api_separated',
                'note': 'Quick overview - load specific event type files for detailed data'
            }
            self._save_separate_data_file(rider_id, "events_summary", summary_file)
            
            self.logger.info(f"💾 Saved specialized event files for {rider_id}")
            
        except Exception as e:
            self.logger.error(f"❌ Error saving event files for {rider_id}: {e}")

    def _fetch_segments_with_session(self, rider_id: str, session) -> Optional[Dict[str, Any]]:
        """Fetch activities data (includes segments/workouts) using the correct AJAX API"""
        try:
            url = f"https://zwiftpower.com/api3.php?do=activities&z={rider_id}"
            
            headers = {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Referer': f'https://zwiftpower.com/profile.php?z={rider_id}'
            }
            
            response = session.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            if not data or 'data' not in data:
                return None
            
            activities = data['data']
            
            # Extract recent activities (limit to 15 most recent)
            recent_activities = []
            for activity in activities[:15]:
                if isinstance(activity, dict):
                    activity_info = {
                        'name': activity.get('name', ''),
                        'date': activity.get('f_date', ''),
                        'type': activity.get('sport', ''),
                        'distance': activity.get('distance', ''),
                        'time': activity.get('moving_time', ''),
                        'avg_power': activity.get('avg_watts', ''),
                        'max_power': activity.get('max_watts', ''),
                        'avg_hr': activity.get('avg_hr', ''),
                        'calories': activity.get('calories', ''),
                        'workout_type': activity.get('workout_type', '')
                    }
                    recent_activities.append(activity_info)
            
            return {
                'extraction_date': datetime.now().isoformat(),
                'total_activities': len(activities),
                'recent_activities': recent_activities,
                'source': 'activities_api'
            }
            
        except Exception as e:
            self.logger.warning(f"⚠️ Failed to fetch activities: {e}")
            return None
    
    def _fetch_achievements_with_session(self, rider_id: str, session) -> Optional[Dict[str, Any]]:
        """Fetch achievements from profile achievements tab"""
        try:
            url = f"https://zwiftpower.com/profile.php?z={rider_id}&tab=achievements"
            response = session.get(url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Look for achievement badges/elements
            achievements = []
            
            # Find achievement containers
            achievement_elements = soup.find_all(['div', 'span'], class_=re.compile(r'badge|achievement|award'))
            
            for elem in achievement_elements[:10]:  # Limit to 10 achievements
                text = elem.get_text(strip=True)
                if text and len(text) > 3:  # Only meaningful text
                    achievements.append({
                        'title': text,
                        'type': 'achievement',
                        'classes': elem.get('class', [])
                    })
            
            return {
                'extraction_date': datetime.now().isoformat(),
                'total_achievements': len(achievements),
                'achievements': achievements,
                'source': 'profile_html_achievements_tab'
            }
            
        except Exception as e:
            self.logger.warning(f"⚠️ Failed to fetch achievements: {e}")
            return None

    def get_rider_data_file(self, rider_id: str, data_type: str) -> Optional[Dict[str, Any]]:
        """
        Get specific data type from separate file
        
        Args:
            rider_id: Rider ID
            data_type: Type of data (profile, power, race_history, etc.)
            
        Returns:
            Data from specific file or None
        """
        try:
            file_path = self.data_dir / rider_id / f"{data_type}.json"
            
            if file_path.exists():
                with open(file_path, 'r') as f:
                    return json.load(f)
            else:
                self.logger.warning(f"⚠️ No {data_type} file found for rider {rider_id}")
                return None
                
        except Exception as e:
            self.logger.warning(f"⚠️ Error reading {data_type} file: {e}")
            return None
    
    def list_rider_data_files(self, rider_id: str) -> List[str]:
        """List all available data files for a rider"""
        try:
            rider_dir = self.data_dir / rider_id
            if rider_dir.exists():
                json_files = [f.stem for f in rider_dir.glob('*.json')]
                return sorted(json_files)
            else:
                return []
        except Exception:
            return []

    # Convenience methods for accessing specific event types
    
    def get_rider_races(self, rider_id: str) -> Optional[Dict[str, Any]]:
        """Get only competitive racing events for a rider"""
        return self.get_rider_data_file(rider_id, "races")
    
    def get_rider_group_rides(self, rider_id: str) -> Optional[Dict[str, Any]]:
        """Get only group/social rides for a rider"""
        return self.get_rider_data_file(rider_id, "group_rides")
    
    def get_rider_workouts(self, rider_id: str) -> Optional[Dict[str, Any]]:
        """Get only structured workouts for a rider"""
        return self.get_rider_data_file(rider_id, "workouts")
    
    def get_events_summary(self, rider_id: str) -> Optional[Dict[str, Any]]:
        """Get quick event statistics and metadata"""
        return self.get_rider_data_file(rider_id, "events_summary")
    
    def get_recent_competitive_performance(self, rider_id: str, limit: int = 10) -> List[Dict]:
        """Get recent race performance for competitive analysis"""
        races_data = self.get_rider_races(rider_id)
        if races_data and 'races' in races_data:
            return races_data['races'][:limit]
        return []
    
    def get_training_volume_data(self, rider_id: str, days: int = 30) -> Dict[str, Any]:
        """Get training volume data from group rides and workouts"""
        from datetime import datetime, timedelta
        
        cutoff_date = datetime.now() - timedelta(days=days)
        cutoff_timestamp = int(cutoff_date.timestamp())
        
        # Get group rides
        rides_data = self.get_rider_group_rides(rider_id)
        workouts_data = self.get_rider_workouts(rider_id)
        
        recent_rides = []
        recent_workouts = []
        
        if rides_data and 'group_rides' in rides_data:
            recent_rides = [
                ride for ride in rides_data['group_rides'] 
                if ride.get('event_timestamp', 0) >= cutoff_timestamp
            ]
        
        if workouts_data and 'workouts' in workouts_data:
            recent_workouts = [
                workout for workout in workouts_data['workouts']
                if workout.get('event_timestamp', 0) >= cutoff_timestamp
            ]
        
        total_distance = sum(ride.get('distance', 0) for ride in recent_rides + recent_workouts)
        total_activities = len(recent_rides) + len(recent_workouts)
        
        return {
            'period_days': days,
            'total_activities': total_activities,
            'group_rides': len(recent_rides),
            'workouts': len(recent_workouts),
            'total_distance': total_distance,
            'avg_activities_per_week': round((total_activities / days) * 7, 1)
        }
