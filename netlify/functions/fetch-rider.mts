import { Context } from "@netlify/functions";
import path from "path";
import fs from "fs/promises";

// Determine Railway backend URL from environment, support multiple env var names
const RAILWAY_URL =
  process.env.RAILWAY_API_URL || process.env.RAILWAY_URL || process.env.RAILWAY_BACKEND_URL ||
  "https://zwiftervals-production.up.railway.app";

function jsonResponse(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    "Permissions-Policy": "interest-cohort=()",
    },
  });
}

export default async (req: Request, context: Context) => {
  try {
    // Basic CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Permissions-Policy": "interest-cohort=()",
        },
      });
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    let body: any;
    try {
      body = await req.json();
    } catch (e) {
      return jsonResponse({ success: false, error: "INVALID_JSON", message: "Invalid JSON body" }, 400);
    }

    const { riderId, force_refresh } = body || {};
    if (!riderId || !/^\d{6,8}$/.test(String(riderId))) {
      return jsonResponse({ success: false, error: "INVALID_RIDER_ID", message: "riderId must be 6-8 digits" }, 400);
    }

    // DEV ONLY: if running under netlify dev and local cache exists, read from zwift_api_client data dir
    if (process.env.NETLIFY_DEV) {
      const localDir = path.join(process.cwd(), 'zwift_api_client', 'data', 'riders', String(riderId));
      try {
        await fs.access(localDir);
        // load each file if present
        const filenames = ['profile.json', 'power.json', 'events_summary.json', 'races.json', 'group_rides.json', 'workouts.json'];
        const dataFiles: any = {};
        for (const name of filenames) {
          try {
            const raw = await fs.readFile(path.join(localDir, name), 'utf-8');
            dataFiles[name.replace('.json', '')] = JSON.parse(raw);
          } catch (e) {
            // missing file is fine
          }
        }
        return jsonResponse({ success: true, riderId: String(riderId), profile: dataFiles.profile || {}, files: {
          power: dataFiles.power || {},
          events_summary: dataFiles.events_summary || {},
          races: dataFiles.races || [],
          group_rides: dataFiles.group_rides || [],
          workouts: dataFiles.workouts || []
        }});
      } catch (_err) {
        // no local cache, fall through
      }
    }
    // Primary behavior: proxy the request to Railway which runs the Python tooling and returns JSON.
    // Proxy request to Railway service
    const targetUrl = `${RAILWAY_URL.replace(/\/+$/, '')}/fetch-rider/${encodeURIComponent(riderId)}${
      force_refresh ? '?force_refresh=true' : ''
    }`;
    console.log(`fetch-rider: proxying to ${targetUrl}`);

    try {
      const railwayResp = await fetch(targetUrl, {
        method: "GET",
        headers: { "Accept": "application/json" },
      });

      if (railwayResp.ok) {
        // Stream the JSON response back to the client without printing everything in logs.
        const data = await railwayResp.json();

        // If Railway already returned structured fields like `profile` and `files`,
        // expose them at the top-level to match the direct-Railway shape. Otherwise
        // preserve the full payload under `result` so the client can inspect it.
        if (data && (data.profile || data.files)) {
          return jsonResponse(Object.assign({ success: true, riderId: String(riderId) }, data));
        }

        return jsonResponse({ success: true, riderId: String(riderId), result: data });
      }

      // Log railway errors
      console.warn(`Railway returned ${railwayResp.status} ${railwayResp.statusText} for rider ${riderId}`);
      // For server errors, provide generic fallback message to avoid Bad Gateway
      if (railwayResp.status >= 500) {
        return jsonResponse(
          { success: false, error: 'RAILWAY_AND_STATIC_UNAVAILABLE', message: 'Unable to fetch live rider data' },
          200
        );
      }
      // For client errors, return specific error info
      return jsonResponse(
        { success: false, error: 'RAILWAY_ERROR', status: railwayResp.status, message: railwayResp.statusText },
        200
      );
    } catch (e) {
      console.warn(`Error contacting Railway for rider ${riderId}: ${e.message || e}`);
    }

    // In development only: static cache fallback
    if (process.env.NETLIFY_DEV) {
      try {
        const staticPath = path.join(process.cwd(), "public", "data", "riders", String(riderId), "profile.json");
        const raw = await fs.readFile(staticPath, { encoding: "utf-8" });
        const json = JSON.parse(raw);
        return jsonResponse({ success: true, riderId: String(riderId), fallback: true, profile: json });
      } catch (_e) {
        // no static data, fall through to error response
      }
    }
    // Production / non-dev: no fallback, return JSON error with HTTP 200
    return jsonResponse(
      { success: false, error: 'RAILWAY_AND_STATIC_UNAVAILABLE', message: 'Unable to fetch live rider data' },
      200
    );
  } catch (e: any) {
    console.error('fetch-rider function error', e);
    return jsonResponse({ success: false, error: 'FUNCTION_ERROR', message: e.message || String(e) }, 200);
  }
};
