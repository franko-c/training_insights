#!/bin/bash
# Zwift API Client - Data Manager (Self-Contained)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory of this script (zwift_api_client/utils)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
# Get the zwift_api_client root directory (parent of utils)
API_CLIENT_DIR="$(dirname "$SCRIPT_DIR")"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Help function
show_help() {
    echo "Zwift API Client - Data Manager (Self-Contained)"
    echo "==============================================="
    echo ""
    echo "Usage: $0 COMMAND [RIDER_ID]"
    echo ""
    echo "Commands:"
    echo "  list                List all cached riders"
    echo "  stats               Show overall statistics"
    echo "  reset RIDER_ID      Reset/clear data for specific rider"
    echo "  refresh RIDER_ID    Refresh data for specific rider"
    echo "  clear-all           Clear ALL cached data (with confirmation)"
    echo "  help                Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 list"
    echo "  $0 reset 5528916"
    echo "  $0 refresh 5528916"
    echo "  $0 stats"
    echo ""
    echo "Location: $API_CLIENT_DIR"
    echo ""
}

# Check if Python script exists
check_python_script() {
    if [ ! -f "$SCRIPT_DIR/data_manager_cli.py" ]; then
        print_error "data_manager_cli.py not found in $SCRIPT_DIR"
        exit 1
    fi
}

# Main command handling
case "$1" in
    "list")
        check_python_script
        print_status "Listing cached riders..."
        cd "$API_CLIENT_DIR/.."
        PYTHONPATH="$API_CLIENT_DIR/.." python3 -m zwift_api_client.utils.data_manager_cli --list-riders
        ;;
    
    "stats")
        check_python_script
        print_status "Showing statistics..."
        cd "$API_CLIENT_DIR/.."
        PYTHONPATH="$API_CLIENT_DIR/.." python3 -m zwift_api_client.utils.data_manager_cli --stats
        ;;
    
    "reset")
        if [ -z "$2" ]; then
            print_error "Rider ID required for reset command"
            echo "Usage: $0 reset RIDER_ID"
            exit 1
        fi
        check_python_script
        print_status "Resetting rider $2..."
        cd "$API_CLIENT_DIR/.."
        PYTHONPATH="$API_CLIENT_DIR/.." python3 -m zwift_api_client.utils.data_manager_cli --reset-rider "$2"
        ;;
    
    "refresh")
        if [ -z "$2" ]; then
            print_error "Rider ID required for refresh command"
            echo "Usage: $0 refresh RIDER_ID"
            exit 1
        fi
        check_python_script
        print_status "Refreshing rider $2..."
        cd "$API_CLIENT_DIR/.."
        PYTHONPATH="$API_CLIENT_DIR/.." python3 -m zwift_api_client.utils.data_manager_cli --refresh-rider "$2"
        ;;
    
    "clear-all")
        check_python_script
        print_warning "This will clear ALL cached data!"
        cd "$API_CLIENT_DIR/.."
        PYTHONPATH="$API_CLIENT_DIR/.." python3 -m zwift_api_client.utils.data_manager_cli --clear-all
        ;;
    
    "help"|"-h"|"--help"|"")
        show_help
        ;;
    
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
