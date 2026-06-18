// Pure math — no DOM, no getBoundingClientRect, no % units.
// All outputs are in stage pixels (1080×1920).

const STAGE_W = 1080;
const STAGE_H = 1920;

export type SlotPosition = { x: number; y: number; w: number; h: number };

export type ItemSize = { w: number; h: number };

export function radiatePositions(items: ItemSize[]): SlotPosition[] {
  const GAP_X = 24;
  const GAP_Y = 32;
  const maxRowW = STAGE_W - 160;

  const rows: number[][] = [[]];

  for (let i = 0; i < items.length; i++) {
    const lastRow = rows[rows.length - 1];
    const rowW = lastRow.reduce((sum, j) => sum + items[j].w + GAP_X, 0) - (lastRow.length ? GAP_X : 0);
    if (lastRow.length > 0 && rowW + GAP_X + items[i].w > maxRowW) {
      rows.push([i]);
    } else {
      lastRow.push(i);
    }
  }

  const rowH    = Math.max(...items.map(it => it.h));
  const totalH  = rows.length * rowH + (rows.length - 1) * GAP_Y;
  const startY  = (STAGE_H - totalH) / 2;

  const positions: SlotPosition[] = new Array(items.length);

  rows.forEach((row, rowIdx) => {
    const rowW = row.reduce((sum, j) => sum + items[j].w, 0) + (row.length - 1) * GAP_X;
    let x = (STAGE_W - rowW) / 2;
    const y = startY + rowIdx * (rowH + GAP_Y);
    row.forEach(idx => {
      positions[idx] = { x, y, w: items[idx].w, h: items[idx].h };
      x += items[idx].w + GAP_X;
    });
  });

  return positions;
}
