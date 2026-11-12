import { hexToRgb, rgbToLab, type Lab } from './color'
import { adjust, downsample, gaussianBlur, rowsFor, type RawImage } from './image'
import { detectBackground } from './background'
import { EMPTY, quantize } from './quantize'
import { despeckle } from './despeckle'
import { softenSkin } from './skin'
import { compareColors, type Brand, type PaletteColor } from '../palettes'

export interface PatternOptions {
  /** 图纸宽度（列数） */
  cols: number
  /** 最大颜色数 */
  maxColors: number
  /** 打开的色系，例如 ['A','F','G','H'] */
  enabledSeries: string[]
  /** 去除背景 */
  removeBackground: boolean
  /** 去背景的色差阈值，越大去得越多 */
  backgroundThreshold: number
  /** 去杂点强度，0 关闭 */
  despeckle: number
  /** -50 ~ 50 */
  contrast: number
  /** -50 ~ 50 */
  saturation: number
  /** 肤色柔和（减轻脸上阴影），0 ~ 100，0 关闭 */
  skinSoften: number
}

export const DEFAULT_OPTIONS: PatternOptions = {
  cols: 52,
  maxColors: 30,
  enabledSeries: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'M'],
  removeBackground: false,
  backgroundThreshold: 12,
  despeckle: 1,
  contrast: 0,
  saturation: 0,
  skinSoften: 50,
}

export interface Pattern {
  cols: number
  rows: number
  /** 每格的色卡下标（对应 brand.colors），空格为 -1 */
  cells: Int16Array
}

export interface UsageItem {
  index: number
  color: PaletteColor
  count: number
}

const labCache = new WeakMap<Brand, Lab[]>()
export function paletteLabs(brand: Brand): Lab[] {
  let labs = labCache.get(brand)
  if (!labs) {
    labs = brand.colors.map((c) => rgbToLab(...hexToRgb(c.hex)))
    labCache.set(brand, labs)
  }
  return labs
}

/**
 * 完整流程：轻微高斯模糊 → 缩小到格子数 → 对比度/饱和度 →
 * 去背景 → 肤色柔和 → 匹配色卡并限制颜色数 → 去杂点。
 */
export function generatePattern(src: RawImage, brand: Brand, opts: PatternOptions): Pattern {
  const cols = Math.max(1, Math.round(opts.cols))
  const rows = rowsFor(cols, src.width, src.height)

  // 模糊强度跟着缩小倍数走：每个格子覆盖的像素越多，模糊半径越大
  const scale = src.width / cols
  const sigma = scale > 1 ? Math.min(3, scale * 0.15) : 0
  const small = adjust(downsample(gaussianBlur(src, sigma), cols, rows), opts.contrast, opts.saturation)

  const n = cols * rows
  let labs: Lab[] = new Array(n)
  const empty = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    const p = i * 4
    labs[i] = rgbToLab(small.data[p], small.data[p + 1], small.data[p + 2])
    if (small.data[p + 3] < 128) empty[i] = 1
  }

  if (opts.removeBackground) {
    const bg = detectBackground(labs, cols, rows, opts.backgroundThreshold, empty)
    for (let i = 0; i < n; i++) if (bg[i]) empty[i] = 1
  }

  // 去背景用的是原始颜色；肤色柔和放在它之后，只影响配色
  labs = softenSkin(labs, empty, (opts.skinSoften ?? 0) / 100)

  const pLabs = paletteLabs(brand)
  const enabled = new Set(opts.enabledSeries)
  const allowed: number[] = []
  brand.colors.forEach((c, i) => {
    if (enabled.has(c.series)) allowed.push(i)
  })

  let cells = quantize(labs, empty, pLabs, allowed, opts.maxColors)
  cells = despeckle(cells, cols, rows, pLabs, opts.despeckle)
  return { cols, rows, cells }
}

/** 统计每种颜色的用量，按色系、编号排序 */
export function countUsage(pattern: Pattern, brand: Brand): UsageItem[] {
  const counts = new Map<number, number>()
  for (const c of pattern.cells) {
    if (c !== EMPTY) counts.set(c, (counts.get(c) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([index, count]) => ({ index, count, color: brand.colors[index] }))
    .sort((a, b) => compareColors(brand, a.color, b.color))
}

export function totalBeads(usage: UsageItem[]): number {
  return usage.reduce((s, u) => s + u.count, 0)
}
