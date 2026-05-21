// GET /api/docs?code=口令 — API 文档 JSON（给 AI/LLM 参考，与 index.js 同源）
import { site, auth, endpoints, wechatFlow } from '../_api-spec.js';

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
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const doc = {
    ...site,
    version: '2.0.0',
    updatedAt: new Date().toISOString(),
    auth,
    endpoints,
    wechatFlow,
  };

  return new Response(JSON.stringify(doc, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
