// POST /api/proxy — RSS 代理抓取

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function handlePost(context) {
  const { request } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400,
      headers: CORS,
    });
  }

  const { url, timeout = 15000 } = body;

  if (!url) {
    return new Response(JSON.stringify({ error: 'url required' }), {
      status: 400,
      headers: CORS,
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const targetRes = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSSBot/1.0)',
        Accept:
          'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timer);

    const text = await targetRes.text();
    const ct = targetRes.headers.get('content-type') || '';

    return new Response(
      JSON.stringify({
        ok: true,
        status: targetRes.status,
        contentType: ct,
        body: text,
      }),
      {
        status: 200,
        headers: CORS,
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      {
        status: 502,
        headers: CORS,
      }
    );
  }
}

async function requireAuth(request) {
  const url = new URL(request.url);
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookieMatch = cookieHeader.match(/site_token=([^;]+)/);
  const token = url.searchParams.get('token') || (cookieMatch ? cookieMatch[1] : '');
  if (typeof RSS_KV === 'undefined') return true;
  const password = await RSS_KV.get('site_password');
  if (!password) return true;
  return token === password;
}

function respond(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS,
  });
}

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (request.method === 'POST') {
    if (!await requireAuth(request)) {
      return respond({ error: 'unauthorized' }, 401);
    }
    return handlePost(context);
  }

  return respond({ error: 'POST only' }, 405);
}
