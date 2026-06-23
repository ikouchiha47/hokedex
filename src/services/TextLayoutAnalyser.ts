export type BoundingBox = { x: number; y: number; width: number; height: number }

export type TextLine = {
  text: string
  boundingBox: BoundingBox
  confidence: number
}

export type TextBlock = {
  text: string
  boundingBox: BoundingBox
  script: string | null
  lines: TextLine[]
}

export type TextResult = {
  type: 'TEXT_RESULT'
  fullText: string
  blocks: TextBlock[]
}

function area(bb: BoundingBox): number {
  return bb.width * bb.height
}

function centroid(bb: BoundingBox): { cx: number; cy: number } {
  return { cx: bb.x + bb.width / 2, cy: bb.y + bb.height / 2 }
}

function distance(a: BoundingBox, b: BoundingBox): number {
  const ca = centroid(a)
  const cb = centroid(b)
  return Math.sqrt((ca.cx - cb.cx) ** 2 + (ca.cy - cb.cy) ** 2)
}

export function sortByReadingOrder(blocks: TextBlock[]): TextBlock[] {
  return [...blocks].sort((a, b) => {
    const rowDiff = a.boundingBox.y - b.boundingBox.y
    if (Math.abs(rowDiff) > a.boundingBox.height * 0.5) return rowDiff
    return a.boundingBox.x - b.boundingBox.x
  })
}

export function dominantText(blocks: TextBlock[]): TextBlock | null {
  if (blocks.length === 0) return null
  return blocks.reduce((best, block) =>
    area(block.boundingBox) > area(best.boundingBox) ? block : best
  )
}

export function groupByProximity(blocks: TextBlock[], threshold = 0.05): TextBlock[][] {
  const remaining = [...blocks]
  const groups: TextBlock[][] = []

  while (remaining.length > 0) {
    const group = [remaining.shift()!]
    let i = 0
    while (i < remaining.length) {
      const close = group.some(g => distance(g.boundingBox, remaining[i].boundingBox) < threshold)
      if (close) {
        group.push(remaining.splice(i, 1)[0])
      } else {
        i++
      }
    }
    groups.push(group)
  }

  return groups
}

export function extractColumns(blocks: TextBlock[], tolerance = 0.02): TextBlock[][] {
  const sorted = sortByReadingOrder(blocks)
  const columns: TextBlock[][] = []

  for (const block of sorted) {
    const col = columns.find(c =>
      c.some(b => Math.abs(b.boundingBox.x - block.boundingBox.x) < tolerance)
    )
    if (col) {
      col.push(block)
    } else {
      columns.push([block])
    }
  }

  return columns
}
