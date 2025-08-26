import { Context } from "@netlify/functions";
import path from "path";
import fs from "fs/promises";

const RAILWAY_URL = process.env.RAILWAY_API_URL || "https://zwiftervals-production.up.railway.app";

function jsonResponse(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export default async (req: Request, context: Context) => {
  // Basic CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

  // Primary behavior: proxy the request to Railway which runs the Python tooling and returns JSON.
  const targetUrl = `${RAILWAY_URL}/fetch-rider/${encodeURIComponent(riderId)}${force_refresh ? "?force_refresh=true" : ""}`;

  try {
    const railwayResp = await fetch(targetUrl, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });

    if (railwayResp.ok) {
      // Stream the JSON response back to the client without printing everything in logs.
      const data = await railwayResp.json();

      // Optionally, return a compact response to the frontend while preserving full payload under "result".
      return jsonResponse({ success: true, riderId: String(riderId), result: data });
    }

    // If Railway returned non-OK, fall through to static fallback
    console.warn(`Railway returned status ${railwayResp.status} for rider ${riderId}`);
  } catch (e) {
    console.warn(`Error contacting Railway for rider ${riderId}: ${e.message || e}`);
  }

  // Static fallback: if a previously generated file exists in the deployed public folder, return that.
  try {
    const staticPath = path.join(process.cwd(), "public", "data", "riders", String(riderId), "profile.json");
    const raw = await fs.readFile(staticPath, { encoding: "utf-8" });
    const json = JSON.parse(raw);
    return jsonResponse({ success: true, riderId: String(riderId), fallback: true, profile: json });
  } catch (e) {
    // Nothing available
    return jsonResponse({ success: false, error: "RAILWAY_AND_STATIC_UNAVAILABLE", message: "Unable to fetch from Railway and no static data found" }, 502);
  }
};
