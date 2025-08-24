# Zwift API Client

A self-contained, unified API client for ZwiftPower data extraction with comprehensive caching, rate limiting, and structured data management.

## 🎯 Key Features

- **Self-Contained**: No external project dependencies - works independently anywhere
- **Unified Architecture**: Single client interface for### Utility Features
- **Safe Operations**: Confirmation required for destructive actions
- **Detailed Output**: Shows file counts, sizes, and timestamps
- **Self-Contained**: Works within the zwift_api_client package structure
- **Error Handling**: Graceful handling of missing data and permissions

## 📚 Documentation

Complete documentation is available in the [`docs/`](docs/) directory:

- **[docs/README.md](docs/README.md)** - Documentation index and navigation
- **[docs/DATA_MANAGEMENT_GUIDE.md](docs/DATA_MANAGEMENT_GUIDE.md)** - Comprehensive data management guide
- **[docs/ENHANCED_DATA_SYSTEM_SUMMARY.md](docs/ENHANCED_DATA_SYSTEM_SUMMARY.md)** - System architecture overview
- **[docs/CODEBASE_ANALYSIS_SUMMARY.md](docs/CODEBASE_ANALYSIS_SUMMARY.md)** - Development history and analysis
- **[docs/RACE_HISTORY_ENHANCEMENT_ANALYSIS.md](docs/RACE_HISTORY_ENHANCEMENT_ANALYSIS.md)** - Race data extraction details
- **[docs/SELF_CONTAINMENT_VALIDATION_REPORT.md](docs/SELF_CONTAINMENT_VALIDATION_REPORT.md)** - Package validation results

## 📝 Version HistoryiftPower data sources  
- **Proven Data Methods**: Race history extraction using correct AJAX API endpoints
- **Intelligent Caching**: Smart cache management with configurable TTL
- **Modular File Structure**: Organized data storage by rider and data type
- **Dual Category Support**: Handles both traditional FTP-based and Zwift Racing Score categories
- **Session Optimization**: Persistent authentication sessions with automatic renewal

## 📁 Package Structure

```
zwift_api_client/
├── __init__.py              # Main package exports
├── auth/                    # Authentication management
│   ├── __init__.py
│   └── session_manager.py   # ZwiftAuthManager with OAuth support
├── cache/                   # Intelligent caching system
│   ├── __init__.py
│   └── cache_manager.py     # CacheManager with TTL support
├── client/                  # API client implementations
│   ├── __init__.py
│   ├── base_client.py       # Base client functionality
│   ├── profile_client.py    # Profile data extraction
│   ├── power_client.py      # Power data extraction
│   ├── rankings_client.py   # Rankings data extraction
│   └── zwift_client.py      # Main ZwiftAPIClient
├── config/                  # Configuration management
│   ├── __init__.py
│   ├── config.py           # Configuration handling
│   └── .env               # Environment variables
├── data/                   # Data management layer
│   ├── __init__.py
│   ├── data_manager.py     # Core data management
│   ├── rider_data_manager.py # Rider-specific data operations
│   └── riders/            # Cached rider data storage
└── utils/                  # Self-contained utilities
    ├── __init__.py
    ├── data_manager_cli.py  # Python CLI for data management
    ├── data_manager.sh      # Shell script for quick commands
    └── test_data_manager.py # Testing utilities
├── docs/                   # 📚 Complete documentation
    ├── README.md           # Documentation index
    ├── DATA_MANAGEMENT_GUIDE.md
    ├── ENHANCED_DATA_SYSTEM_SUMMARY.md
    ├── RACE_HISTORY_ENHANCEMENT_ANALYSIS.md
    ├── SELF_CONTAINMENT_VALIDATION_REPORT.md
    └── [other analysis docs]
└── logs/                   # Application logs
```
├── config/                  # Configuration management
│   ├── __init__.py
│   ├── config.py           # Config class
│   └── .env                # Environment variables
└── data/                    # Data management layer
    ├── __init__.py
    ├── data_manager.py      # Base DataManager
    └── rider_data_manager.py # Enhanced RiderDataManager
```

## 🚀 Quick Start

### Installation

1. Copy the `zwift_api_client/` folder to your project directory
2. Install required dependencies:
   ```bash
   pip install requests beautifulsoup4 python-dotenv
   ```

### Basic Usage

```python
from zwift_api_client import create_rider_manager
import asyncio

async def fetch_rider_data():
    # Create rider manager (self-contained!)
    rider_manager = create_rider_manager()
    
    # Fetch complete rider data
    rider_data = await rider_manager.get_complete_rider_data_proven("5528916")
    
    if rider_data:
        print(f"Rider: {rider_data['profile']['name']}")
        print(f"Category: {rider_data['profile']['category']}")
        print(f"Racing Category: {rider_data['profile']['racing_category']}")
        print(f"Total Events: {len(rider_data['events']['races']['events']) + len(rider_data['events']['group_rides']['events']) + len(rider_data['events']['workouts']['events'])}")

# Alternative: Load specific event types
races = await rider_manager.get_rider_races("5528916")
group_rides = await rider_manager.get_rider_group_rides("5528916") 
workouts = await rider_manager.get_rider_workouts("5528916")

# Run the example
asyncio.run(fetch_rider_data())
```

### Configuration

Create `zwift_api_client/config/.env` with your ZwiftPower credentials:

```
ZWIFT_EMAIL=your_email@example.com
ZWIFT_PASSWORD=your_password
```

## 📊 Data Sources

The client extracts 4 comprehensive data sources with specialized event separation:

1. **Profile Data**: Basic rider information, categories, stats
2. **Power Data**: FTP history, power curve analysis  
3. **Event Data**: Separated into specialized files for optimal app performance:
   - **races.json**: Competitive racing events only (148 events)
   - **group_rides.json**: Social/training rides only (117 events)
   - **workouts.json**: Structured training sessions only (6 events)
   - **events_summary.json**: Quick overview and metadata
4. **Rankings Data**: Category rankings and competitive standings

### Event Separation Benefits

- **🚀 Performance**: Load only the event type you need (races vs rides vs workouts)
- **📊 Analytics**: Clean separation for different analysis types
- **🎯 App Development**: No client-side filtering required
- **📱 Frontend Optimization**: Smaller payloads for mobile apps

## 🏗️ Architecture

### Core Components

- **ZwiftAuthManager**: Handles OAuth authentication with session persistence
- **ZwiftAPIClient**: Main unified client with specialized sub-clients
- **RiderDataManager**: Business logic for rider data operations
- **CacheManager**: Intelligent caching with configurable TTL
- **Config**: Environment and configuration management

### Self-Contained Design

- ✅ No external project dependencies
- ✅ Internal relative imports only
- ✅ Standard Python libraries (requests, beautifulsoup4, python-dotenv)
- ✅ Portable across different environments
- ✅ Works when moved to any directory

## 🔧 Advanced Usage

### Custom Data Directory

```python
from zwift_api_client import ZwiftAPIClient, ZwiftAuthManager, RiderDataManager

# Create with custom configuration
auth = ZwiftAuthManager()
client = ZwiftAPIClient(auth)
rider_manager = RiderDataManager(client, data_dir="/custom/path")

# Fetch specific event types - optimized for app performance
races = await rider_manager.get_rider_races("123456")           # Only competitive races
group_rides = await rider_manager.get_rider_group_rides("123456") # Only social rides  
workouts = await rider_manager.get_rider_workouts("123456")      # Only structured training

# Get performance analysis data
recent_performance = rider_manager.get_recent_competitive_performance("123456", limit=10)
training_volume = rider_manager.get_training_volume_data("123456", days=30)
```

### File Operations

```python
# List available data files for a rider
available_files = rider_manager.list_rider_data_files("123456")
print(f"Available data: {available_files}")

# Get specific event types (optimized approach)
races = rider_manager.get_rider_races("123456")              # Competitive events only
group_rides = rider_manager.get_rider_group_rides("123456")  # Social/training rides only
summary = rider_manager.get_events_summary("123456")        # Quick stats

# Check data freshness
is_fresh = rider_manager.is_data_fresh("123456", "profile", max_age_hours=24)
```

## 📈 Data Structure

### Races Data Format

```json
{
  "races": [
    {
      "event_title": "ZRL Season 5 - Week 3",
      "event_date": "2025-01-15",
      "position": 15,
      "category": "A",
      "avg_power": 285,
      "event_type": "TYPE_RACE"
    }
  ]
}
```

### Group Rides Data Format

```json
{
  "group_rides": [
    {
      "event_title": "Weekly Social Ride",
      "event_date": "2025-01-20",
      "category": "D",
      "team": "GTR",
      "event_type": "TYPE_RIDE"
    }
  ]
}
```

### Events Summary Format

```json
{
  "summary": {
    "races": { "count": 148, "file": "races.json" },
    "group_rides": { "count": 117, "file": "group_rides.json" },
    "workouts": { "count": 6, "file": "workouts.json" }
  }
}
```

### Profile Data Format

```json
{
  "profile": {
    "name": "Rider Name",
    "category": "B",
    "racing_category": "A",
    "ftp": 320,
    "weight": 75,
    "height": 180
  }
}
```

## 🔍 Troubleshooting

### Common Issues

1. **Empty Ride History**: Ensure using latest version with AJAX API endpoints
2. **Authentication Errors**: Check `.env` file exists with valid credentials
3. **Import Errors**: Verify package structure and Python path
4. **Missing Data Sources**: achievements, activities, segments currently return empty data

### Debug Mode

```python
import logging
logging.basicConfig(level=logging.DEBUG)

# Detailed logging for troubleshooting
rider_data = await rider_manager.get_complete_rider_data_proven("123456")
```

## 🎯 Self-Containment Validation

Run the included test to verify independent operation:

```bash
python test_self_containment.py
```

Expected output:
```
🎉 SUCCESS: Zwift API Client is fully self-contained!
   Ready to be moved to any directory
   All dependencies are internal or standard library
```

## � Data Management Utilities

The package includes self-contained utilities for managing cached data:

### Quick Commands (Shell Script)
```bash
cd utils/

# List all cached riders
./data_manager.sh list

# Show storage statistics  
./data_manager.sh stats

# Reset specific rider (clear cache for fresh pull)
./data_manager.sh reset 5528916

# Refresh specific rider (force fresh API fetch)
./data_manager.sh refresh 5528916

# Clear all cached data (with confirmation)
./data_manager.sh clear-all
```

### Advanced Commands (Python CLI)
```bash
cd utils/

# Detailed rider listing with file information
python3 data_manager_cli.py --list-riders

# Reset with detailed confirmation
python3 data_manager_cli.py --reset-rider 5528916

# Refresh with progress information
python3 data_manager_cli.py --refresh-rider 5528916

# Comprehensive statistics
python3 data_manager_cli.py --stats
```

### Utility Features
- **Safe Operations**: Confirmation required for destructive actions
- **Detailed Output**: Shows file counts, sizes, and timestamps
- **Self-Contained**: Works within the zwift_api_client package structure
- **Error Handling**: Graceful handling of missing data and permissions

## �📝 Version History

- **v1.0.0**: Initial self-contained release
  - Unified API client architecture
  - Race history breakthrough (AJAX endpoints)
  - Dual category system support
  - Complete self-containment validation

---

**Ready for independent deployment!** 🚀

This package can be copied to any directory and will work independently with just the standard Python dependencies.
