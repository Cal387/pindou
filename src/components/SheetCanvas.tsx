import { useEffect, useRef } from 'react'
import { renderSheet, type SheetData } from '../lib/render'

/** 页面上显示的图纸（和导出的 PNG 是同一套画法，只是分辨率低一些，省内存） */
export default function SheetCanvas(props: SheetData) {
  const ref = useRef<HTMLCanvasElement>(null)
  const { pattern, brand, usage, title } = props

  useEffect(() => {
    if (ref.current) renderSheet(ref.current, { pattern, brand, usage, title }, 6_000_000)
  }, [pattern, brand, usage, title])

  return <canvas ref={ref} className="mx-auto block max-w-full rounded-lg border border-slate-200" />
}
