// /feed — 订阅源在线管理页面
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // 检查是否已登录
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

  return new Response(MANAGE_HTML, {
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
<title>登录 · 互联中心</title>
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
  <h1>互联中心</h1>
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
      location.href = '/feed?token=' + encodeURIComponent(pwd);
    } else {
      document.getElementById('err').style.display = 'block';
    }
  } catch {
    document.getElementById('err').style.display = 'block';
  }
}
document.getElementById('pwd').addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
</script>
</body>
</html>`;

const MANAGE_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>互联中心 · RSS Robot</title>
<style>
  :root { --bg: #0d1117; --card: #161b22; --border: #30363d; --text: #c9d1d9; --muted: #8b949e; --accent: #58a6ff; --green: #3fb950; --red: #f85149; --yellow: #d2991d; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-height: 100vh; padding: 40px 20px; }
  .container { max-width: 960px; margin: 0 auto; }
  header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; flex-wrap: wrap; gap: 16px; }
  header h1 { font-size: 24px; color: #fff; }
  header .actions { display: flex; gap: 10px; flex-wrap: wrap; }
  .btn { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; display: inline-flex; align-items: center; gap: 6px; }
  .btn-primary { background: #238636; color: #fff; }
  .btn-primary:hover { background: #2ea043; }
  .btn-secondary { background: var(--card); color: var(--text); border: 1px solid var(--border); }
  .btn-secondary:hover { background: #1c2333; }
  .btn-danger { background: var(--card); color: var(--red); border: 1px solid var(--red); }
  .btn-danger:hover { background: #49020233; }
  .stats { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
  .stat { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 10px 20px; }
  .stat .num { font-size: 20px; font-weight: 700; color: #fff; }
  .stat .label { font-size: 11px; color: var(--muted); }
  .stat.alive .num { color: var(--green); }
  .stat.dead .num { color: var(--red); }
  table { width: 100%; border-collapse: collapse; background: var(--card); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
  th, td { padding: 12px 16px; text-align: left; font-size: 13px; }
  th { background: #1c2333; color: var(--muted); font-weight: 600; font-size: 12px; text-transform: uppercase; }
  td { border-top: 1px solid var(--border); }
  td.url { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; color: var(--accent); word-break: break-all; }
  td.title { color: #fff; font-weight: 500; display: flex; align-items: center; }
  td.actions { white-space: nowrap; }
  td.actions button { padding: 4px 10px; font-size: 12px; margin-right: 6px; }
  .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; flex-shrink: 0; }
  .status-dot.alive { background: var(--green); box-shadow: 0 0 6px var(--green); }
  .status-dot.dead { background: var(--red); }
  .status-dot.checking { background: var(--yellow); animation: pulse 0.8s ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
  .latency { font-size: 11px; color: var(--muted); margin-left: 6px; }
  .modal-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 100; align-items: center; justify-content: center; }
  .modal-overlay.active { display: flex; }
  .modal { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 32px; width: 100%; max-width: 480px; }
  .modal h2 { font-size: 18px; color: #fff; margin-bottom: 20px; }
  .modal label { display: block; font-size: 13px; color: var(--muted); margin-bottom: 4px; margin-top: 12px; }
  .modal input, .modal select { width: 100%; padding: 9px 12px; background: #0d1117; border: 1px solid var(--border); border-radius: 6px; color: #fff; font-size: 14px; outline: none; }
  .modal input:focus { border-color: var(--accent); }
  .modal .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 24px; }
  .toast { position: fixed; bottom: 24px; right: 24px; background: #238636; color: #fff; padding: 10px 20px; border-radius: 8px; font-size: 13px; z-index: 200; display: none; animation: fadeIn 0.2s ease; }
  .toast.error { background: #da3633; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .empty { text-align: center; padding: 60px 20px; color: var(--muted); }
  .empty h3 { font-size: 16px; color: #fff; margin-bottom: 8px; }
  .tab { display: inline-flex; gap: 2px; background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 4px; margin-bottom: 24px; }
  .tab button { padding: 6px 16px; border: none; background: none; color: var(--muted); border-radius: 6px; cursor: pointer; font-size: 13px; }
  .tab button.active { background: #1f6feb; color: #fff; }
  .feed-url-bar { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 10px 16px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; font-size: 13px; }
  .feed-url-bar code { font-family: 'SF Mono', 'Fira Code', monospace; color: var(--accent); font-size: 12px; }
  .link-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; background: var(--border); }
  .link-name { color: #fff; font-weight: 500; display: flex; align-items: center; gap: 10px; }
</style>
</head>
<body>
<div class="container">
<header>
  <h1>互联中心</h1>
  <div class="actions">
    <a href="/" class="btn btn-secondary" target="_blank">API 文档</a>
    <button class="btn btn-secondary" onclick="checkHealth()" id="healthBtn">检测存活</button>
    <button class="btn btn-primary" onclick="openAddModal()">+ 添加订阅源</button>
  </div>
</header>

<div class="feed-url-bar">
  <span style="color:var(--muted)">订阅地址</span>
  <code id="feedUrlText">https://rssapi.usj.cc/api/feeds</code>
  <button class="btn btn-secondary" style="padding:4px 10px;font-size:11px" onclick="copyFeedUrl()">复制</button>
</div>

<div class="stats">
  <div class="stat"><div class="num" id="feedCount">0</div><div class="label">订阅源</div></div>
  <div class="stat"><div class="num" id="linkCount">0</div><div class="label">友链</div></div>
  <div class="stat alive" id="aliveStat" style="display:none"><div class="num" id="aliveCount">0</div><div class="label">存活</div></div>
  <div class="stat dead" id="deadStat" style="display:none"><div class="num" id="deadCount">0</div><div class="label">异常</div></div>
</div>

<div class="tab">
  <button class="active" onclick="showTab('feeds')">订阅源</button>
  <button onclick="showTab('links')">友链</button>
  <button onclick="showTab('password')">访问口令</button>
</div>

<div id="tab-feeds">
  <table><thead><tr><th style="width:220px">博客名称</th><th>URL</th><th style="width:100px">操作</th></tr></thead><tbody id="feedTableBody"></tbody></table>
  <div class="empty" id="emptyMsg" style="display:none"><h3>暂无订阅源</h3><p>点击上方按钮添加第一个</p></div>
</div>

<div id="tab-links" style="display:none">
  <div style="margin-bottom:16px">
    <button class="btn btn-primary" onclick="openLinkModal()">+ 添加友链</button>
  </div>
  <table><thead><tr><th style="width:50px"></th><th style="width:180px">站点名称</th><th>URL</th><th style="width:200px">描述</th><th style="width:100px">操作</th></tr></thead><tbody id="linkTableBody"></tbody></table>
  <div class="empty" id="linkEmpty" style="display:none"><h3>暂无友链</h3><p>点击上方按钮添加</p></div>
</div>

<div id="tab-password" style="display:none">
  <div class="modal" style="max-width:400px; margin:0 auto; position:static; border-radius:8px;">
    <h2>修改访问口令</h2>
    <label>当前口令</label>
    <input type="password" id="oldPwd" placeholder="当前口令">
    <label>新口令（留空则清除保护）</label>
    <input type="password" id="newPwd" placeholder="新口令">
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="document.getElementById('oldPwd').value='';document.getElementById('newPwd').value='';">取消</button>
      <button class="btn btn-primary" onclick="changePassword()">保存</button>
    </div>
  </div>
</div>
</div>

<!-- 添加/编辑弹窗 -->
<div class="modal-overlay" id="feedModal">
  <div class="modal">
    <h2 id="modalTitle">添加订阅源</h2>
    <label>博客 URL</label>
    <input type="text" id="feedUrl" placeholder="https://example.com">
    <label>博客名称</label>
    <input type="text" id="feedTitle" placeholder="示例博客">
    <label>抓取格式</label>
    <select id="feedFormat">
      <option value="">自动检测 (auto)</option>
      <option value="xml">RSS/XML</option>
      <option value="json">JSON Feed</option>
    </select>
    <label>JSON 数据路径（format=json 时填写）</label>
    <input type="text" id="feedPath" placeholder="例如 data.list">
    <label>强制使用代理</label>
    <select id="feedProxy">
      <option value="">否</option>
      <option value="true">是</option>
    </select>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" id="saveBtn" onclick="saveFeed()">保存</button>
      <button class="btn btn-danger" id="deleteBtn" style="display:none" onclick="deleteFeed()">删除</button>
    </div>
  </div>
</div>

<!-- 友链弹窗 -->
<div class="modal-overlay" id="linkModal">
  <div class="modal">
    <h2 id="linkModalTitle">添加友链</h2>
    <label>站点名称</label>
    <input type="text" id="linkName" placeholder="示例博客">
    <label>站点 URL</label>
    <input type="text" id="linkUrl" placeholder="https://example.com">
    <label>头像图片 URL（留空自动获取 favicon）</label>
    <input type="text" id="linkImage" placeholder="自动获取">
    <label>描述</label>
    <input type="text" id="linkDesc" placeholder="一个很棒的博客">
    <label>RSS 订阅地址（选填）</label>
    <input type="text" id="linkRss" placeholder="https://example.com/feed">
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeLinkModal()">取消</button>
      <button class="btn btn-primary" id="linkSaveBtn" onclick="saveLink()">保存</button>
      <button class="btn btn-danger" id="linkDeleteBtn" style="display:none" onclick="deleteLink()">删除</button>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
let token = '';
const cMatch = document.cookie.match(/site_token=([^;]+)/);
if (cMatch) token = cMatch[1];
if (!token) { location.href = '/feed'; }

let feeds = [];
let editingUrl = null;

function showToast(msg, isError) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' error' : '');
  t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 2500);
}

function copyFeedUrl() {
  navigator.clipboard.writeText('https://rssapi.usj.cc/api/feeds').then(() => showToast('已复制订阅地址'));
}

function showTab(name) {
  document.querySelectorAll('.tab button').forEach((b, i) => b.classList.toggle('active', (i === 0 && name === 'feeds') || (i === 1 && name === 'links') || (i === 2 && name === 'password')));
  document.getElementById('tab-feeds').style.display = name === 'feeds' ? '' : 'none';
  document.getElementById('tab-links').style.display = name === 'links' ? '' : 'none';
  document.getElementById('tab-password').style.display = name === 'password' ? '' : 'none';
}

function renderTable(healthMap) {
  const tbody = document.getElementById('feedTableBody');
  if (feeds.length === 0) {
    tbody.innerHTML = '';
    document.getElementById('emptyMsg').style.display = '';
    return;
  }
  document.getElementById('emptyMsg').style.display = 'none';
  tbody.innerHTML = feeds.map((f, i) => {
    const h = healthMap ? healthMap[f.url] : null;
    let dot = '';
    let latency = '';
    if (h) {
      if (h.ok) {
        dot = '<span class="status-dot alive" title="HTTP ' + h.status + '"></span>';
        latency = '<span class="latency">' + h.latency + 'ms</span>';
      } else {
        dot = '<span class="status-dot dead" title="' + (h.error || 'HTTP ' + h.status) + '"></span>';
      }
    }
    return '<tr>' +
      '<td class="title">' + dot + (f.feedTitle || '-') + latency + '</td>' +
      '<td class="url">' + f.url + '</td>' +
      '<td class="actions"><button class="btn btn-secondary" onclick="openEditModal(' + i + ')">编辑</button></td>' +
      '</tr>';
  }).join('');
}

async function loadFeeds() {
  try {
    const res = await fetch('/api/feeds?token=' + encodeURIComponent(token));
    if (res.status === 401) { location.href = '/feed'; return; }
    const data = await res.json();
    feeds = data.feeds || [];
    document.getElementById('feedCount').textContent = feeds.length;
    renderTable(null);
  } catch (err) {
    showToast('加载失败: ' + err.message, true);
  }
}

async function checkHealth() {
  const btn = document.getElementById('healthBtn');
  if (feeds.length === 0) { showToast('暂无订阅源', true); return; }
  btn.textContent = '检测中 0/' + feeds.length;
  btn.disabled = true;
  const healthMap = {};
  let done = 0;
  // 每批 5 个并发，逐批更新 UI
  for (let i = 0; i < feeds.length; i += 5) {
    const batch = feeds.slice(i, i + 5);
    await Promise.all(batch.map(async (f) => {
      try {
        const res = await fetch('/api/health?url=' + encodeURIComponent(f.url));
        healthMap[f.url] = await res.json();
      } catch {
        healthMap[f.url] = { ok: false, error: 'network error' };
      }
      done++;
      btn.textContent = '检测中 ' + done + '/' + feeds.length;
    }));
    renderTable(healthMap);
  }
  const alive = Object.values(healthMap).filter(r => r.ok).length;
  const dead = Object.values(healthMap).filter(r => !r.ok).length;
  document.getElementById('aliveStat').style.display = '';
  document.getElementById('deadStat').style.display = '';
  document.getElementById('aliveCount').textContent = alive;
  document.getElementById('deadCount').textContent = dead;
  btn.textContent = '检测存活';
  btn.disabled = false;
  showToast('存活 ' + alive + ' / 异常 ' + dead);
}

function openAddModal() {
  editingUrl = null;
  document.getElementById('modalTitle').textContent = '添加订阅源';
  document.getElementById('feedUrl').value = '';
  document.getElementById('feedTitle').value = '';
  document.getElementById('feedFormat').value = '';
  document.getElementById('feedPath').value = '';
  document.getElementById('feedProxy').value = '';
  document.getElementById('deleteBtn').style.display = 'none';
  document.getElementById('feedModal').classList.add('active');
}

function openEditModal(idx) {
  const f = feeds[idx];
  editingUrl = f.url;
  document.getElementById('modalTitle').textContent = '编辑订阅源';
  document.getElementById('feedUrl').value = f.url || '';
  document.getElementById('feedTitle').value = f.feedTitle || '';
  document.getElementById('feedFormat').value = f.format || '';
  document.getElementById('feedPath').value = f.path || '';
  document.getElementById('feedProxy').value = f.proxy ? 'true' : '';
  document.getElementById('deleteBtn').style.display = '';
  document.getElementById('feedModal').classList.add('active');
}

function closeModal() {
  document.getElementById('feedModal').classList.remove('active');
}

async function saveFeed() {
  const url = document.getElementById('feedUrl').value.trim();
  const feedTitle = document.getElementById('feedTitle').value.trim();
  if (!url) { showToast('URL 不能为空', true); return; }
  const body = { url };
  if (feedTitle) body.feedTitle = feedTitle;
  const format = document.getElementById('feedFormat').value;
  if (format) body.format = format;
  const path = document.getElementById('feedPath').value.trim();
  if (path) body.path = path;
  const proxy = document.getElementById('feedProxy').value;
  if (proxy) body.proxy = true;
  try {
    const res = await fetch('/api/feeds?token=' + encodeURIComponent(token), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    closeModal();
    showToast(editingUrl ? '已更新' : '已添加');
    loadFeeds();
  } catch (err) {
    showToast('保存失败: ' + err.message, true);
  }
}

async function deleteFeed() {
  if (!editingUrl || !confirm('确定删除 ' + editingUrl + ' ？')) return;
  try {
    const res = await fetch('/api/feeds?token=' + encodeURIComponent(token) + '&url=' + encodeURIComponent(editingUrl), { method: 'DELETE' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    closeModal();
    showToast('已删除');
    loadFeeds();
  } catch (err) {
    showToast('删除失败: ' + err.message, true);
  }
}

// ─── 友链管理 ───
let links = [];
let editingLinkUrl = null;

function renderLinkTable() {
  const tbody = document.getElementById('linkTableBody');
  if (links.length === 0) {
    tbody.innerHTML = '';
    document.getElementById('linkEmpty').style.display = '';
    return;
  }
  document.getElementById('linkEmpty').style.display = 'none';
  tbody.innerHTML = links.map((l, i) => {
    const img = l.image || ('https://rssapi.usj.cc/api/favicon?url=' + encodeURIComponent(l.url));
    return '<tr>' +
      '<td><img src="' + img + '" class="link-avatar" onerror="this.style.opacity=0"></td>' +
      '<td class="link-name">' + (l.name || '-') + '</td>' +
      '<td class="url">' + l.url + '</td>' +
      '<td style="font-size:12px;color:var(--muted)">' + (l.description || '') + '</td>' +
      '<td class="actions"><button class="btn btn-secondary" onclick="openEditLink(' + i + ')">编辑</button></td>' +
      '</tr>';
  }).join('');
}

async function loadLinks() {
  try {
    const res = await fetch('/api/links');
    const data = await res.json();
    links = data.links || [];
    document.getElementById('linkCount').textContent = links.length;
    renderLinkTable();
  } catch (err) {
    showToast('加载友链失败: ' + err.message, true);
  }
}

function openLinkModal() {
  editingLinkUrl = null;
  document.getElementById('linkModalTitle').textContent = '添加友链';
  document.getElementById('linkName').value = '';
  document.getElementById('linkUrl').value = '';
  document.getElementById('linkImage').value = '';
  document.getElementById('linkDesc').value = '';
  document.getElementById('linkRss').value = '';
  document.getElementById('linkDeleteBtn').style.display = 'none';
  document.getElementById('linkModal').classList.add('active');
}

function openEditLink(idx) {
  const l = links[idx];
  editingLinkUrl = l.url;
  document.getElementById('linkModalTitle').textContent = '编辑友链';
  document.getElementById('linkName').value = l.name || '';
  document.getElementById('linkUrl').value = l.url || '';
  document.getElementById('linkImage').value = l.image || '';
  document.getElementById('linkDesc').value = l.description || '';
  document.getElementById('linkRss').value = l.rss || '';
  document.getElementById('linkDeleteBtn').style.display = '';
  document.getElementById('linkModal').classList.add('active');
}

function closeLinkModal() {
  document.getElementById('linkModal').classList.remove('active');
}

async function saveLink() {
  const name = document.getElementById('linkName').value.trim();
  const url = document.getElementById('linkUrl').value.trim();
  if (!name && !url) { showToast('名称和 URL 至少填一个', true); return; }
  if (!url) { showToast('URL 不能为空', true); return; }
  const body = { name: name || url, url: url };
  const image = document.getElementById('linkImage').value.trim();
  if (image) body.image = image;
  const desc = document.getElementById('linkDesc').value.trim();
  if (desc) body.description = desc;
  const rss = document.getElementById('linkRss').value.trim();
  if (rss) body.rss = rss;
  try {
    const res = await fetch('/api/links?token=' + encodeURIComponent(token), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    closeLinkModal();
    showToast(editingLinkUrl ? '已更新' : '已添加');
    loadLinks();
  } catch (err) {
    showToast('保存失败: ' + err.message, true);
  }
}

async function deleteLink() {
  if (!editingLinkUrl || !confirm('确定删除 ' + editingLinkUrl + ' ？')) return;
  try {
    const res = await fetch('/api/links?token=' + encodeURIComponent(token) + '&url=' + encodeURIComponent(editingLinkUrl), { method: 'DELETE' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    closeLinkModal();
    showToast('已删除');
    loadLinks();
  } catch (err) {
    showToast('删除失败: ' + err.message, true);
  }
}

async function changePassword() {
  const oldPwd = document.getElementById('oldPwd').value;
  const newPwd = document.getElementById('newPwd').value;
  try {
    const res = await fetch('/api/auth?token=' + encodeURIComponent(token), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
    if (newPwd) {
      token = newPwd;
      document.cookie = 'site_token=' + newPwd + ';path=/;max-age=2592000;SameSite=Lax';
    }
    document.getElementById('oldPwd').value = '';
    document.getElementById('newPwd').value = '';
    showToast(newPwd ? '口令已更新' : '口令保护已清除');
  } catch (err) {
    showToast('修改失败: ' + err.message, true);
  }
}

loadFeeds();
loadLinks();
</script>
</body>
</html>`;
