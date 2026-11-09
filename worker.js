export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/__env.js') {
      const payload = {
        VITE_CONVEX_URL: env.VITE_CONVEX_URL || '',
        GEMINI_API_KEY: env.GEMINI_API_KEY || '',
      };
      return new Response(`window.__ENV__=${JSON.stringify(payload)};`, {
        headers: {
          'content-type': 'application/javascript',
          'cache-control': 'no-store',
        },
      });
    }
    return env.ASSETS.fetch(request);
  },
};
