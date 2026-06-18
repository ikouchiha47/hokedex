#!/usr/bin/env node
const puppeteer = require('puppeteer');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const FPS = 30;

const VIDEOS = [
  { html: 'video1.html', name: 'hokedex_short1', duration: 28 },
];

async function renderVideo({ html, name, duration }) {
  console.log(`\n▶ ${name} (${duration}s @ ${FPS}fps)`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--allow-file-access-from-files',
      '--font-render-hinting=none',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });

  const url = `file://${path.resolve(__dirname, html)}`;
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForFunction('window.timelineReady === true', { timeout: 20000 });

  const framesDir = path.resolve(__dirname, `_frames_${name}`);
  if (fs.existsSync(framesDir)) fs.rmSync(framesDir, { recursive: true });
  fs.mkdirSync(framesDir);

  const total = Math.ceil(duration * FPS);

  for (let i = 0; i < total; i++) {
    const t = i / FPS;
    await page.evaluate(t => window.tl.seek(t, false), t);
    await new Promise(r => setTimeout(r, 20));
    await page.screenshot({ path: path.join(framesDir, `f${String(i).padStart(5,'0')}.png`) });
    if (i % FPS === 0 || i === total - 1) {
      process.stdout.write(`\r  frame ${i+1}/${total}  (${t.toFixed(1)}s)`);
    }
  }

  console.log('\n  encoding...');
  execSync([
    'ffmpeg -y',
    `-r ${FPS}`,
    `-i "${framesDir}/f%05d.png"`,
    '-c:v libx264 -pix_fmt yuv420p -crf 17 -preset slow',
    `-vf "scale=1080:1920"`,
    `"${name}.mp4"`,
  ].join(' '), { stdio: 'inherit', cwd: __dirname });

  fs.rmSync(framesDir, { recursive: true });
  await browser.close();
  console.log(`  ✓ ${name}.mp4`);
}

(async () => {
  const filter = process.argv[2];
  const targets = filter ? VIDEOS.filter(v => v.html.includes(filter) || v.name.includes(filter)) : VIDEOS;
  if (!targets.length) { console.error('No matching videos'); process.exit(1); }
  for (const v of targets) await renderVideo(v);
})().catch(err => { console.error(err); process.exit(1); });
