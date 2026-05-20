// Catch-all: handles paths not matched by specific functions
export async function onRequest(context) {
  const url = new URL(context.request.url);

  // 微信公众平台域名验证文件
  if (url.pathname.startsWith('/MP_verify_') && url.pathname.endsWith('.txt')) {
    const code = url.pathname.replace('/MP_verify_', '').replace('.txt', '');
    return new Response(code, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  return new Response('Not Found', { status: 404 });
}
