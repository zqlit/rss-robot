// GET /api/artalk/commenter?email=xxx&token=xxx
// 代理 Artalk 查询：用存储的 admin 账号登录，查用户最新评论，返回 nick + link
//
// KV: artalk_config → { name, email, password, site_name, api_url }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function respond(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
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

  // CORS 预检
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (request.method === 'POST') {
    if (!(await requireAuth(request))) return respond({ error: 'unauthorized' }, 401);

    let body;
    try { body = await request.json(); } catch { return respond({ error: 'invalid json' }, 400); }

    const { name, email, password, site_name, api_url } = body;
    if (!name || !email || !password) return respond({ error: 'name, email, password 必填' }, 400);

    await RSS_KV.put('artalk_config', JSON.stringify({
      name, email, password,
      site_name: site_name || '优世界',
      api_url: api_url || 'https://artalk.usj.cc',
    }));

    return respond({ ok: true, message: 'Artalk 配置已保存' });
  }

  // GET
  if (!(await requireAuth(request))) return respond({ error: 'unauthorized' }, 401);

  const url = new URL(request.url);
  const targetEmail = url.searchParams.get('email');
  if (!targetEmail) return respond({ error: 'email 参数必填' }, 400);

  // 读取 Artalk 配置
  if (typeof RSS_KV === 'undefined') return respond({ error: 'KV not configured' }, 500);

  const configRaw = await RSS_KV.get('artalk_config');
  if (!configRaw) return respond({ error: 'Artalk 未配置，请先 POST 保存 admin 账号' }, 400);

  const config = JSON.parse(configRaw);
  const { name, email, password, site_name, api_url } = config;

  try {
    // 1. 登录 Artalk
    const loginRes = await fetch(`${api_url}/api/v2/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const loginJson = await loginRes.json();
    if (!loginJson.data?.token) {
      return respond({ error: 'Artalk 登录失败: ' + (loginJson.msg || 'unknown') }, 502);
    }
    const adminToken = loginJson.data.token;

    // 2. 查最新评论
    const searchUrl = `${api_url}/api/v2/admin/comments?site_name=${encodeURIComponent(site_name)}&search=${encodeURIComponent(targetEmail)}&limit=1&sort_by=date_desc`;
    const commentRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const commentJson = await commentRes.json();

    const comments = commentJson.data?.comments || commentJson.data || [];
    if (!Array.isArray(comments) || comments.length === 0) {
      return respond({ nick: '', link: '' });
    }

    const last = comments[0];
    return respond({
      nick: last.nick || '',
      link: last.link || '',
    });
  } catch (err) {
    return respond({ error: err.message }, 500);
  }
}
