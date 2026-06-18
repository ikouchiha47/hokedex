#!/usr/bin/env node
// Collect assets from URLs or local paths into a destination directory,
// and record what was collected in a YAML manifest.
//
// Usage:
//   node scripts/collect-assets.js \
//     --dest    <dir>          destination directory (required)
//     --manifest <file>        YAML manifest path (required)
//     --name <key> --src <url-or-path>  (one or more pairs)
//
// Example:
//   node scripts/collect-assets.js \
//     --dest    remotion/public/<project> \
//     --manifest remotion/src/projects/<project>/assets.yaml \
//     --name profile --src /Downloads/photo.png \
//     --name hero    --src https://example.com/banner.jpg

const fs    = require('fs');
const path  = require('path');
const https = require('https');
const http  = require('http');

// ── arg parsing ──────────────────────────────────────────────────────────────

function parseArgs(argv) {
  let dest = null, manifest = null;
  const pairs = [];

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dest'     && argv[i + 1]) { dest     = argv[++i]; continue; }
    if (argv[i] === '--manifest' && argv[i + 1]) { manifest = argv[++i]; continue; }
    if (argv[i] === '--name' && argv[i + 1] && argv[i + 2] === '--src' && argv[i + 3]) {
      pairs.push({ name: argv[i + 1], src: argv[i + 3] });
      i += 3;
    }
  }

  return { dest, manifest, pairs };
}

// ── download (follows one redirect) ─────────────────────────────────────────

function download(url, destPath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const file   = fs.createWriteStream(destPath);

    client.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        try { fs.unlinkSync(destPath); } catch (_) {}
        return download(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        try { fs.unlinkSync(destPath); } catch (_) {}
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', reject);
    }).on('error', reject);
  });
}

// ── YAML manifest (no external deps) ────────────────────────────────────────

function readManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) return {};
  const assets = {};
  let current  = null;
  for (const line of fs.readFileSync(manifestPath, 'utf8').split('\n')) {
    const key   = line.match(/^  ([\w-]+):$/);
    const field = line.match(/^    (\w+): (.+)$/);
    if (key)                   { current = key[1]; assets[current] = {}; }
    else if (field && current) { assets[current][field[1]] = field[2]; }
  }
  return assets;
}

function writeManifest(manifestPath, assets) {
  const lines = ['assets:'];
  for (const [key, val] of Object.entries(assets)) {
    lines.push(`  ${key}:`);
    for (const [k, v] of Object.entries(val)) {
      lines.push(`    ${k}: ${v}`);
    }
  }
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, lines.join('\n') + '\n');
}

// ── main ─────────────────────────────────────────────────────────────────────

async function collect({ dest, manifest, pairs }) {
  if (!dest || !manifest) {
    console.error('--dest and --manifest are required');
    process.exit(1);
  }
  if (pairs.length === 0) {
    console.error('No assets specified. Use --name <key> --src <url-or-path>');
    process.exit(1);
  }

  const destDir = path.resolve(dest);
  fs.mkdirSync(destDir, { recursive: true });

  const manifestPath = path.resolve(manifest);
  const assets       = readManifest(manifestPath);
  let   ok = 0, fail = 0;

  for (const { name, src } of pairs) {
    const ext      = path.extname(src.split('?')[0]) || '.png';
    const filename = `${name}${ext}`;
    const fileDest = path.join(destDir, filename);
    const isUrl    = /^https?:\/\//.test(src);

    process.stdout.write(`  [${name}] `);
    try {
      if (isUrl) {
        await download(src, fileDest);
      } else {
        fs.copyFileSync(path.resolve(src), fileDest);
      }
      // record relative path from manifest file's directory
      const relFile = path.relative(path.dirname(manifestPath), fileDest);
      assets[name] = isUrl
        ? { file: relFile, source: src, type: 'url' }
        : { file: relFile, type: 'local' };
      console.log(`→ ${relFile}`);
      ok++;
    } catch (e) {
      console.error(`FAILED: ${e.message}`);
      fail++;
    }
  }

  writeManifest(manifestPath, assets);
  console.log(`\n${ok} collected, ${fail} failed`);
  console.log(`Manifest: ${manifestPath}`);
}

const args = parseArgs(process.argv.slice(2));
collect(args).catch(e => { console.error(e.message); process.exit(1); });
