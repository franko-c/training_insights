#!/usr/bin/env python3
"""
Zwift API Client

A unified, modular API client for ZwiftPower data with:
- Clean separation of concerns
- Comprehensive caching
- Rate limiting
- Structured data management
"""

from .auth import ZwiftAuthManager
from .cache import CacheManager
from .client import ZwiftAPIClient, ProfileClient, PowerClient, RankingsClient
from .data import DataManager, RiderDataManager
from .config import Config, get_config

__version__ = "1.0.0"
__author__ = "Zwift Tools"

# Package-level exports
__all__ = [
    "ZwiftAPIClient",
    "ZwiftAuthManager", 
    "CacheManager",
    "ProfileClient",
    "PowerClient", 
    "RankingsClient",
    "DataManager",
    "RiderDataManager",
    "Config",
    "get_config"
]

def create_client(username: str = None, password: str = None) -> ZwiftAPIClient:
    """
    Create a configured Zwift API client
    
    Args:
        username: ZwiftPower username (optional)
        password: ZwiftPower password (optional)
        
    Returns:
        Configured ZwiftAPIClient instance
    """
    client = ZwiftAPIClient()
    
    if username and password:
        client.authenticate(username, password)
    
    return client

def create_data_manager(username: str = None, password: str = None) -> DataManager:
    """
    Create a configured data manager
    
    Args:
        username: ZwiftPower username (optional)
        password: ZwiftPower password (optional)
        
    Returns:
        Configured DataManager instance
    """
    client = create_client(username, password)
    return DataManager(client)

def create_rider_manager(username: str = None, password: str = None) -> RiderDataManager:
    """
    Create a configured rider data manager
    
    Args:
        username: ZwiftPower username (optional)
        password: ZwiftPower password (optional)
        
    Returns:
        Configured RiderDataManager instance
    """
    client = create_client(username, password)
    return RiderDataManager(client)
