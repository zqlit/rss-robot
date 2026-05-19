// POST /api/update — 接收 check-feeds.js 的上报，存入 KV

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const data = await request.json();

    // 存入 KV（如果已绑定），7 天过期
    if (typeof RSS_KV !== 'undefined') {
      await RSS_KV.put('latest', JSON.stringify(data), { expirationTtl: 604800 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
