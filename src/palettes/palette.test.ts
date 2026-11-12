import { describe, expect, it } from 'vitest'
import { BRANDS, MARD } from './index'

describe('MARD 色卡', () => {
  it('一共 221 个色号', () => {
    expect(MARD.colors.length).toBe(221)
  })

  it('色号没有重复', () => {
    const codes = MARD.colors.map((c) => c.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('每个色系的数量正确', () => {
    const counts: Record<string, number> = {}
    for (const c of MARD.colors) counts[c.series] = (counts[c.series] ?? 0) + 1
    expect(counts).toEqual({ A: 26, B: 32, C: 29, D: 26, E: 24, F: 25, G: 21, H: 23, M: 15 })
  })

  it('每个色系的编号从 1 连续到最后一个', () => {
    for (const s of MARD.series) {
      const nums = MARD.colors
        .filter((c) => c.series === s.id)
        .map((c) => Number(c.code.slice(1)))
        .sort((a, b) => a - b)
      expect(nums).toEqual(nums.map((_, i) => i + 1))
    }
  })

  it('格式正确：色号以色系字母开头，hex 是 #RRGGBB', () => {
    for (const c of MARD.colors) {
      expect(c.code.startsWith(c.series)).toBe(true)
      expect(c.hex).toMatch(/^#[0-9A-F]{6}$/)
    }
  })

  it('所有品牌的色系定义和颜色数据对得上', () => {
    for (const b of BRANDS) {
      const ids = new Set(b.series.map((s) => s.id))
      for (const c of b.colors) expect(ids.has(c.series)).toBe(true)
    }
  })
})
