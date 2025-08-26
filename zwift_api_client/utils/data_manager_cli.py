#!/usr/bin/env python3
"""
Clean CLI for managing Zwift rider data.

Single implementation: no side-effects on import and a `main()` entrypoint for
running the tool directly.
"""

import os
import sys
import argparse
import shutil
import logging
from pathlib import Path

# Module logger; configure handlers only when running as a script to avoid
# interfering with applications (like the FastAPI server) that import this module.
logger = logging.getLogger('zwift_api_client.utils.data_manager_cli')

# Ensure project root is on sys.path so imports work when executing the script
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Try to import the zwift_api_client factory; provide local fallback for repo layout
try:
    from zwift_api_client import create_rider_manager
    from zwift_api_client.data.rider_data_manager import RiderDataManager
except ImportError:
    parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)
    try:
        from data.rider_data_manager import RiderDataManager
        try:
            from client.zwift_client import ZwiftAPIClient
        except Exception:
            from client import ZwiftAPIClient

        def create_rider_manager():
            client = ZwiftAPIClient()
            return RiderDataManager(client)
    except Exception as e:
        logger.error("Could not import local zwift client components: %s", e)
        raise


class DataManagerCLI:
    """Command-line interface for managing cached rider data."""

    def __init__(self):
        self.rider_manager = create_rider_manager()
        self.data_dir: Path = Path(self.rider_manager.data_dir)

    def list_riders(self):
        print("Cached Riders Summary")
        print("=" * 40)

        if not self.data_dir.exists():
            print("No data directory found")
            return

        rider_dirs = [d for d in self.data_dir.iterdir() if d.is_dir()]
        if not rider_dirs:
            print("No cached riders found")
            return

        print(f"Total riders: {len(rider_dirs)}")
        for d in sorted(rider_dirs):
            print(f" - {d.name}")

    def reset_rider(self, rider_id: str, yes: bool = False):
        print(f"Resetting rider {rider_id}")
        print("-" * 30)
        rider_dir = self.data_dir / str(rider_id)
        if not rider_dir.exists():
            print(f"No data found for rider {rider_id}")
            return

        files = list(rider_dir.glob("*.json"))
        print(f"Found {len(files)} files to delete:")
        for f in files:
            print(f"   {f.name}")

        if not yes:
            confirm = input(f"\nDelete all data for rider {rider_id}? (y/N): ").lower().strip()
            if confirm not in ("y", "yes"):
                print("Reset cancelled")
                return

        try:
            shutil.rmtree(rider_dir)
            print(f"Successfully reset rider {rider_id}")
        except Exception as e:
            print(f"Error resetting rider: {e}")

    def refresh_rider(self, rider_id: str, force: bool = True):
        print(f"Refreshing rider {rider_id}")
        print("-" * 30)
        try:
            rider_data = self.rider_manager.get_complete_rider_data_proven(rider_id, force_refresh=force)
            if isinstance(rider_data, dict) and rider_data.get("success"):
                sources = rider_data.get("data_sources", [])
                print(f"Successfully refreshed rider {rider_id}")
                if sources:
                    print(f"Data sources: {', '.join(sources)}")
            else:
                print(f"Failed to refresh rider: {rider_data.get('error', 'Unknown') if isinstance(rider_data, dict) else rider_data}")
            return rider_data
        except Exception as e:
            print(f"Error refreshing rider: {e}")
            return {"success": False, "error": str(e)}

    def clear_all_data(self):
        print("Clear All Cached Data")
        print("=" * 30)
        if not self.data_dir.exists():
            print("No data directory found")
            return
        rider_dirs = [d for d in self.data_dir.iterdir() if d.is_dir()]
        print(f"This will delete data for {len(rider_dirs)} riders")

        # In automation we may pass a confirmation flag to skip interactive prompt
        # The caller should pass yes=True to bypass this prompt
        if not getattr(self, "_auto_confirm_all", False):
            confirm = input("Type 'DELETE' to confirm: ").strip()
            if confirm != "DELETE":
                print("Clear cancelled")
                return

        try:
            shutil.rmtree(self.data_dir)
            print("Successfully cleared all cached data")
        except Exception as e:
            print(f"Error clearing data: {e}")

    def show_stats(self):
        print("Zwift API Client Statistics")
        print("=" * 40)
        if not self.data_dir.exists():
            print("No data directory found")
            return

        rider_dirs = [d for d in self.data_dir.iterdir() if d.is_dir()]
        total_files = 0
        total_size = 0
        for d in rider_dirs:
            files = list(d.glob("*.json"))
            total_files += len(files)
            total_size += sum(f.stat().st_size for f in files)

        size_str = f"{total_size} B" if total_size < 1024 else f"{total_size/1024:.1f} KB"
        print(f"Total riders: {len(rider_dirs)}")
        print(f"Total files: {total_files}")
        print(f"Total size: {size_str}")


def main(argv=None):
    parser = argparse.ArgumentParser(description="Zwift API Client Data Management Tool")
    parser.add_argument('--list-riders', action='store_true', help='List all riders with cached data')
    parser.add_argument('--reset-rider', metavar='RIDER_ID', help='Reset/clear all data for a specific rider')
    parser.add_argument('--refresh-rider', metavar='RIDER_ID', help='Refresh data for a specific rider (force fresh fetch)')
    parser.add_argument('--clear-all', action='store_true', help='Clear ALL cached data (requires confirmation)')
    parser.add_argument('--stats', action='store_true', help='Show overall statistics')
    parser.add_argument('--yes', action='store_true', help='Auto-confirm destructive actions')
    # By default the CLI will force refresh to get fresh data; --no-force disables that
    parser.add_argument('--no-force', dest='force', action='store_false', help='Disable force refresh; use cached data when available')
    parser.set_defaults(force=True)
    args = parser.parse_args(argv)

    if not any(vars(args).values()):
        parser.print_help()
        return

    cli = DataManagerCLI()

    # Propagate non-interactive confirmation flag to the CLI instance when used
    if args.yes:
        # set an internal flag used by clear_all_data; reset_rider gets explicit arg
        cli._auto_confirm_all = True

    if args.list_riders:
        cli.list_riders()
    if args.reset_rider:
        cli.reset_rider(args.reset_rider, yes=args.yes)
    if args.refresh_rider:
        cli.refresh_rider(args.refresh_rider, force=args.force)
    if args.clear_all:
        cli.clear_all_data()
    if args.stats:
        cli.show_stats()


if __name__ == "__main__":
    # Configure logging for standalone script execution only
    root_logger = logging.getLogger()
    if root_logger.handlers:
        for h in list(root_logger.handlers):
            root_logger.removeHandler(h)
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    main()
