import { handleRequest } from './server/http';
import { perRequestConnector, setConnector } from './server/runtime';

setConnector(perRequestConnector);

const API_PATHS = ['/rpc', '/upload', '/storage/', '/health'];

export default {
  async fetch(request, env) {
    for (const [k, v] of Object.entries(env)) {
      if (typeof v === 'string') process.env[k] = v;
    }
    if (env.HYPERDRIVE && env.HYPERDRIVE.connectionString) {
      process.env.DATABASE_URL = env.HYPERDRIVE.connectionString;
      process.env.DATABASE_SSL = 'false';
    }
    const url = new URL(request.url);
    if (url.pathname === '/__env.js') {
      const payload = {
        GEMINI_API_KEY: env.GEMINI_API_KEY || '',
      };
      return new Response(`window.__ENV__=${JSON.stringify(payload)};`, {
        headers: {
          'content-type': 'application/javascript',
          'cache-control': 'no-store',
        },
      });
    }
    if (API_PATHS.some((p) => url.pathname === p || (p.endsWith('/') && url.pathname.startsWith(p)))) {
      return handleRequest(request);
    }
    return env.ASSETS.fetch(request);
  },
};
