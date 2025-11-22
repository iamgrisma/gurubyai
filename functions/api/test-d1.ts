export async function onRequest(context) {
    return new Response(JSON.stringify({ message: "Hello from Cloudflare Pages Functions!" }), {
        headers: { "Content-Type": "application/json" },
    });
}
