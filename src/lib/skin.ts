import type { Lab } from './color'

function smoothstep(lo: number, hi: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - lo) / (hi - lo)))
  return t * t * (3 - 2 * t)
}

/**
 * 一个颜色"像不像肤色"，0–1。
 * 肤色在 Lab 里的色相集中在橙色一带（约 30°–70°），彩度适中，且不会太暗。
 * 太暗的（黑发、深色衣服）权重为 0，不会被当成肤色。
 */
export function skinWeight(lab: Lab): number {
  const [L, a, b] = lab
  const chroma = Math.hypot(a, b)
  let hue = (Math.atan2(b, a) * 180) / Math.PI
  if (hue < 0) hue += 360
  const hueW = smoothstep(22, 34, hue) * (1 - smoothstep(70, 85, hue))
  // 彩度太高的（嘴唇、腮红、橙色物体）不算肤色，避免把嘴唇也抹淡
  const chromaW = smoothstep(8, 16, chroma) * (1 - smoothstep(40, 55, chroma))
  return hueW * chromaW * smoothstep(22, 38, L)
}

/**
 * 肤色柔和：减轻脸上的阴影。
 *
 * 先找出画面里肤色的"正常亮度"（肤色格子里偏亮的那部分），
 * 再把比它暗的肤色格子往这个亮度拉近，同时把偏红偏棕的阴影颜色往正常肤色靠。
 * 比正常肤色暗太多的格子（多半是头发、眉毛、眼睛）不动，高光也不动。
 *
 * @param strength 0–1，0 不处理
 * @returns 新数组，不修改传入的 labs
 */
export function softenSkin(labs: Lab[], empty: Uint8Array, strength: number): Lab[] {
  if (strength <= 0) return labs
  const s = Math.min(1, strength)

  const weights = new Float32Array(labs.length)
  const skin: number[] = []
  let filled = 0
  for (let i = 0; i < labs.length; i++) {
    if (empty[i]) continue
    filled++
    const w = skinWeight(labs[i])
    weights[i] = w
    if (w > 0.5) skin.push(i)
  }
  // 肤色太少（不是人像）就不处理
  if (skin.length < Math.max(4, filled * 0.02)) return labs

  // 参考肤色：肤色格子按亮度排序，取第 70 百分位附近的一段求平均
  skin.sort((x, y) => labs[x][0] - labs[y][0])
  const from = Math.floor(skin.length * 0.6)
  const to = Math.max(from + 1, Math.floor(skin.length * 0.8))
  let refL = 0, refA = 0, refB = 0
  for (let k = from; k < to; k++) {
    const c = labs[skin[k]]
    refL += c[0]
    refA += c[1]
    refB += c[2]
  }
  const n = to - from
  refL /= n
  refA /= n
  refB /= n

  // 比参考亮度暗多少以内算"脸上的阴影"；强度越大，管得越深
  const reach = 18 + 14 * s
  return labs.map((lab, i) => {
    const w = weights[i]
    if (w === 0) return lab
    const gap = refL - lab[0]
    if (gap <= 0) return lab
    const k = s * w * (1 - smoothstep(reach, reach + 12, gap))
    if (k === 0) return lab
    return [lab[0] + gap * k * 0.85, lab[1] + (refA - lab[1]) * k * 0.6, lab[2] + (refB - lab[2]) * k * 0.6] as Lab
  })
}
