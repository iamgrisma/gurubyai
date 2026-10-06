import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\\s+/i, "");
  let payload: { role?: string };
  try {
    payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
  if (payload.role !== "service_role") return new Response("Forbidden", { status: 403 });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const workerId = "edge-job-worker";
  const { data: jobs, error } = await db.rpc("claim_job_queue", { p_worker_id: workerId, p_limit: 25 });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const job of jobs || []) {
    try {
      if (job.job_type === "booking_event" && job.payload?.event_id) {
        const { error: eventError } = await db.from("domain_events").update({ processed_at: new Date().toISOString() }).eq("id", job.payload.event_id).is("processed_at", null);
        if (eventError) throw eventError;
      }
      await db.rpc("complete_job_queue", { p_job_id: job.id, p_worker_id: workerId });
      results.push({ id: job.id, status: "completed" });
    } catch (e) {
      await db.rpc("fail_job_queue", { p_job_id: job.id, p_worker_id: workerId, p_error: String(e), p_retry_delay_seconds: 60 });
      results.push({ id: job.id, status: "retry" });
    }
  }
  return Response.json({ claimed: (jobs || []).length, results });
});
