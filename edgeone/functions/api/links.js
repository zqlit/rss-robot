// GET  /api/links           — 列出所有友链（公开）
// POST /api/links           — 添加/更新友链（需口令）
// DELETE /api/links?url=xxx  — 删除友链（需口令）

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

  if (typeof RSS_KV === 'undefined') {
    return new Response(JSON.stringify({ error: 'KV not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  // GET — 列出所有友链（公开）
  if (method === 'GET') {
    const raw = await RSS_KV.get('friend_links');
    const data = raw ? JSON.parse(raw) : { links: [] };
    // 兼容旧 avatar 字段，统一为 image
    data.links = data.links.map((l) => ({ ...l, image: l.image || l.avatar || '' }));
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=600',
      },
    });
  }

  // POST / DELETE — 需要口令
  if (!(await requireAuth(request))) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // DELETE
  if (method === 'DELETE') {
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'missing url param' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const raw = await RSS_KV.get('friend_links');
    const data = raw ? JSON.parse(raw) : { links: [] };
    data.links = data.links.filter((l) => l.url !== targetUrl);
    await RSS_KV.put('friend_links', JSON.stringify(data));
    return new Response(JSON.stringify({ ok: true, links: data.links }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
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
        return new Response(JSON.stringify({ error: 'empty body' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      for (const link of incoming) {
        if (!link.url) continue;
        const idx = data.links.findIndex((l) => l.url === link.url);
        const entry = {
          name: link.name || link.title || '',
          url: link.url,
          image: link.image || link.avatar || `https://rssapi.usj.cc/api/favicon?url=${encodeURIComponent(link.url)}`,
          description: link.description || '',
          rss: link.rss || '',
          addedAt: idx >= 0 ? data.links[idx].addedAt : new Date().toISOString(),
        };
        if (idx >= 0) {
          data.links[idx] = entry;
        } else {
          data.links.push(entry);
        }
      }

      await RSS_KV.put('friend_links', JSON.stringify(data));
      return new Response(JSON.stringify({ ok: true, links: data.links }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({ error: 'method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
}
