import mardColors from './mard.json'

export interface PaletteColor {
  /** 色号，例如 "A1" */
  code: string
  /** 颜色值，例如 "#FAF4C8" */
  hex: string
  /** 色系字母，例如 "A" */
  series: string
}

export interface SeriesInfo {
  id: string
  name: string
}

export interface Brand {
  id: string
  name: string
  /** 色系列表，顺序就是界面和图例里的排序 */
  series: SeriesInfo[]
  colors: PaletteColor[]
}

export const MARD: Brand = {
  id: 'mard',
  name: 'MARD 221 色',
  series: [
    { id: 'A', name: '黄橙' },
    { id: 'B', name: '绿' },
    { id: 'C', name: '蓝青' },
    { id: 'D', name: '蓝紫' },
    { id: 'E', name: '粉玫' },
    { id: 'F', name: '红' },
    { id: 'G', name: '棕肤' },
    { id: 'H', name: '黑白' },
    { id: 'M', name: '大地' },
  ],
  colors: mardColors as PaletteColor[],
}

/**
 * 所有品牌。以后要加 Artkal、COCO 等：
 * 1. 在本目录放一个同样格式的 json（code / hex / series）
 * 2. 仿照 MARD 写一个 Brand 对象，加进这个数组
 */
export const BRANDS: Brand[] = [MARD]

export function getBrand(id: string): Brand {
  return BRANDS.find((b) => b.id === id) ?? MARD
}

/** 色号里的数字部分，"A12" -> 12 */
export function codeNumber(code: string): number {
  const m = code.match(/\d+/)
  return m ? Number(m[0]) : 0
}

/** 按色系顺序、再按编号排序的比较函数 */
export function compareColors(brand: Brand, a: PaletteColor, b: PaletteColor): number {
  const sa = brand.series.findIndex((s) => s.id === a.series)
  const sb = brand.series.findIndex((s) => s.id === b.series)
  if (sa !== sb) return sa - sb
  return codeNumber(a.code) - codeNumber(b.code)
}
