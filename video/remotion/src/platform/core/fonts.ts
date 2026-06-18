import { useState, useEffect } from 'react';
import { delayRender, continueRender, staticFile } from 'remotion';
import { FontSource } from '../types';

// How long to wait for any single font before giving up and continuing.
// Remotion's own render timeout is typically 30s — stay well under it.
const FONT_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`font load timeout (${ms}ms): ${label}`)), ms),
    ),
  ]);
}

async function loadGoogleFont(source: Extract<FontSource, { type: 'google' }>): Promise<void> {
  const weights   = source.weights ?? [400, 700, 800, 900];
  const weightStr = weights.map(w => `0,${w}`).join(';');
  const url       = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(source.family)}:wght@${weightStr}&display=block`;

  // Step 1: fetch and inject the CSS stylesheet.
  // Using fetch() gives us a real error instead of a silent <link> failure.
  let css: string;
  try {
    const res = await withTimeout(fetch(url), FONT_TIMEOUT_MS, `${source.family} stylesheet`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    css = await res.text();
  } catch (e) {
    throw new Error(`Google Fonts unavailable for "${source.family}": ${e}`);
  }

  // Step 2: inject the CSS so the browser knows the @font-face rules.
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // Step 3: wait for the specific font faces to finish downloading.
  // document.fonts.load() targets only this family — not all fonts.
  const loadPromises = weights.map(w =>
    document.fonts.load(`${w} 1em "${source.family}"`),
  );
  await withTimeout(Promise.all(loadPromises), FONT_TIMEOUT_MS, source.family);
}

async function loadLocalFont(source: Extract<FontSource, { type: 'url' | 'file' }>): Promise<void> {
  const src  = source.type === 'file' ? staticFile(source.path) : source.url;
  const face = new FontFace(source.family, `url(${src})`, {
    weight: source.weight ? String(source.weight) : 'normal',
    style:  source.style  ?? 'normal',
  });
  const loaded = await withTimeout(face.load(), FONT_TIMEOUT_MS, `${source.family} from ${src}`);
  (document.fonts as any).add(loaded);
}

async function loadFont(source: FontSource): Promise<void> {
  try {
    if (source.type === 'google') {
      await loadGoogleFont(source);
    } else {
      await loadLocalFont(source);
    }
  } catch (e) {
    // Non-fatal: log and continue. The render will use the CSS fallback font stack.
    console.warn(`[fonts] "${(source as any).family}" failed to load — rendering with fallback.`, e);
  }
}

// Load all fonts concurrently. Each failure is isolated — others still load.
export async function loadFonts(fonts: FontSource[]): Promise<void> {
  await Promise.all(fonts.map(loadFont));
}

// React hook for use in VideoPlayer. Calls delayRender until fonts resolve.
// continueRender fires in `finally` — guaranteed even if a font errors or times out.
export function useFonts(fonts: FontSource[] | undefined): boolean {
  const [ready, setReady] = useState(!fonts || fonts.length === 0);
  const [handle]          = useState(() =>
    fonts && fonts.length > 0 ? delayRender('loading fonts') : null,
  );

  useEffect(() => {
    if (!fonts || fonts.length === 0) return;
    loadFonts(fonts).finally(() => {
      setReady(true);
      if (handle !== null) continueRender(handle);
    });
  }, [handle]);

  return ready;
}
