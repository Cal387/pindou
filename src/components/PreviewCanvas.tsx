import { useEffect, useRef } from 'react'
import { renderPreview } from '../lib/render'
import { EMPTY } from '../lib/quantize'
import type { Pattern } from '../lib/pattern'
import type { Brand } from '../palettes'

interface Props {
  pattern: Pattern
  brand: Brand
  highlight: number | null
  onPick: (index: number | null) => void
}

/** "拼好后的样子"。点某颗豆子可以高亮同色的所有位置，再点一次取消。 */
export default function PreviewCanvas({ pattern, brand, highlight, onPick }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (ref.current) renderPreview(ref.current, pattern, brand, highlight)
  }, [pattern, brand, highlight])

  return (
    <canvas
      ref={ref}
      className="mx-auto block max-h-[75vh] max-w-full cursor-pointer rounded-lg"
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = Math.floor(((e.clientX - rect.left) / rect.width) * pattern.cols)
        const y = Math.floor(((e.clientY - rect.top) / rect.height) * pattern.rows)
        if (x < 0 || y < 0 || x >= pattern.cols || y >= pattern.rows) return
        const c = pattern.cells[y * pattern.cols + x]
        onPick(c === EMPTY || c === highlight ? null : c)
      }}
    />
  )
}
