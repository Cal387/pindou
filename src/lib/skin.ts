import type { Lab } from './color'

function smoothstep(lo: number, hi: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - lo) / (hi - lo)))
  return t * t * (3 - 2 * t)
}

/**
 * 一个颜色"像不像肤色"，0–1。
 * 肤色在 Lab 里的色相集中在橙色一带（约 30°–70°），彩度适中，且有一定亮度。
 * 偏暗的（黑发、棕发、红棕色头发、深色衣服）权重为 0，不会被当成肤色——
 * 红棕色头发的色相和肤色几乎一样，只能靠亮度区分。
 */
export function skinWeight(lab: Lab): number {
  const [L, a, b] = lab
  const chroma = Math.hypot(a, b)
  let hue = (Math.atan2(b, a) * 180) / Math.PI
  if (hue < 0) hue += 360
  const hueW = smoothstep(22, 34, hue) * (1 - smoothstep(70, 85, hue))
  // 彩度太高的（嘴唇、橙红色头发的高光、橙色物体）不算肤色，避免把嘴唇也抹淡
  const chromaW = smoothstep(6, 13, chroma) * (1 - smoothstep(28, 40, chroma))
  return hueW * chromaW * smoothstep(46, 60, L)
}

/** 色卡里浅肤色（G1、G2、G3、E14、A23 等）所在的亮度。照片里的肤色会被提到这附近。 */
const TARGET_L = 85
/** 最多提亮多少，避免把本来就偏深的肤色硬拉成浅色 */
const MAX_LIFT = 24

/**
 * 肤色柔和：让脸配出干净的肤色，并减轻脸上的阴影。
 *
 * 为什么需要：照片里的脸看起来很白，但实际像素值往往是中等亮度的灰粉色
 * （在深色头发旁边显得白）。色卡里没有这种亮度的肤色，直接匹配会落到
 * M7、M9 这类灰褐色上，脸就"脏"了。
 *
 * 做法：
 * 1. 找出画面里的肤色格子，取其中偏亮部分的平均值作为"正常肤色"；
 * 2. 把整体肤色提亮到色卡里浅肤色所在的亮度（保留原有的明暗层次）；
 * 3. 比正常肤色暗的阴影部分，再额外往正常肤色拉近一些。
 * 头发、眉毛、眼睛、嘴唇不动。
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

  // 参考肤色：肤色格子按亮度排序，取第 60–80 百分位的一段求平均
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

  // 整体提亮量：强度 60 以上就提满
  const lift = Math.max(0, Math.min(MAX_LIFT, TARGET_L - refL)) * Math.min(1, s / 0.6)
  // 比参考亮度暗多少以内算"脸上的阴影"；强度越大，管得越深
  const reach = 18 + 14 * s

  return labs.map((lab, i) => {
    const w = weights[i]
    if (w === 0) return lab
    let [L, a, b] = lab
    const gap = refL - L
    if (gap > 0) {
      const k = s * w * (1 - smoothstep(reach, reach + 12, gap))
      L += gap * k * 0.85
      a += (refA - a) * k * 0.6
      b += (refB - b) * k * 0.6
    }
    // 高光不要提过头
    L = Math.min(Math.max(L, 94), L + lift * w)
    return [L, a, b] as Lab
  })
}
