import { deltaE, type Lab } from './color'

/**
 * 去背景：从四个角出发做 flood fill（四连通）。
 * 和出发角的颜色色差小于 threshold 的连通区域标记为背景（返回的数组里为 1）。
 *
 * @param labs 每个格子的 Lab 颜色，长度 = cols * rows
 * @param skip 已经是空格的位置（例如透明像素），flood fill 可以穿过它们
 */
export function detectBackground(
  labs: Lab[],
  cols: number,
  rows: number,
  threshold: number,
  skip?: Uint8Array,
): Uint8Array {
  const mask = new Uint8Array(cols * rows)
  const corners = [0, cols - 1, (rows - 1) * cols, rows * cols - 1]
  const stack: number[] = []

  for (const start of corners) {
    if (mask[start]) continue
    const seed = labs[start]
    const visited = new Uint8Array(cols * rows)
    stack.push(start)
    visited[start] = 1
    while (stack.length) {
      const i = stack.pop()!
      const transparent = skip ? skip[i] === 1 : false
      if (!transparent && deltaE(labs[i], seed) >= threshold) continue
      mask[i] = 1
      const x = i % cols
      const y = (i - x) / cols
      if (x > 0 && !visited[i - 1]) { visited[i - 1] = 1; stack.push(i - 1) }
      if (x < cols - 1 && !visited[i + 1]) { visited[i + 1] = 1; stack.push(i + 1) }
      if (y > 0 && !visited[i - cols]) { visited[i - cols] = 1; stack.push(i - cols) }
      if (y < rows - 1 && !visited[i + cols]) { visited[i + cols] = 1; stack.push(i + cols) }
    }
  }
  return mask
}
