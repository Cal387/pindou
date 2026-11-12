/** 把图纸画到 Canvas 上：带色号的网格、行列号、标题、图例 */
import { isDark } from './color'
import { EMPTY } from './quantize'
import type { Pattern, UsageItem } from './pattern'
import type { Brand } from '../palettes'

const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC",sans-serif'

export interface SheetLayout {
  /** 每格像素 */
  cell: number
  width: number
  height: number
  gridX: number
  gridY: number
  legendPerRow: number
  legendRows: number
}

// 以下尺寸都以"格"为单位
const PAD = 0.6
const NUM = 0.95 // 行号/列号占的宽度
const TITLE_W = 2.6 // 右侧竖排标题栏
const LEGEND_GAP = 0.6
const ITEM_W = 3.5
const ITEM_H = 1.5

/**
 * 计算图纸尺寸。maxPixels 用来保证手机浏览器（尤其 iPhone）不会因为画布太大而导出失败。
 */
export function sheetLayout(cols: number, rows: number, colorCount: number, maxPixels = 16_000_000): SheetLayout {
  const wUnits = PAD * 2 + NUM * 2 + cols + TITLE_W
  const legendPerRow = Math.max(1, Math.floor((wUnits - PAD * 2) / ITEM_W))
  const legendRows = Math.ceil(colorCount / legendPerRow)
  const hUnits = PAD * 2 + NUM * 2 + rows + (legendRows ? LEGEND_GAP + legendRows * ITEM_H : 0)

  let cell = Math.max(36, Math.min(64, Math.round(2600 / wUnits)))
  while (cell > 12 && (wUnits * cell * hUnits * cell > maxPixels || Math.max(wUnits, hUnits) * cell > 8000)) cell--
  return {
    cell,
    width: Math.ceil(wUnits * cell),
    height: Math.ceil(hUnits * cell),
    gridX: Math.round((PAD + NUM) * cell),
    gridY: Math.round((PAD + NUM) * cell),
    legendPerRow,
    legendRows,
  }
}

/** 竖排文字用：连续的数字/英文算一个整体，其余每个字一个 */
export function verticalTokens(text: string): string[] {
  return text.match(/[0-9A-Za-z.]+|\S/g) ?? []
}

function drawVertical(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  top: number,
  fontSize: number,
  maxWidth: number,
  weight: string,
): number {
  ctx.font = `${weight} ${fontSize}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const step = fontSize * 1.18
  let y = top
  for (const t of verticalTokens(text)) {
    ctx.fillText(t, cx, y + step / 2, maxWidth)
    y += step
  }
  return y
}

export interface SheetData {
  pattern: Pattern
  brand: Brand
  usage: UsageItem[]
  title: string
  /** 只在页面上用：高亮这个颜色（色卡下标），其他颜色变淡。导出时不传。 */
  highlight?: number | null
}

/** 画完整图纸：网格 + 色号 + 行列号 + 右侧竖排标题 + 底部图例 */
export function renderSheet(canvas: HTMLCanvasElement, data: SheetData, maxPixels?: number): SheetLayout {
  const { pattern, brand, usage, title } = data
  const highlight = data.highlight ?? null
  const { cols, rows, cells } = pattern
  const L = sheetLayout(cols, rows, usage.length, maxPixels)
  const s = L.cell
  canvas.width = L.width
  canvas.height = L.height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, L.width, L.height)

  const gx = L.gridX
  const gy = L.gridY
  const gw = cols * s
  const gh = rows * s

  // 格子 + 色号
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const fonts = [0, 0, 0.5, 0.42, 0.34].map((k) => `600 ${Math.round(s * k)}px ${FONT}`)
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const c = cells[y * cols + x]
      if (c === EMPTY) continue
      const color = brand.colors[c]
      ctx.globalAlpha = highlight !== null && c !== highlight ? 0.12 : 1
      ctx.fillStyle = color.hex
      ctx.fillRect(gx + x * s, gy + y * s, s, s)
      ctx.fillStyle = isDark(color.hex) ? '#ffffff' : '#1e293b'
      ctx.font = fonts[Math.min(4, Math.max(2, color.code.length))]
      ctx.fillText(color.code, gx + x * s + s / 2, gy + y * s + s / 2 + s * 0.03)
    }
  }

  ctx.globalAlpha = 1

  // 细线
  ctx.strokeStyle = 'rgba(15,23,42,0.35)'
  ctx.lineWidth = Math.max(1, s * 0.025)
  ctx.beginPath()
  for (let x = 0; x <= cols; x++) {
    ctx.moveTo(gx + x * s, gy)
    ctx.lineTo(gx + x * s, gy + gh)
  }
  for (let y = 0; y <= rows; y++) {
    ctx.moveTo(gx, gy + y * s)
    ctx.lineTo(gx + gw, gy + y * s)
  }
  ctx.stroke()

  // 每 10 格一条粗线 + 外框
  ctx.strokeStyle = '#0f172a'
  ctx.lineWidth = Math.max(2, s * 0.085)
  ctx.beginPath()
  for (let x = 10; x < cols; x += 10) {
    ctx.moveTo(gx + x * s, gy)
    ctx.lineTo(gx + x * s, gy + gh)
  }
  for (let y = 10; y < rows; y += 10) {
    ctx.moveTo(gx, gy + y * s)
    ctx.lineTo(gx + gw, gy + y * s)
  }
  ctx.stroke()
  ctx.strokeRect(gx, gy, gw, gh)

  // 四周的行号、列号（每逢 5、10 加粗，方便数格子）
  const numOffset = (NUM * s) / 2
  for (let x = 0; x < cols; x++) {
    const n = x + 1
    ctx.font = `${n % 5 === 0 ? 700 : 400} ${Math.round(s * 0.4)}px ${FONT}`
    ctx.fillStyle = n % 5 === 0 ? '#0f172a' : '#64748b'
    ctx.fillText(String(n), gx + x * s + s / 2, gy - numOffset, s * 0.95)
    ctx.fillText(String(n), gx + x * s + s / 2, gy + gh + numOffset, s * 0.95)
  }
  for (let y = 0; y < rows; y++) {
    const n = y + 1
    ctx.font = `${n % 5 === 0 ? 700 : 400} ${Math.round(s * 0.4)}px ${FONT}`
    ctx.fillStyle = n % 5 === 0 ? '#0f172a' : '#64748b'
    ctx.fillText(String(n), gx - numOffset, gy + y * s + s / 2, NUM * s * 0.95)
    ctx.fillText(String(n), gx + gw + numOffset, gy + y * s + s / 2, NUM * s * 0.95)
  }

  // 右侧竖排：作品名 + "X列 X Y行 共 N 颗"
  const total = usage.reduce((sum, u) => sum + u.count, 0)
  const info = `${cols}列 X ${rows}行 共 ${total} 颗`
  const stripX = gx + gw + NUM * s
  const stripCx = stripX + (TITLE_W * s) / 2
  const name = title.trim()
  const infoTokens = verticalTokens(info).length
  const nameTokens = verticalTokens(name).length
  // 字号按可用高度自动缩小，保证长标题也放得下
  const infoSize = Math.min(s * 0.85, (gh * (nameTokens ? 0.42 : 0.95)) / (infoTokens * 1.18))
  const nameSize = nameTokens ? Math.min(s * 1.25, (gh * 0.55) / (nameTokens * 1.18)) : 0
  ctx.fillStyle = '#0f172a'
  let ty = gy
  if (nameTokens) ty = drawVertical(ctx, name, stripCx, ty, nameSize, TITLE_W * s * 0.9, '700') + Math.min(s * 0.6, gh * 0.03)
  ctx.fillStyle = '#475569'
  drawVertical(ctx, info, stripCx, ty, infoSize, TITLE_W * s * 0.9, '500')

  // 底部图例
  const lx = PAD * s
  const ly = gy + gh + NUM * s + LEGEND_GAP * s
  usage.forEach((u, i) => {
    const col = i % L.legendPerRow
    const row = Math.floor(i / L.legendPerRow)
    const x = lx + col * ITEM_W * s
    const y = ly + row * ITEM_H * s
    const sw = s * 1.1
    ctx.globalAlpha = highlight !== null && u.index !== highlight ? 0.25 : 1
    ctx.fillStyle = u.color.hex
    ctx.fillRect(x, y, sw, sw)
    ctx.strokeStyle = 'rgba(15,23,42,0.45)'
    ctx.lineWidth = Math.max(1, s * 0.03)
    ctx.strokeRect(x, y, sw, sw)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#0f172a'
    ctx.font = `700 ${Math.round(s * 0.5)}px ${FONT}`
    ctx.fillText(u.color.code, x + sw + s * 0.22, y + sw * 0.27)
    ctx.fillStyle = '#475569'
    ctx.font = `400 ${Math.round(s * 0.42)}px ${FONT}`
    ctx.fillText(`${u.count} 颗`, x + sw + s * 0.22, y + sw * 0.76)
  })
  ctx.globalAlpha = 1

  return L
}
