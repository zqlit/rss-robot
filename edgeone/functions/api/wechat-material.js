// POST /api/wechat-material — 同步文章到微信公众号草稿箱（需口令）
//
// 基于微信官方 API:
//   - 新增草稿: POST /cgi-bin/draft/add
//   - 上传封面图(永久素材): POST /cgi-bin/material/add_material?type=image
//   - 上传文内图片: POST /cgi-bin/media/uploadimg
//
// Body:
//   { appId?, appSecret?, articles: [{ title, thumb_media_url?, thumb_media_id?,
//       author?, digest?, show_cover_pic?, content, content_source_url?,
//       content_image_urls?, need_open_comment?, only_fans_can_comment? }] }
//
//   appId/appSecret 优先用 body 中的值，否则从 KV wechat_config 读取

const WECHAT_CONFIG_KEY = 'wechat_config';
const WECHAT_TOKEN_KEY = 'wechat_token';

function respond(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
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

// 获取 access_token（自动缓存到 KV，提前 5 分钟刷新）
async function getAccessToken(appId, appSecret) {
  if (typeof RSS_KV !== 'undefined') {
    const cached = await RSS_KV.get(WECHAT_TOKEN_KEY);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (data.expiresAt > Date.now()) {
          return data.token;
        }
      } catch {}
    }
  }

  const res = await fetch(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`
  );
  const json = await res.json();
  if (json.errcode) {
    throw new Error(`获取 access_token 失败: ${json.errmsg} (code=${json.errcode})`);
  }

  if (typeof RSS_KV !== 'undefined') {
    const ttl = Math.max(json.expires_in - 300, 60);
    await RSS_KV.put(
      WECHAT_TOKEN_KEY,
      JSON.stringify({
        token: json.access_token,
        expiresAt: Date.now() + ttl * 1000,
      })
    );
  }

  return json.access_token;
}

// 上传封面图到微信永久素材库 → 返回 media_id（用于 thumb_media_id）
// API: POST /cgi-bin/material/add_material?type=image  限制: ≤10MB, bmp/png/jpeg/jpg/gif
async function uploadThumbImage(accessToken, imageUrl) {
  const downloadRes = await fetch(imageUrl);
  if (!downloadRes.ok) {
    throw new Error(`下载封面图失败: HTTP ${downloadRes.status} — ${imageUrl}`);
  }
  const buffer = await downloadRes.arrayBuffer();
  const contentType = downloadRes.headers.get('content-type') || 'image/jpeg';

  const formData = new FormData();
  formData.append('media', new Blob([buffer], { type: contentType }), 'cover.jpg');

  const res = await fetch(
    `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${accessToken}&type=image`,
    { method: 'POST', body: formData }
  );
  const json = await res.json();
  if (json.errcode) {
    throw new Error(`上传封面图失败: ${json.errmsg} (code=${json.errcode})`);
  }
  return json.media_id;
}

// 上传文内图片到微信 → 返回 url（用于替换 content 中的图片链接）
// API: POST /cgi-bin/media/uploadimg  限制: ≤1MB, 仅 jpg/png
async function uploadContentImage(accessToken, imageUrl) {
  const downloadRes = await fetch(imageUrl);
  if (!downloadRes.ok) {
    throw new Error(`下载文内图片失败: HTTP ${downloadRes.status} — ${imageUrl}`);
  }
  const buffer = await downloadRes.arrayBuffer();
  const contentType = downloadRes.headers.get('content-type') || 'image/jpeg';

  const formData = new FormData();
  formData.append('media', new Blob([buffer], { type: contentType }), 'content.jpg');

  const res = await fetch(
    `https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=${accessToken}`,
    { method: 'POST', body: formData }
  );
  const json = await res.json();
  if (json.errcode) {
    throw new Error(`上传文内图片失败: ${json.errmsg} (code=${json.errcode})`);
  }
  return json.url;
}

// 新增草稿到公众号草稿箱 → 返回 media_id
// API: POST /cgi-bin/draft/add  官方文档: https://developers.weixin.qq.com/doc/service/api/draftbox/draftmanage/api_draft_add
async function addDraft(accessToken, articles) {
  const res = await fetch(
    `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${accessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articles }),
    }
  );
  const json = await res.json();
  if (json.errcode) {
    throw new Error(`新增草稿失败: ${json.errmsg} (code=${json.errcode})`);
  }
  return json.media_id;
}

// POST — 上传文章到草稿箱
async function handlePost(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return respond({ error: 'invalid json' }, 400);
  }

  const { appId, appSecret, articles } = body;

  if (!articles || !Array.isArray(articles) || articles.length === 0) {
    return respond({ error: 'articles 数组不能为空' }, 400);
  }

  // 获取微信配置：优先用请求体中的，否则从 KV 读取
  let wechatAppId = appId;
  let wechatAppSecret = appSecret;

  if ((!wechatAppId || !wechatAppSecret) && typeof RSS_KV !== 'undefined') {
    const configRaw = await RSS_KV.get(WECHAT_CONFIG_KEY);
    if (configRaw) {
      try {
        const config = JSON.parse(configRaw);
        if (!wechatAppId) wechatAppId = config.appId;
        if (!wechatAppSecret) wechatAppSecret = config.appSecret;
      } catch {}
    }
  }

  if (!wechatAppId || !wechatAppSecret) {
    return respond(
      { error: '请提供微信 appId 和 appSecret（在请求体中传入，或先通过 POST 带 appId/appSecret 保存到 KV）' },
      400
    );
  }

  try {
    // 如果请求体带了 appId/appSecret，自动保存到 KV
    if (appId && appSecret && typeof RSS_KV !== 'undefined') {
      await RSS_KV.put(WECHAT_CONFIG_KEY, JSON.stringify({ appId, appSecret }));
    }

    const accessToken = await getAccessToken(wechatAppId, wechatAppSecret);

    const processed = [];
    for (const article of articles) {
      const item = { ...article };

      // 校验必填字段
      if (!item.title) {
        throw new Error('文章 title 不能为空');
      }

      // 封面图：优先用 thumb_media_url 自动上传，否则用已有的 thumb_media_id
      if (item.thumb_media_url && !item.thumb_media_id) {
        item.thumb_media_id = await uploadThumbImage(accessToken, item.thumb_media_url);
      }
      delete item.thumb_media_url;

      if (!item.thumb_media_id) {
        throw new Error(`文章「${item.title}」缺少 thumb_media_id 或 thumb_media_url`);
      }

      // 文内图片：如果提供了 content_image_urls，逐个上传到微信并替换 content 中的链接
      if (item.content_image_urls && Array.isArray(item.content_image_urls)) {
        for (const img of item.content_image_urls) {
          const wxUrl = await uploadContentImage(accessToken, img.original_url);
          item.content = item.content.split(img.original_url).join(wxUrl);
        }
      }
      delete item.content_image_urls;

      // 清理不属于 draft/add API 的字段
      const allowed = [
        'title', 'author', 'digest', 'content', 'content_source_url',
        'thumb_media_id', 'show_cover_pic', 'need_open_comment',
        'only_fans_can_comment', 'article_type',
      ];
      const draft = {};
      for (const key of allowed) {
        if (item[key] !== undefined) draft[key] = item[key];
      }

      // 默认值
      if (draft.show_cover_pic == null) draft.show_cover_pic = 1;
      if (!draft.content) draft.content = '';

      processed.push(draft);
    }

    const mediaId = await addDraft(accessToken, processed);

    return respond({
      ok: true,
      media_id: mediaId,
      message: `已同步 ${processed.length} 篇文章到公众号草稿箱`,
    });
  } catch (err) {
    return respond({ error: err.message }, 500);
  }
}

// GET — 查看配置状态（不暴露 appSecret）
async function handleGet() {
  if (typeof RSS_KV === 'undefined') {
    return respond({ configured: false, message: 'KV 未配置' });
  }

  const configRaw = await RSS_KV.get(WECHAT_CONFIG_KEY);
  if (!configRaw) {
    return respond({ configured: false, message: '尚未配置微信公众号凭证' });
  }

  try {
    const config = JSON.parse(configRaw);
    return respond({
      configured: true,
      appId: config.appId,
      hasSecret: !!config.appSecret,
    });
  } catch {
    return respond({ configured: false, message: '配置解析失败' });
  }
}

export async function onRequest(context) {
  const { request } = context;

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
