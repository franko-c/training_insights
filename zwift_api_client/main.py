from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import sys
import logging
from typing import Optional
import requests
import json
from pathlib import Path
from datetime import datetime, timezone

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


def dispatch_github_workflow(rider_id: str) -> None:
    """Dispatch a GitHub Actions workflow (workflow_dispatch) to persist generated JSON.

    This runs in the background and is best-effort. Requires the following env vars:
    - GITHUB_PAT (Personal Access Token with repo+workflow scopes)
    - GITHUB_REPO (owner/repo)
    - GITHUB_BRANCH (branch to dispatch against; defaults to 'master')
    - GITHUB_WORKFLOW_FILE (workflow filename or id; defaults to 'generate-rider-data.yml')
    """
    pat = os.getenv("GITHUB_PAT")
    repo = os.getenv("GITHUB_REPO")
    branch = os.getenv("GITHUB_BRANCH", "master")
    workflow_file = os.getenv("GITHUB_WORKFLOW_FILE", "generate-rider-data.yml")

    if not pat or not repo:
        logger.info("GITHUB_PAT or GITHUB_REPO not set; skipping GitHub workflow dispatch")
        return

    url = f"https://api.github.com/repos/{repo}/actions/workflows/{workflow_file}/dispatches"
    headers = {
        "Authorization": f"token {pat}",
        "Accept": "application/vnd.github+json",
    }
    payload = {"ref": branch, "inputs": {"rider_id": str(rider_id)}}

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=10)
        if resp.status_code in (204, 201, 200):
            logger.info(f"Dispatched GitHub workflow '{workflow_file}' for rider {rider_id}")
        else:
            logger.warning(f"Failed to dispatch workflow: {resp.status_code} {resp.text}")
        # Return response details for optional synchronous callers
        return {"status_code": resp.status_code, "text": resp.text}
    except Exception as e:
        logger.exception(f"Error dispatching GitHub workflow for rider {rider_id}: {e}")
        return {"error": str(e)}


def fetch_raw_profile_from_repo(rider_id: str, repo: str, branch: str, token: Optional[str] = None, timeout: int = 6):
    """Try to fetch the persisted profile.json from the repository's raw URL.

    Returns parsed JSON on success or None.
    """
    if not repo or not branch:
        return None
    raw = f"https://raw.githubusercontent.com/{repo}/{branch}/public/data/riders/{rider_id}/profile.json"
    headers = {}
    if token:
        headers["Authorization"] = f"token {token}"
    try:
        r = requests.get(raw, headers=headers, timeout=timeout)
        if r.status_code == 200:
            try:
                return r.json()
            except Exception:
                # fallthrough to return None on parse error
                return None
    except Exception:
        return None
    return None

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
async def fetch_rider_data(rider_id: str, force_refresh: bool = False, background_tasks: BackgroundTasks = None):
    """
    Handle both new rider fetching AND refresh operations
    This replaces ALL Python script calls from Netlify functions
    """
    try:

        logger.info(f"Processing rider {rider_id}, force_refresh={force_refresh}")

        # Try dynamic-first fast-path: if a persisted file exists in the repo and is
        # younger than the TTL, return it immediately. Otherwise run the scraper.
        PERSIST_TTL = int(os.getenv("PERSIST_TTL_SECONDS", "86400"))
        repo_env = os.getenv("GITHUB_REPO", "")
        branch_env = os.getenv("GITHUB_BRANCH", "master")
        token_env = os.getenv("GITHUB_PAT") or os.getenv("GITHUB_TOKEN")

        raw_profile = None
        try:
            if not force_refresh and repo_env:
                raw_profile = fetch_raw_profile_from_repo(rider_id, repo_env, branch_env, token=token_env)
                if raw_profile and isinstance(raw_profile, dict):
                    # parse extraction_date if present
                    dt_str = raw_profile.get("extraction_date")
                    if dt_str:
                        try:
                            dt = datetime.fromisoformat(dt_str)
                            # ensure timezone-aware
                            if dt.tzinfo is None:
                                dt = dt.replace(tzinfo=timezone.utc)
                            age = (datetime.now(timezone.utc) - dt).total_seconds()
                            if age <= PERSIST_TTL:
                                logger.info(f"Returning repo-cached profile for {rider_id}, age={age}s")
                                github_env = {
                                    "GITHUB_PAT_set": bool(os.getenv("GITHUB_PAT")),
                                    "GITHUB_REPO_set": bool(os.getenv("GITHUB_REPO")),
                                    "GITHUB_BRANCH": os.getenv("GITHUB_BRANCH"),
                                    "GITHUB_WORKFLOW_FILE": os.getenv("GITHUB_WORKFLOW_FILE"),
                                }
                                return {
                                    "success": True,
                                    "rider_id": rider_id,
                                    "from": "repo_cache",
                                    "age_seconds": age,
                                    "profile": raw_profile,
                                    "files": ["profile.json"],
                                    "github_env": github_env,
                                }
                        except Exception:
                            # if parsing fails, ignore and fall through to scrape
                            raw_profile = None

        except Exception:
            raw_profile = None

        # Create CLI instance and run scraper for fresh data
        cli = DataManagerCLI()
        result = cli.refresh_rider(rider_id, force=True)

        logger.info(f"Successfully processed rider {rider_id}")

        # Attempt to load produced JSON files (profile is critical for frontend)
        data_dir = Path(__file__).parent / "data" / "riders" / str(rider_id)
        files = []
        profile = None
        try:
            if data_dir.exists():
                for p in data_dir.iterdir():
                    if p.suffix == ".json":
                        files.append(p.name)
                        if p.name == "profile.json":
                            try:
                                with open(p, "r", encoding="utf-8") as fh:
                                    profile = json.load(fh)
                            except Exception:
                                profile = None
        except Exception as e:
            logger.warning(f"Error reading generated files for {rider_id}: {e}")

        # Schedule background dispatch to persist generated JSON via GitHub Actions
        try:
            if background_tasks is not None:
                background_tasks.add_task(dispatch_github_workflow, rider_id)
        except Exception:
            logger.exception("Failed to schedule background GitHub workflow dispatch")

        # Diagnostic: report presence of GitHub dispatch env vars so we can tell
        # whether the deployed process is configured to persist generated JSON.
        github_env = {
            "GITHUB_PAT_set": bool(os.getenv("GITHUB_PAT")),
            "GITHUB_REPO_set": bool(os.getenv("GITHUB_REPO")),
            "GITHUB_BRANCH": os.getenv("GITHUB_BRANCH"),
            "GITHUB_WORKFLOW_FILE": os.getenv("GITHUB_WORKFLOW_FILE"),
        }

        return {
            "success": True,
            "rider_id": rider_id,
            "force_refresh": True,
            "result": str(result),
            "message": f"Rider {rider_id} data refreshed successfully",
            "files": files,
            "profile": profile,
            "github_env": github_env,
        }
    except Exception as e:
        logger.error(f"Error processing rider {rider_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": str(e),
                "rider_id": rider_id,
                "operation": "refresh"
            }
        )


@app.get("/fetch-rider/{rider_id}")
async def fetch_rider_get(rider_id: str, force_refresh: Optional[bool] = False, background_tasks: BackgroundTasks = None):
    """Support GET requests from the frontend/legacy clients that call the Railway API.

    Pass BackgroundTasks through so GET calls (used by the landing page) will
    schedule the background GitHub Actions workflow dispatch to persist generated JSON.
    """
    # Delegate to the same implementation and forward background tasks
    return await fetch_rider_data(rider_id, force_refresh=force_refresh, background_tasks=background_tasks)

@app.post("/refresh-rider/{rider_id}")
async def refresh_rider_data(rider_id: str):
    """Convenience endpoint specifically for refresh operations"""
    return await fetch_rider_data(rider_id, force_refresh=True)


@app.post("/dispatch-workflow/{rider_id}")
async def dispatch_workflow_now(rider_id: str):
    """Diagnostic endpoint: synchronously attempt to dispatch the GitHub Actions workflow

    This is for debugging environment / permission issues. In production this endpoint
    can be removed. Returns the HTTP response from the GitHub API or an error.
    """
    try:
        result = dispatch_github_workflow(rider_id)
        return {"dispatched": True, "result": result}
    except Exception as e:
        return {"dispatched": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
