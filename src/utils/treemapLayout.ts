import { DiskNode } from '../types/disk';

export interface TreemapTile {
  node: DiskNode;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Computes a squarified treemap layout inside a bounding box [0, 0, width, height]
 */
export function layoutSquarifiedTreemap(
  nodes: DiskNode[],
  width: number,
  height: number,
  padding: number = 2
): TreemapTile[] {
  if (!nodes || nodes.length === 0 || width <= 0 || height <= 0) {
    return [];
  }

  // Filter out zero-size nodes and sort descending
  const validNodes = nodes.filter((n) => n.size > 0).sort((a, b) => b.size - a.size);
  if (validNodes.length === 0) return [];

  const totalSize = validNodes.reduce((sum, n) => sum + n.size, 0);
  const totalArea = width * height;

  // Scale node sizes so sum of areas == totalArea
  const items = validNodes.map((n) => ({
    node: n,
    area: (n.size / totalSize) * totalArea,
  }));

  const tiles: TreemapTile[] = [];

  function worst(row: typeof items, sideLength: number): number {
    const rowArea = row.reduce((sum, it) => sum + it.area, 0);
    const side2 = sideLength * sideLength;
    const rowArea2 = rowArea * rowArea;
    let maxAspect = 0;

    for (const it of row) {
      const a = it.area;
      const aspect = Math.max((side2 * a) / rowArea2, rowArea2 / (side2 * a));
      if (aspect > maxAspect) maxAspect = aspect;
    }
    return maxAspect;
  }

  function layoutRow(row: typeof items, rx: number, ry: number, rw: number, rh: number, isHorizontal: boolean) {
    const rowArea = row.reduce((sum, it) => sum + it.area, 0);

    if (isHorizontal) {
      // Row spans full height `rh`, thickness is rowArea / rh
      const thickness = rowArea / rh;
      let currentY = ry;
      for (const it of row) {
        const itemHeight = it.area / thickness;
        tiles.push({
          node: it.node,
          x: rx + padding,
          y: currentY + padding,
          width: Math.max(1, thickness - padding * 2),
          height: Math.max(1, itemHeight - padding * 2),
        });
        currentY += itemHeight;
      }
    } else {
      // Row spans full width `rw`, thickness is rowArea / rw
      const thickness = rowArea / rw;
      let currentX = rx;
      for (const it of row) {
        const itemWidth = it.area / thickness;
        tiles.push({
          node: it.node,
          x: currentX + padding,
          y: ry + padding,
          width: Math.max(1, itemWidth - padding * 2),
          height: Math.max(1, thickness - padding * 2),
        });
        currentX += itemWidth;
      }
    }
  }

  function squarify(
    children: typeof items,
    currentRow: typeof items,
    rx: number,
    ry: number,
    rw: number,
    rh: number
  ) {
    if (children.length === 0) {
      if (currentRow.length > 0) {
        layoutRow(currentRow, rx, ry, rw, rh, rw < rh);
      }
      return;
    }

    const isHorizontal = rw < rh;
    const shortestSide = Math.min(rw, rh);
    const nextChild = children[0];

    const rowWithNext = [...currentRow, nextChild];

    if (currentRow.length === 0) {
      squarify(children.slice(1), rowWithNext, rx, ry, rw, rh);
    } else {
      const currentWorst = worst(currentRow, shortestSide);
      const nextWorst = worst(rowWithNext, shortestSide);

      if (nextWorst <= currentWorst) {
        squarify(children.slice(1), rowWithNext, rx, ry, rw, rh);
      } else {
        // Lay out current row and continue with the remaining space
        layoutRow(currentRow, rx, ry, rw, rh, isHorizontal);
        const rowArea = currentRow.reduce((sum, it) => sum + it.area, 0);

        if (isHorizontal) {
          const thickness = rowArea / rh;
          squarify(children, [], rx + thickness, ry, Math.max(0, rw - thickness), rh);
        } else {
          const thickness = rowArea / rw;
          squarify(children, [], rx, ry + thickness, rw, Math.max(0, rh - thickness));
        }
      }
    }
  }

  squarify(items, [], 0, 0, width, height);
  return tiles;
}
