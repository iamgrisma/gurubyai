export interface Env {
  PUROHIT_STORAGE: R2Bucket;
  SIGNALING_ROOM: DurableObjectNamespace;
  ENVIRONMENT?: string;
  CORS_ALLOW_ORIGIN?: string;
  MAX_UPLOAD_SIZE_MB?: string;
}

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export async function handleStorageUpload(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const contentType = request.headers.get("Content-Type") || "";

  // 1. Multipart Form Upload
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");
    const category = (formData.get("category") as string) || "avatar";
    const userId = (formData.get("userId") as string) || "user";

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: "No file provided in form" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return new Response(JSON.stringify({ error: `Unsupported MIME type: ${file.type}` }), {
        status: 415,
        headers: { "Content-Type": "application/json" },
      });
    }

    const maxBytes = (parseInt(env.MAX_UPLOAD_SIZE_MB || "15", 10) || 15) * 1024 * 1024;
    if (file.size > maxBytes) {
      return new Response(JSON.stringify({ error: `File exceeds maximum allowed size (${env.MAX_UPLOAD_SIZE_MB || 15}MB)` }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }

    const ext = file.name.split(".").pop() || "bin";
    const cleanCategory = category.replace(/[^a-zA-Z0-9_-]/g, "");
    const cleanUser = userId.replace(/[^a-zA-Z0-9_-]/g, "");
    const key = `${cleanCategory}/${cleanUser}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    await env.PUROHIT_STORAGE.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        category: cleanCategory,
      },
    });

    const publicUrl = `/api/storage/file/${key}`;
    return new Response(
      JSON.stringify({
        success: true,
        bucket: "purohit",
        key,
        publicUrl,
        contentType: file.type,
        sizeBytes: file.size,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 2. Direct Binary Stream Upload (with headers)
  const category = request.headers.get("X-Media-Category") || "avatar";
  const userId = request.headers.get("X-User-Id") || "user";
  const mimeType = request.headers.get("X-Content-Type") || "application/octet-stream";
  const ext = request.headers.get("X-File-Ext") || "bin";

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return new Response(JSON.stringify({ error: `Unsupported MIME type: ${mimeType}` }), {
      status: 415,
      headers: { "Content-Type": "application/json" },
    });
  }

  const cleanCategory = category.replace(/[^a-zA-Z0-9_-]/g, "");
  const cleanUser = userId.replace(/[^a-zA-Z0-9_-]/g, "");
  const key = `${cleanCategory}/${cleanUser}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

  if (!request.body) {
    return new Response(JSON.stringify({ error: "Missing body stream" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  await env.PUROHIT_STORAGE.put(key, request.body, {
    httpMetadata: { contentType: mimeType },
    customMetadata: { uploadedAt: new Date().toISOString(), category: cleanCategory },
  });

  return new Response(
    JSON.stringify({
      success: true,
      bucket: "purohit",
      key,
      publicUrl: `/api/storage/file/${key}`,
      contentType: mimeType,
    }),
    {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export async function handleStorageGet(request: Request, env: Env, key: string): Promise<Response> {
  const object = await env.PUROHIT_STORAGE.get(key);

  if (!object) {
    return new Response(JSON.stringify({ error: "File not found in purohit storage" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new Response(object.body, {
    headers,
  });
}

export async function handleStorageDelete(request: Request, env: Env, key: string): Promise<Response> {
  await env.PUROHIT_STORAGE.delete(key);
  return new Response(JSON.stringify({ success: true, deletedKey: key }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
