#!/usr/bin/env node
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, 'remotion/public');
const SPEC_FILE  = path.join(__dirname, 'remotion/src/spec.ts');
const EDITOR_HTML = path.join(__dirname, 'editor.html');
const PORT = 4242;

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.html': 'text/html', '.js': 'application/javascript',
};

function serveAssets() {
  return fs.readdirSync(PUBLIC_DIR)
    .filter(f => ['.png','.jpg','.jpeg','.webp'].includes(path.extname(f).toLowerCase()))
    .sort();
}

function parseScenes() {
  const src = fs.readFileSync(SPEC_FILE, 'utf8');
  const scenes = [];
  // extract type and src/images from each scene block
  const blocks = src.split(/},\s*\{/);
  for (const block of blocks) {
    const typeMatch = block.match(/type:\s*['"](\w+)['"]/);
    const srcMatch  = block.match(/src:\s*['"]([^'"]+)['"]/);
    const imgMatch  = block.match(/images:\s*\[([^\]]+)\]/);
    const durMatch  = block.match(/duration:\s*([\d.]+)/);
    if (!typeMatch) continue;
    const scene = {
      type:     typeMatch[1],
      duration: durMatch ? parseFloat(durMatch[1]) : null,
      src:      srcMatch ? srcMatch[1] : null,
      images:   imgMatch ? imgMatch[1].match(/['"]([^'"]+)['"]/g)?.map(s => s.replace(/['"]/g,'')) : null,
    };
    scenes.push(scene);
  }
  return scenes;
}

// Patch elements into a scene by rewriting just the elements line
function saveElements(sceneIndex, elements) {
  const src = fs.readFileSync(SPEC_FILE, 'utf8');
  const lines = src.split('\n');

  // Find scene block boundaries by counting '  {' openers in the scenes array
  const sceneStarts = [];
  let inScenes = false;
  let depth = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/export const scenes/.test(l)) { inScenes = true; }
    if (!inScenes) continue;
    const opens  = (l.match(/\{/g) || []).length;
    const closes = (l.match(/\}/g) || []).length;
    const prevDepth = depth;
    depth += opens - closes;
    // depth 2 = inside a scene object (scenes array is depth 1)
    if (prevDepth === 1 && depth === 2) sceneStarts.push(i);
  }

  if (sceneIndex < 0 || sceneIndex >= sceneStarts.length) throw new Error('scene index out of range');

  const startLine = sceneStarts[sceneIndex];
  const endLine   = sceneIndex + 1 < sceneStarts.length ? sceneStarts[sceneIndex + 1] - 1 : lines.length - 1;

  // Remove existing elements lines in this scene block
  let sceneLines = lines.slice(startLine, endLine + 1);
  const elemStart = sceneLines.findIndex(l => /^\s*elements:\s*\[/.test(l));
  if (elemStart >= 0) {
    let elemEnd = elemStart;
    let d = 0;
    for (let i = elemStart; i < sceneLines.length; i++) {
      d += (sceneLines[i].match(/\[/g)||[]).length - (sceneLines[i].match(/\]/g)||[]).length;
      if (i > elemStart && d <= 0) { elemEnd = i; break; }
    }
    sceneLines.splice(elemStart, elemEnd - elemStart + 1);
  }

  // Build elements block indented to match scene body
  const indent = '    ';
  const elLines = JSON.stringify(elements, null, 2)
    .split('\n')
    .map((l, i) => i === 0 ? `${indent}elements: ${l}` : `${indent}${l}`);
  elLines[elLines.length - 1] += ',';

  // Insert before koFinish: or closing brace (transition removed from screenshot scenes)
  const insertBefore = sceneLines.findIndex(l => /^\s*(koFinish):/.test(l));
  if (insertBefore >= 0) {
    sceneLines.splice(insertBefore, 0, ...elLines);
  } else {
    const closingBrace = sceneLines.lastIndexOf(sceneLines.find((l, i) => i > 0 && /^\s*\},?/.test(l)));
    sceneLines.splice(closingBrace, 0, ...elLines);
  }

  const result = [...lines.slice(0, startLine), ...sceneLines, ...lines.slice(endLine + 1)];
  fs.writeFileSync(SPEC_FILE, result.join('\n'));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // API: asset list
  if (url.pathname === '/api/assets') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify(serveAssets()));
  }

  // API: save elements for a scene
  if (url.pathname === '/api/save' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const { sceneIndex, elements } = JSON.parse(body);
        saveElements(sceneIndex, elements);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true }));
      } catch(e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // API: scene list
  if (url.pathname === '/api/scenes') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    try { return res.end(JSON.stringify(parseScenes())); }
    catch(e) { return res.end(JSON.stringify([])); }
  }

  // Serve images from public/
  if (url.pathname.startsWith('/public/')) {
    const file = path.join(PUBLIC_DIR, url.pathname.slice(8));
    if (!file.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end(); }
    if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    return fs.createReadStream(file).pipe(res);
  }

  // Serve editor HTML
  if (url.pathname === '/' || url.pathname === '/editor.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return fs.createReadStream(EDITOR_HTML).pipe(res);
  }

  res.writeHead(404); res.end();
});

server.listen(PORT, () => {
  console.log(`hokédex editor → http://localhost:${PORT}`);
});
