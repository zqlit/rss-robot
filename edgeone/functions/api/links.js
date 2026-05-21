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
    // 默认隐藏 marked 的友链，?all=1 显示全部（管理页面用）
    const showAll = url.searchParams.get('all') === '1';
    let links = data.links.map((l) => ({ ...l, image: l.image || l.avatar || '' }));
    if (!showAll) links = links.filter((l) => !l.hidden);
    return new Response(JSON.stringify({ links }), {
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
        return new Response(JSON.stringify({ error: '链接已存在，不允许重复添加', duplicates }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      for (const link of incoming) {
        if (!link.url) continue;
        const entry = {
          name: link.name || link.title || '',
          url: link.url,
          image: link.image || link.avatar || `https://rssapi.usj.cc/api/favicon?url=${encodeURIComponent(link.url)}`,
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
