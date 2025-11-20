export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    try {
      // Attempt to fetch the requested asset from the bound assets directory
      let response = await env.ASSETS.fetch(request);
      
      // SPA Routing Logic:
      // If the asset is not found (404) and the request is not for a file extension (like .js, .css, .png),
      // serve index.html to let React Router handle the route.
      if (response.status === 404 && !url.pathname.includes('.')) {
        return await env.ASSETS.fetch(new URL("/", request.url));
      }
      
      return response;
    } catch (e) {
      // Fallback error handling
      return new Response("An unexpected error occurred.", { status: 500 });
    }
  },
};