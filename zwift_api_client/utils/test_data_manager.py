#!/usr/bin/env python3
"""
Test script to demonstrate data manager refresh functionality
Now properly located in zwift_api_client/utils/
"""

import sys
from pathlib import Path

# Import from the zwift_api_client package
from zwift_api_client import create_rider_manager

def test_refresh_demo():
    """Demonstrate refresh functionality"""
    
    rider_id = "5528916"
    print(f"🔄 Testing refresh functionality for rider {rider_id}")
    print("=" * 50)
    
    rider_manager = create_rider_manager()
    
    # Show current cached data timestamp
    rider_dir = rider_manager.data_dir / rider_id
    if rider_dir.exists():
        files = list(rider_dir.glob("*.json"))
        if files:
            newest_file = max(files, key=lambda f: f.stat().st_mtime)
            from datetime import datetime
            mtime = datetime.fromtimestamp(newest_file.stat().st_mtime)
            print(f"📅 Current cache timestamp: {mtime.strftime('%Y-%m-%d %H:%M:%S')}")
    
    print(f"\n💡 To refresh rider {rider_id}, use either:")
    print(f"   python3 data_manager_cli.py --refresh-rider {rider_id}")
    print(f"   ./data_manager.sh refresh {rider_id}")
    
    print(f"\n💡 To reset (clear) rider {rider_id}, use either:")
    print(f"   python3 data_manager_cli.py --reset-rider {rider_id}")
    print(f"   ./data_manager.sh reset {rider_id}")
    
    print(f"\n📊 To list all riders:")
    print(f"   python3 data_manager_cli.py --list-riders")
    print(f"   ./data_manager.sh list")

if __name__ == "__main__":
    test_refresh_demo()
