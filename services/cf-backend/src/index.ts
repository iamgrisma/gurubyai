import { MeetingSignalingDO } from "./signaling";
import { Env, handleStorageUpload, handleStorageGet, handleStorageDelete } from "./storage";

export { MeetingSignalingDO };

function setCorsHeaders(response: Response, allowOrigin: string = "*"): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", allowOrigin);
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-Id, X-Media-Category, X-Content-Type, X-File-Ext");
  headers.set("Access-Control-Max-Age", "86400");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "*";

    // Handle CORS Preflight
    if (request.method === "OPTIONS") {
      return setCorsHeaders(new Response(null, { status: 204 }), origin);
    }

    // 1. Health check
    if (url.pathname === "/health" || url.pathname === "/api/health") {
      const res = Response.json({
        status: "ok",
        service: "purohit-cf-backend",
        r2_bucket: "purohit",
        signaling: "durable-objects",
        timestamp: new Date().toISOString(),
      });
      return setCorsHeaders(res, origin);
    }

    // 2. WebRTC Durable Object Signaling WebSocket Upgrade: /signaling/room/:roomId
    const signalingMatch = url.pathname.match(/^\/(?:api\/)?signaling\/room\/([^/]+)/);
    if (signalingMatch) {
      const roomId = decodeURIComponent(signalingMatch[1]);
      if (!roomId) {
        return new Response("Missing roomId parameter", { status: 400 });
      }

      // Get or create unique Durable Object instance for this room
      const doId = env.SIGNALING_ROOM.idFromName(roomId);
      const roomStub = env.SIGNALING_ROOM.get(doId);

      return roomStub.fetch(request);
    }

    // 3. Storage Upload API: POST /api/storage/upload
    if (url.pathname === "/api/storage/upload") {
      const res = await handleStorageUpload(request, env);
      return setCorsHeaders(res, origin);
    }

    // 4. Storage File Retrieval: GET /api/storage/file/:key
    const getMatch = url.pathname.match(/^\/api\/storage\/file\/(.+)$/);
    if (getMatch && request.method === "GET") {
      const key = decodeURIComponent(getMatch[1]);
      const res = await handleStorageGet(request, env, key);
      return setCorsHeaders(res, origin);
    }

    // 5. Storage File Delete: DELETE /api/storage/file/:key
    if (getMatch && request.method === "DELETE") {
      const key = decodeURIComponent(getMatch[1]);
      const res = await handleStorageDelete(request, env, key);
      return setCorsHeaders(res, origin);
    }

    return setCorsHeaders(
      Response.json({ error: "Endpoint not found" }, { status: 404 }),
      origin
    );
  },
};
