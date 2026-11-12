import type { UsageItem } from './pattern'

function esc(v: string | number): string {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** 用量清单 CSV。开头带 BOM，Excel 打开中文不会乱码。 */
export function usageToCsv(usage: UsageItem[], seriesNames: Record<string, string> = {}): string {
  const lines = ['色号,色系,颜色值,用量(颗)']
  let total = 0
  for (const u of usage) {
    total += u.count
    const series = seriesNames[u.color.series]
      ? `${u.color.series} ${seriesNames[u.color.series]}`
      : u.color.series
    lines.push([u.color.code, series, u.color.hex, u.count].map(esc).join(','))
  }
  lines.push(`合计,,,${total}`)
  return '﻿' + lines.join('\r\n') + '\r\n'
}
