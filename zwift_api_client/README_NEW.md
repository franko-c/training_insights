# Zwift API Client

A self-contained, unified API client for ZwiftPower data extraction with comprehensive caching, rate limiting, and structured data management.

## 🎯 Key Features

- **Self-Contained**: No external project dependencies - works independently anywhere
- **Unified Architecture**: Single client interface for all ZwiftPower data sources  
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
│   └── zwift_auth.py       # ZwiftAuthManager with OAuth support
├── cache/                   # Intelligent caching system
│   ├── __init__.py
│   └── cache_manager.py    # CacheManager with TTL support
├── client/                  # API client implementations
│   ├── __init__.py
│   ├── api_client.py       # Main ZwiftAPIClient
│   ├── profile_client.py   # Profile data extraction
│   ├── power_client.py     # Power data extraction
│   └── rankings_client.py  # Rankings data extraction
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
        print(f"Race Events: {len(rider_data['race_history'])}")

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

The client extracts 6+ comprehensive data sources:

1. **Profile Data**: Basic rider information, categories, stats
2. **Power Data**: FTP history, power curve analysis
3. **Race History**: Complete race results with proper sorting (newest first)
4. **Achievements**: Badges, accomplishments, milestones
5. **Activities**: Recent training activities and events
6. **Segments**: Performance on various course segments

### Race History Enhancement

- **Correct API Usage**: Uses AJAX endpoints instead of HTML scraping
- **Event Classification**: Separates competitive races from group rides
- **Proper Sorting**: Newest events first for relevant analysis
- **Dual Categories**: Shows both traditional (FTP) and racing score categories

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

# Fetch specific data types
profile_data = await rider_manager.get_rider_data_file("123456", "profile")
race_history = await rider_manager.get_rider_data_file("123456", "race_history")
```

### File Operations

```python
# List available data files for a rider
available_files = rider_manager.list_rider_data_files("123456")
print(f"Available data: {available_files}")

# Get specific data file
power_data = rider_manager.get_rider_data_file("123456", "power")

# Check data freshness
is_fresh = rider_manager.is_data_fresh("123456", "profile", max_age_hours=24)
```

## 📈 Data Structure

### Race History Format

```json
{
  "race_history": [
    {
      "date": "2025-01-15",
      "name": "ZRL Season 5 - Week 3",
      "position": 15,
      "category": "A",
      "points": 850,
      "type": "race",
      "event_type": "TYPE_RACE"
    }
  ]
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

1. **Empty Race History**: Ensure using latest version with AJAX API endpoints
2. **Authentication Errors**: Check `.env` file exists with valid credentials
3. **Import Errors**: Verify package structure and Python path

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

## 📝 Version History

- **v1.0.0**: Initial self-contained release
  - Unified API client architecture
  - Race history breakthrough (AJAX endpoints)
  - Dual category system support
  - Complete self-containment validation

---

**Ready for independent deployment!** 🚀

This package can be copied to any directory and will work independently with just the standard Python dependencies.
