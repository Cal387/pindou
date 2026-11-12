import { useEffect, useRef } from 'react'
import { renderSheet, type SheetData, type SheetLayout } from '../lib/render'
import { EMPTY } from '../lib/quantize'

interface Props extends SheetData {
  onPick: (index: number | null) => void
}

/**
 * 页面上显示的图纸（和导出的 PNG 是同一套画法，只是分辨率低一些，省内存）。
 * 点某个格子可以高亮同色的所有位置，再点一次取消。
 */
export default function SheetCanvas({ pattern, brand, usage, title, highlight, onPick }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const layout = useRef<SheetLayout | null>(null)

  useEffect(() => {
    if (ref.current) layout.current = renderSheet(ref.current, { pattern, brand, usage, title, highlight }, 6_000_000)
  }, [pattern, brand, usage, title, highlight])

  return (
    <canvas
      ref={ref}
      className="mx-auto block max-h-[42vh] max-w-full cursor-pointer rounded-lg border border-slate-200 lg:max-h-none"
      onClick={(e) => {
        const L = layout.current
        if (!L) return
        const rect = e.currentTarget.getBoundingClientRect()
        const px = ((e.clientX - rect.left) / rect.width) * L.width
        const py = ((e.clientY - rect.top) / rect.height) * L.height
        const x = Math.floor((px - L.gridX) / L.cell)
        const y = Math.floor((py - L.gridY) / L.cell)
        if (x < 0 || y < 0 || x >= pattern.cols || y >= pattern.rows) return
        const c = pattern.cells[y * pattern.cols + x]
        onPick(c === EMPTY || c === highlight ? null : c)
      }}
    />
  )
}
