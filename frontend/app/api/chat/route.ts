import { NextRequest } from "next/server";

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const token = request.headers.get("Authorization");
  
  const backendUrl = process.env.API_URL || "http://backend:8000";
  
  const response = await fetch(`${backendUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": token } : {})
    },
    body: body,
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive"
    }
  });
}
