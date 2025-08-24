import { Context } from "@netlify/functions";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";

const execAsync = promisify(exec);

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

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const body = await req.json();
    const { riderId, force_refresh } = body;

    if (!riderId || !/^\d{6,8}$/.test(riderId.toString())) {
      return new Response(JSON.stringify({ 
        error: "Invalid rider ID. Must be 6-8 digits." 
      }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // Check if rider data already exists (unless force refresh)
    const dataPath = path.join(process.cwd(), "public", "data", "riders", riderId.toString());
    
    if (!force_refresh) {
      try {
        await fs.access(path.join(dataPath, "profile.json"));
        return new Response(JSON.stringify({
          success: true,
          message: `Rider ${riderId} data already exists`,
          riderId: riderId.toString()
        }), {
          status: 200,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      } catch {
        // Data doesn't exist, proceed with fetch
      }
    }

    // Note: In a real deployment, you'd need to:
    // 1. Set up the Python environment
    // 2. Install the zwift_api_client dependencies
    // 3. Handle authentication properly
    // 4. Run the actual data collection
    
    // For now, return an instructional message
    return new Response(JSON.stringify({
      success: false,
      error: "PYTHON_BACKEND_REQUIRED",
      message: `To fetch data for rider ${riderId}, you need to set up the Python backend. ` +
               `This requires installing Python dependencies and configuring Zwift authentication. ` +
               `Please run locally: python data_manager_cli.py --refresh-rider ${riderId}`,
      instructions: [
        "1. Install Python dependencies (requests, etc.)",
        "2. Configure Zwift authentication",
        "3. Set up the data collection pipeline",
        "4. Deploy with proper environment variables"
      ]
    }), {
      status: 501,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error) {
    console.error("Error in fetch-rider function:", error);
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
