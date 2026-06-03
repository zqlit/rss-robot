// GET  /api/random-image?folder=xxx      — 随机返回一张图片（二进制）
// GET  /api/random-image?folder=xxx&meta=1 — 返回 JSON
// GET  /api/random-image?list=1           — 列出所有文件夹
// POST /api/random-image?folder=xxx       — 上传图片（URL 或 base64），需口令
//
// KV 结构:
//   img_folders           → ["jiege", "wallpaper", ...]
//   img_folder:<folder>   → [{ name, type?, url? }, ...]
//   img_data:<folder>/<n> → base64 图片数据（仅上传的图片）

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function respond(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

async function requireAuth(request) {
  const url = new URL(request.url);
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookieMatch = cookieHeader.match(/site_token=([^;]+)/);
  const token = url.searchParams.get('token') || (cookieMatch ? cookieMatch[1] : '');
  if (typeof RSS_KV === 'undefined') return true;
  const password = await RSS_KV.get('site_password');
  if (!password) return true;
  return token === password;
}

const FOLDER_PREFIX = 'img_folder:';
const DATA_PREFIX = 'img_data:';

function getContentType(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  const map = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml', ico: 'image/x-icon' };
  return map[ext] || 'image/jpeg';
}

// GET
async function handleGet(request) {
  if (typeof RSS_KV === 'undefined') return respond({ error: 'KV not configured' }, 500);

  const url = new URL(request.url);
  const folder = url.searchParams.get('folder') || 'jiege';
  const meta = url.searchParams.get('meta');
  const list = url.searchParams.get('list');

  if (list === '1') {
    const raw = await RSS_KV.get('img_folders');
    const folders = raw ? JSON.parse(raw) : [];
    return respond({ folders });
  }

  // 获取文件夹内容
  const folderRaw = await RSS_KV.get(FOLDER_PREFIX + folder);
  const images = folderRaw ? JSON.parse(folderRaw) : [];
  if (images.length === 0) {
    return respond({ error: `文件夹 "${folder}" 为空或不存在` }, 404);
  }

  const idx = Math.floor(Math.random() * images.length);
  const img = images[idx];

  if (meta === '1') {
    return respond({ name: img.name, type: img.type, url: img.url || null, folder, total: images.length, index: idx });
  }

  // URL 图片 → 302 重定向
  if (img.url && !img.name) {
    return new Response(null, { status: 302, headers: { Location: img.url } });
  }

  // KV 存储的图片 → 读取 base64 返回二进制
  const dataKey = DATA_PREFIX + folder + '/' + img.name;
  const base64 = await RSS_KV.get(dataKey);
  if (!base64) {
    return respond({ error: `图片数据不存在: ${img.name}` }, 404);
  }

  const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Response(binary, {
    status: 200,
    headers: {
      'Content-Type': img.type || getContentType(img.name),
      'Cache-Control': 'public, max-age=86400',
      'Content-Disposition': `inline; filename="${img.name}"`,
    },
  });
}

// POST — 上传图片（URL 或 base64）
async function handlePost(request) {
  if (typeof RSS_KV === 'undefined') return respond({ error: 'KV not configured' }, 500);

  const reqUrl = new URL(request.url);
  const folder = reqUrl.searchParams.get('folder') || 'jiege';

  let body;
  try { body = await request.json(); } catch { return respond({ error: 'invalid json' }, 400); }

  const folderKey = FOLDER_PREFIX + folder;
  const folderRaw = await RSS_KV.get(folderKey);
  const images = folderRaw ? JSON.parse(folderRaw) : [];

  let added = 0;

  // 方式一：上传 base64 图片文件 { files: [{ name: "a.jpg", data: "base64...", type: "image/jpeg" }] }
  if (body.files && Array.isArray(body.files)) {
    for (const f of body.files) {
      if (!f.name || !f.data) continue;
      // 去重
      if (images.find((i) => i.name === f.name)) continue;

      const type = f.type || getContentType(f.name);
      await RSS_KV.put(DATA_PREFIX + folder + '/' + f.name, f.data);
      images.push({ name: f.name, type });
      added++;
    }
  }

  // 方式二：添加图片 URL { urls: ["https://...", { url: "https://...", name: "别名" }] }
  if (body.urls && Array.isArray(body.urls)) {
    for (const item of body.urls) {
      const u = typeof item === 'string' ? item : item.url;
      if (!u) continue;
      if (!images.find((i) => (i.url || i.name) === u)) {
        images.push(typeof item === 'string' ? { url: u } : item);
        added++;
      }
    }
  }

  if (added === 0) return respond({ error: '没有可添加的图片（files 或 urls 为空，或全部重复）' }, 400);

  await RSS_KV.put(folderKey, JSON.stringify(images));

  // 更新文件夹列表
  const foldersRaw = await RSS_KV.get('img_folders');
  const folders = foldersRaw ? JSON.parse(foldersRaw) : [];
  if (!folders.includes(folder)) {
    folders.push(folder);
    await RSS_KV.put('img_folders', JSON.stringify(folders));
  }

  return respond({ ok: true, folder, added, total: images.length });
}

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  switch (request.method) {
    case 'GET':
      return handleGet(request);
    case 'POST':
      if (!(await requireAuth(request))) return respond({ error: 'unauthorized' }, 401);
      return handlePost(request);
    default:
      return respond({ error: 'method not allowed' }, 405);
  }
}
