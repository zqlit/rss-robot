// GET /api/health — 检测站点存活状态
//   ?url=<siteUrl>  检测单个站点
//   无参数           批量检测所有订阅源（从 KV 读取 feeds_config）

async function checkSite(url) {
  const start = Date.now();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(url, {
      method: 'HEAD',
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSSBot/1.0)',
      },
    });
    clearTimeout(t);
    return {
      url,
      status: res.status,
      ok: res.ok,
      latency: Date.now() - start,
    };
  } catch (err) {
    return {
      url,
      status: 0,
      ok: false,
      latency: Date.now() - start,
      error: err.message,
    };
  }
}

function respond(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function onRequest(context) {
  const { request } = context;
  const reqUrl = new URL(request.url);
  const targetUrl = reqUrl.searchParams.get('url');

  // 单个检测
  if (targetUrl) {
    const result = await checkSite(targetUrl);
    return respond(result);
  }

  // 批量检测：从 KV 读取所有订阅源
  if (typeof RSS_KV === 'undefined') {
    return respond({ error: 'KV not configured' }, 500);
  }

  const raw = await RSS_KV.get('feeds_config');
  if (!raw) {
    return respond({ error: 'no feeds configured' }, 404);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return respond({ error: 'invalid feeds data' }, 500);
  }

  const feeds = data.feeds || [];
  if (feeds.length === 0) {
    return respond({ results: [], total: 0 });
  }

  // 并发检测（限制并发 5 个）
  const results = [];
  const concurrency = 5;
  for (let i = 0; i < feeds.length; i += concurrency) {
    const batch = feeds.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((f) => checkSite(f.url))
    );
    results.push(...batchResults);
  }

  const alive = results.filter((r) => r.ok).length;
  const dead = results.filter((r) => !r.ok).length;

  return respond({
    timestamp: new Date().toISOString(),
    total: results.length,
    alive,
    dead,
    results,
  });
}
