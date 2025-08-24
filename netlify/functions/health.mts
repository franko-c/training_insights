import { Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  return new Response(JSON.stringify({
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "Zwift Racing Insights API is running"
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    }
  });
};
