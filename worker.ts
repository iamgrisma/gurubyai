
import { getAssetFromKV } from '@cloudflare/kv-asset-handler';
// @ts-ignore
import manifest from '__STATIC_CONTENT_MANIFEST';

const assetManifest = JSON.parse(manifest);

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    try {
      return await getAssetFromKV(
        {
          request,
          waitUntil: ctx.waitUntil.bind(ctx),
        },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: assetManifest,
        }
      );
    } catch (e) {
      // Handle requests for pages and serve index.html
      const url = new URL(request.url);
      if (url.pathname.indexOf('.') === -1) {
        try {
          return await getAssetFromKV(
            {
              request: new Request(new URL('/index.html', request.url).toString(), request),
              waitUntil: ctx.waitUntil.bind(ctx),
            },
            {
              ASSET_NAMESPACE: env.__STATIC_CONTENT,
              ASSET_MANIFEST: assetManifest,
            }
          );
        } catch (e) {
          return new Response('Not Found', { status: 404 });
        }
      }
      return new Response('Not Found', { status: 404 });
    }
  },
};
