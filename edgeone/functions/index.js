// 首页 — API 文档
export async function onRequest() {
  return new Response(HTML, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

const HTML = `<!DOCTYPE html>
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
</header>
<div class="stats">
  <div class="stat"><div class="num" id="feedCount">-</div><div class="label">订阅源</div></div>
  <div class="stat"><div class="num" id="articleCount">-</div><div class="label">最新文章</div></div>
</div>
<div class="endpoint">
  <h3><span class="method get">GET</span><span class="path">/api/results</span></h3>
  <p class="desc">获取所有博客最新文章（JSON），每个 Feed 附带 siteUrl 和 favicon 地址。</p>
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
  <p class="desc">订阅源管理 API。通过接口增删订阅源，告别手动编辑 JSON。GET 返回格式可直接设为 FEEDS_URL 供 check-feeds 使用。</p>
  <div class="code"><span class="cmt"># 查看所有订阅源（返回 { feeds: [...] }）</span>
curl https://rssapi.usj.cc/api/feeds

<span class="cmt"># 添加订阅源（URL 已存在则覆盖更新）</span>
curl -X POST https://rssapi.usj.cc/api/feeds \\
  -H <span class="str">"Content-Type: application/json"</span> \\
  -d <span class="str">'{"url": "https://example.com", "feedTitle": "示例博客"}'</span>

<span class="cmt"># 批量导入</span>
curl -X POST https://rssapi.usj.cc/api/feeds \\
  -H <span class="str">"Content-Type: application/json"</span> \\
  -d <span class="str">'{"feeds": [{ "url": "...", "feedTitle": "..." }, ...]}'</span>

<span class="cmt"># 删除订阅源</span>
curl -X DELETE https://rssapi.usj.cc/api/feeds?<span class="key">url</span>=<span class="str">https://example.com</span></div>
</div>
<div class="endpoint">
  <h3><span class="method get">GET</span><span class="path">/api/favicon</span></h3>
  <p class="desc">自动发现并返回站点 favicon 图片。抓取目标站 HTML 解析 icon 标签，回退 /favicon.ico。结果缓存在 KV 中 7 天。</p>
  <div class="code"><span class="cmt"># 获取 favicon 图片（可直接用作 &lt;img src&gt;）</span>
curl https://rssapi.usj.cc/api/favicon?<span class="key">url</span>=<span class="str">blog.keepke.com</span>

<span class="cmt"># 查看发现的原始 favicon URL（不返回图片）</span>
curl https://rssapi.usj.cc/api/favicon?<span class="key">url</span>=<span class="str">blog.keepke.com</span>&<span class="key">meta</span>=<span class="str">1</span></div>
</div>
<div class="endpoint">
  <h3><span class="method post">POST</span><span class="path">/api/proxy</span></h3>
  <p class="desc">RSS 抓取代理，通过国内节点抓取被境外封锁的博客。</p>
  <div class="code"><span class="cmt"># 代理抓取目标 URL</span>
curl -X POST https://rssapi.usj.cc/api/proxy \\
  -H <span class="str">"Content-Type: application/json"</span> \\
  -d <span class="str">'{"url": "https://example.com/feed", "timeout": 15000}'</span></div>
</div>
<div class="endpoint">
  <h3><span class="method post">POST</span><span class="path">/api/update</span></h3>
  <p class="desc">接收抓取结果并存入 KV（由 GitHub Action 自动调用）。</p>
</div>
<footer>
  数据来源：<a href="https://github.com/cheungray123/rss-robot" target="_blank">RSS Robot</a>
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
