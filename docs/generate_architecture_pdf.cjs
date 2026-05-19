#!/usr/bin/env node
/**
 * 从架构 HTML 导出 PDF（横版 A4）。
 * 依赖：全局 puppeteer + 本机 Google Chrome
 *
 *   npm install -g puppeteer   # 建议 PUPPETEER_SKIP_DOWNLOAD=true
 *
 * 用法（在 docs 目录）：
 *   node generate_architecture_pdf.cjs
 *   node generate_architecture_pdf.cjs RBS_JAVA_ARCHITECTURE.html
 *   node generate_architecture_pdf.cjs RBS_JAVA_ARCHITECTURE.html out.pdf
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { pathToFileURL } = require('url');

const CHROME_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function loadPuppeteer() {
  try {
    return require('puppeteer');
  } catch {
    const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
    const globalPkg = path.join(globalRoot, 'puppeteer');
    if (!fs.existsSync(path.join(globalPkg, 'package.json'))) {
      console.error('未找到 puppeteer，请先执行：npm install -g puppeteer');
      process.exit(1);
    }
    return require(globalPkg);
  }
}

const puppeteer = loadPuppeteer();
const docsDir = __dirname;
const htmlFile = process.argv[2] || 'RBS_JAVA_ARCHITECTURE.html';
const htmlPath = path.join(docsDir, htmlFile);

if (!fs.existsSync(htmlPath)) {
  console.error('HTML not found:', htmlPath);
  process.exit(1);
}

if (!fs.existsSync(CHROME_PATH)) {
  console.error('未找到 Google Chrome:', CHROME_PATH);
  console.error('请安装 Chrome，或设置环境变量 PUPPETEER_EXECUTABLE_PATH');
  process.exit(1);
}

const baseName = path.basename(htmlFile, path.extname(htmlFile));
const outPath = path.join(docsDir, process.argv[3] || `${baseName}.pdf`);

const footerTemplate =
  '<div style="box-sizing:border-box;width:100%;padding:2px 10mm 0;font-size:9px;line-height:1.2;color:#64748B;text-align:center;font-family:-apple-system,\'PingFang SC\',\'Microsoft YaHei\',sans-serif;-webkit-print-color-adjust:exact;">' +
  '第 <span class="pageNumber"></span> 页 / 共 <span class="totalPages"></span> 页' +
  '</div>';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.emulateMediaType('print');
  await page.goto(pathToFileURL(htmlPath).href, {
    waitUntil: 'networkidle0',
    timeout: 120000,
  });
  await page.pdf({
    path: outPath,
    format: 'A4',
    landscape: true,
    preferCSSPageSize: true,
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate,
    margin: { top: '8mm', right: '8mm', bottom: '14mm', left: '8mm' },
  });
  await browser.close();
  console.log('PDF saved to:', outPath);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
