/**
 * Puppeteer 批量截图工具（兼容 v24）
 * 用法：node screenshot.js slide-01.html slide-02.html ...
 * 输出：同目录下的 slide-01.png
 */

const puppeteer = require('puppeteer');
const path = require('path');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const htmlFiles = process.argv.slice(2);
  if (htmlFiles.length === 0) {
    console.error('❌ 请提供 HTML 文件路径');
    process.exit(1);
  }

  console.log(`📸 启动 Puppeteer，截图 ${htmlFiles.length} 页...`);

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  for (const htmlFile of htmlFiles) {
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });

      // 加载本地文件
      const fileUrl = 'file://' + path.resolve(htmlFile);
      await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });

      // 等待字体/资源加载（Google Fonts 可能需要较长时间）
      await sleep(3000);  // 3 秒确保字体下载完成

      // 截图
      const pngPath = htmlFile.replace('.html', '.png');
      await page.screenshot({
        path: pngPath,
        fullPage: true,
        type: 'png'
      });

      console.log(`  ✅ ${path.basename(htmlFile)} → ${path.basename(pngPath)}`);
      await page.close();
    } catch (err) {
      console.error(`  ❌ ${htmlFile} 截图失败: ${err.message}`);
    }
  }

  await browser.close();
  console.log('✅ 截图完成');
})().catch(err => {
  console.error('❌ Puppeteer 异常:', err);
  process.exit(1);
});
