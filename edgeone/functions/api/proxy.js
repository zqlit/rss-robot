// POST /api/proxy — RSS 代理抓取

async function handlePost(context) {
  const { request } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { url, timeout = 15000 } = body;

  if (!url) {
    return new Response(JSON.stringify({ error: 'url required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
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

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'POST') {
    if (!await requireAuth(request)) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return handlePost(context);
  }

  return new Response(JSON.stringify({ error: 'POST only' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
}
