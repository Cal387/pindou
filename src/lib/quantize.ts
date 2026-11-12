import { ciede2000, type Lab } from './color'

export const EMPTY = -1

/** 在 candidates（色卡下标列表）里找和 lab 色差最小的颜色 */
export function nearest(lab: Lab, paletteLabs: Lab[], candidates: number[]): number {
  let best = candidates[0]
  let bestD = Infinity
  for (let k = 0; k < candidates.length; k++) {
    const idx = candidates[k]
    const p = paletteLabs[idx]
    const d = ciede2000(lab[0], lab[1], lab[2], p[0], p[1], p[2])
    if (d < bestD) {
      bestD = d
      best = idx
    }
  }
  return best
}

/**
 * 把每个格子匹配到色卡，并把颜色数限制在 maxColors 以内。
 *
 * 做法：先全部匹配到可用色卡；如果颜色种类超出上限，就反复把用量最少的
 * 颜色剔除，把原来用它的格子重新匹配到剩下的颜色，直到不超过上限。
 *
 * @param labs 每个格子的 Lab 颜色
 * @param empty 为 1 的格子不放豆子
 * @param allowed 可用的色卡下标（已按色系开关过滤）
 * @returns 每格的色卡下标，空格为 EMPTY
 */
export function quantize(
  labs: Lab[],
  empty: Uint8Array,
  paletteLabs: Lab[],
  allowed: number[],
  maxColors: number,
): Int16Array {
  const n = labs.length
  const cells = new Int16Array(n).fill(EMPTY)
  if (allowed.length === 0) return cells

  // 相同的 Lab 只算一次
  const cache = new Map<string, number>()
  const counts = new Map<number, number>()
  for (let i = 0; i < n; i++) {
    if (empty[i]) continue
    const lab = labs[i]
    const key = `${lab[0].toFixed(2)},${lab[1].toFixed(2)},${lab[2].toFixed(2)}`
    let idx = cache.get(key)
    if (idx === undefined) {
      idx = nearest(lab, paletteLabs, allowed)
      cache.set(key, idx)
    }
    cells[i] = idx
    counts.set(idx, (counts.get(idx) ?? 0) + 1)
  }

  const limit = Math.max(1, maxColors)
  while (counts.size > limit) {
    // 用量最少的颜色；用量相同时剔除下标大的，保证结果稳定
    let victim = -1
    let min = Infinity
    for (const [idx, c] of counts) {
      if (c < min || (c === min && idx > victim)) {
        min = c
        victim = idx
      }
    }
    counts.delete(victim)
    const remaining = [...counts.keys()]
    for (let i = 0; i < n; i++) {
      if (cells[i] !== victim) continue
      const idx = nearest(labs[i], paletteLabs, remaining)
      cells[i] = idx
      counts.set(idx, counts.get(idx)! + 1)
    }
  }
  return cells
}
