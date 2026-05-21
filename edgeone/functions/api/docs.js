// GET /api/docs?code=口令 — 输出 API 文档 JSON（供 AI 模型参考）
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code') || '';

  // 鉴权
  let authed = typeof RSS_KV === 'undefined';
  if (!authed) {
    const password = await RSS_KV.get('site_password');
    if (!password || code === password) authed = true;
  }
  if (!authed) {
    return new Response(JSON.stringify({ error: 'unauthorized', hint: '需要 ?code=口令 参数' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const baseUrl = 'https://api.usj.cc';
  const doc = {
    name: 'UAPI 管理系统',
    version: '1.0.0',
    baseUrl,
    description: 'RSS 订阅聚合 · 友链管理 · 微信公众号同步 · 代理抓取',
    updatedAt: new Date().toISOString(),

    auth: {
      methods: [
        { type: 'query', name: 'token', description: 'URL 查询参数 ?token=口令' },
        { type: 'cookie', name: 'site_token', description: 'Cookie site_token=口令' },
      ],
      note: 'GET 类接口大多公开。POST / DELETE 需要口令鉴权。首次部署 KV 无口令时自动跳过。',
    },

    endpoints: [
      // ─── 文章数据 ───
      {
        method: 'GET',
        path: '/api/results',
        auth: false,
        summary: '获取所有博客最新文章',
        params: [
          { name: 'feed', type: 'string', required: false, description: '按博客名称筛选' },
          { name: 'limit', type: 'number', required: false, description: '每博客最多返回文章数' },
        ],
        response: { type: 'object', fields: { feeds: 'array<{name, siteUrl, favicon, articles: [{title, link, pubDate, author}]}>' } },
        example: `${baseUrl}/api/results?feed=吾柯&limit=3`,
      },
      {
        method: 'GET',
        path: '/api/articles',
        auth: false,
        summary: '按时间排序的所有文章（跨博客混合）',
        params: [
          { name: 'limit', type: 'number', required: false, description: '返回数量，默认 50' },
        ],
        response: { type: 'object', fields: { total: 'number', articles: 'array<{title, link, pubDate, feedName, siteUrl, favicon, author}>' } },
        example: `${baseUrl}/api/articles?limit=100`,
      },

      // ─── 订阅源管理 ───
      {
        method: 'GET',
        path: '/api/feeds',
        auth: false,
        summary: '列出所有订阅源',
        response: { type: 'object', fields: { feeds: 'array<{url, feedTitle, format?, path?, proxy?}>' } },
        example: `${baseUrl}/api/feeds`,
      },
      {
        method: 'POST',
        path: '/api/feeds',
        auth: true,
        summary: '新增订阅源（支持批量）',
        body: {
          type: 'json',
          fields: {
            url: { type: 'string', required: true, description: '博客订阅源 URL' },
            feedTitle: { type: 'string', required: false, description: '博客名称' },
            format: { type: 'string', required: false, description: 'xml / json / 留空自动检测' },
            path: { type: 'string', required: false, description: 'JSON 数据路径，如 data.list' },
            proxy: { type: 'boolean', required: false, description: '强制代理抓取' },
            oldUrl: { type: 'string', required: false, description: '编辑时传：原 URL，按此查找替换' },
          },
        },
        note: '单条传 { url, ... }，批量传 { feeds: [{ url, ... }] }。URL 重复返回 409。',
        response: { type: 'object', fields: { ok: 'boolean', total: 'number' } },
        errors: { 400: '参数错误', 401: '未授权', 409: 'URL 已存在' },
        example: `curl -X POST "${baseUrl}/api/feeds?token=xxx" -H "Content-Type: application/json" -d '{"url":"https://example.com","feedTitle":"示例"}'`,
      },
      {
        method: 'DELETE',
        path: '/api/feeds',
        auth: true,
        summary: '删除订阅源',
        params: [{ name: 'url', type: 'string', required: true, description: '要删除的 URL' }],
        response: { type: 'object', fields: { ok: 'boolean', removed: 'number' } },
        example: `curl -X DELETE "${baseUrl}/api/feeds?url=https://example.com&token=xxx"`,
      },

      // ─── 友链管理 ───
      {
        method: 'GET',
        path: '/api/links',
        auth: false,
        summary: '列出所有友链（默认过滤隐藏项）',
        params: [
          { name: 'all', type: 'string', required: false, description: '传 1 显示全部（含隐藏项）' },
        ],
        response: { type: 'object', fields: { links: 'array<{name, url, image, description, rss, hidden, addedAt}>' } },
        example: `${baseUrl}/api/links?all=1`,
      },
      {
        method: 'POST',
        path: '/api/links',
        auth: true,
        summary: '新增友链（支持批量）',
        body: {
          type: 'json',
          fields: {
            name: { type: 'string', required: false, description: '站点名称' },
            url: { type: 'string', required: true, description: '站点 URL' },
            image: { type: 'string', required: false, description: '头像 URL，留空自动获取 favicon' },
            description: { type: 'string', required: false, description: '站点描述' },
            rss: { type: 'string', required: false, description: 'RSS 订阅地址' },
            hidden: { type: 'boolean', required: false, description: '是否隐藏' },
            oldUrl: { type: 'string', required: false, description: '编辑时传：原 URL' },
          },
        },
        note: '单条传 { url, ... }，批量传 { links: [{ url, ... }] }。URL 重复返回 409。',
        response: { type: 'object', fields: { ok: 'boolean', links: 'array' } },
        errors: { 400: '参数错误', 401: '未授权', 409: 'URL 已存在' },
        example: `curl -X POST "${baseUrl}/api/links?token=xxx" -H "Content-Type: application/json" -d '{"name":"示例","url":"https://example.com"}'`,
      },
      {
        method: 'DELETE',
        path: '/api/links',
        auth: true,
        summary: '删除友链',
        params: [{ name: 'url', type: 'string', required: true, description: '要删除的 URL' }],
        example: `curl -X DELETE "${baseUrl}/api/links?url=https://example.com&token=xxx"`,
      },

      // ─── 工具接口 ───
      {
        method: 'GET',
        path: '/api/favicon',
        auth: false,
        summary: '获取站点 favicon',
        params: [
          { name: 'url', type: 'string', required: true, description: '目标站点域名或 URL' },
          { name: 'meta', type: 'string', required: false, description: '传 1 返回 favicon URL 而非图片' },
        ],
        note: '可直接用作 <img src>。自动发现 link[rel=icon]，回退到 /favicon.ico。',
        example: `${baseUrl}/api/favicon?url=blog.keepke.com`,
      },
      {
        method: 'GET',
        path: '/api/health',
        auth: false,
        summary: '检测站点存活状态（HEAD 请求）',
        params: [
          { name: 'url', type: 'string', required: false, description: '传单个 URL；不传检测全部订阅源' },
        ],
        response: { type: 'object', fields: { total: 'number', alive: 'number', dead: 'number', results: 'array<{url, status, ok, latency?, error?}>' } },
        example: `${baseUrl}/api/health?url=blog.keepke.com`,
      },
      {
        method: 'POST',
        path: '/api/proxy',
        auth: true,
        summary: 'RSS 抓取代理（EdgeOne 节点）',
        body: {
          type: 'json',
          fields: {
            url: { type: 'string', required: true, description: '目标抓取 URL' },
            timeout: { type: 'number', required: false, description: '超时毫秒，默认 15000' },
          },
        },
        note: `SCF 国内节点 ${baseUrl.replace('api', 'scfapi')} 提供相同接口但无需鉴权。`,
        response: { type: 'object', fields: { ok: 'boolean', status: 'number', contentType: 'string', body: 'string' } },
        example: `curl -X POST "${baseUrl}/api/proxy?token=xxx" -H "Content-Type: application/json" -d '{"url":"https://example.com/feed"}'`,
      },
      {
        method: 'POST',
        path: '/api/update',
        auth: true,
        summary: '接收抓取结果写入 KV（由 GitHub Action 自动调用）',
        note: '外部无需直接调用。用于 check-feeds.js 将抓取结果上报到 EdgeOne KV。',
      },

      // ─── 微信集成 ───
      {
        method: 'GET',
        path: '/api/wechat-material',
        auth: false,
        summary: '查看微信公众号凭证配置状态',
        response: { type: 'object', fields: { configured: 'boolean', appId: 'string', hasSecret: 'boolean' } },
        example: `${baseUrl}/api/wechat-material`,
      },
      {
        method: 'POST',
        path: '/api/wechat-material',
        auth: true,
        summary: '同步文章到微信公众号草稿箱（draft/add）',
        body: {
          type: 'json',
          fields: {
            appId: { type: 'string', required: '首次必填', description: '公众号 AppID，首次传入后自动保存 KV' },
            appSecret: { type: 'string', required: '首次必填', description: '公众号 AppSecret' },
            articles: {
              type: 'array',
              required: true,
              description: '文章数组',
              fields: {
                title: { type: 'string', required: true, description: '标题，最长 32 字' },
                content: { type: 'string', required: true, description: 'HTML 正文，最长 20000 字 / 1MB' },
                thumb_media_url: { type: 'string', required: '与 thumb_media_id 二选一', description: '封面图 URL，自动上传' },
                thumb_media_id: { type: 'string', required: '与 thumb_media_url 二选一', description: '已有永久素材 media_id' },
                author: { type: 'string', required: false, description: '作者，最长 16 字' },
                digest: { type: 'string', required: false, description: '摘要，最长 128 字' },
                content_source_url: { type: 'string', required: false, description: '原文链接' },
                show_cover_pic: { type: 'number', required: false, description: '封面显示：0=否 1=是，默认 1' },
                content_image_urls: { type: 'array', required: false, description: '文内图片 [{original_url}]，自动上传到微信 CDN' },
                need_open_comment: { type: 'number', required: false, description: '打开评论：0=关 1=开' },
                only_fans_can_comment: { type: 'number', required: false, description: '仅粉丝评论：0=否 1=是' },
              },
            },
          },
        },
        note: '内部调用：/cgi-bin/token → /cgi-bin/material/add_material(封面图) → /cgi-bin/media/uploadimg(文内图) → /cgi-bin/draft/add(创建草稿)',
        response: { type: 'object', fields: { ok: 'boolean', media_id: 'string', message: 'string' } },
        example: `curl -X POST "${baseUrl}/api/wechat-material?token=xxx" -H "Content-Type: application/json" -d '{"articles":[{"title":"标题","thumb_media_url":"https://...","content":"<p>正文</p>","content_source_url":"https://..."}]}'`,
      },

      // ─── 系统 ───
      {
        method: 'GET',
        path: '/api/auth',
        auth: false,
        summary: 'GET 验证口令有效性，POST 修改口令',
        note: 'POST 需传 { oldPassword, newPassword }，新口令为空则清除保护。',
      },
      {
        method: 'GET',
        path: '/api/docs',
        auth: true,
        summary: '输出本 API 文档 JSON（给 AI/LLM 参考）',
        params: [{ name: 'code', type: 'string', required: true, description: '站点口令' }],
        note: '本接口文档本身。',
        example: `${baseUrl}/api/docs?code=口令`,
      },
    ],

    wechatApiFlow: {
      description: '微信同步内部调用链',
      steps: [
        { step: 1, api: '/cgi-bin/token', description: '获取 access_token（自动缓存 2h，提前 5min 刷新）' },
        { step: 2, api: '/cgi-bin/material/add_material?type=image', description: '上传封面图到永久素材库 → media_id' },
        { step: 3, api: '/cgi-bin/media/uploadimg', description: '上传文内图片到微信 CDN → url（替换 content 链接）' },
        { step: 4, api: '/cgi-bin/draft/add', description: '创建草稿 → media_id（存入草稿箱，不群发）' },
      ],
    },
  };

  return new Response(JSON.stringify(doc, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
