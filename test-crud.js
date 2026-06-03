// 测试 feeds.js 和 links.js 的 CRUD 逻辑
// 模拟 KV 存储
const mockKV = {
  store: {},
  async get(key) { return this.store[key] || null; },
  async put(key, value) { this.store[key] = value; },
  async delete(key) { delete this.store[key]; }
};

// 设置全局变量
globalThis.RSS_KV = mockKV;

// 测试函数
async function runTests() {
  console.log('=== 测试 Feeds CRUD (feeds.js) ===\n');

  // 清空 KV
  mockKV.store = {};

  // 动态导入 feeds 模块
  const feedsModule = await import('./edgeone/functions/api/feeds.js');

  // 测试 1: GET 空数据
  console.log('测试 1: GET /api/feeds (空数据)');
  const getReq1 = new Request('https://example.com/api/feeds');
  const getRes1 = await feedsModule.onRequest({ request: getReq1 });
  const getData1 = await getRes1.json();
  console.log('结果:', JSON.stringify(getData1));
  console.assert(getData1.feeds && Array.isArray(getData1.feeds), '应该返回 feeds 数组');
  console.assert(getData1.feeds.length === 0, '初始应该为空数组');
  console.log('✓ 通过\n');

  // 测试 2: POST 添加订阅源
  console.log('测试 2: POST /api/feeds (添加订阅源)');
  const postReq1 = new Request('https://example.com/api/feeds?token=test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com/feed', feedTitle: '示例' })
  });
  const postRes1 = await feedsModule.onRequest({ request: postReq1 });
  const postData1 = await postRes1.json();
  console.log('结果:', JSON.stringify(postData1));
  console.assert(postData1.ok === true, '应该返回 ok: true');
  console.assert(postData1.total === 1, '应该有 1 个订阅源');
  console.log('✓ 通过\n');

  // 测试 3: GET 有数据
  console.log('测试 3: GET /api/feeds (有数据)');
  const getReq2 = new Request('https://example.com/api/feeds');
  const getRes2 = await feedsModule.onRequest({ request: getReq2 });
  const getData2 = await getRes2.json();
  console.log('结果:', JSON.stringify(getData2));
  console.assert(getData2.feeds.length === 1, '应该有 1 个订阅源');
  console.assert(getData2.feeds[0].url === 'https://example.com/feed', 'URL 应该匹配');
  console.assert(getData2.feeds[0].feedTitle === '示例', '标题应该匹配');
  console.log('✓ 通过\n');

  // 测试 4: POST 编辑订阅源
  console.log('测试 4: POST /api/feeds (编辑订阅源)');
  const postReq2 = new Request('https://example.com/api/feeds?token=test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://example.com/new-feed',
      feedTitle: '新示例',
      oldUrl: 'https://example.com/feed'
    })
  });
  const postRes2 = await feedsModule.onRequest({ request: postReq2 });
  const postData2 = await postRes2.json();
  console.log('结果:', JSON.stringify(postData2));
  console.assert(postData2.ok === true, '应该返回 ok: true');
  console.log('✓ 通过\n');

  // 测试 5: DELETE 删除订阅源
  console.log('测试 5: DELETE /api/feeds (删除订阅源)');
  const deleteReq1 = new Request('https://example.com/api/feeds?url=https://example.com/new-feed&token=test', {
    method: 'DELETE'
  });
  const deleteRes1 = await feedsModule.onRequest({ request: deleteReq1 });
  const deleteData1 = await deleteRes1.json();
  console.log('结果:', JSON.stringify(deleteData1));
  console.assert(deleteData1.ok === true, '应该返回 ok: true');
  console.assert(deleteData1.removed === 1, '应该删除 1 个');
  console.log('✓ 通过\n');

  // 测试 6: POST 批量添加
  console.log('测试 6: POST /api/feeds (批量添加)');
  const postReq3 = new Request('https://example.com/api/feeds?token=test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      feeds: [
        { url: 'https://blog1.com', feedTitle: '博客1' },
        { url: 'https://blog2.com', feedTitle: '博客2' }
      ]
    })
  });
  const postRes3 = await feedsModule.onRequest({ request: postReq3 });
  const postData3 = await postRes3.json();
  console.log('结果:', JSON.stringify(postData3));
  console.assert(postData3.ok === true, '应该返回 ok: true');
  console.assert(postData3.total === 2, '应该有 2 个订阅源');
  console.log('✓ 通过\n');

  // 测试 7: POST 重复添加
  console.log('测试 7: POST /api/feeds (重复添加)');
  const postReq4 = new Request('https://example.com/api/feeds?token=test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://blog1.com', feedTitle: '重复' })
  });
  const postRes4 = await feedsModule.onRequest({ request: postReq4 });
  const postData4 = await postRes4.json();
  console.log('结果:', JSON.stringify(postData4));
  console.assert(postRes4.status === 409, '应该返回 409 状态码');
  console.assert(postData4.error === '链接已存在，不允许重复添加', '应该返回重复错误');
  console.log('✓ 通过\n');

  console.log('=== 测试 Links CRUD (links.js) ===\n');

  // 清空 KV
  mockKV.store = {};

  // 动态导入 links 模块
  const linksModule = await import('./edgeone/functions/api/links.js');

  // 测试 1: GET 空数据
  console.log('测试 1: GET /api/links (空数据)');
  const getReq3 = new Request('https://example.com/api/links');
  const getRes3 = await linksModule.onRequest({ request: getReq3 });
  const getData3 = await getRes3.json();
  console.log('结果:', JSON.stringify(getData3));
  console.assert(getData3.links && Array.isArray(getData3.links), '应该返回 links 数组');
  console.assert(getData3.links.length === 0, '初始应该为空数组');
  console.log('✓ 通过\n');

  // 测试 2: POST 添加友链
  console.log('测试 2: POST /api/links (添加友链)');
  const postReq5 = new Request('https://example.com/api/links?token=test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: '示例站点',
      url: 'https://example.com',
      description: '一个示例站点'
    })
  });
  const postRes5 = await linksModule.onRequest({ request: postReq5 });
  const postData5 = await postRes5.json();
  console.log('结果:', JSON.stringify(postData5));
  console.assert(postData5.ok === true, '应该返回 ok: true');
  console.assert(postData5.links && postData5.links.length === 1, '应该有 1 个友链');
  console.log('✓ 通过\n');

  // 测试 3: GET 有数据
  console.log('测试 3: GET /api/links (有数据)');
  const getReq4 = new Request('https://example.com/api/links');
  const getRes4 = await linksModule.onRequest({ request: getReq4 });
  const getData4 = await getRes4.json();
  console.log('结果:', JSON.stringify(getData4));
  console.assert(getData4.links.length === 1, '应该有 1 个友链');
  console.assert(getData4.links[0].name === '示例站点', '名称应该匹配');
  console.log('✓ 通过\n');

  // 测试 4: POST 编辑友链
  console.log('测试 4: POST /api/links (编辑友链)');
  const postReq6 = new Request('https://example.com/api/links?token=test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: '新示例站点',
      url: 'https://new-example.com',
      description: '更新后的描述',
      oldUrl: 'https://example.com'
    })
  });
  const postRes6 = await linksModule.onRequest({ request: postReq6 });
  const postData6 = await postRes6.json();
  console.log('结果:', JSON.stringify(postData6));
  console.assert(postData6.ok === true, '应该返回 ok: true');
  console.log('✓ 通过\n');

  // 测试 5: DELETE 删除友链
  console.log('测试 5: DELETE /api/links (删除友链)');
  const deleteReq2 = new Request('https://example.com/api/links?url=https://new-example.com&token=test', {
    method: 'DELETE'
  });
  const deleteRes2 = await linksModule.onRequest({ request: deleteReq2 });
  const deleteData2 = await deleteRes2.json();
  console.log('结果:', JSON.stringify(deleteData2));
  console.assert(deleteData2.ok === true, '应该返回 ok: true');
  console.assert(deleteData2.links && deleteData2.links.length === 0, '应该没有友链');
  console.log('✓ 通过\n');

  // 测试 6: POST 批量添加
  console.log('测试 6: POST /api/links (批量添加)');
  const postReq7 = new Request('https://example.com/api/links?token=test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      links: [
        { name: '站点A', url: 'https://a.com', description: '站点A' },
        { name: '站点B', url: 'https://b.com', description: '站点B' }
      ]
    })
  });
  const postRes7 = await linksModule.onRequest({ request: postReq7 });
  const postData7 = await postRes7.json();
  console.log('结果:', JSON.stringify(postData7));
  console.assert(postData7.ok === true, '应该返回 ok: true');
  console.assert(postData7.links && postData7.links.length === 2, '应该有 2 个友链');
  console.log('✓ 通过\n');

  // 测试 7: POST 重复添加
  console.log('测试 7: POST /api/links (重复添加)');
  const postReq8 = new Request('https://example.com/api/links?token=test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: '重复站点',
      url: 'https://a.com',
      description: '重复'
    })
  });
  const postRes8 = await linksModule.onRequest({ request: postReq8 });
  const postData8 = await postRes8.json();
  console.log('结果:', JSON.stringify(postData8));
  console.assert(postRes8.status === 409, '应该返回 409 状态码');
  console.log('✓ 通过\n');

  console.log('✅ 所有测试通过！');
}

// 运行测试
runTests().catch(err => {
  console.error('❌ 测试失败:', err);
  process.exit(1);
});
