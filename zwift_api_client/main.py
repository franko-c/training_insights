from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import sys
import logging
from typing import Optional

# Add the current directory to Python path so imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import directly from the local modules
from utils.data_manager_cli import DataManagerCLI

app = FastAPI(title="Zwift API Client", version="1.0.0")

# Add CORS middleware for Netlify integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your Netlify domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RiderRequest(BaseModel):
    rider_id: str
    force_refresh: Optional[bool] = False

@app.get("/")
async def root():
    return {"message": "Zwift API Client is running", "status": "healthy"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "zwift-api-client"}

@app.post("/fetch-rider/{rider_id}")
async def fetch_rider_data(rider_id: str, force_refresh: bool = False):
    """
    Handle both new rider fetching AND refresh operations
    This replaces ALL Python script calls from Netlify functions
    """
    try:
        logger.info(f"Processing rider {rider_id}, force_refresh={force_refresh}")
        
        # Create CLI instance
        cli = DataManagerCLI()
        
        # Call the appropriate method
        if force_refresh:
            result = cli.refresh_rider(rider_id)
        else:
            # For new riders, also use refresh since it fetches data
            result = cli.refresh_rider(rider_id, force=False)
        
        logger.info(f"Successfully processed rider {rider_id}")
        return {
            "success": True,
            "rider_id": rider_id,
            "force_refresh": force_refresh,
            "result": str(result),
            "message": f"Rider {rider_id} data {'refreshed' if force_refresh else 'fetched'} successfully"
        }
        
    except Exception as e:
        logger.error(f"Error processing rider {rider_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": str(e),
                "rider_id": rider_id,
                "operation": "refresh" if force_refresh else "fetch"
            }
        )

@app.post("/refresh-rider/{rider_id}")
async def refresh_rider_data(rider_id: str):
    """Convenience endpoint specifically for refresh operations"""
    return await fetch_rider_data(rider_id, force_refresh=True)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
