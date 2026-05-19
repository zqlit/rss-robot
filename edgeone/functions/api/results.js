// GET /api/results — 读取 KV 中缓存的最近抓取结果
// 可选参数: ?host=blog.example.com 筛选特定博客

export async function onRequest(context) {
  try {
    const { request, env } = context;

    if (!env.RSS_KV) {
      return new Response(JSON.stringify({ error: 'KV not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const host = url.searchParams.get('host');

    if (host) {
      const raw = await env.RSS_KV.get(`feed:${host}`);
      if (!raw) {
        return new Response(JSON.stringify({ error: 'not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(raw, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const list = await env.RSS_KV.list({ prefix: 'feed:', limit: 100 });
    const results = [];
    for (const key of list.keys) {
      const raw = await env.RSS_KV.get(key.name);
      if (raw) {
        try {
          const data = JSON.parse(raw);
          results.push({
            host: key.name.replace('feed:', ''),
            url: data.url,
            status: data.status,
            contentType: data.contentType,
            fetchedAt: data.fetchedAt,
          });
        } catch {
          // skip
        }
      }
    }

    return new Response(JSON.stringify({ count: results.length, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message, stack: err.stack }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
