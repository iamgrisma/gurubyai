import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

function expoMessages(notification: any, deliveries: any[]) {
  return deliveries.map((delivery) => ({
    to: delivery.expo_push_token,
    title: notification.title || "Purohit",
    body: notification.message || "",
    sound: "default",
    data: {
      notification_id: notification.id,
      notification_type: notification.notification_type || "general",
      action_url: notification.action_url || null,
    },
  }));
}

async function sendExpo(messages: any[]) {
  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(messages),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Expo push API ${response.status}: ${text.slice(0, 500)}`);
  }
  let body: any;
  try { body = JSON.parse(text); } catch { throw new Error("Expo push API returned invalid JSON"); }
  if (!Array.isArray(body?.data) || body.data.length !== messages.length) {
    throw new Error("Expo push API returned an invalid ticket set");
  }
  return body.data;
}

async function processNotificationPush(db: any, notificationId: string) {
  const { data: notification, error: notificationError } = await db
    .from("notifications")
    .select("id,user_id,title,message,notification_type,action_url")
    .eq("id", notificationId)
    .maybeSingle();
  if (notificationError) throw notificationError;
  if (!notification?.user_id) return { done: true, accepted: 0 };

  const { data: devices, error: deviceError } = await db
    .from("notification_devices")
    .select("id,expo_push_token")
    .eq("user_id", notification.user_id)
    .eq("is_active", true)
    .order("updated_at", { ascending: false });
  if (deviceError) throw deviceError;

  if (!devices?.length) return { done: true, accepted: 0 };

  const { error: seedError } = await db
    .from("notification_push_deliveries")
    .upsert(
      devices.map((device: any) => ({ notification_id: notification.id, device_id: device.id })),
      { onConflict: "notification_id,device_id", ignoreDuplicates: true },
    );
  if (seedError) throw seedError;

  const { data: pending, error: pendingError } = await db
    .from("notification_push_deliveries")
    .select("id,device_id,attempts,expo_ticket_id,notification_id,notification_devices!inner(expo_push_token,is_active)")
    .eq("notification_id", notification.id)
    .eq("status", "pending")
    .eq("notification_devices.is_active", true)
    .order("created_at", { ascending: true })
    .limit(100);
  if (pendingError) throw pendingError;

  let accepted = 0;
  if (pending?.length) {
    await db.from("notification_push_deliveries")
      .update({ attempts: db.rpc ? undefined : undefined });
    const ids = pending.map((d: any) => d.id);
    const { error: attemptError } = await db
      .from("notification_push_deliveries")
      .update({ last_error: null })
      .in("id", ids);
    if (attemptError) throw attemptError;
    for (const delivery of pending) {
      const { error } = await db
        .from("notification_push_deliveries")
        .update({ attempts: (delivery.attempts || 0) + 1, updated_at: new Date().toISOString() })
        .eq("id", delivery.id);
      if (error) throw error;
    }

    const tickets = await sendExpo(expoMessages(notification, pending.map((delivery: any) => ({
      ...delivery,
      expo_push_token: delivery.notification_devices.expo_push_token,
    }))));

    for (let i = 0; i < pending.length; i++) {
      const delivery = pending[i];
      const ticket = tickets[i];
      if (ticket?.status === "ok") {
        const { error } = await db.from("notification_push_deliveries").update({
          status: "accepted",
          expo_ticket_id: ticket.id || null,
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_error: null,
        }).eq("id", delivery.id);
        if (error) throw error;
        accepted++;
      } else {
        const detail = ticket?.details?.error || ticket?.message || "Expo rejected push ticket";
        if (detail === "DeviceNotRegistered") {
          await db.from("notification_push_deliveries").update({
            status: "failed_permanent",
            last_error: detail,
            updated_at: new Date().toISOString(),
          }).eq("id", delivery.id);
          const { error } = await db.from("notification_devices").update({
            is_active: false,
            updated_at: new Date().toISOString(),
          }).eq("id", delivery.device_id);
          if (error) throw error;
        } else {
          const { error } = await db.from("notification_push_deliveries").update({
            last_error: detail,
            updated_at: new Date().toISOString(),
          }).eq("id", delivery.id);
          if (error) throw error;
        }
      }
    }
  }

  const { count: remaining, error: remainingError } = await db
    .from("notification_push_deliveries")
    .select("id", { count: "exact", head: true })
    .eq("notification_id", notification.id)
    .eq("status", "pending");
  if (remainingError) throw remainingError;

  return { done: (remaining || 0) === 0, accepted };
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
  const { data: jobs, error } = await db.rpc("claim_job_queue", { p_worker_id: workerId, p_limit: 25 });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const job of jobs || []) {
    try {
      let done = true;
      let accepted = 0;
      if (job.job_type === "booking_event" && job.payload?.event_id) {
        const { error: eventError } = await db
          .from("domain_events").update({ processed_at: new Date().toISOString() })
          .eq("id", job.payload.event_id).is("processed_at", null);
        if (eventError) throw eventError;
      } else if (job.job_type === "notification_push" && job.payload?.notification_id) {
        const result = await processNotificationPush(db, job.payload.notification_id);
        done = result.done;
        accepted = result.accepted;
      }

      if (done) {
        const { error: completeError } = await db.rpc("complete_job_queue", { p_job_id: job.id, p_worker_id: workerId });
        if (completeError) throw completeError;
        results.push({ id: job.id, status: "completed", accepted });
      } else {
        throw new Error("Pending push deliveries remain; retrying job");
      }
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
