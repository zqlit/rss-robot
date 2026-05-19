// POST /api/proxy — RSS 代理抓取，用于绕过境外 IP 封锁
// 与 check-feeds.js 的 PROXY_FUNCTION_URL 集成

// 每次抓取后可选存入 KV，用于后续读取最新结果
async function saveToKV(env, key, data) {
  if (!env?.RSS_KV) return;
  try {
    await env.RSS_KV.put(key, JSON.stringify(data), { expirationTtl: 86400 }); // 24h 过期
  } catch {
    // KV 写入失败不影响主流程
  }
}

export async function onRequestPost({ request, env }) {
  const AUTH_TOKEN = env.AUTH_TOKEN || '';

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 });
  }

  const { url, timeout = 15000, token } = body;

  if (AUTH_TOKEN && token !== AUTH_TOKEN) {
    return Response.json({ error: 'unauthorized' }, { status: 403 });
  }

  if (!url) {
    return Response.json({ error: 'url required' }, { status: 400 });
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

    // 存入 KV（最佳努力，不阻塞返回）
    const hostname = new URL(url).hostname;
    saveToKV(env, `feed:${hostname}`, {
      url,
      status: targetRes.status,
      contentType: ct,
      body: text.substring(0, 50000), // 截断，避免超出 KV 限制
      fetchedAt: new Date().toISOString(),
    });

    return Response.json({
      ok: true,
      status: targetRes.status,
      contentType: ct,
      body: text,
    });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 502 });
  }
}
