import { getAssetFromKV, mapRequestToAsset } from '@cloudflare/kv-asset-handler';

const DEBUG = false;

export default {
  async fetch(request, env) {
    try {
      if (DEBUG) {
        console.log(`${request.method} ${request.url}`);
      }

      const url = new URL(request.url);
      let options = {};

      try {
        if (DEBUG) {
          options.cacheControl = {
            bypassCache: true,
          };
        }

        let page = await getAssetFromKV(
          {
            request,
            waitUntil: (promise) => env.ASSETS?.waitUntil?.(promise),
          },
          options
        );

        if (!page) {
          return new Response('Not Found', { status: 404 });
        }

        return page;
      } catch (e) {
        if (url.pathname === '/') {
          return getAssetFromKV(
            {
              mapRequestToAsset: (req) =>
                new Request(`${new URL(req.url).origin}/index.html`, req),
              request,
              waitUntil: (promise) => env.ASSETS?.waitUntil?.(promise),
            },
            options
          );
        }

        if (url.pathname.includes('.')) {
          throw e;
        }

        return getAssetFromKV(
          {
            mapRequestToAsset: (req) =>
              new Request(`${new URL(req.url).origin}/index.html`, req),
            request,
            waitUntil: (promise) => env.ASSETS?.waitUntil?.(promise),
          },
          options
        );
      }
    } catch (e) {
      if (DEBUG) {
        return new Response(e.message || 'error', { status: 500 });
      }
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};
