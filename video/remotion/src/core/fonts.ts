import { delayRender, continueRender, staticFile } from 'remotion';
import { FontSource } from '../types';

// Loads all fonts declared in VideoConfig.fonts before rendering begins.
// Call once from Root.tsx via useFonts().
export async function loadFonts(fonts: FontSource[]): Promise<void> {
  await Promise.all(fonts.map(f => loadFont(f)));
}

async function loadFont(source: FontSource): Promise<void> {
  if (source.type === 'google') {
    const weights = source.weights ?? [400, 700, 800, 900];
    const weightStr = weights.join(';');
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(source.family)}:wght@${weightStr}&display=block`;
    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
    await document.fonts.ready;
    return;
  }

  if (source.type === 'url' || source.type === 'file') {
    const src  = source.type === 'file' ? staticFile(source.path) : source.url;
    const face = new FontFace(source.family, `url(${src})`, {
      weight: source.weight ? String(source.weight) : 'normal',
      style:  source.style ?? 'normal',
    });
    const loaded = await face.load();
    document.fonts.add(loaded);
  }
}

// React hook — call in Root before rendering scenes.
// Returns true once all fonts are loaded.
import { useState, useEffect } from 'react';

export function useFonts(fonts: FontSource[] | undefined): boolean {
  const [ready, setReady] = useState(!fonts || fonts.length === 0);
  const [handle]          = useState(() =>
    fonts && fonts.length > 0 ? delayRender('loading fonts') : null,
  );

  useEffect(() => {
    if (!fonts || fonts.length === 0) return;
    loadFonts(fonts).then(() => {
      setReady(true);
      if (handle !== null) continueRender(handle);
    });
  }, [handle]);

  return ready;
}
