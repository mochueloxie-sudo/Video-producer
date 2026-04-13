#!/usr/bin/env node
/**
 * 本地静态服务：用于预览 step6 产出的 presentation.html（iframe 加载同目录 page_*.html）。
 * file:// 下子 frame 常被浏览器拦截，需 http://127.0.0.1 访问。
 *
 * 用法（在项目根）：
 *   npm run preview:html -- ./output
 *   npm run preview:html -- ./verify_notebook_shell 8766
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.resolve(process.argv[2] || './output');
const port = Math.min(65535, Math.max(1, Number(process.argv[3]) || 8765));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

function resolveUnderRoot(rootDir, pathname) {
  const raw = decodeURIComponent((pathname || '/').split('?')[0]);
  const rel = raw.replace(/^\/+/, '') || '';
  const candidate = path.resolve(path.join(rootDir, rel));
  const rootResolved = path.resolve(rootDir);
  const prefix = rootResolved.endsWith(path.sep) ? rootResolved : rootResolved + path.sep;
  if (candidate !== rootResolved && !candidate.startsWith(prefix)) return null;
  return candidate;
}

if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
  console.error(`目录不存在或不是文件夹: ${root}`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  let filePath = resolveUnderRoot(root, req.url || '/');
  if (!filePath) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    const idx = path.join(filePath, 'presentation.html');
    filePath = fs.existsSync(idx) ? idx : path.join(filePath, 'index.html');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = err.code === 'ENOENT' ? 404 : 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(err.code === 'ENOENT' ? 'Not found' : String(err.message));
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.end(data);
  });
});

server.listen(port, '127.0.0.1', () => {
  const base = `http://127.0.0.1:${port}`;
  console.log(`slide-forge 预览: ${root}`);
  console.log(`  ${base}/presentation.html`);
  console.log(`  （或 ${pathToFileURL(path.join(root, 'page_001.html')).href} 单页调试）`);
  console.log('Ctrl+C 结束');
});
