/**
 * Grid Image Splitter
 *
 * Splits a composite grid image (e.g., 2×2 story board panels) into
 * individual cell images using Sharp.
 *
 * Each cell gets a sequential index (row-major order) and is saved as PNG.
 */
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join, resolve } from 'path';

const DATA_DIR = resolve(process.cwd(), 'data', 'static', 'grid-cells');

export interface SplitResult {
  index: number;
  localPath: string;
  width: number;
  height: number;
}

/**
 * Split a grid image into individual cells.
 *
 * @param imagePath Absolute path or path relative to data dir
 * @param rows Number of rows in the grid
 * @param cols Number of columns in the grid
 * @returns Array of cell results with local paths (relative to data/static)
 */
export async function splitGridImage(
  imagePath: string,
  rows: number,
  cols: number,
): Promise<SplitResult[]> {
  const absPath = imagePath.startsWith('/')
    ? imagePath
    : resolve(process.cwd(), 'data', imagePath);

  const image = sharp(absPath);
  const meta = await image.metadata();
  if (!meta.width || !meta.height) {
    throw new Error('Cannot read image dimensions from ' + imagePath);
  }

  const cellW = Math.floor(meta.width / cols);
  const cellH = Math.floor(meta.height / rows);

  if (cellW < 1 || cellH < 1) {
    throw new Error(
      `Grid dimensions ${rows}x${cols} exceed image size ${meta.width}x${meta.height}`,
    );
  }

  mkdirSync(DATA_DIR, { recursive: true });

  const results: SplitResult[] = [];
  const ts = Date.now();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const index = r * cols + c;
      const fileName = `cell_${ts}_${index}.png`;
      const outPath = join(DATA_DIR, fileName);

      await sharp(absPath)
        .extract({
          left: c * cellW,
          top: r * cellH,
          width: cellW,
          height: cellH,
        })
        .toFile(outPath);

      results.push({
        index,
        localPath: `grid-cells/${fileName}`,
        width: cellW,
        height: cellH,
      });
    }
  }

  return results;
}
