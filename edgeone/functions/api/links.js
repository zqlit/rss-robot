// GET  /api/links           — 列出所有友链（公开）
// POST /api/links           — 添加/更新友链（需口令）
// DELETE /api/links?url=xxx  — 删除友链（需口令）

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function respond(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

function corsOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

async function requireAuth(request) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookieMatch = cookieHeader.match(/site_token=([^;]+)/);
  const token = new URL(request.url).searchParams.get('token') || (cookieMatch ? cookieMatch[1] : '');
  if (typeof RSS_KV === 'undefined') return true;
  const password = await RSS_KV.get('site_password');
  if (!password || token === password) return true;
  return false;
}

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') return corsOptions();

  if (typeof RSS_KV === 'undefined') {
    return respond({ error: 'KV not configured' }, 500);
  }

  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  // GET — 列出所有友链（公开）
  if (method === 'GET') {
    const raw = await RSS_KV.get('friend_links');
    const data = raw ? JSON.parse(raw) : { links: [] };
    // 默认隐藏 marked 的友链，?all=1 显示全部（管理页面用）
    const showAll = url.searchParams.get('all') === '1';
    let links = data.links.map((l) => ({ ...l, image: l.image || l.avatar || '' }));
    if (!showAll) links = links.filter((l) => !l.hidden);
    return respond({ links });
  }

  // POST / DELETE — 需要口令
  if (!(await requireAuth(request))) {
    return respond({ error: 'unauthorized' }, 401);
  }

  // DELETE
  if (method === 'DELETE') {
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      return respond({ error: 'missing url param' }, 400);
    }

    const raw = await RSS_KV.get('friend_links');
    const data = raw ? JSON.parse(raw) : { links: [] };
    data.links = data.links.filter((l) => l.url !== targetUrl);
    await RSS_KV.put('friend_links', JSON.stringify(data));
    return respond({ ok: true, links: data.links });
  }

  // POST — 添加或更新友链
  if (method === 'POST') {
    try {
      const body = await request.json();
      const raw = await RSS_KV.get('friend_links');
      const data = raw ? JSON.parse(raw) : { links: [] };

      // 支持单条或批量
      const incoming = body.links || (body.url ? [body] : []);
      if (incoming.length === 0) {
        return respond({ error: 'empty body' }, 400);
      }

      // 重复检测：新增模式下 URL 已存在则拒绝；编辑模式下新旧 URL 不同才算冲突
      const duplicates = [];
      for (const link of incoming) {
        if (!link.url) continue;
        const idx = data.links.findIndex((l) => l.url === link.url);
        if (idx >= 0 && link.url !== link.oldUrl) {
          duplicates.push(link.url);
        }
      }
      if (duplicates.length > 0) {
        return respond({ error: '链接已存在，不允许重复添加', duplicates }, 409);
      }

      for (const link of incoming) {
        if (!link.url) continue;
        const entry = {
          name: link.name || link.title || '',
          url: link.url,
          image: link.image || link.avatar || `https://api.usj.cc/api/favicon?url=${encodeURIComponent(link.url)}`,
          description: link.description || '',
          rss: link.rss || '',
          hidden: link.hidden || false,
          addedAt: new Date().toISOString(),
        };
        // 编辑模式：按 oldUrl 查找并替换，保留原始 addedAt
        if (link.oldUrl) {
          const idx = data.links.findIndex((l) => l.url === link.oldUrl);
          if (idx >= 0) {
            entry.addedAt = data.links[idx].addedAt;
            data.links[idx] = entry;
          } else {
            data.links.push(entry);
          }
        } else {
          data.links.push(entry);
        }
      }

      await RSS_KV.put('friend_links', JSON.stringify(data));
      return respond({ ok: true, links: data.links });
    } catch (err) {
      return respond({ error: err.message }, 500);
    }
  }

  return respond({ error: 'method not allowed' }, 405);
}
