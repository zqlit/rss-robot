// GET /api/articles — 按发布时间排序的文章列表
//   ?limit=50  限制返回数量（默认 50）

export async function onRequest(context) {
  const { request } = context;

  if (typeof RSS_KV === 'undefined') {
    return new Response(JSON.stringify({ error: 'KV not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const raw = await RSS_KV.get('latest');
    if (!raw) {
      return new Response(JSON.stringify({ total: 0, articles: [], timestamp: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = JSON.parse(raw);
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit')) || 50;

    // 展开所有文章，附带博客信息
    const articles = [];
    for (const feed of (data.feeds || [])) {
      for (const article of (feed.articles || [])) {
        articles.push({
          title: article.title,
          link: article.link,
          pubDate: article.pubDate,
          author: article.author || feed.name,
          feedName: feed.name,
          siteUrl: feed.siteUrl,
          favicon: feed.favicon,
        });
      }
    }

    // 按发布时间倒序
    articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    const result = {
      timestamp: data.timestamp,
      total: articles.length,
      articles: articles.slice(0, limit),
    };

    return new Response(JSON.stringify(result), {
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
