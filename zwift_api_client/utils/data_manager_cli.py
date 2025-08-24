#!/usr/bin/env python3
"""
Zwift API Client - Data Management CLI Tool (Self-Contained)

A command-line utility for managing cached rider data, resetting specific riders,
clearing all data, and performing maintenance operations.

Usage:
    python data_manager_cli.py --help
    python data_manager_cli.py --reset-rider 5528916
    python data_manager_cli.py --clear-all
    python data_manager_cli.py --list-riders
    python data_manager_cli.py --refresh-rider 5528916
"""

import argparse
import sys
from pathlib import Path
from datetime import datetime
import json
import shutil

# Import from the zwift_api_client package
from zwift_api_client import create_rider_manager


class DataManagerCLI:
    """Command-line interface for managing Zwift API Client data (Self-Contained)"""
    
    def __init__(self):
        self.rider_manager = create_rider_manager()
        self.data_dir = self.rider_manager.data_dir
    
    def list_riders(self):
        """List all riders with cached data"""
        print("📊 Cached Riders Summary")
        print("=" * 50)
        
        if not self.data_dir.exists():
            print("❌ No data directory found")
            return
        
        rider_dirs = [d for d in self.data_dir.iterdir() if d.is_dir()]
        
        if not rider_dirs:
            print("🚫 No cached riders found")
            return
        
        total_riders = len(rider_dirs)
        print(f"📈 Total riders: {total_riders}")
        print()
        
        for rider_dir in sorted(rider_dirs):
            rider_id = rider_dir.name
            self._print_rider_summary(rider_id)
    
    def _print_rider_summary(self, rider_id: str):
        """Print summary of a rider's cached data"""
        try:
            files = self.rider_manager.list_rider_data_files(rider_id)
            rider_dir = self.data_dir / rider_id
            
            # Get profile info if available
            profile_data = self.rider_manager.get_rider_data_file(rider_id, "profile")
            rider_name = "Unknown"
            if profile_data:
                rider_name = profile_data.get('name', 'Unknown')
            
            # Get events summary if available
            summary = self.rider_manager.get_events_summary(rider_id)
            event_info = ""
            if summary:
                total = summary.get('total_events', 0)
                races = summary.get('summary', {}).get('races', {}).get('count', 0)
                rides = summary.get('summary', {}).get('group_rides', {}).get('count', 0)
                event_info = f" | {total} events ({races} races, {rides} rides)"
            
            # Get last modified time
            last_modified = "Unknown"
            if rider_dir.exists():
                newest_file = max(rider_dir.glob("*.json"), key=lambda f: f.stat().st_mtime, default=None)
                if newest_file:
                    mtime = datetime.fromtimestamp(newest_file.stat().st_mtime)
                    last_modified = mtime.strftime("%Y-%m-%d %H:%M")
            
            print(f"👤 {rider_id} ({rider_name})")
            print(f"   📁 Files: {len(files)} | Last: {last_modified}{event_info}")
            
        except Exception as e:
            print(f"👤 {rider_id}")
            print(f"   ❌ Error reading data: {e}")
    
    def reset_rider(self, rider_id: str):
        """Reset/clear all data for a specific rider"""
        print(f"🔄 Resetting rider {rider_id}")
        print("-" * 30)
        
        rider_dir = self.data_dir / rider_id
        
        if not rider_dir.exists():
            print(f"⚠️ No data found for rider {rider_id}")
            return
        
        # Show what will be deleted
        files = list(rider_dir.glob("*.json"))
        print(f"📁 Found {len(files)} files to delete:")
        for file in files:
            print(f"   🗑️ {file.name}")
        
        # Confirm deletion
        confirm = input(f"\n❓ Delete all data for rider {rider_id}? (y/N): ").lower().strip()
        if confirm in ['y', 'yes']:
            try:
                shutil.rmtree(rider_dir)
                print(f"✅ Successfully reset rider {rider_id}")
            except Exception as e:
                print(f"❌ Error resetting rider: {e}")
        else:
            print("❌ Reset cancelled")
    
    def refresh_rider(self, rider_id: str, force: bool = True):
        """Refresh data for a specific rider"""
        print(f"🔄 Refreshing rider {rider_id}")
        print("-" * 30)
        
        try:
            # Force fresh data fetch
            print("📊 Fetching fresh data...")
            rider_data = self.rider_manager.get_complete_rider_data_proven(rider_id, force_refresh=force)
            
            if rider_data.get('success'):
                sources = rider_data.get('data_sources', [])
                print(f"✅ Successfully refreshed rider {rider_id}")
                print(f"📈 Data sources: {', '.join(sources)}")
                
                # Show event summary if available
                if 'events' in rider_data:
                    events = rider_data['events']
                    races = events.get('races', {}).get('count', 0)
                    rides = events.get('group_rides', {}).get('count', 0)
                    workouts = events.get('workouts', {}).get('count', 0)
                    print(f"🏁 Events: {races} races, {rides} group rides, {workouts} workouts")
            else:
                error = rider_data.get('error', 'Unknown error')
                print(f"❌ Failed to refresh rider: {error}")
                
        except Exception as e:
            print(f"❌ Error refreshing rider: {e}")
    
    def clear_all_data(self):
        """Clear all cached data"""
        print("🗑️ Clear All Cached Data")
        print("=" * 30)
        
        if not self.data_dir.exists():
            print("⚠️ No data directory found")
            return
        
        rider_dirs = [d for d in self.data_dir.iterdir() if d.is_dir()]
        total_riders = len(rider_dirs)
        
        if total_riders == 0:
            print("🚫 No cached data found")
            return
        
        print(f"⚠️ This will delete data for {total_riders} riders:")
        for rider_dir in rider_dirs[:5]:  # Show first 5
            print(f"   🗑️ {rider_dir.name}")
        if total_riders > 5:
            print(f"   ... and {total_riders - 5} more")
        
        print(f"\n📁 Data directory: {self.data_dir}")
        confirm = input(f"\n❓ DELETE ALL cached data? Type 'DELETE' to confirm: ").strip()
        
        if confirm == 'DELETE':
            try:
                shutil.rmtree(self.data_dir)
                print(f"✅ Successfully cleared all cached data")
                print(f"📁 Data directory removed: {self.data_dir}")
            except Exception as e:
                print(f"❌ Error clearing data: {e}")
        else:
            print("❌ Clear cancelled")
    
    def show_stats(self):
        """Show overall statistics"""
        print("📊 Zwift API Client Statistics")
        print("=" * 40)
        
        if not self.data_dir.exists():
            print("❌ No data directory found")
            return
        
        rider_dirs = [d for d in self.data_dir.iterdir() if d.is_dir()]
        total_riders = len(rider_dirs)
        
        total_files = 0
        total_size = 0
        
        for rider_dir in rider_dirs:
            files = list(rider_dir.glob("*.json"))
            total_files += len(files)
            total_size += sum(f.stat().st_size for f in files)
        
        # Convert size to human readable
        if total_size < 1024:
            size_str = f"{total_size} B"
        elif total_size < 1024 * 1024:
            size_str = f"{total_size / 1024:.1f} KB"
        else:
            size_str = f"{total_size / (1024 * 1024):.1f} MB"
        
        print(f"👥 Total riders: {total_riders}")
        print(f"📁 Total files: {total_files}")
        print(f"💾 Total size: {size_str}")
        print(f"📂 Data directory: {self.data_dir}")


def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        description="Zwift API Client Data Management Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python data_manager_cli.py --list-riders
  python data_manager_cli.py --reset-rider 5528916
  python data_manager_cli.py --refresh-rider 5528916
  python data_manager_cli.py --clear-all
  python data_manager_cli.py --stats
        """
    )
    
    parser.add_argument('--list-riders', action='store_true',
                        help='List all riders with cached data')
    
    parser.add_argument('--reset-rider', metavar='RIDER_ID',
                        help='Reset/clear all data for a specific rider')
    
    parser.add_argument('--refresh-rider', metavar='RIDER_ID',
                        help='Refresh data for a specific rider (force fresh fetch)')
    
    parser.add_argument('--clear-all', action='store_true',
                        help='Clear ALL cached data (requires confirmation)')
    
    parser.add_argument('--stats', action='store_true',
                        help='Show overall statistics')
    
    args = parser.parse_args()
    
    if not any(vars(args).values()):
        parser.print_help()
        return
    
    try:
        cli = DataManagerCLI()
        
        if args.list_riders:
            cli.list_riders()
        
        if args.reset_rider:
            cli.reset_rider(args.reset_rider)
        
        if args.refresh_rider:
            cli.refresh_rider(args.refresh_rider)
        
        if args.clear_all:
            cli.clear_all_data()
        
        if args.stats:
            cli.show_stats()
            
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
