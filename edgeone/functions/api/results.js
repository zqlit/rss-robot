// GET /api/results — 对外提供最新的 RSS 聚合 JSON 数据
// 数据由 check-feeds.js 每次运行后通过 POST /api/update 上报
//
// 可选参数:
//   ?feed=博客名   筛选指定博客
//   ?limit=20      限制返回文章数

export async function onRequest(context) {
  const { request, env } = context;

  if (typeof RSS_KV === 'undefined') {
    return new Response(JSON.stringify({ error: 'KV not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const raw = await RSS_KV.get('latest');
    if (!raw) {
      return new Response(JSON.stringify({ total: 0, feeds: [], timestamp: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let data = JSON.parse(raw);
    const url = new URL(request.url);
    const feedFilter = url.searchParams.get('feed');
    const limit = parseInt(url.searchParams.get('limit')) || 0;

    // 过滤掉没有日期的文章
    data.feeds = data.feeds.map((f) => ({
      ...f,
      articles: f.articles.filter((a) => a.pubDate),
    }));

    // 按博客筛选
    if (feedFilter) {
      data.feeds = data.feeds.filter((f) => f.name === feedFilter);
    }

    // 限制文章数
    if (limit > 0) {
      data.feeds = data.feeds.map((f) => ({
        ...f,
        articles: f.articles.slice(0, limit),
      }));
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=600',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
