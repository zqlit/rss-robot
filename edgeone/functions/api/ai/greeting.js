// GET  /api/ai/greeting?count=10&token=xxx     — 随机返回问候语
// POST /api/ai/greeting?token=xxx               — 词库管理：
//   { action: "config", deepseek_key: "sk-..." }  保存 DeepSeek API Key 到 KV
//   { action: "generate", count: 20 }              调用 DeepSeek 扩充词库
//   { pool: [...] }                                 手动替换词库
//
// KV: greetings_pool → [{ text, time, holiday }]
//     ai_config      → { deepseek_key: "sk-..." }

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

// 中国法定节日和常见节气（MM-DD）
const HOLIDAYS = {
  '01-01': '元旦',
  '02-14': '情人节',
  '03-08': '妇女节',
  '04-01': '愚人节',
  '05-01': '劳动节',
  '05-04': '青年节',
  '06-01': '儿童节',
  '10-01': '国庆节',
  '12-25': '圣诞节',
  // 农历节日（近似公历日期，每年需调整）
  'spring-festival': '春节',
};

function getTodayMMDD() {
  const now = new Date();
  return String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
}

function getTimeSlot() {
  const h = new Date().getHours();
  const d = new Date().getDay();
  if (d === 0 || d === 6) {
    if (h < 10) return 'weekend';
    if (h < 14) return 'weekend';
    if (h < 18) return 'weekend';
    if (h < 22) return 'weekend';
    return 'night';
  }
  if (h >= 6 && h < 9) return 'weekday-morning';
  if (h >= 9 && h < 12) return 'morning';
  if (h >= 12 && h < 14) return 'noon';
  if (h >= 14 && h < 18) return 'afternoon';
  if (h >= 18 && h < 22) return 'evening';
  return 'night';
}

// 默认问候词库
function defaultPool() {
  return [
    // --- 工作日早晨 ---
    { text: '早上好，今天的咖啡够浓吗', time: 'weekday-morning', holiday: null },
    { text: '新的一天，新的 bug 等着你', time: 'weekday-morning', holiday: null },
    { text: '周一的闹钟总是响得特别早', time: 'weekday-morning', holiday: null },
    { text: '周二了，距离周末还有 3 天', time: 'weekday-morning', holiday: null },
    { text: '周三，一周的折返点', time: 'weekday-morning', holiday: null },
    { text: '周四了，胜利在望', time: 'weekday-morning', holiday: null },
    { text: '周五早晨的空气都是甜的', time: 'weekday-morning', holiday: null },
    { text: '上班前来看看博客吧', time: 'weekday-morning', holiday: null },
    { text: '通勤路上，刷一篇好文章', time: 'weekday-morning', holiday: null },
    // --- 上午 ---
    { text: '阳光正好，写点什么吧', time: 'morning', holiday: null },
    { text: '一杯茶，一篇文章，一个上午', time: 'morning', holiday: null },
    { text: '灵感总在上午悄悄来访', time: 'morning', holiday: null },
    { text: '窗外鸟鸣，键盘轻敲', time: 'morning', holiday: null },
    // --- 午间 ---
    { text: '午饭吃好了吗，来读篇博客', time: 'noon', holiday: null },
    { text: '午休时间，偷得浮生一刻闲', time: 'noon', holiday: null },
    { text: '饱了才有力气写代码', time: 'noon', holiday: null },
    { text: '午餐后的惬意，属于博客时光', time: 'noon', holiday: null },
    // --- 下午 ---
    { text: '午后阳光很暖，文字也很温柔', time: 'afternoon', holiday: null },
    { text: '来杯下午茶，配一篇好博客', time: 'afternoon', holiday: null },
    { text: '不想工作的时候，就读博客吧', time: 'afternoon', holiday: null },
    { text: '下午三点，正是摸鱼好时光', time: 'afternoon', holiday: null },
    { text: '代码写累了，换个脑子', time: 'afternoon', holiday: null },
    // --- 傍晚 ---
    { text: '夕阳之下，该给今天收个尾了', time: 'evening', holiday: null },
    { text: '晚霞温柔，适合安静地读点东西', time: 'evening', holiday: null },
    { text: '下班了吗，博客等你回家', time: 'evening', holiday: null },
    { text: '暮色四合，一天又悄悄过去了', time: 'evening', holiday: null },
    // --- 深夜 ---
    { text: '夜深了，只有你还在折腾博客吧', time: 'night', holiday: null },
    { text: '凌晨三点，灵感比白天更活跃', time: 'night', holiday: null },
    { text: '熬夜冠军，博客世界永远亮着灯', time: 'night', holiday: null },
    { text: '星星都睡了，你的博客还醒着', time: 'night', holiday: null },
    { text: '深夜的代码写给自己看', time: 'night', holiday: null },
    { text: '失眠的夜晚，幸好有博客陪伴', time: 'night', holiday: null },
    // --- 周末 ---
    { text: '周末不用早起，但可以早起写博客', time: 'weekend', holiday: null },
    { text: '窝在沙发里，手机刷博客', time: 'weekend', holiday: null },
    { text: '周末的早晨，适合赖床和码字', time: 'weekend', holiday: null },
    { text: '终于有空了，把攒了一周的文章读完', time: 'weekend', holiday: null },
    { text: '周末宅家，博客是最好的伴侣', time: 'weekend', holiday: null },
    { text: '咖啡 + 面包 + 博客 = 完美周末', time: 'weekend', holiday: null },
    { text: '没有 deadline 的周末，写点想写的', time: 'weekend', holiday: null },
    // --- 节日 ---
    { text: '元旦快乐，新的一年从一篇博客开始', time: null, holiday: '01-01' },
    { text: '新年新气象，博客也要更新啦', time: null, holiday: '01-01' },
    { text: '元旦快乐，今年第一篇写什么', time: null, holiday: '01-01' },
    { text: '情人节快乐，代码和爱情可以兼得', time: null, holiday: '02-14' },
    { text: '今天不写代码，陪 ta 看看博客', time: null, holiday: '02-14' },
    { text: '三八妇女节，致敬所有闪闪发光的她', time: null, holiday: '03-08' },
    { text: '愚人节快乐，今天看到什么都别信', time: null, holiday: '04-01' },
    { text: '劳动节快乐，今天不写代码', time: null, holiday: '05-01' },
    { text: '五一劳动节，劳动者最光荣', time: null, holiday: '05-01' },
    { text: '五四青年节，趁年轻多写点博客', time: null, holiday: '05-04' },
    { text: '六一快乐，谁还不是个孩子呢', time: null, holiday: '06-01' },
    { text: '国庆快乐，祖国繁荣昌盛', time: null, holiday: '10-01' },
    { text: '假期余额不多，抓紧时间写博客', time: null, holiday: '10-01' },
    { text: '圣诞快乐，博客就是你的圣诞老人', time: null, holiday: '12-25' },
    { text: '圣诞夜，许个愿，明年博客涨粉', time: null, holiday: '12-25' },
    // --- 节气 ---
    { text: '立春了，博客也要焕发新生', time: null, holiday: '02-04' },
    { text: '春分时节，昼夜平分，灵感均分', time: null, holiday: '03-20' },
    { text: '夏至已至，白天很长，文章也可以很长', time: null, holiday: '06-21' },
    { text: '秋分，收获的季节，盘点一下今年的博客', time: null, holiday: '09-23' },
    { text: '冬至了，吃碗饺子暖暖心，写篇博客暖暖手', time: null, holiday: '12-22' },
    // --- 通用 ---
    { text: '又是美好的一天', time: null, holiday: null },
    { text: '今天想写点什么吗', time: null, holiday: null },
    { text: '来博客串个门吧', time: null, holiday: null },
    { text: '保持好奇心，世界不会无趣', time: null, holiday: null },
    { text: '你有多久没有好好写点东西了', time: null, holiday: null },
    { text: '每个博客都是一扇窗', time: null, holiday: null },
    { text: '写作是和自己的对话', time: null, holiday: null },
    { text: '今天遇到什么有趣的事了吗', time: null, holiday: null },
    { text: '读别人的故事，写自己的心情', time: null, holiday: null },
    { text: '博客是一个人的宇宙', time: null, holiday: null },
    { text: '别让灵感溜走，赶紧码下来', time: null, holiday: null },
    { text: '有人默默关注着你的博客呢', time: null, holiday: null },
    { text: '每个字都是时间的印记', time: null, holiday: null },
    { text: '博客不老，我们永远年轻', time: null, holiday: null },
  ];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// GET
async function handleGet(request) {
  if (typeof RSS_KV === 'undefined') return respond({ error: 'KV not configured' }, 500);

  const url = new URL(request.url);
  const count = Math.min(Math.max(parseInt(url.searchParams.get('count')) || 10, 1), 50);

  // 加载词库
  const raw = await RSS_KV.get('greetings_pool');
  const pool = raw ? JSON.parse(raw) : defaultPool();

  const today = getTodayMMDD();
  const slot = getTimeSlot();

  // 匹配优先级：节日精确匹配 > 节日前缀匹配 > 时段匹配 > 通用
  const holidayMatches = pool.filter((g) => g.holiday === today);
  const slotMatches = pool.filter((g) => !g.holiday && g.time === slot);
  const genericMatches = pool.filter((g) => !g.holiday && !g.time);

  // 节日匹配优先出现，然后时段匹配，再填充通用
  let result = shuffle(holidayMatches).slice(0, Math.ceil(count * 0.3));
  result = result.concat(shuffle(slotMatches).slice(0, count - result.length));
  result = result.concat(shuffle(genericMatches).slice(0, count - result.length));

  return respond({ greetings: shuffle(result).slice(0, count) });
}

// 调用 DeepSeek API 生成新问候语
async function callDeepSeek(apiKey, count) {
  const today = getTodayMMDD();
  const slot = getTimeSlot();
  const slotNames = {
    'weekday-morning': '工作日早晨', morning: '上午', noon: '中午',
    afternoon: '下午', evening: '傍晚', night: '深夜', weekend: '周末',
  };

  const prompt = `你是"优世界"博客的AI助手。请生成${count}条新的博客问候语，每条15字以内，语气轻松温暖幽默。

当前场景：${slotNames[slot] || slot}，日期 ${today}。
覆盖这些时段至少各2条：早晨、中午、下午、傍晚、深夜、周末。
再覆盖几个中国节日（元旦、春节、劳动节、国庆、圣诞等）和节气各2条。
确保每条都不重复、不跟已有词库雷同。

返回纯JSON数组：
[{"text":"问候语","time":"morning","holiday":null}]
time 可选: morning/noon/afternoon/evening/night/weekday-morning/weekend
holiday 为 MM-DD 格式或 null`;

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
      temperature: 0.9,
    }),
  });

  const json = await res.json();
  if (json.error) {
    throw new Error(`DeepSeek API: ${json.error.message}`);
  }

  const text = json.choices?.[0]?.message?.content || '';
  // 提取 JSON 数组
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('AI 返回格式异常，未找到 JSON 数组');

  const generated = JSON.parse(match[0]);
  if (!Array.isArray(generated)) throw new Error('AI 返回的不是数组');

  return generated.filter((g) => g.text && g.text.length <= 20);
}

// POST — 词库管理（需口令）
// { action: "config", deepseek_key: "sk-..." }  保存 API Key
// { action: "generate", count: 20 }             调用 DeepSeek 扩充词库
// { pool: [...] }                                手动替换词库
async function handlePost(request) {
  if (typeof RSS_KV === 'undefined') return respond({ error: 'KV not configured' }, 500);

  let body;
  try { body = await request.json(); } catch { return respond({ error: 'invalid json' }, 400); }

  // 保存 DeepSeek API Key
  if (body.action === 'config') {
    if (!body.deepseek_key) return respond({ error: '请提供 deepseek_key' }, 400);
    await RSS_KV.put('ai_config', JSON.stringify({ deepseek_key: body.deepseek_key }));
    return respond({ ok: true, message: 'DeepSeek API Key 已保存' });
  }

  // 调用 DeepSeek 生成
  if (body.action === 'generate') {
    const count = Math.min(body.count || 10, 30);

    // 读取 API Key
    let apiKey = body.deepseek_key;
    if (!apiKey) {
      const configRaw = await RSS_KV.get('ai_config');
      if (configRaw) {
        try { apiKey = JSON.parse(configRaw).deepseek_key; } catch {}
      }
    }
    if (!apiKey) return respond({ error: '请先配置 DeepSeek API Key: POST { action: "config", deepseek_key: "sk-..." }' }, 400);

    try {
      const generated = await callDeepSeek(apiKey, count);

      // 读取现有词库并合并
      const raw = await RSS_KV.get('greetings_pool');
      const pool = raw ? JSON.parse(raw) : defaultPool();

      // 去重：text 相同的跳过
      const existing = new Set(pool.map((g) => g.text));
      let added = 0;
      for (const g of generated) {
        if (!existing.has(g.text)) {
          pool.push({ text: g.text, time: g.time || null, holiday: g.holiday || null });
          existing.add(g.text);
          added++;
        }
      }

      await RSS_KV.put('greetings_pool', JSON.stringify(pool));
      return respond({ ok: true, generated: generated.length, added, total: pool.length, message: `AI 生成 ${generated.length} 条，新增 ${added} 条，词库共 ${pool.length} 条` });
    } catch (err) {
      return respond({ error: err.message }, 500);
    }
  }

  // 手动替换词库
  const pool = body.pool && Array.isArray(body.pool) ? body.pool : defaultPool();
  await RSS_KV.put('greetings_pool', JSON.stringify(pool));
  return respond({ ok: true, total: pool.length, message: '词库已更新' });
}

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  switch (request.method) {
    case 'GET':
      if (!(await requireAuth(request))) return respond({ error: 'unauthorized' }, 401);
      return handleGet(request);
    case 'POST':
      if (!(await requireAuth(request))) return respond({ error: 'unauthorized' }, 401);
      return handlePost(request);
    default:
      return respond({ error: 'method not allowed' }, 405);
  }
}
