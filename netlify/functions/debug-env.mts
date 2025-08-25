import { Context } from "@netlify/functions";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export default async (req: Request, context: Context) => {
  // Handle CORS
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
    const envInfo: any = {
      platform: process.platform,
      architecture: process.arch,
      nodeVersion: process.version,
      cwd: process.cwd(),
      env: {
        PATH: process.env.PATH,
        PYTHON_VERSION: process.env.PYTHON_VERSION,
        NODE_VERSION: process.env.NODE_VERSION
      },
      availableCommands: {}
    };

    // Test various commands
    const commands = [
      'which python',
      'which python3', 
      'python --version',
      'python3 --version',
      'ls /opt/buildhome/',
      'ls /usr/bin/ | grep python',
      'find /opt -name "*python*" 2>/dev/null | head -10'
    ];

    for (const cmd of commands) {
      try {
        const { stdout, stderr } = await execAsync(cmd);
        envInfo.availableCommands[cmd] = { stdout: stdout.trim(), stderr: stderr.trim() };
      } catch (error: any) {
        envInfo.availableCommands[cmd] = { error: error.message };
      }
    }

    return new Response(JSON.stringify(envInfo, null, 2), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ 
      error: "Debug failed",
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
