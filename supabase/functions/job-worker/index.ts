import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// Supabase Edge Functions run on Deno; this file is intentionally excluded from the Next.js client typecheck.

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
