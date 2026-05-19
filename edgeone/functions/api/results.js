// GET /api/results — 读取 KV 中缓存的最近抓取结果
// 可选参数: ?host=blog.example.com 筛选特定博客

export async function onRequestGet({ request, env }) {
  if (!env?.RSS_KV) {
    return Response.json({ error: 'KV not configured' }, { status: 500 });
  }

  const url = new URL(request.url);
  const host = url.searchParams.get('host');

  try {
    if (host) {
      // 读取指定博客
      const raw = await env.RSS_KV.get(`feed:${host}`);
      if (!raw) {
        return Response.json({ error: 'not found' }, { status: 404 });
      }
      return Response.json(JSON.parse(raw));
    }

    // 列出所有缓存 key（最多 100 条）
    const list = await env.RSS_KV.list({ prefix: 'feed:', limit: 100 });
    const results = [];
    for (const key of list.keys) {
      const raw = await env.RSS_KV.get(key.name);
      if (raw) {
        try {
          const data = JSON.parse(raw);
          // 不返回 body，列表接口只返回元数据
          results.push({
            host: key.name.replace('feed:', ''),
            url: data.url,
            status: data.status,
            contentType: data.contentType,
            fetchedAt: data.fetchedAt,
          });
        } catch {
          // skip corrupted entries
        }
      }
    }

    return Response.json({ count: results.length, results });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
