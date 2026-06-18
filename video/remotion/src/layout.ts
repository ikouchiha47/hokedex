// Pure math — no DOM, no getBoundingClientRect, no % units.
// All outputs are in stage pixels (1080×1920).

const STAGE_W = 1080;
const STAGE_H = 1920;
const CHIP_H = 88;
const CHIP_PADDING_X = 36;
const CHAR_WIDTH_APPROX = 28; // px per character at font-size 40px

export function chipWidth(label: string): number {
  // emoji + gap + text + padding both sides
  return 56 + 12 + label.length * CHAR_WIDTH_APPROX + CHIP_PADDING_X * 2;
}

export type SlotPosition = { x: number; y: number; w: number; h: number };

export function radiatePositions(labels: string[]): SlotPosition[] {
  // Arrange chips in rows, centered horizontally.
  // Rows centered vertically on stage.
  const GAP_X = 24;
  const GAP_Y = 32;

  const widths = labels.map(chipWidth);

  // Pack into rows that fit within STAGE_W - 80px margin each side
  const maxRowW = STAGE_W - 160;
  const rows: number[][] = [[]]; // indices per row

  for (let i = 0; i < labels.length; i++) {
    const lastRow = rows[rows.length - 1];
    const rowW = lastRow.reduce((sum, j) => sum + widths[j] + GAP_X, 0) - (lastRow.length ? GAP_X : 0);
    if (lastRow.length > 0 && rowW + GAP_X + widths[i] > maxRowW) {
      rows.push([i]);
    } else {
      lastRow.push(i);
    }
  }

  const totalH = rows.length * CHIP_H + (rows.length - 1) * GAP_Y;
  const startY = (STAGE_H - totalH) / 2;

  const positions: SlotPosition[] = new Array(labels.length);

  rows.forEach((row, rowIdx) => {
    const rowW = row.reduce((sum, j) => sum + widths[j], 0) + (row.length - 1) * GAP_X;
    let x = (STAGE_W - rowW) / 2;
    const y = startY + rowIdx * (CHIP_H + GAP_Y);
    row.forEach(chipIdx => {
      positions[chipIdx] = { x, y, w: widths[chipIdx], h: CHIP_H };
      x += widths[chipIdx] + GAP_X;
    });
  });

  return positions;
}
