// POST /api/auth — 验证或修改访问口令
//   { oldPassword, newPassword } — 修改口令
//   仅验证: 直接 GET /api/auth?token=xxx 即可

async function requireToken(request) {
  const url = new URL(request.url);
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookieMatch = cookieHeader.match(/site_token=([^;]+)/);
  const token = url.searchParams.get('token') || (cookieMatch ? cookieMatch[1] : '');

  if (typeof RSS_KV === 'undefined') return true; // KV 未配置，跳过
  const password = await RSS_KV.get('site_password');
  if (!password) return true; // 未设置口令，跳过
  return token === password;
}

function respond(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'POST') {
    const authed = await requireToken(request);
    if (!authed) return respond({ error: 'unauthorized' }, 401);

    let body;
    try { body = await request.json(); } catch { return respond({ error: 'invalid json' }, 400); }

    const { oldPassword, newPassword } = body;

    if (typeof RSS_KV === 'undefined') {
      return respond({ error: 'KV not configured' }, 500);
    }

    if (oldPassword) {
      const current = (await RSS_KV.get('site_password')) || '';
      if (current && oldPassword !== current) {
        return respond({ error: '当前口令错误' }, 403);
      }
    }

    if (newPassword) {
      await RSS_KV.put('site_password', newPassword);
    } else if (newPassword === '') {
      await RSS_KV.delete('site_password');
    }

    return respond({ ok: true });
  }

  // GET — verify token
  const authed = await requireToken(request);
  return respond({ ok: authed }, authed ? 200 : 401);
}
