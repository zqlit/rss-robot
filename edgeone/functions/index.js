// 首页 — API 文档（与 _api-spec.js/api/docs.js 数据同源，手动同步）
// 新增接口时同步更新 _api-spec.js、api/docs.js 和此文件的 endpoints 数组

const site = { name: 'UAPI', baseUrl: 'https://api.usj.cc', description: 'RSS 订阅聚合 · 友链管理 · 微信公众号同步 · 代理抓取' };

const endpoints = [
  {tag:'articles',method:'GET',path:'/api/results',auth:false,summary:'获取所有博客最新文章',params:[{name:'feed',type:'string',desc:'按博客名称筛选'},{name:'limit',type:'number',desc:'每博客最多返回篇数'}],response:"{\n  \"feeds\": [{\n    \"name\": \"吾柯\",\n    \"siteUrl\": \"https://blog.keepke.com\",\n    \"favicon\": \"https://api.usj.cc/api/favicon?url=...\",\n    \"articles\": [{ \"title\": \"...\", \"link\": \"...\", \"pubDate\": \"...\", \"author\": \"...\" }]\n  }]\n}",curl:"curl \"https://api.usj.cc/api/results?feed=吾柯&limit=5\""},
  {tag:'articles',method:'GET',path:'/api/articles',auth:false,summary:'按时间排序的所有文章（跨博客混合）',params:[{name:'limit',type:'number',desc:'返回数量，默认 50'}],response:"{\n  \"total\": 380,\n  \"articles\": [\n    { \"title\": \"...\", \"link\": \"...\", \"pubDate\": \"...\", \"feedName\": \"吾柯\", \"siteUrl\": \"...\", \"favicon\": \"...\", \"author\": \"...\" }\n  ]\n}",curl:"curl \"https://api.usj.cc/api/articles?limit=100\""},
  {tag:'feeds',method:'GET',path:'/api/feeds',auth:false,summary:'列出所有订阅源',response:"{\n  \"feeds\": [\n    { \"url\": \"https://blog.keepke.com\", \"feedTitle\": \"吾柯\" },\n    { \"url\": \"https://example.com\", \"feedTitle\": \"示例\", \"format\": \"json\", \"path\": \"data.list\", \"proxy\": true }\n  ]\n}",curl:"curl https://api.usj.cc/api/feeds"},
  {tag:'feeds',method:'POST',path:'/api/feeds',auth:true,summary:'新增/编辑订阅源（支持批量）',body:{'url':{type:'string',req:true,desc:'订阅源 URL'},'feedTitle':{type:'string',desc:'博客名称'},'format':{type:'string',desc:'xml / json / 留空自动'},'path':{type:'string',desc:'JSON 数据路径，如 data.list'},'proxy':{type:'boolean',desc:'强制代理抓取'},'oldUrl':{type:'string',desc:'编辑时传原 URL，实现改链'}},note:"单条 { url, ... }，批量 { feeds: [{ url, ... }] }。URL 重复返回 409。",errors:[400,401,409,500],curl:"curl -X POST \"https://api.usj.cc/api/feeds?token=xxx\" -H \"Content-Type: application/json\" -d '{\"url\":\"https://example.com\",\"feedTitle\":\"示例\"}'\n# 编辑（oldUrl=原URL，改链不丢数据）\ncurl -X POST \"https://api.usj.cc/api/feeds?token=xxx\" -H \"Content-Type: application/json\" -d '{\"url\":\"https://new.com\",\"oldUrl\":\"https://old.com\"}'"},
  {tag:'feeds',method:'DELETE',path:'/api/feeds',auth:true,summary:'删除订阅源',params:[{name:'url',type:'string',desc:'要删除的 URL'}],errors:[200,401],curl:"curl -X DELETE \"https://api.usj.cc/api/feeds?url=https://example.com&token=xxx\""},
  {tag:'links',method:'GET',path:'/api/links',auth:false,summary:'列出所有友链（默认过滤隐藏）',params:[{name:'all',type:'string',desc:'传 1 显示全部（含隐藏项）'}],response:"{\n  \"links\": [{\n    \"name\": \"吾柯\", \"url\": \"https://blog.keepke.com\",\n    \"image\": \"https://api.usj.cc/api/favicon?url=...\",\n    \"description\": \"保持思考与理性\", \"rss\": \"\", \"hidden\": false,\n    \"addedAt\": \"2026-01-01T00:00:00.000Z\"\n  }]\n}",curl:"curl \"https://api.usj.cc/api/links?all=1\""},
  {tag:'links',method:'POST',path:'/api/links',auth:true,summary:'新增/编辑友链（支持批量）',body:{'name':{type:'string',desc:'站点名称'},'url':{type:'string',req:true,desc:'站点 URL'},'image':{type:'string',desc:'头像 URL，留空自动获取 favicon'},'description':{type:'string',desc:'站点描述'},'rss':{type:'string',desc:'RSS 订阅地址'},'hidden':{type:'boolean',desc:'是否隐藏'},'oldUrl':{type:'string',desc:'编辑时传原 URL'}},note:"单条 { url, ... }，批量 { links: [{ url, ... }] }。URL 重复返回 409。",errors:[400,401,409,500],curl:"curl -X POST \"https://api.usj.cc/api/links?token=xxx\" -H \"Content-Type: application/json\" -d '{\"name\":\"示例\",\"url\":\"https://example.com\",\"description\":\"一个很棒的博客\"}'"},
  {tag:'links',method:'DELETE',path:'/api/links',auth:true,summary:'删除友链',params:[{name:'url',type:'string',desc:'要删除的 URL'}],errors:[200,401],curl:"curl -X DELETE \"https://api.usj.cc/api/links?url=https://example.com&token=xxx\""},
  {tag:'tools',method:'GET',path:'/api/favicon',auth:false,summary:'获取站点 favicon 图片',params:[{name:'url',type:'string',desc:'目标站点域名或 URL'},{name:'meta',type:'string',desc:'传 1 返回 favicon URL 而非图片'}],note:"可直接用作 <img src>。自动发现 link[rel=icon]，回退 /favicon.ico。",curl:"curl \"https://api.usj.cc/api/favicon?url=blog.keepke.com\""},
  {tag:'tools',method:'GET',path:'/api/health',auth:false,summary:'检测站点存活状态（HEAD 请求）',params:[{name:'url',type:'string',desc:'传单个 URL；不传检测全部订阅源'}],response:"{\n  \"total\": 52, \"alive\": 49, \"dead\": 3,\n  \"results\": [\n    { \"url\": \"https://blog.keepke.com\", \"status\": 200, \"ok\": true, \"latency\": 234 },\n    { \"url\": \"https://dead.com\", \"status\": 0, \"ok\": false, \"error\": \"timeout\" }\n  ]\n}",curl:"curl \"https://api.usj.cc/api/health?url=blog.keepke.com\""},
  {tag:'tools',method:'POST',path:'/api/proxy',auth:true,summary:'RSS 抓取代理',body:{'url':{type:'string',req:true,desc:'目标抓取 URL'},'timeout':{type:'number',desc:'超时毫秒，默认 15000'}},response:"{ \"ok\": true, \"status\": 200, \"contentType\": \"application/rss+xml\", \"body\": \"<?xml version=1.0...\" }",note:"EdgeOne 节点 api.usj.cc/api/proxy（需口令）。SCF 国内节点 scfapi.usj.cc（无需口令，同接口）。SCF 部署在腾讯云成都区。",errors:[200,400,401,502],curl:"# EdgeOne 代理（需口令）\ncurl -X POST \"https://api.usj.cc/api/proxy?token=xxx\" -H \"Content-Type: application/json\" -d '{\"url\":\"https://example.com/feed\",\"timeout\":15000}'\n# 腾讯云 SCF 代理（无需口令）\ncurl -X POST https://scfapi.usj.cc/ -H \"Content-Type: application/json\" -d '{\"url\":\"https://example.com/feed\",\"timeout\":15000}'"},
  {tag:'tools',method:'POST',path:'/api/update',auth:true,summary:'接收抓取结果写入 KV（GitHub Action 自动调用）',note:"由 check-feeds.js 每小时调用，外部无需关心。"},
  {tag:'wechat',method:'GET',path:'/api/wechat-material',auth:false,summary:'查看微信凭证配置状态',response:"{ \"configured\": true, \"appId\": \"wx1234567890\", \"hasSecret\": true }",curl:"curl https://api.usj.cc/api/wechat-material"},
  {tag:'wechat',method:'POST',path:'/api/wechat-material',auth:true,summary:'同步文章到公众号草稿箱（draft/add）',body:{'appId':{type:'string',desc:'公众号 AppID，首次传入后自动保存 KV'},'appSecret':{type:'string',desc:'公众号 AppSecret'},'articles[].title':{type:'string',req:true,desc:'标题，最长 32 字'},'articles[].content':{type:'string',req:true,desc:'HTML 正文，最长 20000 字'},'articles[].thumb_media_url':{type:'string',desc:'封面图 URL，自动上传'},'articles[].thumb_media_id':{type:'string',desc:'已有永久素材 media_id'},'articles[].author':{type:'string',desc:'作者，最长 16 字'},'articles[].digest':{type:'string',desc:'摘要，最长 128 字'},'articles[].content_source_url':{type:'string',desc:'原文链接'},'articles[].show_cover_pic':{type:'number',desc:'封面显示：0=否 1=是，默认 1'},'articles[].content_image_urls':{type:'array',desc:'[{original_url}] 文内图片，自动上传 CDN'},'articles[].need_open_comment':{type:'number',desc:'评论：0=关 1=开'},'articles[].only_fans_can_comment':{type:'number',desc:'仅粉丝评论：0=否 1=是'}},response:"{ \"ok\": true, \"media_id\": \"abc123def456\", \"message\": \"已同步 1 篇文章到公众号草稿箱\" }",note:"内部调用链：/cgi-bin/token → material/add_material(封面) → media/uploadimg(文内图) → draft/add(创建草稿)。access_token 自动缓存 2h。",errors:[200,400,401,500],curl:"curl -X POST \"https://api.usj.cc/api/wechat-material?token=xxx\" -H \"Content-Type: application/json\" -d '{\"articles\":[{\"title\":\"标题\",\"thumb_media_url\":\"https://...\",\"content\":\"<p>正文</p>\",\"content_source_url\":\"https://...\"}]}'"},
  {tag:'system',method:'GET',path:'/api/artalk/commenter',auth:true,summary:'代理 Artalk 查询用户最新评论',params:[{name:'email','type':'string',desc:'用户邮箱'}],note:'内部 Artalk admin 存在 KV。POST {name,email,password,site_name,api_url} 配置。',curl:'curl "https://api.usj.cc/api/artalk/commenter?email=user@example.com&token=xxx"'},{tag:'system',method:'GET',path:'/api/ai/greeting',auth:true,summary:'随机返回问候语（预生成词库+时段/节日匹配）',params:[{name:'count','type':'number',desc:'生成几条，默认 10，最大 50'}],note:'词库预存 KV+DeepSeek Flash 动态扩充。覆盖 7 时段+14 节日+节气。POST {action:\\"generate\\"} 调 AI 生成，{action:\\"config\\"} 存 Key。',curl:'curl "https://api.usj.cc/api/ai/greeting?count=5&token=xxx"'},{tag:'system',method:'GET',path:'/api/random-image',auth:false,summary:'随机返回文件夹中的图片',params:[{name:'folder','type':'string',desc:'文件夹名，默认 jiege'},{name:'meta','type':'string',desc:'传 1 返回 JSON'},{name:'list','type':'string',desc:'传 1 列出文件夹'}],note:'图片存 GitHub+jsDelivr CDN。302 重定向。POST 需口令传 {urls:[...]}',curl:'curl -L "https://api.usj.cc/api/random-image?folder=jiege"'},{tag:'system',method:'GET',path:'/api/auth',auth:false,summary:'GET 验证口令 / POST 修改口令',note:"POST 需 { oldPassword, newPassword }，新口令留空清除保护。"},
  {tag:'system',method:'GET',path:'/api/docs',auth:true,summary:'API 文档 JSON（本接口）',params:[{name:'code',type:'string',desc:'站点口令'}],note:"给 AI/LLM 参考的 API 完整文档。",curl:"curl \"https://api.usj.cc/api/docs?code=口令\""},
];


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

  let tagNav = '';
  for (const t of tags) tagNav += `<button onclick="scrollToTag('${t}')">[${tagNames[t] || t}]</button>`;

  let tagSections = '';
  for (const t of tags) {
    const eps = endpoints.filter(e => e.tag === t);
    tagSections += `<div class="tag-section" id="tag-${t}"><h2>${tagNames[t] || t}</h2>`;
    for (const ep of eps) {
      const m = ep.method === 'GET' ? 'get' : ep.method === 'POST' ? 'post' : 'delete';
      const badge = ep.auth ? '<span class="lock">🔒</span>' : '<span class="open">🌐</span>';
      let pr = ''; if (ep.params) for (const p of ep.params) pr += `<tr><td class="pn">${p.name}</td><td class="pt">${p.type}</td><td class="pd">${p.desc}</td></tr>`;
      const pt = pr ? `<h4>▸ 参数</h4><table>${pr}</table>` : '';
      let br = ''; if (ep.body) for (const [k,v] of Object.entries(ep.body)) br += `<tr><td class="pn">${k}</td><td class="pt">${v.type}${v.req?' <b style="color:#f85149">*</b>':''}</td><td class="pd">${v.desc}</td></tr>`;
      const bt = br ? `<h4>▸ 请求体</h4><table>${br}</table>` : '';
      const rb = ep.response ? `<h4>▸ 响应</h4><pre>${escHtml(ep.response)}</pre>` : '';
      const nb = ep.note ? `<div class="note">${ep.note}</div>` : '';
      const eb = ep.errors ? `<div class="errors">${ep.errors.map(c=>'<span class="ec ec'+c+'">'+c+'</span>').join('')}</div>` : '';
      const cb = ep.curl ? `<h4>▸ curl</h4><pre class="curl">${escHtml(ep.curl)}</pre>` : '';
      tagSections += `
    <div class="ep-card">
      <div class="ep-bar" onclick="this.parentElement.classList.toggle('open')">
        <span class="ep-arrow">▸</span>
        <span class="method ${m}">${ep.method}</span>
        <span class="ep-path">${ep.path}</span>
        ${badge}
        <span class="ep-summary">${ep.summary}</span>
      </div>
      <div class="ep-detail">${pt}${bt}${rb}${nb}${eb}${cb}</div>
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
<footer>[<a href="/feed">管理</a>] · [<a href="https://github.com/zqlit/rss-robot" target="_blank">github</a>] · [<a href="/api/docs?code=口令">API 文档 JSON</a>]</footer>
</div>
<script>
function scrollToTag(t){const e=document.getElementById('tag-'+t);e&&e.scrollIntoView({behavior:'smooth',block:'start'})}
fetch('/api/results').then(r=>r.json()).then(d=>{if(d.feeds){document.getElementById('feedCount').textContent=d.feeds.length;let t=0;d.feeds.forEach(f=>t+=(f.articles||[]).length);document.getElementById('articleCount').textContent=t}}).catch(()=>{});
</script>
</body>
</html>`;
}
