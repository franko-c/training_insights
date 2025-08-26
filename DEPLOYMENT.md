Railway + Netlify deployment checklist

This project contains a FastAPI backend (`zwift_api_client/main.py`) and a Vite/React frontend (served by Netlify).

Railway (FastAPI backend)

1. Set up a new Railway project and link the repository.
2. Ensure Python runtime is selected (3.11 recommended).
3. Add the following environment variables in Railway Settings:
   - ZWIFT_EMAIL: <zwift login email>
   - ZWIFT_PASSWORD: <zwift password>
   - ZWIFT_API_CLIENT_ENABLE_ROOT_LOGGING: "true" (optional - enables module-level log files)
   - PORT: default Railway provides one; Procfile uses ${PORT}
4. Railway will detect `requirements.txt` and install dependencies. If not, set `pip install -r requirements.txt` as build command.
5. Start command: `uvicorn zwift_api_client.main:app --host 0.0.0.0 --port $PORT` (Procfile already present).
6. Verify `/health` and `/fetch-rider/{rider_id}` endpoints.

Netlify (Frontend + fallback function)

1. Deploy the `main` branch to Netlify (project already configured).
2. The frontend will call Railway first (see `src/services/riderDataFetcher.js`), and fallback to the Netlify function `/.netlify/functions/fetch-rider` if Railway is unreachable.
3. Netlify function (`netlify/functions/fetch-rider.mts`) will run the Python CLI as a module and copy produced JSON files into `public/data/riders/<id>` so the frontend can read them.
4. Ensure Netlify Build has Python available if you need the function to run the CLI with dependencies. Alternatively, pre-install dependencies in the function environment or vendor them.

Notes & Tips

- The CLI supports non-interactive operation: `--refresh-rider <id> --yes` will run without prompts.
- For production, avoid storing credentials in repository; use Railway/Netlify environment variables.
- Consider centralizing logging configuration if you want a single behavior across CLI/server.

If you'd like, I can also:
- Add a simple integration test for the FastAPI endpoints.
- Create a small GitHub Actions workflow to deploy to Railway on push.
- Modify the Netlify function to pass `--yes` and `--no-force` flags explicitly when appropriate.
