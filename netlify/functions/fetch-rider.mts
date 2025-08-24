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

    // Execute the Python data collection script with virtual environment
    const pythonExe = `${process.cwd()}/.venv/bin/python`;
    const command = `cd "${process.cwd()}" && PYTHONPATH=. ${pythonExe} zwift_api_client/utils/data_manager_cli.py --refresh-rider ${riderId}`;
    
    try {
      console.log(`Executing: ${command}`);
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && !stderr.includes('UserWarning')) {
        console.error(`Python script stderr: ${stderr}`);
        if (stderr.includes('Error') || stderr.includes('Exception')) {
          throw new Error(`Python script failed: ${stderr}`);
        }
      }
      
      console.log(`Python script output: ${stdout}`);
      
      // Copy data from zwift_api_client to public directory
      const sourceDataPath = path.join(process.cwd(), "zwift_api_client", "data", "riders", riderId.toString());
      const targetDataPath = path.join(process.cwd(), "public", "data", "riders", riderId.toString());
      
      try {
        await fs.mkdir(targetDataPath, { recursive: true });
        const files = await fs.readdir(sourceDataPath);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        
        for (const file of jsonFiles) {
          const sourcePath = path.join(sourceDataPath, file);
          const targetPath = path.join(targetDataPath, file);
          await fs.copyFile(sourcePath, targetPath);
          console.log(`Copied ${file} to public data directory`);
        }
        
        console.log(`Successfully copied ${jsonFiles.length} data files for rider ${riderId}`);
      } catch (copyError) {
        console.error(`Data copy error:`, copyError);
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: `Successfully fetched data for rider ${riderId}`,
        riderId: riderId.toString(),
        output: stdout
      }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
      
    } catch (execError) {
      console.error(`Python execution error:`, execError);
      
      return new Response(JSON.stringify({
        success: false,
        error: "PYTHON_EXECUTION_FAILED",
        message: `Failed to fetch data for rider ${riderId}. Error: ${execError.message}`,
        instructions: [
          "1. Verify Python environment is set up correctly",
          "2. Check Zwift API credentials", 
          "3. Ensure zwift_api_client dependencies are installed",
          `4. Try running manually: python3 zwift_api_client/utils/data_manager_cli.py --refresh-rider ${riderId}`
        ]
      }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

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
