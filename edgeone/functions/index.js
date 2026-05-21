// 首页 — 登录后展示 API 文档（UI 从 _api-spec.js 自动生成）
import { site, auth, endpoints, wechatFlow } from '../_api-spec.js';

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/MP_verify_') && url.pathname.endsWith('.txt')) {
    const code = url.pathname.replace('/MP_verify_', '').replace('.txt', '');
    return new Response(code, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  let authed = false;
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookieMatch = cookieHeader.match(/site_token=([^;]+)/);
  const token = url.searchParams.get('token') || (cookieMatch ? cookieMatch[1] : '');
  if (typeof RSS_KV !== 'undefined') {
    const password = await RSS_KV.get('site_password');
    if (!password || token === password) authed = true;
  } else { authed = true; }

  if (!authed) {
    return new Response(LOGIN_HTML, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const html = buildDocsHtml(endpoints);
  return new Response(html, {
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
<title>UAPI</title>
<style>
  :root { --bg: #0a0f0f; --card: #0f1a1a; --border: #1a3a2a; --text: #c9d1d9; --muted: #5a7a5a; --accent: #3fb950; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:var(--bg); color:var(--text); font-family:'JetBrains Mono','Fira Code','SF Mono',Consolas,monospace; min-height:100vh; display:flex; align-items:center; justify-content:center; }
  .box { background:var(--card); border:1px solid var(--border); border-radius:4px; padding:36px; width:100%; max-width:360px; text-align:center; }
  .box h1 { font-size:18px; color:var(--accent); font-weight:400; margin-bottom:6px; }
  .box p { color:var(--muted); font-size:12px; margin-bottom:20px; }
  .box input { width:100%; padding:10px 12px; background:#050a0a; border:1px solid var(--border); border-radius:4px; color:#fff; font-size:14px; font-family:inherit; outline:none; }
  .box input:focus { border-color:var(--accent); }
  .box button { width:100%; margin-top:12px; padding:10px; background:var(--accent); color:#000; border:none; border-radius:4px; font-size:14px; font-family:inherit; cursor:pointer; font-weight:600; }
  .box button:hover { background:#2ea043; color:#fff; }
  .err { color:var(--red); font-size:12px; margin-top:10px; display:none; }
</style>
</head>
<body>
<div class="box">
  <h1>[UAPI] 身份验证</h1>
  <p>请输入访问口令</p>
  <input type="password" id="pwd" placeholder="口令" autofocus>
  <button onclick="login()">进入系统</button>
  <div class="err" id="err">口令错误</div>
</div>
<script>
async function login(){const t=document.getElementById('pwd').value;if(!t)return;try{const r=await fetch('/api/auth?token='+encodeURIComponent(t));if(r.ok){document.cookie='site_token='+t+';path=/;max-age=2592000;SameSite=Lax';location.href='/?token='+encodeURIComponent(t)}else{document.getElementById('err').style.display='block'}}catch{document.getElementById('err').style.display='block'}}
document.getElementById('pwd').addEventListener('keydown',e=>{if(e.key==='Enter')login()});
</script>
</body>
</html>`;
function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function buildDocsHtml(endpoints) {
  const tags = [...new Set(endpoints.map(e => e.tag))];
  const tagNames = { articles: '文章数据', feeds: '订阅源管理', links: '友链管理', tools: '工具接口', wechat: '微信集成', system: '系统' };

  // Tag nav
  let tagNav = '';
  for (const t of tags) {
    tagNav += `<button onclick="scrollToTag('${t}')">[${tagNames[t] || t}]</button>`;
  }

  // Build tag sections
  let tagSections = '';
  for (const t of tags) {
    const eps = endpoints.filter(e => e.tag === t);
    tagSections += `<div class="tag-section" id="tag-${t}"><h2>${tagNames[t] || t}</h2>`;
    for (const ep of eps) {
      const methodCls = ep.method === 'GET' ? 'get' : ep.method === 'POST' ? 'post' : 'delete';
      const authBadge = ep.auth ? '<span class="lock">🔒</span>' : '<span class="open">🌐</span>';
      let paramRows = '';
      if (ep.params) { for (const p of ep.params) { paramRows += `<tr><td class="pn">${p.name}</td><td class="pt">${p.type}</td><td class="pd">${p.desc}</td></tr>`; } }
      const paramTable = paramRows ? `<h4>▸ 参数</h4><table>${paramRows}</table>` : '';
      let bodyRows = '';
      if (ep.body) { for (const [k, v] of Object.entries(ep.body)) { bodyRows += `<tr><td class="pn">${k}</td><td class="pt">${v.type}${v.req ? ' <b style="color:#f85149">*</b>' : ''}</td><td class="pd">${v.desc}</td></tr>`; } }
      const bodyTable = bodyRows ? `<h4>▸ 请求体</h4><table>${bodyRows}</table>` : '';
      const respBlock = ep.response ? `<h4>▸ 响应</h4><pre>${escHtml(ep.response)}</pre>` : '';
      const noteBlock = ep.note ? `<div class="note">${ep.note}</div>` : '';
      const errBlock = ep.errors ? `<div class="errors">${ep.errors.map(c => `<span class="ec ec${c}">${c}</span>`).join('')}</div>` : '';
      const curlBlock = ep.curl ? `<h4>▸ curl</h4><pre class="curl">${escHtml(ep.curl)}</pre>` : '';
      tagSections += `
    <div class="ep-card">
      <div class="ep-bar" onclick="this.parentElement.classList.toggle('open')">
        <span class="ep-arrow">▸</span>
        <span class="method ${methodCls}">${ep.method}</span>
        <span class="ep-path">${ep.path}</span>
        ${authBadge}
        <span class="ep-summary">${ep.summary}</span>
      </div>
      <div class="ep-detail">${paramTable}${bodyTable}${respBlock}${noteBlock}${errBlock}${curlBlock}</div>
    </div>`;
    }
    tagSections += '</div>';
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${site.name} API</title>
<style>
  :root { --bg: #0a0f0f; --card: #0f1a1a; --border: #1a3a2a; --text: #c9d1d9; --muted: #5a7a5a; --accent: #3fb950; --green: #3fb950; --red: #f85149; --yellow: #d2991d; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:var(--bg); color:var(--text); font-family:'JetBrains Mono','Fira Code','SF Mono',Consolas,monospace; min-height:100vh; padding:20px; }
  .container { max-width:860px; margin:0 auto; }
  header { padding:32px 0 20px; border-bottom:1px solid var(--border); margin-bottom:24px; }
  header h1 { font-size:22px; color:var(--accent); font-weight:400; }
  header h1 .dim { color:var(--muted); }
  header .meta { color:var(--muted); font-size:12px; margin-top:6px; display:flex; gap:20px; flex-wrap:wrap; }
  header .meta span { color:var(--accent); }
  .tag-nav { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:28px; }
  .tag-nav button { background:var(--card); color:var(--accent); border:1px solid var(--border); padding:6px 14px; font-size:12px; font-family:inherit; cursor:pointer; border-radius:4px; transition:all .15s; }
  .tag-nav button:hover { background:#1a2a1a; border-color:var(--accent); }
  .stats { display:flex; gap:12px; margin-bottom:28px; }
  .stat { background:var(--card); border:1px solid var(--border); border-radius:4px; padding:10px 18px; }
  .stat .num { font-size:20px; color:var(--accent); }
  .stat .label { font-size:11px; color:var(--muted); }
  .tag-section { margin-bottom:32px; }
  .tag-section h2 { font-size:15px; color:var(--accent); font-weight:400; margin-bottom:14px; }
  .ep-card { background:var(--card); border:1px solid var(--border); border-radius:4px; margin-bottom:10px; overflow:hidden; }
  .ep-bar { display:flex; align-items:center; gap:10px; padding:12px 16px; cursor:pointer; font-size:13px; }
  .ep-bar:hover { background:#142424; }
  .ep-arrow { color:var(--muted); font-size:10px; transition:transform .2s; }
  .ep-card.open .ep-arrow { transform:rotate(90deg); }
  .method { font-size:10px; font-weight:700; padding:2px 8px; border-radius:3px; text-transform:uppercase; letter-spacing:.5px; }
  .method.get { background:#1a3a1a; color:var(--green); }
  .method.post { background:#1a2a3a; color:#58a6ff; }
  .method.delete { background:#3a1a1a; color:var(--red); }
  .ep-path { color:#e6edf3; font-weight:600; font-size:13px; }
  .ep-summary { color:var(--muted); font-size:12px; margin-left:auto; text-align:right; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:280px; }
  .lock { font-size:11px; }
  .open { font-size:11px; }
  .ep-detail { display:none; padding:0 20px 18px; border-top:1px solid var(--border); font-size:13px; }
  .ep-card.open .ep-detail { display:block; }
  .ep-detail h4 { color:var(--accent); font-size:12px; font-weight:400; margin:14px 0 6px; }
  .ep-detail table { width:100%; border-collapse:collapse; font-size:12px; }
  .ep-detail th { background:#142424; color:var(--muted); font-weight:600; padding:6px 10px; text-align:left; font-size:10px; text-transform:uppercase; }
  .ep-detail td { padding:6px 10px; border-bottom:1px solid var(--border); }
  .ep-detail .pn { color:var(--accent); font-family:inherit; white-space:nowrap; }
  .ep-detail .pt { color:var(--green); font-size:11px; }
  .ep-detail .pd { color:var(--muted); }
  .ep-detail pre { background:#050a0a; color:#a5d6ff; padding:12px 14px; border-radius:4px; font-size:11px; line-height:1.6; overflow-x:auto; margin-top:6px; white-space:pre; }
  .ep-detail pre.curl { color:var(--text); }
  .note { background:#1a2a1a; border-left:2px solid var(--accent); padding:8px 12px; border-radius:0 4px 4px 0; margin-top:10px; font-size:12px; color:var(--muted); line-height:1.6; }
  .errors { display:flex; gap:6px; margin-top:10px; }
  .ec { font-size:10px; padding:2px 6px; border-radius:3px; }
  .ec200 { background:#1a3a1a; color:var(--green); }
  .ec400 { background:#3a2a1a; color:var(--yellow); }
  .ec401,.ec409,.ec500,.ec502 { background:#3a1a1a; color:var(--red); }
  footer { text-align:center; padding:24px 0; color:var(--muted); font-size:12px; border-top:1px solid var(--border); margin-top:20px; }
  footer a { color:var(--accent); text-decoration:none; }
  @media (max-width:600px) { .ep-summary { display:none; } .ep-bar { flex-wrap:wrap; } }
</style>
</head>
<body>
<div class="container">
<header>
  <h1>[<span class="dim">${site.name}</span>] ${site.baseUrl}</h1>
  <div class="meta"><span>[STATUS OK]</span> ${site.description} · 接口数 ${endpoints.length} · <a href="/feed" style="color:var(--accent)">管理后台</a></div>
</header>

<div class="tag-nav">${tagNav}</div>

<div class="stats">
  <div class="stat"><div class="num" id="feedCount">-</div><div class="label">订阅源</div></div>
  <div class="stat"><div class="num" id="articleCount">-</div><div class="label">最新文章</div></div>
</div>

${tagSections}

<footer>
  [<a href="/feed">管理</a>] · [<a href="https://github.com/zqlit/rss-robot" target="_blank">github</a>] · [<a href="/api/docs?code=口令">API 文档 JSON</a>]
</footer>
</div>
<script>
function scrollToTag(t){const e=document.getElementById('tag-'+t);e&&e.scrollIntoView({behavior:'smooth',block:'start'})}
fetch('/api/results').then(r=>r.json()).then(d=>{if(d.feeds){document.getElementById('feedCount').textContent=d.feeds.length;let t=0;d.feeds.forEach(f=>t+=(f.articles||[]).length);document.getElementById('articleCount').textContent=t}}).catch(()=>{});
</script>
</body>
</html>`;
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
