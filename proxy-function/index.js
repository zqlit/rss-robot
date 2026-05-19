// RSS 抓取代理 — 部署到腾讯云 SCF (Web 函数)，提供国内 IP 中转

const http = require('http');
const PORT = process.env.PORT || 9000;
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

function parseBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
  });
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'POST only' });
  }

  const { url, timeout = 15000, token } = await parseBody(req);

  if (AUTH_TOKEN && token !== AUTH_TOKEN) {
    return json(res, 403, { error: 'unauthorized' });
  }

  if (!url) {
    return json(res, 400, { error: 'url required' });
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

    json(res, 200, {
      ok: true,
      status: targetRes.status,
      contentType: ct,
      body: text,
    });
  } catch (err) {
    json(res, 502, { ok: false, error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`RSS proxy running on port ${PORT}`);
});
