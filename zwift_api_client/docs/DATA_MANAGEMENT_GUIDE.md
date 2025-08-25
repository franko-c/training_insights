# Data Management Guide

## Overview

The Zwift API Client package includes self-contained data management utilities located in `zwift_api_client/utils/`. These tools provide comprehensive data management capabilities for maintaining cached rider data, performing fresh pulls, and managing storage efficiently during development and production use.

## Available Tools

### 1. Shell Script (Quick Commands)
**File:** `zwift_api_client/utils/data_manager.sh`
**Purpose:** Simple, fast commands for common operations

```bash
# Navigate to utilities directory
cd zwift_api_client/utils/

# Make executable (first time only)
chmod +x data_manager.sh

# List all cached riders with summary
./data_manager.sh list

# Show storage statistics
./data_manager.sh stats

# Reset specific rider (clear all cached data)
./data_manager.sh reset 5528916

# Refresh specific rider (force fresh API pull)
./data_manager.sh refresh 5528916

# Clear all cached data (with safety confirmation)
./data_manager.sh clear-all
```

### 2. Python CLI (Advanced Commands)
**File:** `zwift_api_client/utils/data_manager_cli.py`
**Purpose:** Detailed operations with comprehensive output

```bash
# Navigate to utilities directory
cd zwift_api_client/utils/

# List riders with detailed information
python3 data_manager_cli.py --list-riders

# Reset specific rider with file listing
python3 data_manager_cli.py --reset-rider 5528916

# Refresh rider with detailed progress
python3 data_manager_cli.py --refresh-rider 5528916

# Show comprehensive statistics
python3 data_manager_cli.py --stats

# Clear all data with detailed confirmation
python3 data_manager_cli.py --clear-all

# Show help
python3 data_manager_cli.py --help
```

## Common Use Cases

### During Development

1. **Fresh Data Pull After API Changes**
   ```bash
   # Reset rider to clear potentially stale data
   ./data_manager.sh reset 5528916
   
   # Fetch fresh data
   python3 zwift_api_client_demo.py
   ```

2. **Testing Different Riders**
   ```bash
   # Check current cached riders
   ./data_manager.sh list
   
   # Clear specific rider for testing
   ./data_manager.sh reset RIDER_ID
   ```

3. **Storage Management**
   ```bash
   # Check storage usage
   ./data_manager.sh stats
   
   # Clear all data if needed
   ./data_manager.sh clear-all
   ```

### During Production

1. **Regular Data Refresh**
   ```bash
   # Refresh specific rider (keeps existing structure)
   ./data_manager.sh refresh 5528916
   ```

2. **Cache Maintenance**
   ```bash
   # List all cached riders
   ./data_manager.sh list
   
   # Remove inactive riders
   ./data_manager.sh reset OLD_RIDER_ID
   ```

## Output Examples

### List Command Output
```
📊 Cached Riders Summary
==================================================
📈 Total riders: 1

👤 5528916 (Fran Cardona)
   📁 Files: 10 | Last: 2025-08-23 14:48 | 271 events (148 races, 117 rides)
```

### Stats Command Output
```
📊 Zwift API Client Statistics
========================================
👥 Total riders: 1
📁 Total files: 10
💾 Total size: 131.2 KB
📂 Data directory: /Users/franoc/TOP/training_insights/zwift_api_client/data/riders
```

### Reset Command Output
```
🔄 Resetting rider 5528916
------------------------------
📁 Found 10 files to delete:
   🗑️ workouts.json
   🗑️ races.json
   🗑️ power.json
   🗑️ segments.json
   🗑️ achievements.json
   🗑️ ride_history.json
   🗑️ group_rides.json
   🗑️ activities.json
   🗑️ events_summary.json
   🗑️ profile.json

❓ Delete all data for rider 5528916? (y/N):
```

## Safety Features

### Confirmation Required
- **Reset operations:** Require 'y' confirmation
- **Clear all operations:** Require typing 'DELETE' exactly
- **Cancel-friendly:** Any other input cancels the operation

### Detailed Output
- Shows exactly what files will be deleted
- Displays file counts and sizes
- Provides clear success/error messages

### Error Handling
- Graceful handling of missing data directories
- Clear error messages for invalid rider IDs
- Safe handling of permission issues

## Integration with Main System

The data management tools are designed to work seamlessly with:

1. **Zwift API Client:** Uses the same data directory structure
2. **Cache Management:** Respects existing cache logic
3. **Authentication:** Uses the same auth system
4. **File Structure:** Maintains the specialized file separation (races.json, group_rides.json, etc.)

## File Structure Maintained

After reset/refresh operations, the following structure is preserved:

```
zwift_api_client/data/riders/RIDER_ID/
├── profile.json           # Basic rider information
├── power.json            # Power data and categories
├── segments.json         # Segment attempts
├── achievements.json     # Achievements and badges
├── activities.json       # Recent activities
├── ride_history.json     # Complete ride history
├── races.json           # Competitive races only (148 events)
├── group_rides.json     # Group rides only (117 events)
├── workouts.json        # Structured workouts only (6 events)
└── events_summary.json  # Event statistics and metadata
```

## Best Practices

1. **Before Major Changes:** Always `list` first to see current state
2. **Development Testing:** Use `reset` for clean slate testing
3. **Production Updates:** Use `refresh` to update existing data
4. **Storage Monitoring:** Check `stats` regularly
5. **Backup Important Data:** Before using `clear-all`, ensure backups exist

This data management system provides the flexibility and safety needed for both development iteration and production maintenance of the Zwift Tools package.
