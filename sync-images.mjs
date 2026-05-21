// 把本地图片文件夹的 GitHub Raw URL 批量写入 KV
// 用法: node sync-images.mjs <文件夹名> [token]
// 示例: node sync-images.mjs jiege qunlin

const folder = process.argv[2] || 'jiege';
const token = process.argv[3] || 'qunlin';
const baseUrl = process.env.API_URL || 'https://api.usj.cc';

// jsDelivr CDN（国内有节点，自动同步 GitHub）
const GITHUB_RAW = 'https://cdn.jsdelivr.net/gh/zqlit/rss-robot@master/images';

import { readdir } from 'fs/promises';
import { join, extname } from 'path';

const localPath = join(process.cwd(), 'images', folder);

let files;
try {
  files = (await readdir(localPath)).filter((f) => {
    const ext = extname(f).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].includes(ext);
  });
} catch (err) {
  console.log(`错误: 文件夹不存在 "${localPath}"`);
  console.log('请先创建 images/' + folder + ' 并放入图片，然后 git push');
  process.exit(1);
}

if (files.length === 0) {
  console.log(`文件夹 images/${folder} 中没有图片文件`);
  process.exit(1);
}

// 生成 GitHub raw URL 列表
const urls = files.map((f) => `${GITHUB_RAW}/${folder}/${f}`);
console.log(`找到 ${files.length} 张图片:`);
urls.forEach((u) => console.log(`  ${u}`));

// 上传到 KV
try {
  const res = await fetch(`${baseUrl}/api/random-image?folder=${encodeURIComponent(folder)}&token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls }),
  });
  const json = await res.json();
  if (res.ok) {
    console.log(`\n完成! 已写入 KV: ${json.total} 张`);
    console.log(`测试: ${baseUrl}/api/random-image?folder=${folder}`);
  } else {
    console.log(`\n错误: ${json.error}`);
  }
} catch (err) {
  console.log(`\n网络错误: ${err.message}`);
}
