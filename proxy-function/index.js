// RSS 抓取代理 — 部署到腾讯云 SCF（事件函数），提供国内 IP 中转
// 配合 check-feeds.js 使用，设置 PROXY_FUNCTION_URL 即可

exports.main_handler = async (event) => {
  // 尝试多种方式解析请求体（兼容不同 API 网关配置）
  let body = event.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body || typeof body !== 'object') body = {};

  const { url, timeout = 15000 } = body;

  if (!url) {
    return { statusCode: 400, body: JSON.stringify({ error: 'url required' }) };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const targetRes = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSSBot/1.0)',
        Accept: 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
      },
    });

    clearTimeout(timer);

    const text = await targetRes.text();
    const ct = targetRes.headers.get('content-type') || '';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        status: targetRes.status,
        contentType: ct,
        body: text,
      }),
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
