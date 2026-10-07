import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface PushMessage {
  to: string;
  sound: "default";
  title: string;
  body: string;
  data: Record<string, unknown>;
  priority?: "high" | "default";
}

async function sendExpoPushNotification(messages: PushMessage[]): Promise<void> {
  if (!messages.length) return;

  const valid = messages.filter((m) => m.to && m.to.startsWith("ExponentPushToken"));
  if (!valid.length) return;

  // Expo recommends chunks of <= 100
  const chunks: PushMessage[][] = [];
  for (let i = 0; i < valid.length; i += 100) {
    chunks.push(valid.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });
      if (!res.ok) {
        console.error("Expo push notification delivery error:", res.status, await res.text());
      }
    } catch (err) {
      console.error("Failed to connect to Expo push gateway:", err);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();

  let payload: { role?: string };
  try {
    const part = token.split(".")[1];
    if (!part) throw new Error("missing jwt payload");
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    payload = JSON.parse(atob(normalized));
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  if (payload.role !== "service_role") return new Response("Forbidden", { status: 403 });

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return new Response("Worker configuration missing", { status: 500 });

  const db = createClient(url, key, { auth: { persistSession: false } });
  const workerId = "edge-job-worker";
  const { data: jobs, error } = await db.rpc("claim_job_queue", {
    p_worker_id: workerId,
    p_limit: 25,
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const job of jobs || []) {
    try {
      if (job.job_type === "booking_event" && job.payload?.event_id) {
        const eventPayload = job.payload;
        const targetUserId = eventPayload.target_user_id || eventPayload.user_id;

        // Fetch active push tokens for user
        if (targetUserId) {
          const { data: tokens } = await db
            .from("user_push_tokens")
            .select("token")
            .eq("user_id", targetUserId)
            .eq("is_active", true);

          if (tokens && tokens.length > 0) {
            const title = eventPayload.title || "GuruByAI Update";
            const body = eventPayload.message || "Your booking has an update.";
            const pushMessages: PushMessage[] = tokens.map((t) => ({
              to: t.token,
              sound: "default",
              title,
              body,
              data: {
                booking_id: eventPayload.booking_id,
                event_type: eventPayload.event_type,
                action_url: `/booking/${eventPayload.booking_id}`,
              },
              priority: "high",
            }));
            await sendExpoPushNotification(pushMessages);
          }
        }

        const { error: eventError } = await db
          .from("domain_events")
          .update({ processed_at: new Date().toISOString() })
          .eq("id", job.payload.event_id)
          .is("processed_at", null);
        if (eventError) throw eventError;
      }

      const { error: completeError } = await db.rpc("complete_job_queue", {
        p_job_id: job.id,
        p_worker_id: workerId,
      });
      if (completeError) throw completeError;

      results.push({ id: job.id, status: "completed" });
    } catch (e) {
      await db.rpc("fail_job_queue", {
        p_job_id: job.id,
        p_worker_id: workerId,
        p_error: String(e),
        p_retry_delay_seconds: 60,
      });
      results.push({ id: job.id, status: "retry" });
    }
  }

  return Response.json({ claimed: (jobs || []).length, results });
});
