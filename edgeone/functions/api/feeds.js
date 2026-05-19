// GET  /api/feeds        — 列出所有订阅源
// POST /api/feeds        — 添加订阅源  { url: "...", feedTitle: "..." }
// DELETE /api/feeds?url=  — 删除订阅源

const KV_KEY = 'feeds_config';

function respond(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
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

// GET — 返回 feeds 列表（兼容 loadFeedsFromRemote 的 { feeds: [...] } 格式）
async function handleList() {
  if (typeof RSS_KV === 'undefined') {
    return respond({ error: 'KV not configured' }, 500);
  }
  const raw = await RSS_KV.get(KV_KEY);
  if (!raw) {
    return respond({ feeds: [] });
  }
  try {
    return respond(JSON.parse(raw));
  } catch {
    return respond({ feeds: [] });
  }
}

// POST — 添加或更新订阅源
//  单条: { url: "...", feedTitle: "...", ... }
//  批量: { feeds: [{ url: "...", feedTitle: "..." }, ...] }
async function handleAdd(request) {
  if (typeof RSS_KV === 'undefined') {
    return respond({ error: 'KV not configured' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return respond({ error: 'invalid json' }, 400);
  }

  // 读取现有数据
  const raw = await RSS_KV.get(KV_KEY);
  let data = { feeds: [] };
  if (raw) {
    try { data = JSON.parse(raw); } catch { data = { feeds: [] }; }
  }

  const newFeeds = body.feeds && Array.isArray(body.feeds) ? body.feeds : [body];
  for (const feed of newFeeds) {
    if (!feed.url) continue;
    // 如果 URL 已存在则更新字段，否则追加
    const idx = data.feeds.findIndex((f) => f.url === feed.url);
    if (idx >= 0) {
      data.feeds[idx] = { ...data.feeds[idx], ...feed };
    } else {
      data.feeds.push({ url: feed.url, feedTitle: feed.feedTitle || '' });
    }
  }

  await RSS_KV.put(KV_KEY, JSON.stringify(data));
  return respond({ ok: true, total: data.feeds.length });
}

// DELETE — 按 URL 删除订阅源  ?url=https://example.com
async function handleRemove(request) {
  if (typeof RSS_KV === 'undefined') {
    return respond({ error: 'KV not configured' }, 500);
  }

  const reqUrl = new URL(request.url);
  const targetUrl = reqUrl.searchParams.get('url');
  if (!targetUrl) {
    return respond({ error: 'url parameter required' }, 400);
  }

  const raw = await RSS_KV.get(KV_KEY);
  if (!raw) {
    return respond({ ok: true, total: 0 });
  }

  let data;
  try { data = JSON.parse(raw); } catch { data = { feeds: [] }; }

  const before = data.feeds.length;
  data.feeds = data.feeds.filter((f) => f.url !== targetUrl);
  const removed = before - data.feeds.length;

  await RSS_KV.put(KV_KEY, JSON.stringify(data));
  return respond({ ok: true, removed, total: data.feeds.length });
}

export async function onRequest(context) {
  const { request } = context;

  switch (request.method) {
    case 'GET':
      return handleList();
    case 'POST':
      if (!await requireAuth(request)) return respond({ error: 'unauthorized' }, 401);
      return handleAdd(request);
    case 'DELETE':
      if (!await requireAuth(request)) return respond({ error: 'unauthorized' }, 401);
      return handleRemove(request);
    default:
      return respond({ error: 'method not allowed' }, 405);
  }
}
