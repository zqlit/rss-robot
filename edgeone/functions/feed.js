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
<title>登录 · RSS 管理</title>
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
  <h1>RSS 管理</h1>
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
<title>订阅源管理 · RSS Robot</title>
<style>
  :root { --bg: #0d1117; --card: #161b22; --border: #30363d; --text: #c9d1d9; --muted: #8b949e; --accent: #58a6ff; --green: #3fb950; --red: #f85149; --yellow: #d2991d; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-height: 100vh; padding: 40px 20px; }
  .container { max-width: 900px; margin: 0 auto; }
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
  .stats { display: flex; gap: 12px; margin-bottom: 24px; }
  .stat { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 10px 20px; }
  .stat .num { font-size: 20px; font-weight: 700; color: #fff; }
  .stat .label { font-size: 11px; color: var(--muted); }
  table { width: 100%; border-collapse: collapse; background: var(--card); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
  th, td { padding: 12px 16px; text-align: left; font-size: 13px; }
  th { background: #1c2333; color: var(--muted); font-weight: 600; font-size: 12px; text-transform: uppercase; }
  td { border-top: 1px solid var(--border); }
  td.url { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; color: var(--accent); word-break: break-all; }
  td.title { color: #fff; font-weight: 500; }
  td.actions { white-space: nowrap; }
  td.actions button { padding: 4px 10px; font-size: 12px; margin-right: 6px; }
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
</style>
</head>
<body>
<div class="container">
<header>
  <h1>RSS 订阅源管理</h1>
  <div class="actions">
    <a href="/" class="btn btn-secondary" target="_blank">API 文档</a>
    <button class="btn btn-primary" onclick="openAddModal()">+ 添加订阅源</button>
  </div>
</header>

<div class="stats">
  <div class="stat"><div class="num" id="feedCount">0</div><div class="label">订阅源</div></div>
</div>

<div class="tab">
  <button class="active" onclick="showTab('feeds')">订阅源列表</button>
  <button onclick="showTab('password')">访问口令</button>
</div>

<div id="tab-feeds">
  <table><thead><tr><th>博客名称</th><th>URL</th><th style="width:100px">操作</th></tr></thead><tbody id="feedTableBody"></tbody></table>
  <div class="empty" id="emptyMsg" style="display:none"><h3>暂无订阅源</h3><p>点击上方按钮添加第一个</p></div>
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

<div class="toast" id="toast"></div>

<script>
let token = '';
const cMatch = document.cookie.match(/site_token=([^;]+)/);
if (cMatch) token = cMatch[1];
if (!token) { location.href = '/feed'; } // force login

let feeds = [];
let editingUrl = null;

function showToast(msg, isError) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' error' : '');
  t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 2500);
}

function showTab(name) {
  document.querySelectorAll('.tab button').forEach((b, i) => b.classList.toggle('active', (i === 0 && name === 'feeds') || (i === 1 && name === 'password')));
  document.getElementById('tab-feeds').style.display = name === 'feeds' ? '' : 'none';
  document.getElementById('tab-password').style.display = name === 'password' ? '' : 'none';
}

async function loadFeeds() {
  try {
    const res = await fetch('/api/feeds?token=' + encodeURIComponent(token));
    if (res.status === 401) { location.href = '/feed'; return; }
    const data = await res.json();
    feeds = data.feeds || [];
    document.getElementById('feedCount').textContent = feeds.length;
    const tbody = document.getElementById('feedTableBody');
    if (feeds.length === 0) {
      tbody.innerHTML = '';
      document.getElementById('emptyMsg').style.display = '';
      return;
    }
    document.getElementById('emptyMsg').style.display = 'none';
    tbody.innerHTML = feeds.map((f, i) => \`<tr>
      <td class="title">\${f.feedTitle || '-'}</td>
      <td class="url">\${f.url}</td>
      <td class="actions">
        <button class="btn btn-secondary" onclick="openEditModal(\${i})">编辑</button>
      </td>
    </tr>\`).join('');
  } catch (err) {
    showToast('加载失败: ' + err.message, true);
  }
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
</script>
</body>
</html>`;
