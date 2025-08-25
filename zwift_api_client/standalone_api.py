#!/usr/bin/env python3
"""
Standalone Zwift API for Railway deployment
"""

import os
import sys
import json
import asyncio
import logging
from datetime import datetime
from typing import Optional, Dict, List, Any

import requests
from bs4 import BeautifulSoup
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Zwift API", description="Standalone Zwift API for Railway")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SimpleZwiftClient:
    """Simple Zwift API client for Railway deployment"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        self.base_url = "https://zwiftpower.com"
    
    def fetch_rider_profile(self, rider_id: str) -> Dict[str, Any]:
        """Fetch rider profile data"""
        try:
            url = f"{self.base_url}/profile.php?z={rider_id}"
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract basic profile information
            profile_data = {
                "rider_id": rider_id,
                "name": "",
                "team": "",
                "country": "",
                "weight": None,
                "height": None,
                "ftp": None,
                "last_seen": None,
                "total_events": 0,
                "total_distance": 0,
                "fetch_timestamp": datetime.now().isoformat()
            }
            
            # Try to extract name
            name_elem = soup.find('h1')
            if name_elem:
                profile_data["name"] = name_elem.get_text(strip=True)
            
            # Try to extract stats from tables
            tables = soup.find_all('table')
            for table in tables:
                rows = table.find_all('tr')
                for row in rows:
                    cells = row.find_all(['td', 'th'])
                    if len(cells) >= 2:
                        key = cells[0].get_text(strip=True).lower()
                        value = cells[1].get_text(strip=True)
                        
                        if 'weight' in key and value:
                            try:
                                profile_data["weight"] = float(value.replace('kg', '').strip())
                            except ValueError:
                                pass
                        elif 'ftp' in key and value:
                            try:
                                profile_data["ftp"] = int(value.replace('W', '').strip())
                            except ValueError:
                                pass
                        elif 'event' in key and value:
                            try:
                                profile_data["total_events"] = int(value)
                            except ValueError:
                                pass
            
            return profile_data
            
        except Exception as e:
            logger.error(f"Error fetching rider profile {rider_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Error fetching rider data: {str(e)}")
    
    def fetch_rider_races(self, rider_id: str, year: Optional[int] = None) -> List[Dict[str, Any]]:
        """Fetch rider race results"""
        try:
            year = year or datetime.now().year
            url = f"{self.base_url}/api3.php?do=profile_results&z={rider_id}&y={year}"
            
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            # Check if response content is JSON
            try:
                data = response.json()
            except ValueError:
                # If not JSON, try to parse the HTML response or return empty list
                logger.warning(f"Non-JSON response for rider {rider_id}, returning empty race list")
                return []
            
            races = []
            if 'data' in data and isinstance(data['data'], list):
                for race in data['data']:
                    race_data = {
                        "event_id": race.get('eid', ''),
                        "event_name": race.get('name', ''),
                        "date": race.get('date', ''),
                        "position": race.get('position', 0),
                        "category": race.get('category', ''),
                        "avg_power": race.get('avg_watts', 0),
                        "max_power": race.get('max_watts', 0),
                        "avg_hr": race.get('avg_hr', 0),
                        "duration": race.get('duration', ''),
                        "distance": race.get('distance', 0)
                    }
                    races.append(race_data)
            
            return races
            
        except Exception as e:
            logger.error(f"Error fetching rider races {rider_id}: {e}")
            # Return empty list instead of raising error to allow profile fetch to succeed
            return []


# --- Import ZwiftAPIClient and RiderDataManager ---
from zwift_api_client import ZwiftAPIClient
from zwift_api_client.data.rider_data_manager import RiderDataManager

# Create unified API client and data manager
api_client = ZwiftAPIClient()
rider_manager = RiderDataManager(api_client)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "ok", "service": "Zwift API", "timestamp": datetime.now().isoformat()}

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.get("/fetch-rider/{rider_id}")
async def fetch_rider(rider_id: str, force_refresh: bool = False):
    """Fetch complete rider data using proven methods"""
    try:
        # Use the full RiderDataManager logic
        data = rider_manager.get_complete_rider_data_proven(rider_id, force_refresh=force_refresh)
        return data
    except Exception as e:
        logger.error(f"Error in fetch_rider endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/rider-profile/{rider_id}")
async def get_rider_profile(rider_id: str):
    """Get rider profile data only"""
    try:
        profile = zwift_client.fetch_rider_profile(rider_id)
        return profile
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in rider_profile endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/rider-races/{rider_id}")
async def get_rider_races(rider_id: str, year: Optional[int] = None):
    """Get rider race results"""
    try:
        races = zwift_client.fetch_rider_races(rider_id, year)
        return {
            "rider_id": rider_id,
            "year": year or datetime.now().year,
            "races": races,
            "total_races": len(races),
            "fetch_timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in rider_races endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
