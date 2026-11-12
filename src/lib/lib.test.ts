import { describe, expect, it } from 'vitest'
import { ciede2000, deltaE, hexToRgb, isDark, rgbToLab, type Lab } from './color'
import { skinWeight, softenSkin } from './skin'
import { adjust, downsample, gaussianBlur, gaussianKernel, rowsFor, type RawImage } from './image'
import { detectBackground } from './background'
import { EMPTY, nearest, quantize } from './quantize'
import { despeckle } from './despeckle'
import { countUsage, DEFAULT_OPTIONS, generatePattern, paletteLabs, totalBeads } from './pattern'
import { usageToCsv } from './csv'
import { MARD } from '../palettes'

function solid(w: number, h: number, rgb: [number, number, number]): RawImage {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) data.set([...rgb, 255], i * 4)
  return { data, width: w, height: h }
}
function setPx(img: RawImage, x: number, y: number, rgb: [number, number, number]) {
  img.data.set([...rgb, 255], (y * img.width + x) * 4)
}
function fillRect(img: RawImage, x0: number, y0: number, x1: number, y1: number, rgb: [number, number, number]) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) setPx(img, x, y, rgb)
}
const idx = (code: string) => MARD.colors.findIndex((c) => c.code === code)
const labOf = (hex: string): Lab => rgbToLab(...hexToRgb(hex))

describe('颜色', () => {
  it('hexToRgb', () => {
    expect(hexToRgb('#FAF4C8')).toEqual([250, 244, 200])
  })

  it('rgbToLab：白、黑、红', () => {
    const w = rgbToLab(255, 255, 255)
    expect(w[0]).toBeCloseTo(100, 1)
    expect(w[1]).toBeCloseTo(0, 1)
    expect(w[2]).toBeCloseTo(0, 1)
    expect(rgbToLab(0, 0, 0)[0]).toBeCloseTo(0, 5)
    const r = rgbToLab(255, 0, 0)
    expect(r[0]).toBeCloseTo(53.24, 1)
    expect(r[1]).toBeCloseTo(80.09, 1)
    expect(r[2]).toBeCloseTo(67.2, 1)
  })

  it('CIEDE2000 和 Sharma 论文的标准测试数据一致', () => {
    const cases: [number, number, number, number, number, number, number][] = [
      [50, 2.6772, -79.7751, 50, 0, -82.7485, 2.0425],
      [50, 3.1571, -77.2803, 50, 0, -82.7485, 2.8615],
      [50, -1.3802, -84.2814, 50, 0, -82.7485, 1.0],
      [50, 2.5, 0, 50, 0, -2.5, 4.3065],
      [50, 2.5, 0, 73, 25, -18, 27.1492],
      [50, 2.5, 0, 61, -5, 29, 22.8977],
      [60.2574, -34.0099, 36.2677, 60.4626, -34.1751, 39.4387, 1.2644],
      [22.7233, 20.0904, -46.694, 23.0331, 14.973, -42.5619, 2.0373],
      [90.8027, -2.0831, 1.441, 91.1528, -1.6435, 0.0447, 1.4441],
      [2.0776, 0.0795, -1.135, 0.9033, -0.0636, -0.5514, 0.9082],
    ]
    for (const [L1, a1, b1, L2, a2, b2, expected] of cases) {
      expect(ciede2000(L1, a1, b1, L2, a2, b2)).toBeCloseTo(expected, 4)
      expect(ciede2000(L2, a2, b2, L1, a1, b1)).toBeCloseTo(expected, 4)
    }
  })

  it('深色用白字、浅色用深字', () => {
    expect(isDark('#000000')).toBe(true)
    expect(isDark('#182A84')).toBe(true)
    expect(isDark('#FFFFFF')).toBe(false)
    expect(isDark('#FAF4C8')).toBe(false)
  })
})

describe('图像处理', () => {
  it('高斯核归一化且对称', () => {
    const k = gaussianKernel(1.2)
    expect(k.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5)
    expect(k[0]).toBeCloseTo(k[k.length - 1], 6)
  })

  it('模糊不改变纯色图，能削弱单个噪点', () => {
    const img = solid(9, 9, [100, 150, 200])
    const same = gaussianBlur(img, 1.5)
    expect([...same.data.slice(0, 4)]).toEqual([100, 150, 200, 255])

    setPx(img, 4, 4, [255, 255, 255])
    const blurred = gaussianBlur(img, 1.5)
    const p = (4 * 9 + 4) * 4
    expect(blurred.data[p]).toBeLessThan(180)
    expect(blurred.data[p]).toBeGreaterThan(100)
  })

  it('sigma 为 0 时不处理', () => {
    const img = solid(3, 3, [1, 2, 3])
    expect(gaussianBlur(img, 0)).toBe(img)
  })

  it('行数按比例计算', () => {
    expect(rowsFor(52, 1000, 1000)).toBe(52)
    expect(rowsFor(52, 1000, 1500)).toBe(78)
    expect(rowsFor(20, 4000, 10)).toBe(1)
  })

  it('缩小取面积平均', () => {
    const img = solid(4, 2, [0, 0, 0])
    fillRect(img, 2, 0, 4, 2, [200, 100, 50])
    setPx(img, 0, 0, [100, 100, 100])
    const s = downsample(img, 2, 1)
    expect(s.width).toBe(2)
    expect(s.height).toBe(1)
    expect([...s.data]).toEqual([25, 25, 25, 255, 200, 100, 50, 255])
  })

  it('对比度、饱和度', () => {
    const gray = adjust(solid(1, 1, [200, 100, 50]), 0, -100)
    expect(gray.data[0]).toBe(gray.data[1])
    expect(gray.data[1]).toBe(gray.data[2])
    const more = adjust(solid(1, 1, [200, 128, 60]), 50, 0)
    expect(more.data[0]).toBeGreaterThan(200)
    expect(more.data[2]).toBeLessThan(60)
    const img = solid(1, 1, [10, 20, 30])
    expect(adjust(img, 0, 0)).toBe(img)
  })
})

describe('去背景', () => {
  it('四角连通的背景被标记，主体和被主体包住的同色区域保留', () => {
    // 7x7：白底，中间 5x5 红色方框，框里面中心是白色
    const cols = 7, rows = 7
    const white = labOf('#FFFFFF'), red = labOf('#E7002F')
    const labs: Lab[] = []
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const inBox = x >= 1 && x <= 5 && y >= 1 && y <= 5
        const inHole = x >= 2 && x <= 4 && y >= 2 && y <= 4
        labs.push(inBox && !inHole ? red : white)
      }
    const mask = detectBackground(labs, cols, rows, 12)
    expect(mask[0]).toBe(1)
    expect(mask[6]).toBe(1)
    expect(mask[3]).toBe(1) // 上边缘中间
    expect(mask[1 * cols + 1]).toBe(0) // 红框
    expect(mask[3 * cols + 3]).toBe(0) // 框内的白色不连通，保留
    expect(mask.reduce((a, b) => a + b, 0)).toBe(24)
  })

  it('接近但不完全相同的背景色也算背景，阈值太小时不算', () => {
    const a = labOf('#FFFFFF'), b = labOf('#F4F4F4')
    const labs = [a, b, b, a]
    expect([...detectBackground(labs, 2, 2, 12)]).toEqual([1, 1, 1, 1])
    // 阈值很小时，和角落颜色略有差别的格子不算背景
    const strict = detectBackground([a, b, a, b, b, b, a, b, a], 3, 3, 1)
    expect([...strict]).toEqual([1, 0, 1, 0, 0, 0, 1, 0, 1])
  })
})

describe('颜色匹配与限制颜色数', () => {
  const pLabs = paletteLabs(MARD)
  const all = MARD.colors.map((_, i) => i)

  it('色卡里的颜色匹配到自己', () => {
    for (const code of ['A1', 'B8', 'C5', 'F5', 'H7', 'M15']) {
      expect(nearest(labOf(MARD.colors[idx(code)].hex), pLabs, all)).toBe(idx(code))
    }
  })

  it('纯黑匹配 H7', () => {
    expect(MARD.colors[nearest(rgbToLab(0, 0, 0), pLabs, all)].code).toBe('H7')
  })

  it('空格保持为空', () => {
    const labs = [labOf('#FF0000'), labOf('#00FF00')]
    const cells = quantize(labs, new Uint8Array([0, 1]), pLabs, all, 30)
    expect(cells[0]).not.toBe(EMPTY)
    expect(cells[1]).toBe(EMPTY)
  })

  it('超过上限时剔除用量最少的颜色', () => {
    // 10 颗 F5 红，6 颗 H7 黑，1 颗 F8 深红 → 上限 2 时，F8 被并入 F5
    const labs: Lab[] = [
      ...Array(10).fill(pLabs[idx('F5')]),
      ...Array(6).fill(pLabs[idx('H7')]),
      pLabs[idx('F8')],
    ]
    const cells = quantize(labs, new Uint8Array(labs.length), pLabs, all, 2)
    expect(new Set(cells).size).toBe(2)
    expect(cells[16]).toBe(idx('F5'))
    const one = quantize(labs, new Uint8Array(labs.length), pLabs, all, 1)
    expect(new Set(one)).toEqual(new Set([idx('F5')]))
  })

  it('随机图像：颜色数不超过上限，且只用允许的色系', () => {
    let seed = 42
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
    const labs: Lab[] = Array.from({ length: 900 }, () => rgbToLab(rnd() * 255, rnd() * 255, rnd() * 255))
    const allowed = all.filter((i) => !['B', 'C', 'D'].includes(MARD.colors[i].series))
    for (const max of [8, 30, 60]) {
      const cells = quantize(labs, new Uint8Array(900), pLabs, allowed, max)
      const used = new Set(cells)
      expect(used.size).toBeLessThanOrEqual(max)
      for (const c of used) expect(['B', 'C', 'D']).not.toContain(MARD.colors[c].series)
    }
  })
})

describe('去杂点', () => {
  const pLabs = paletteLabs(MARD)
  const skin = idx('G1'), nearSkin = idx('G18'), black = idx('H7')
  const grid = (center: number) => {
    const cells = new Int16Array(25).fill(skin)
    cells[12] = center
    return cells
  }

  it('强度 0 不处理', () => {
    const cells = grid(nearSkin)
    expect(despeckle(cells, 5, 5, pLabs, 0)).toBe(cells)
  })

  it('和周围颜色接近的孤立豆子被合并', () => {
    const out = despeckle(grid(nearSkin), 5, 5, pLabs, 1)
    expect(out[12]).toBe(skin)
  })

  it('和周围反差大的孤立豆子（比如眼睛）在低中强度下保留', () => {
    for (const s of [1, 2, 3]) expect(despeckle(grid(black), 5, 5, pLabs, s)[12]).toBe(black)
  })

  it('最高强度会连反差大的也合并', () => {
    expect(despeckle(grid(black), 5, 5, pLabs, 4)[12]).not.toBe(black)
  })

  it('两颗相连的同色豆子不算杂点', () => {
    const cells = grid(nearSkin)
    cells[13] = nearSkin
    const out = despeckle(cells, 5, 5, pLabs, 2)
    expect(out[12]).toBe(nearSkin)
    expect(out[13]).toBe(nearSkin)
  })

  it('不会把豆子填进空格，也不会产生新颜色', () => {
    const cells = grid(nearSkin)
    cells[0] = EMPTY
    const out = despeckle(cells, 5, 5, pLabs, 4)
    expect(out[0]).toBe(EMPTY)
    for (const c of out) expect([skin, nearSkin, EMPTY]).toContain(c)
  })
})

describe('完整流程', () => {
  it('尺寸、颜色数、用量统计', () => {
    const img = solid(200, 300, [255, 255, 255])
    fillRect(img, 50, 50, 150, 250, [231, 0, 47]) // F5
    fillRect(img, 80, 100, 120, 140, [0, 0, 0]) // H7
    const p = generatePattern(img, MARD, { ...DEFAULT_OPTIONS, cols: 20, maxColors: 8 })
    expect(p.cols).toBe(20)
    expect(p.rows).toBe(30)
    expect(p.cells.length).toBe(600)
    const usage = countUsage(p, MARD)
    expect(usage.length).toBeLessThanOrEqual(8)
    expect(totalBeads(usage)).toBe(600)
    expect(usage.map((u) => u.color.code)).toContain('F5')
    expect(usage.map((u) => u.color.code)).toContain('H7')
    // 图例按色系、编号排序
    const order = usage.map((u) => MARD.series.findIndex((s) => s.id === u.color.series) * 1000 + Number(u.color.code.slice(1)))
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })

  it('去背景后四角为空，总颗数减少', () => {
    const img = solid(200, 200, [250, 250, 250])
    fillRect(img, 60, 60, 140, 140, [231, 0, 47])
    const p = generatePattern(img, MARD, { ...DEFAULT_OPTIONS, cols: 20, removeBackground: true })
    expect(p.cells[0]).toBe(EMPTY)
    expect(p.cells[399]).toBe(EMPTY)
    expect(p.cells[10 * 20 + 10]).toBe(MARD.colors.findIndex((c) => c.code === 'F5'))
    const total = totalBeads(countUsage(p, MARD))
    expect(total).toBeGreaterThanOrEqual(64)
    expect(total).toBeLessThan(150)
  })

  it('关掉的色系不会出现', () => {
    const img = solid(100, 100, [40, 160, 80])
    fillRect(img, 0, 0, 50, 100, [40, 80, 200])
    const p = generatePattern(img, MARD, { ...DEFAULT_OPTIONS, cols: 20, enabledSeries: ['A', 'E', 'F', 'G', 'H', 'M'] })
    for (const u of countUsage(p, MARD)) expect(['B', 'C', 'D']).not.toContain(u.color.series)
  })

  it('透明像素是空格', () => {
    const img = solid(40, 40, [231, 0, 47])
    for (let i = 0; i < 40 * 20; i++) img.data[i * 4 + 3] = 0
    const p = generatePattern(img, MARD, { ...DEFAULT_OPTIONS, cols: 20 })
    expect(p.cells[0]).toBe(EMPTY)
    expect(p.cells[399]).not.toBe(EMPTY)
  })

  it('100 列的大图能在合理时间内算完', () => {
    let seed = 7
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
    const img = solid(400, 400, [0, 0, 0])
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = rnd() * 255
      img.data[i + 1] = rnd() * 255
      img.data[i + 2] = rnd() * 255
    }
    const t = Date.now()
    const p = generatePattern(img, MARD, { ...DEFAULT_OPTIONS, cols: 100, maxColors: 60 })
    expect(p.cells.length).toBe(10000)
    expect(new Set(p.cells).size).toBeLessThanOrEqual(60)
    expect(Date.now() - t).toBeLessThan(5000)
  })
})

describe('CSV', () => {
  it('包含表头、每种颜色一行、合计', () => {
    const usage = [
      { index: 0, count: 12, color: MARD.colors[0] },
      { index: idx('H7'), count: 30, color: MARD.colors[idx('H7')] },
    ]
    const csv = usageToCsv(usage, { A: '黄橙', H: '黑白' })
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    const lines = csv.slice(1).trim().split('\r\n')
    expect(lines).toEqual(['色号,色系,颜色值,用量(颗)', 'A1,A 黄橙,#FAF4C8,12', 'H7,H 黑白,#000000,30', '合计,,,42'])
  })
})

describe('肤色柔和', () => {
  const skin: Lab = rgbToLab(240, 195, 165) // 正常肤色
  const shadow: Lab = rgbToLab(176, 124, 96) // 脸上的阴影
  const hair: Lab = rgbToLab(35, 28, 26) // 黑发
  const brownHair: Lab = rgbToLab(96, 62, 44) // 深棕色头发
  const blue: Lab = rgbToLab(54, 119, 210)
  const face = (): Lab[] => [...Array(30).fill(skin), ...Array(10).fill(shadow), ...Array(10).fill(hair), ...Array(6).fill(brownHair), ...Array(6).fill(blue)]
  const none = new Uint8Array(62)

  it('肤色判断：肤色是，黑发、蓝色、白色、灰色不是', () => {
    expect(skinWeight(skin)).toBeGreaterThan(0.9)
    expect(skinWeight(shadow)).toBeGreaterThan(0.7)
    expect(skinWeight(hair)).toBe(0)
    // 棕色、红棕色头发的色相和肤色一样，靠亮度排除
    expect(skinWeight(brownHair)).toBe(0)
    expect(skinWeight(rgbToLab(141, 96, 76))).toBe(0)
    expect(skinWeight(blue)).toBe(0)
    expect(skinWeight(rgbToLab(255, 255, 255))).toBe(0)
    expect(skinWeight(rgbToLab(128, 128, 128))).toBe(0)
  })

  it('强度 0 不处理', () => {
    const labs = face()
    expect(softenSkin(labs, none, 0)).toBe(labs)
  })

  it('阴影变亮、更接近正常肤色；强度越大越接近', () => {
    const half = softenSkin(face(), none, 0.5)
    const full = softenSkin(face(), none, 1)
    expect(half[30][0]).toBeGreaterThan(shadow[0] + 4)
    expect(full[30][0]).toBeGreaterThan(half[30][0])
    expect(full[30][0]).toBeLessThanOrEqual(skin[0])
    expect(deltaE(full[30], skin)).toBeLessThan(deltaE(shadow, skin) * 0.5)
  })

  it('头发、其他颜色不变；本来就亮的肤色只是略微提亮，色相不变', () => {
    const out = softenSkin(face(), none, 1)
    expect(out[40]).toEqual(hair)
    expect(out[50]).toEqual(brownHair)
    expect(out[56]).toEqual(blue)
    expect(out[0][0]).toBeGreaterThanOrEqual(skin[0])
    expect(out[0][0]).toBeLessThan(skin[0] + 5)
    expect(out[0][1]).toBeCloseTo(skin[1], 5)
    expect(out[0][2]).toBeCloseTo(skin[2], 5)
  })

  it('照片里中等亮度的脸（周围是红棕色头发）：配出干净的浅肤色，而不是灰褐色', () => {
    // 这组颜色取自一张真实自拍：脸的像素值其实不亮，色卡里没有对应的肤色，
    // 不处理的话会被配成 M7 / M9 这类灰褐色
    const faceMid: Lab = rgbToLab(195, 155, 137)
    const faceLight: Lab = rgbToLab(222, 177, 160)
    const auburn: Lab = rgbToLab(141, 96, 76)
    const labs: Lab[] = [...Array(60).fill(auburn), ...Array(25).fill(faceMid), ...Array(15).fill(faceLight)]
    const empty = new Uint8Array(labs.length)
    const pLabs = paletteLabs(MARD)
    const all = MARD.colors.map((_, i) => i)
    const match = (lab: Lab) => MARD.colors[nearest(lab, pLabs, all)]

    expect(match(faceMid).series).toBe('M') // 问题重现

    const out = softenSkin(labs, empty, 0.5)
    const fixed = match(out[60])
    expect(['G', 'E', 'A']).toContain(fixed.series)
    expect(pLabs[MARD.colors.indexOf(fixed)][0]).toBeGreaterThan(76)
    // 明暗层次还在：亮的地方仍然比暗的地方亮
    expect(out[85][0]).toBeGreaterThan(out[60][0])
    // 头发不受影响
    expect(out[0]).toEqual(auburn)
  })

  it('画面里几乎没有肤色时不处理', () => {
    const labs: Lab[] = [...Array(99).fill(blue), shadow]
    expect(softenSkin(labs, new Uint8Array(100), 1)).toBe(labs)
  })

  it('完整流程里：打开后脸上阴影用的颜色更亮', () => {
    const img = solid(200, 200, [240, 195, 165])
    fillRect(img, 100, 0, 200, 200, [176, 124, 96])
    const lightness = (soften: number) => {
      const p = generatePattern(img, MARD, { ...DEFAULT_OPTIONS, cols: 20, skinSoften: soften })
      return paletteLabs(MARD)[p.cells[10 * 20 + 15]][0]
    }
    expect(lightness(100)).toBeGreaterThan(lightness(0) + 8)
  })
})

describe('肤色柔和不影响嘴唇', () => {
  it('红色的嘴唇不算肤色', () => {
    expect(skinWeight(rgbToLab(200, 52, 74))).toBe(0)
    expect(skinWeight(rgbToLab(216, 80, 90))).toBeLessThan(0.1)
  })
})
