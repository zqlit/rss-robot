// 首页 — 登录后展示 API 文档
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // 微信公众平台域名验证文件
  if (url.pathname.startsWith('/MP_verify_') && url.pathname.endsWith('.txt')) {
    const code = url.pathname.replace('/MP_verify_', '').replace('.txt', '');
    return new Response(code, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

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
<title>UAPI管理系统</title>
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
  <h1>UAPI管理系统</h1>
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
      location.href = '/?token=' + encodeURIComponent(pwd);
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
<title>UAPI管理系统</title>
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
  .badge { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 10px; margin-left: 6px; }
  .badge-public { background: #23863622; color: var(--green); border: 1px solid #23863644; }
  .badge-auth { background: #d2991d22; color: var(--yellow); border: 1px solid #d2991d44; }
  table.params { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
  table.params th { background: #1c2333; color: var(--muted); font-weight: 600; padding: 7px 10px; text-align: left; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid var(--border); }
  table.params td { padding: 7px 10px; border-bottom: 1px solid var(--border); vertical-align: top; }
  table.params td.n { font-family: 'SF Mono', 'Fira Code', monospace; color: var(--accent); white-space: nowrap; }
  table.params td.t { color: var(--green); font-size: 11px; }
  table.params td.req { color: var(--red); font-weight: 600; font-size: 11px; }
  table.params td.opt { color: var(--muted); font-size: 11px; }
  table.params td.d { color: var(--muted); line-height: 1.5; }
  .status-bar { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
  .status-chip { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 11px; padding: 2px 7px; border-radius: 4px; }
  .s200 { background: #23863622; color: var(--green); }
  .s400 { background: #d2991d22; color: var(--yellow); }
  .s401 { background: #da363322; color: var(--red); }
  .s409 { background: #da363322; color: var(--red); }
  .s500 { background: #da363322; color: var(--red); }
  .s502 { background: #da363322; color: var(--red); }
  footer { text-align: center; padding: 32px 0; color: var(--muted); font-size: 13px; border-top: 1px solid var(--border); margin-top: 32px; }
  footer a { color: var(--accent); text-decoration: none; }
</style>
</head>
<body>
<div class="container">
<header>
  <h1>UAPI管理系统</h1>
  <p>博客 RSS 订阅聚合 · 友链管理 · 数据每小时自动刷新</p>
  <div class="nav-links"><a href="/feed">UAPI 管理</a></div>
</header>
<div class="stats">
  <div class="stat"><div class="num" id="feedCount">-</div><div class="label">订阅源</div></div>
  <div class="stat"><div class="num" id="articleCount">-</div><div class="label">最新文章</div></div>
</div>

<div class="endpoint">
  <h3><span class="method get">GET</span><span class="path">/api/results</span></h3>
  <p class="desc"><span class="badge badge-public">公开</span> 获取所有博客最新文章（JSON），每个 Feed 附带 siteUrl 和 favicon 地址。<strong style="color:var(--green)">无需口令</strong></p>
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
  <h3><span class="method get">GET</span><span class="path">/api/articles</span></h3>
  <p class="desc"><span class="badge badge-public">公开</span> 按发布时间排序的所有文章（跨博客混合）。适合友圈/时间线场景。<strong style="color:var(--green)">无需口令</strong></p>
  <div class="code"><span class="cmt"># 获取最新 50 篇（默认）</span>
curl https://rssapi.usj.cc/api/articles

<span class="cmt"># 获取最新 100 篇</span>
curl https://rssapi.usj.cc/api/articles?<span class="key">limit</span>=<span class="str">100</span>

<span class="cmt"># 响应示例</span>
{
  "<span class="key">total</span>": 380,
  "<span class="key">articles</span>": [
    {
      "<span class="key">title</span>": "...", "<span class="key">link</span>": "...", "<span class="key">pubDate</span>": "...",
      "<span class="key">feedName</span>": "<span class="str">吾柯</span>",
      "<span class="key">siteUrl</span>": "<span class="str">https://blog.keepke.com</span>",
      "<span class="key">favicon</span>": "<span class="str">https://rssapi.usj.cc/api/favicon?url=...</span>"
    }
  ]
}</div>
</div>

<div class="endpoint">
  <h3><span class="method get">GET</span><span class="method post">POST</span><span class="method delete">DELETE</span><span class="path">/api/feeds</span></h3>
  <p class="desc">订阅源管理 API。GET 公开，POST/DELETE <span class="badge badge-auth">需口令</span>。支持 oldUrl 编辑模式，重复 URL 返回 409。</p>
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

<span class="cmt"># 编辑（oldUrl=原URL，改链不丢数据）</span>
curl -X POST https://rssapi.usj.cc/api/feeds?<span class="key">token</span>=<span class="str">xxx</span> \\
  -H <span class="str">"Content-Type: application/json"</span> \\
  -d <span class="str">'{"url":"https://new.com","oldUrl":"https://old.com"}'</span>

<span class="cmt"># 删除</span>
curl -X DELETE https://rssapi.usj.cc/api/feeds?<span class="key">url</span>=<span class="str">https://example.com</span>&<span class="key">token</span>=<span class="str">xxx</span>
<div class="status-bar"><span class="status-chip s200">200 OK</span><span class="status-chip s400">400</span><span class="status-chip s401">401</span><span class="status-chip s409">409 重复</span><span class="status-chip s500">500</span></div></div>
</div>


	<div class="endpoint">
	  <h3><span class="method get">GET</span><span class="method post">POST</span><span class="method delete">DELETE</span><span class="path">/api/links</span></h3>
	  <p class="desc">友链管理 API。GET 公开（?all=1 含隐藏），POST/DELETE <span class="badge badge-auth">需口令</span>。支持 oldUrl 编辑模式，重复 URL 返回 409。</p>
	  <div class="code"><span class="cmt"># 查看所有友链（无需口令）</span>
	curl https://rssapi.usj.cc/api/links

	<span class="cmt"># 添加友链（需要 ?token=口令）</span>
	curl -X POST https://rssapi.usj.cc/api/links?<span class="key">token</span>=<span class="str">xxx</span> \
	  -H <span class="str">"Content-Type: application/json"</span> \
	  -d <span class="str">'{"name": "示例博客", "url": "https://example.com", "description": "一个很棒的博客"}'</span>

	<span class="cmt"># 批量导入</span>
	curl -X POST https://rssapi.usj.cc/api/links?<span class="key">token</span>=<span class="str">xxx</span> \
	  -H <span class="str">"Content-Type: application/json"</span> \
	  -d <span class="str">'{"links": [{ "name": "...", "url": "..." }, ...]}'</span>

	<span class="cmt"># 编辑（oldUrl=原URL）</span>
	curl -X POST https://rssapi.usj.cc/api/links?<span class="key">token</span>=<span class="str">xxx</span> \\
	  -H <span class="str">"Content-Type: application/json"</span> \\
	  -d <span class="str">'{"url":"https://new.com","oldUrl":"https://old.com"}'</span>

<span class="cmt"># 删除</span>
	curl -X DELETE https://rssapi.usj.cc/api/links?<span class="key">url</span>=<span class="str">https://example.com</span>&<span class="key">token</span>=<span class="str">xxx</span>
	<div class="status-bar"><span class="status-chip s200">200 OK</span><span class="status-chip s400">400</span><span class="status-chip s401">401</span><span class="status-chip s409">409 重复</span><span class="status-chip s500">500</span></div></div>
	</div>

<div class="endpoint">
  <h3><span class="method get">GET</span><span class="path">/api/favicon</span></h3>
  <p class="desc"><span class="badge badge-public">公开</span> 自动发现并返回站点 favicon 图片。<strong style="color:var(--green)">无需口令</strong></p>
  <div class="code"><span class="cmt"># 获取 favicon 图片（可直接用作 &lt;img src&gt;）</span>
curl https://rssapi.usj.cc/api/favicon?<span class="key">url</span>=<span class="str">blog.keepke.com</span>

<span class="cmt"># 查看发现的原始 favicon URL</span>
curl https://rssapi.usj.cc/api/favicon?<span class="key">url</span>=<span class="str">blog.keepke.com</span>&<span class="key">meta</span>=<span class="str">1</span></div>
</div>

<div class="endpoint">
  <h3><span class="method get">GET</span><span class="path">/api/health</span></h3>
  <p class="desc"><span class="badge badge-public">公开</span> 检测订阅源站点存活状态。<strong style="color:var(--green)">无需口令</strong>。HEAD 请求目标 URL，返回状态码和延迟。</p>
  <div class="code"><span class="cmt"># 批量检测所有订阅源</span>
curl https://rssapi.usj.cc/api/health

<span class="cmt"># 检测单个站点</span>
curl https://rssapi.usj.cc/api/health?<span class="key">url</span>=<span class="str">blog.keepke.com</span>

<span class="cmt"># 响应示例</span>
{
  "<span class="key">total</span>": 38, "<span class="key">alive</span>": 35, "<span class="key">dead</span>": 3,
  "<span class="key">results</span>": [
    { "<span class="key">url</span>": "...", "<span class="key">status</span>": 200, "<span class="key">ok</span>": true, "<span class="key">latency</span>": 234 },
    { "<span class="key">url</span>": "...", "<span class="key">status</span>": 0, "<span class="key">ok</span>": false, "<span class="key">error</span>": "timeout" }
  ]
}</div>
<div class="status-bar"><span class="status-chip s200">200 OK</span></div></div>

<div class="endpoint">
  <h3><span class="method post">POST</span><span class="path">/api/proxy</span></h3>
  <p class="desc"><span class="badge badge-auth">需口令</span> RSS 抓取代理，通过国内节点抓取被境外封锁的博客。需要口令。<br>EdgeOne 节点：<code style="color:var(--accent)">rssapi.usj.cc/api/proxy</code> ｜ 腾讯云 SCF 国内节点：<code style="color:var(--accent)">scfapi.usj.cc</code></p>
  <div class="code"><span class="cmt"># 方式一：EdgeOne Pages 代理（rssapi.usj.cc，需口令）</span>
curl -X POST https://rssapi.usj.cc/api/proxy?<span class="key">token</span>=<span class="str">xxx</span> \\
  -H <span class="str">"Content-Type: application/json"</span> \\
  -d <span class="str">'{"url": "https://example.com/feed", "timeout": 15000}'</span>

<span class="cmt"># 方式二：腾讯云 SCF 国内代理（scfapi.usj.cc，无需口令）</span>
curl -X POST https://scfapi.usj.cc/ \\
  -H <span class="str">"Content-Type: application/json"</span> \\
  -d <span class="str">'{"url": "https://example.com/feed", "timeout": 15000}'</span>

<span class="cmt"># SCF 代理部署在腾讯云成都区，纯国内网络环境</span>
<span class="cmt"># check-feeds.js 中设置 PROXY_FUNCTION_URL=https://scfapi.usj.cc 即可启用</span>

<span class="cmt"># 响应示例</span>
{
  "<span class="key">ok</span>": true,
  "<span class="key">status</span>": 200,
  "<span class="key">contentType</span>": "<span class="str">application/rss+xml</span>",
  "<span class="key">body</span>": "<span class="str">&lt;?xml version=\"1.0\"...</span>"
}</div>
<div class="status-bar"><span class="status-chip s200">200 OK</span><span class="status-chip s400">400</span><span class="status-chip s401">401</span><span class="status-chip s502">502 抓取失败</span></div></div>

<div class="endpoint">
  <h3><span class="method get">GET</span><span class="method post">POST</span><span class="path">/api/wechat-material</span></h3>
  <p class="desc"><span class="badge badge-auth">POST 需口令</span> 同步文章到微信公众号草稿箱（调用 draft/add，不群发）。POST 需要口令。<br>封面图自动上传到永久素材库，文内图片自动上传到微信 CDN。</p>
  <div class="code"><span class="cmt"># 查看微信配置状态（无需口令）</span>
curl https://rssapi.usj.cc/api/wechat-material

<span class="cmt"># 首次使用：同时传入凭证和文章（appId/appSecret 会自动保存到 KV）</span>
curl -X POST https://rssapi.usj.cc/api/wechat-material?<span class="key">token</span>=<span class="str">xxx</span> \\
  -H <span class="str">"Content-Type: application/json"</span> \\
  -d <span class="str">'{
  "appId": "wx1234567890",
  "appSecret": "abc123...",
  "articles": [{
    "title": "文章标题（最长32字）",
    "thumb_media_url": "https://example.com/cover.jpg",
    "author": "作者名（最长16字）",
    "digest": "文章摘要（最长128字）",
    "show_cover_pic": 1,
    "content": "&lt;h1&gt;文章正文 HTML&lt;/h1&gt;",
    "content_source_url": "https://example.com/original-article",
    "content_image_urls": [
      { "original_url": "https://example.com/img.jpg" }
    ],
    "need_open_comment": 0,
    "only_fans_can_comment": 0
  }]
}'</span>

<span class="cmt"># 后续调用可省略 appId/appSecret（已保存到 KV）</span>
curl -X POST https://rssapi.usj.cc/api/wechat-material?<span class="key">token</span>=<span class="str">xxx</span> \\
  -H <span class="str">"Content-Type: application/json"</span> \\
  -d <span class="str">'{
  "articles": [{
    "title": "第二篇文章",
    "thumb_media_id": "已上传的永久media_id",
    "content": "&lt;p&gt;内容&lt;/p&gt;",
    "content_source_url": "https://example.com/post-2"
  }]
}'</span>

<span class="cmt"># --- 字段说明 ---</span>
<span class="cmt"># thumb_media_url   — 封面图 URL，自动上传到永久素材库（≤10MB, bmp/png/jpg/gif）</span>
<span class="cmt"># thumb_media_id    — 已有的永久素材 media_id（与上一个二选一）</span>
<span class="cmt"># content_image_urls — 文内图片 [{original_url}], 自动上传到微信 CDN 并替换</span>
<span class="cmt">#                     content 中的链接（≤1MB, 仅 jpg/png）</span>
<span class="cmt"># need_open_comment — 打开评论: 0=关 1=开（默认 0）</span>
<span class="cmt"># only_fans_can_comment — 评论仅粉丝: 0=否 1=是（默认 0）</span>
<span class="cmt"># 官方文档: https://developers.weixin.qq.com/doc/service/api/draftbox/draftmanage/api_draft_add</span>

<span class="cmt"># 响应示例</span>
{
  "<span class="key">ok</span>": true,
  "<span class="key">media_id</span>": "<span class="str">abc123def456</span>",
  "<span class="key">message</span>": "<span class="str">已同步 1 篇文章到公众号草稿箱</span>"
}</div>
<div class="status-bar"><span class="status-chip s200">200 OK</span><span class="status-chip s400">400</span><span class="status-chip s401">401</span><span class="status-chip s500">500 微信错误</span></div></div>

<div class="endpoint">
  <h3><span class="method post">POST</span><span class="path">/api/update</span></h3>
  <p class="desc">接收抓取结果并存入 KV（由 GitHub Action 自动调用）。需要口令。</p>
</div>

<footer>
  管理：<a href="/feed">UAPI</a>
  · 数据来源：<a href="https://github.com/cheungray123/rss-robot" target="_blank">UAPI</a>
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
