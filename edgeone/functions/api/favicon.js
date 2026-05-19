// GET /api/favicon?url=<siteUrl> — 自动发现并返回站点的 favicon 图片

const CACHE_TTL = 604800; // KV 缓存 7 天

async function discoverFaviconUrl(siteUrl) {
  // 规范化 URL
  if (!/^https?:\/\//i.test(siteUrl)) {
    siteUrl = 'https://' + siteUrl;
  }

  // 1. 抓取站点 HTML，解析 <link rel="icon"> 标签
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(siteUrl, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSSBot/1.0)',
        Accept: 'text/html,application/xhtml+xml,*/*',
      },
    });
    clearTimeout(t);

    const html = await res.text();

    // 优先匹配 <link rel="icon"> 或 <link rel="shortcut icon">
    const iconPatterns = [
      /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i,
      /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i,
      /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i,
      /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon["']/i,
    ];

    for (const pattern of iconPatterns) {
      const match = html.match(pattern);
      if (match) {
        let href = match[1].trim();
        return resolveUrl(href, siteUrl);
      }
    }

    // 2. 回退到 /favicon.ico
    const urlObj = new URL(siteUrl);
    const defaultFavicon = `${urlObj.protocol}//${urlObj.host}/favicon.ico`;

    // 验证 /favicon.ico 是否存在
    try {
      const ctrl2 = new AbortController();
      const t2 = setTimeout(() => ctrl2.abort(), 8000);
      const check = await fetch(defaultFavicon, {
        method: 'HEAD',
        signal: ctrl2.signal,
        redirect: 'follow',
      });
      clearTimeout(t2);
      if (check.ok && (check.headers.get('content-type') || '').includes('image')) {
        return defaultFavicon;
      }
      // 即使 HEAD 没有返回 image content-type，也尝试使用它
      if (check.ok) {
        return defaultFavicon;
      }
    } catch {
      // HEAD 失败，仍然返回默认路径（让浏览器尝试）
      return defaultFavicon;
    }

    return defaultFavicon;
  } catch {
    // 抓取 HTML 失败，返回默认 /favicon.ico
    try {
      const urlObj = new URL(siteUrl);
      return `${urlObj.protocol}//${urlObj.host}/favicon.ico`;
    } catch {
      return null;
    }
  }
}

function resolveUrl(href, baseUrl) {
  if (href.startsWith('http://') || href.startsWith('https://')) return href;
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const siteUrl = url.searchParams.get('url');

  if (!siteUrl) {
    return new Response(JSON.stringify({ error: 'url parameter required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 检查 KV 缓存
    let faviconUrl = null;
    if (typeof RSS_KV !== 'undefined') {
      const cacheKey = 'favicon:' + siteUrl;
      faviconUrl = await RSS_KV.get(cacheKey);
      if (!faviconUrl) {
        faviconUrl = await discoverFaviconUrl(siteUrl);
        if (faviconUrl) {
          await RSS_KV.put(cacheKey, faviconUrl, { expirationTtl: CACHE_TTL });
        }
      }
    } else {
      faviconUrl = await discoverFaviconUrl(siteUrl);
    }

    if (!faviconUrl) {
      return new Response(JSON.stringify({ error: 'favicon not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 如果请求要求返回 URL 而非图片，加 ?meta=1
    if (url.searchParams.get('meta')) {
      return new Response(JSON.stringify({ url: faviconUrl }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 抓取 favicon 图片并返回
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const imgRes = await fetch(faviconUrl, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RSSBot/1.0)' },
    });
    clearTimeout(t);

    if (!imgRes.ok) {
      return new Response(JSON.stringify({ error: `fetch failed: HTTP ${imgRes.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const contentType = imgRes.headers.get('content-type') || 'image/x-icon';
    const body = await imgRes.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
