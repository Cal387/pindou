import { deltaE, type Lab } from './color'
import { EMPTY } from './quantize'

/**
 * 每档强度的规则：
 * - maxDelta：只有当"孤立豆子"和要替换成的颜色色差小于这个值才合并。
 *   眼睛、嘴唇这类细节和周围肤色的色差通常很大，所以会被保留；
 *   而渐变区域里的杂点和周围色差小，会被合并。
 * - diagonal：为 true 时，斜对角有同色豆子也仍然算孤立（更激进）。
 */
const LEVELS = [
  null,
  { maxDelta: 10, diagonal: false },
  { maxDelta: 18, diagonal: false },
  { maxDelta: 28, diagonal: true },
  { maxDelta: Infinity, diagonal: true },
] as const

export const MAX_DESPECKLE = LEVELS.length - 1

/**
 * 去杂点：把孤立的单颗异色豆子合并到周围最多的颜色。
 * @param strength 0 = 关闭，1–4 越大越强
 * @returns 新的 cells 数组（不修改传入的）
 */
export function despeckle(
  cells: Int16Array,
  cols: number,
  rows: number,
  paletteLabs: Lab[],
  strength: number,
): Int16Array {
  const level = LEVELS[Math.max(0, Math.min(MAX_DESPECKLE, Math.round(strength)))]
  if (!level) return cells
  const out = new Int16Array(cells)
  const tally = new Map<number, number>()

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x
      const me = cells[i]
      if (me === EMPTY) continue

      tally.clear()
      let sameSide = 0
      let sameDiag = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
          const c = cells[ny * cols + nx]
          if (c === me) {
            if (dx === 0 || dy === 0) sameSide++
            else sameDiag++
          } else if (c !== EMPTY) {
            // 上下左右的邻居权重更高
            tally.set(c, (tally.get(c) ?? 0) + (dx === 0 || dy === 0 ? 2 : 1))
          }
        }
      }
      const isolated = sameSide === 0 && (level.diagonal ? sameDiag <= 1 : sameDiag === 0)
      if (!isolated || tally.size === 0) continue

      let best = EMPTY
      let bestW = 0
      for (const [c, w] of tally) {
        if (w > bestW) {
          bestW = w
          best = c
        }
      }
      // 周围得有一个占明显多数的颜色（至少相当于 2 个正邻居 + 1 个斜邻居）
      if (bestW < 5) continue
      if (deltaE(paletteLabs[me], paletteLabs[best]) < level.maxDelta) out[i] = best
    }
  }
  return out
}
