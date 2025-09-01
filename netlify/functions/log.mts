import { Context } from "@netlify/functions";

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
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "METHOD_NOT_ALLOWED" }, 405);
  }

  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return jsonResponse({ success: false, error: "INVALID_JSON", message: "Invalid JSON body" }, 400);
  }

  // Log to server console for debugging
  console.log("[remoteLog]", body.level, body.message, body.meta, body.source);

  return jsonResponse({ success: true });
};
