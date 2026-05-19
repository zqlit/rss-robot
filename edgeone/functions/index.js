// 首页 — 登录后展示 API 文档
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // 检查登录状态
  let authed = false;
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookieMatch = cookieHeader.match(/site_token=([^;]+)/);
  const token = url.searchParams.get('token') || (cookieMatch ? cookieMatch[1] : '');

  if (typeof RSS_KV !== 'undefined') {
    const password = await RSS_KV.get('site_password');
    if (!password || token === password) {
      authed = true;
    }
  } else {
    authed = true; // KV 未配置时跳过
  }

  if (!authed) {
    return new Response(LOGIN_HTML, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return new Response(DOCS_HTML, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Set-Cookie': `site_token=${token}; Path=/; Max-Age=2592000; SameSite=Lax`,
    },
  });
}

const LOGIN_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RSS API</title>
<style>
  :root { --bg: #0d1117; --card: #161b22; --border: #30363d; --text: #c9d1d9; --muted: #8b949e; --accent: #58a6ff; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .login-box { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 40px; width: 100%; max-width: 380px; text-align: center; }
  .login-box h1 { font-size: 22px; margin-bottom: 8px; color: #fff; }
  .login-box p { color: var(--muted); font-size: 14px; margin-bottom: 24px; }
  .login-box input { width: 100%; padding: 10px 14px; background: #0d1117; border: 1px solid var(--border); border-radius: 8px; color: #fff; font-size: 15px; outline: none; }
  .login-box input:focus { border-color: var(--accent); }
  .login-box button { width: 100%; margin-top: 14px; padding: 10px; background: #238636; color: #fff; border: none; border-radius: 8px; font-size: 15px; cursor: pointer; font-weight: 600; }
  .login-box button:hover { background: #2ea043; }
  .error { color: #f85149; font-size: 13px; margin-top: 10px; display: none; }
</style>
</head>
<body>
<div class="login-box">
  <h1>RSS API</h1>
  <p>请输入访问口令</p>
  <input type="password" id="pwd" placeholder="口令" autofocus>
  <button onclick="login()">进入</button>
  <div class="error" id="err">口令错误</div>
</div>
<script>
async function login() {
  const pwd = document.getElementById('pwd').value;
  if (!pwd) return;
  try {
    const res = await fetch('/api/auth?token=' + encodeURIComponent(pwd));
    if (res.ok) {
      document.cookie = 'site_token=' + pwd + ';path=/;max-age=2592000;SameSite=Lax';
      location.reload();
    } else {
      document.getElementById('err').style.display = 'block';
    }
  } catch { document.getElementById('err').style.display = 'block'; }
}
document.getElementById('pwd').addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
</script>
</body>
</html>`;

const DOCS_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RSS API · 博客订阅聚合</title>
<style>
  :root { --bg: #0d1117; --card: #161b22; --border: #30363d; --text: #c9d1d9; --muted: #8b949e; --accent: #58a6ff; --green: #3fb950; --red: #f85149; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 40px 20px; }
  .container { max-width: 760px; width: 100%; }
  header { text-align: center; padding: 40px 0; border-bottom: 1px solid var(--border); margin-bottom: 32px; }
  header h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; color: #fff; }
  header p { color: var(--muted); font-size: 15px; }
  .nav-links { margin-top: 12px; }
  .nav-links a { color: var(--accent); font-size: 13px; text-decoration: none; }
  .nav-links a:hover { text-decoration: underline; }
  .stats { display: flex; gap: 16px; justify-content: center; margin-bottom: 32px; }
  .stat { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 12px 24px; text-align: center; }
  .stat .num { font-size: 22px; font-weight: 700; color: #fff; }
  .stat .label { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .endpoint { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 20px 24px; margin-bottom: 16px; }
  .endpoint h3 { font-size: 16px; margin-bottom: 8px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .method { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; }
  .method.post { background: #1f6feb33; color: var(--accent); }
  .method.get { background: #23863633; color: var(--green); }
  .method.delete { background: #da363333; color: var(--red); }
  .path { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 14px; color: #e6edf3; }
  .desc { color: var(--muted); font-size: 13px; margin-bottom: 12px; }
  .code { background: #0d1117; border-radius: 6px; padding: 12px 16px; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; line-height: 1.6; overflow-x: auto; white-space: pre; color: #e6edf3; margin-top: 8px; }
  .code .key { color: var(--accent); }
  .code .str { color: #a5d6ff; }
  .code .cmt { color: #6e7681; }
  footer { text-align: center; padding: 32px 0; color: var(--muted); font-size: 13px; border-top: 1px solid var(--border); margin-top: 32px; }
  footer a { color: var(--accent); text-decoration: none; }
</style>
</head>
<body>
<div class="container">
<header>
  <h1>RSS API</h1>
  <p>博客 RSS 订阅聚合 · 数据每小时自动刷新</p>
  <div class="nav-links"><a href="/feed">管理订阅源</a></div>
</header>
<div class="stats">
  <div class="stat"><div class="num" id="feedCount">-</div><div class="label">订阅源</div></div>
  <div class="stat"><div class="num" id="articleCount">-</div><div class="label">最新文章</div></div>
</div>

<div class="endpoint">
  <h3><span class="method get">GET</span><span class="path">/api/results</span></h3>
  <p class="desc">获取所有博客最新文章（JSON），每个 Feed 附带 siteUrl 和 favicon 地址。<strong style="color:var(--green)">无需口令</strong></p>
  <div class="code"><span class="cmt"># 获取全部</span>
curl https://rssapi.usj.cc/api/results

<span class="cmt"># 筛选特定博客</span>
curl https://rssapi.usj.cc/api/results?<span class="key">feed</span>=<span class="str">刘郎阁</span>

<span class="cmt"># 每博客只取最新 3 篇</span>
curl https://rssapi.usj.cc/api/results?<span class="key">limit</span>=<span class="str">3</span>

<span class="cmt"># 响应示例</span>
{
  "<span class="key">feeds</span>": [{
    "<span class="key">name</span>": "<span class="str">吾柯</span>",
    "<span class="key">siteUrl</span>": "<span class="str">https://blog.keepke.com</span>",
    "<span class="key">favicon</span>": "<span class="str">https://rssapi.usj.cc/api/favicon?url=...</span>",
    "<span class="key">articles</span>": [...]
  }]
}</div>
</div>

<div class="endpoint">
  <h3><span class="method get">GET</span><span class="method post">POST</span><span class="method delete">DELETE</span><span class="path">/api/feeds</span></h3>
  <p class="desc">订阅源管理 API。通过接口增删订阅源。POST/DELETE 需要口令。</p>
  <div class="code"><span class="cmt"># 查看所有订阅源（无需口令，返回 { feeds: [...] }）</span>
curl https://rssapi.usj.cc/api/feeds

<span class="cmt"># 添加订阅源（需要 ?token=口令）</span>
curl -X POST https://rssapi.usj.cc/api/feeds?<span class="key">token</span>=<span class="str">xxx</span> \\
  -H <span class="str">"Content-Type: application/json"</span> \\
  -d <span class="str">'{"url": "https://example.com", "feedTitle": "示例博客"}'</span>

<span class="cmt"># 批量导入</span>
curl -X POST https://rssapi.usj.cc/api/feeds?<span class="key">token</span>=<span class="str">xxx</span> \\
  -H <span class="str">"Content-Type: application/json"</span> \\
  -d <span class="str">'{"feeds": [{ "url": "...", "feedTitle": "..." }, ...]}'</span>

<span class="cmt"># 删除订阅源（需要 ?token=口令）</span>
curl -X DELETE https://rssapi.usj.cc/api/feeds?<span class="key">url</span>=<span class="str">https://example.com</span>&<span class="key">token</span>=<span class="str">xxx</span></div>
</div>

<div class="endpoint">
  <h3><span class="method get">GET</span><span class="path">/api/favicon</span></h3>
  <p class="desc">自动发现并返回站点 favicon 图片。<strong style="color:var(--green)">无需口令</strong></p>
  <div class="code"><span class="cmt"># 获取 favicon 图片（可直接用作 &lt;img src&gt;）</span>
curl https://rssapi.usj.cc/api/favicon?<span class="key">url</span>=<span class="str">blog.keepke.com</span>

<span class="cmt"># 查看发现的原始 favicon URL</span>
curl https://rssapi.usj.cc/api/favicon?<span class="key">url</span>=<span class="str">blog.keepke.com</span>&<span class="key">meta</span>=<span class="str">1</span></div>
</div>

<div class="endpoint">
  <h3><span class="method post">POST</span><span class="path">/api/proxy</span></h3>
  <p class="desc">RSS 抓取代理，通过国内节点抓取被境外封锁的博客。需要口令。</p>
  <div class="code"><span class="cmt"># 代理抓取</span>
curl -X POST https://rssapi.usj.cc/api/proxy?<span class="key">token</span>=<span class="str">xxx</span> \\
  -H <span class="str">"Content-Type: application/json"</span> \\
  -d <span class="str">'{"url": "https://example.com/feed", "timeout": 15000}'</span></div>
</div>

<div class="endpoint">
  <h3><span class="method post">POST</span><span class="path">/api/update</span></h3>
  <p class="desc">接收抓取结果并存入 KV（由 GitHub Action 自动调用）。需要口令。</p>
</div>

<footer>
  管理：<a href="/feed">订阅源管理</a>
  · 数据来源：<a href="https://github.com/cheungray123/rss-robot" target="_blank">RSS Robot</a>
  · 代理：<a href="https://scfapi.usj.cc" target="_blank">SCF 国内节点</a>
  · 托管：<a href="https://pages.edgeone.ai" target="_blank">EdgeOne Pages</a>
</footer>
</div>
<script>
fetch('/api/results').then(r => r.json()).then(data => {
  if (data.feeds) {
    document.getElementById('feedCount').textContent = data.feeds.length;
    let total = 0;
    data.feeds.forEach(f => total += (f.articles || []).length);
    document.getElementById('articleCount').textContent = total;
  }
}).catch(() => {});
</script>
</body>
</html>`;
