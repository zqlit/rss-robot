// GET /api/docs?code=口令 — API 文档 JSON（给 AI/LLM 参考，与 index.js 同源）
// 新增接口时同步更新 _api-spec.js 和本文件的 spec 数据

const site = { name: 'UAPI', baseUrl: 'https://api.usj.cc', version: '2.0.0', description: 'RSS 订阅聚合 · 友链管理 · 微信公众号同步 · 代理抓取' };

const auth = {
  type: 'token',
  methods: [
    { name: 'URL 参数', example: '?token=你的口令' },
    { name: 'Cookie', example: 'site_token=你的口令' },
  ],
  note: 'GET 大多公开；POST / DELETE 需口令。KV 无口令时自动跳过鉴权。',
};

const endpoints = [
  // === 文章数据 ===
  { tag:'articles', method:'GET', path:'/api/results', auth:false, summary:'获取所有博客最新文章',
    params:[{ name:'feed', type:'string', desc:'按博客名称筛选' },{ name:'limit', type:'number', desc:'每博客最多返回篇数' }],
    response:'{"feeds":[{"name":"吾柯","siteUrl":"https://blog.keepke.com","favicon":"https://api.usj.cc/api/favicon?url=...","articles":[{"title":"...","link":"...","pubDate":"...","author":"..."}]}]}',
    curl:'curl "https://api.usj.cc/api/results?feed=吾柯&limit=5"' },
  { tag:'articles', method:'GET', path:'/api/articles', auth:false, summary:'按时间排序的所有文章（跨博客混合）',
    params:[{ name:'limit', type:'number', desc:'返回数量，默认 50' }],
    response:'{"total":380,"articles":[{"title":"...","link":"...","pubDate":"...","feedName":"吾柯","siteUrl":"...","favicon":"...","author":"..."}]}',
    curl:'curl "https://api.usj.cc/api/articles?limit=100"' },
  // === 订阅源管理 ===
  { tag:'feeds', method:'GET', path:'/api/feeds', auth:false, summary:'列出所有订阅源',
    response:'{"feeds":[{"url":"https://blog.keepke.com","feedTitle":"吾柯"},{"url":"https://example.com","feedTitle":"示例","format":"json","path":"data.list","proxy":true}]}',
    curl:'curl https://api.usj.cc/api/feeds' },
  { tag:'feeds', method:'POST', path:'/api/feeds', auth:true, summary:'新增/编辑订阅源（支持批量）',
    body:{url:{type:'string',req:true,desc:'订阅源 URL'},feedTitle:{type:'string',desc:'博客名称'},format:{type:'string',desc:'xml / json / 留空自动'},path:{type:'string',desc:'JSON 数据路径，如 data.list'},proxy:{type:'boolean',desc:'强制代理抓取'},oldUrl:{type:'string',desc:'编辑时传原 URL，实现改链'}},
    note:'单条 { url, ... }，批量 { feeds: [{ url, ... }] }。URL 重复返回 409。',errors:[400,401,409,500],
    curl:'curl -X POST "https://api.usj.cc/api/feeds?token=xxx" -H "Content-Type: application/json" -d \'{"url":"https://example.com","feedTitle":"示例"}\'\n# 编辑（oldUrl=原URL，改链不丢数据）\ncurl -X POST "https://api.usj.cc/api/feeds?token=xxx" -H "Content-Type: application/json" -d \'{"url":"https://new.com","oldUrl":"https://old.com"}\'' },
  { tag:'feeds', method:'DELETE', path:'/api/feeds', auth:true, summary:'删除订阅源', params:[{ name:'url', type:'string', desc:'要删除的 URL' }], errors:[200,401],
    curl:'curl -X DELETE "https://api.usj.cc/api/feeds?url=https://example.com&token=xxx"' },
  // === 友链管理 ===
  { tag:'links', method:'GET', path:'/api/links', auth:false, summary:'列出所有友链（默认过滤隐藏）',
    params:[{ name:'all', type:'string', desc:'传 1 显示全部（含隐藏项）' }],
    response:'{"links":[{"name":"吾柯","url":"https://blog.keepke.com","image":"https://api.usj.cc/api/favicon?url=...","description":"保持思考与理性","rss":"","hidden":false,"addedAt":"2026-01-01T00:00:00.000Z"}]}',
    curl:'curl "https://api.usj.cc/api/links?all=1"' },
  { tag:'links', method:'POST', path:'/api/links', auth:true, summary:'新增/编辑友链（支持批量）',
    body:{name:{type:'string',desc:'站点名称'},url:{type:'string',req:true,desc:'站点 URL'},image:{type:'string',desc:'头像 URL，留空自动获取 favicon'},description:{type:'string',desc:'站点描述'},rss:{type:'string',desc:'RSS 订阅地址'},hidden:{type:'boolean',desc:'是否隐藏'},oldUrl:{type:'string',desc:'编辑时传原 URL'}},
    note:'单条 { url, ... }，批量 { links: [{ url, ... }] }。URL 重复返回 409。',errors:[400,401,409,500],
    curl:'curl -X POST "https://api.usj.cc/api/links?token=xxx" -H "Content-Type: application/json" -d \'{"name":"示例","url":"https://example.com","description":"一个很棒的博客"}\'' },
  { tag:'links', method:'DELETE', path:'/api/links', auth:true, summary:'删除友链', params:[{ name:'url', type:'string', desc:'要删除的 URL' }], errors:[200,401],
    curl:'curl -X DELETE "https://api.usj.cc/api/links?url=https://example.com&token=xxx"' },
  // === 工具接口 ===
  { tag:'tools', method:'GET', path:'/api/favicon', auth:false, summary:'获取站点 favicon 图片',
    params:[{ name:'url', type:'string', desc:'目标站点域名或 URL' },{ name:'meta', type:'string', desc:'传 1 返回 favicon URL 而非图片' }],
    note:'可直接用作 <img src>。自动发现 link[rel=icon]，回退 /favicon.ico。',curl:'curl "https://api.usj.cc/api/favicon?url=blog.keepke.com"' },
  { tag:'tools', method:'GET', path:'/api/health', auth:false, summary:'检测站点存活状态（HEAD 请求）',
    params:[{ name:'url', type:'string', desc:'传单个 URL；不传检测全部订阅源' }],
    response:'{"total":52,"alive":49,"dead":3,"results":[{"url":"https://blog.keepke.com","status":200,"ok":true,"latency":234},{"url":"https://dead.com","status":0,"ok":false,"error":"timeout"}]}',
    curl:'curl "https://api.usj.cc/api/health?url=blog.keepke.com"' },
  { tag:'tools', method:'POST', path:'/api/proxy', auth:true, summary:'RSS 抓取代理',
    body:{url:{type:'string',req:true,desc:'目标抓取 URL'},timeout:{type:'number',desc:'超时毫秒，默认 15000'}},
    note:'EdgeOne 节点 api.usj.cc/api/proxy（需口令）。SCF 国内节点 scfapi.usj.cc（无需口令，同接口）。SCF 部署在腾讯云成都区。',
    response:'{"ok":true,"status":200,"contentType":"application/rss+xml","body":"<?xml version=1.0..."}',errors:[200,400,401,502],
    curl:'# EdgeOne 代理（需口令）\ncurl -X POST "https://api.usj.cc/api/proxy?token=xxx" -H "Content-Type: application/json" -d \'{"url":"https://example.com/feed","timeout":15000}\'\n# 腾讯云 SCF 代理（无需口令）\ncurl -X POST https://scfapi.usj.cc/ -H "Content-Type: application/json" -d \'{"url":"https://example.com/feed","timeout":15000}\'' },
  { tag:'tools', method:'POST', path:'/api/update', auth:true, summary:'接收抓取结果写入 KV（GitHub Action 自动调用）', note:'由 check-feeds.js 每小时调用，外部无需关心。' },
  // === 微信集成 ===
  { tag:'wechat', method:'GET', path:'/api/wechat-material', auth:false, summary:'查看微信凭证配置状态',
    response:'{"configured":true,"appId":"wx1234567890","hasSecret":true}', curl:'curl https://api.usj.cc/api/wechat-material' },
  { tag:'wechat', method:'POST', path:'/api/wechat-material', auth:true, summary:'同步文章到公众号草稿箱（draft/add）',
    body:{'appId':{type:'string',desc:'公众号 AppID，首次传入后自动保存 KV'},'appSecret':{type:'string',desc:'公众号 AppSecret'},'articles[].title':{type:'string',req:true,desc:'标题，最长 32 字'},'articles[].content':{type:'string',req:true,desc:'HTML 正文，最长 20000 字'},'articles[].thumb_media_url':{type:'string',desc:'封面图 URL，自动上传'},'articles[].thumb_media_id':{type:'string',desc:'已有永久素材 media_id'},'articles[].author':{type:'string',desc:'作者，最长 16 字'},'articles[].digest':{type:'string',desc:'摘要，最长 128 字'},'articles[].content_source_url':{type:'string',desc:'原文链接'},'articles[].show_cover_pic':{type:'number',desc:'封面显示：0=否 1=是，默认 1'},'articles[].content_image_urls':{type:'array',desc:'[{original_url}] 文内图片，自动上传 CDN'},'articles[].need_open_comment':{type:'number',desc:'评论：0=关 1=开'},'articles[].only_fans_can_comment':{type:'number',desc:'仅粉丝评论：0=否 1=是'}},
    note:'内部调用链：/cgi-bin/token → material/add_material(封面) → media/uploadimg(文内图) → draft/add(创建草稿)。access_token 自动缓存 2h。',
    response:'{"ok":true,"media_id":"abc123def456","message":"已同步 1 篇文章到公众号草稿箱"}',errors:[200,400,401,500],
    curl:'curl -X POST "https://api.usj.cc/api/wechat-material?token=xxx" -H "Content-Type: application/json" -d \'{"articles":[{"title":"标题","thumb_media_url":"https://...","content":"<p>正文</p>","content_source_url":"https://..."}]}\'' },
  // === 系统 ===
  { tag:'system',method:'GET',path:'/api/artalk/commenter',auth:true,summary:'代理 Artalk 查询用户最新评论',params:[{name:'email','type':'string',desc:'用户邮箱'}],note:'内部 Artalk admin 存在 KV。POST {name,email,password,site_name,api_url} 配置。',curl:'curl "https://api.usj.cc/api/artalk/commenter?email=user@example.com&token=xxx"'},{tag:'system',method:'GET',path:'/api/ai/greeting',auth:true,summary:'随机返回问候语（预生成词库+时段/节日匹配）',params:[{name:'count','type':'number',desc:'生成几条，默认 10，最大 50'}],note:'词库预存 KV+DeepSeek Flash 动态扩充。覆盖 7 时段+14 节日+节气。POST {action:"generate"} 调 AI 生成，{action:"config"} 存 Key。',curl:'curl "https://api.usj.cc/api/ai/greeting?count=5&token=xxx"'},{tag:'system',method:'GET',path:'/api/random-image', auth:false, summary:'随机返回文件夹中的图片', params:[{ name:'folder', type:'string', desc:'文件夹名称，默认 default' },{ name:'meta', type:'string', desc:'传 1 返回 JSON { url, folder, total }' },{ name:'list', type:'string', desc:'传 1 列出所有文件夹' }], note:'302 重定向到随机图片 URL。meta=1 返回 JSON。POST { urls: [...] }?folder=xxx 需口令添加。', curl:'curl -L \"https://api.usj.cc/api/random-image?folder=wallpaper\"\ncurl \"https://api.usj.cc/api/random-image?folder=wallpaper&meta=1\"' }, { tag:'system', method:'GET', path:'/api/auth', auth:false, summary:'GET 验证口令 / POST 修改口令', note:'POST 需 { oldPassword, newPassword }，新口令留空清除保护。' },
  { tag:'system', method:'GET', path:'/api/docs', auth:true, summary:'API 文档 JSON（本接口）', params:[{ name:'code', type:'string', desc:'站点口令' }], note:'给 AI/LLM 参考的 API 完整文档。', curl:'curl "https://api.usj.cc/api/docs?code=口令"' },
];

const wechatFlow = [
  { step:1, api:'/cgi-bin/token', desc:'获取 access_token（缓存 2h，提前 5min 刷新）' },
  { step:2, api:'/cgi-bin/material/add_material?type=image', desc:'上传封面图 → media_id（≤10MB）' },
  { step:3, api:'/cgi-bin/media/uploadimg', desc:'上传文内图 → url（≤1MB, jpg/png）' },
  { step:4, api:'/cgi-bin/draft/add', desc:'创建草稿 → media_id（不群发）' },
];

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code') || '';

  let authed = typeof RSS_KV === 'undefined';
  if (!authed) {
    const password = await RSS_KV.get('site_password');
    if (!password || code === password) authed = true;
  }
  if (!authed) {
    return new Response(JSON.stringify({ error: 'unauthorized', hint: '需要 ?code=口令' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  const doc = { ...site, updatedAt: new Date().toISOString(), auth, endpoints, wechatFlow };
  return new Response(JSON.stringify(doc, null, 2), {
    status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
