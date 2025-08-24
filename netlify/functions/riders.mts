import { Context } from "@netlify/functions";
import fs from "fs/promises";
import path from "path";

export default async (req: Request, context: Context) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
      }
    });
  }

  try {
    const ridersPath = path.join(process.cwd(), "public", "data", "riders");
    
    let riders = [];
    try {
      const entries = await fs.readdir(ridersPath, { withFileTypes: true });
      riders = entries
        .filter(entry => entry.isDirectory() && /^\d{6,8}$/.test(entry.name))
        .map(entry => entry.name);
    } catch (error) {
      // Directory doesn't exist or is empty
      console.log("No riders directory found or empty");
    }

    return new Response(JSON.stringify({
      success: true,
      riders: riders,
      count: riders.length,
      message: riders.length > 0 
        ? `Found ${riders.length} rider(s) with data`
        : "No rider data found. Use the fetch-rider endpoint to add riders."
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
      }
    });

  } catch (error) {
    console.error("Error in riders function:", error);
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      message: error.message 
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};
