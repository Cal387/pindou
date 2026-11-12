import { useEffect, useRef, useState } from 'react'
import type { RawImage } from '../lib/image'
import type { Pattern, PatternOptions } from '../lib/pattern'
import type { WorkerRequest, WorkerResponse } from '../lib/worker'

/**
 * 在 Web Worker 里生成图纸。参数变化后稍等一下再算（防抖），
 * 并且只采用最新一次请求的结果，所以拖动滑块时页面不会卡。
 */
export function usePattern(image: RawImage | null, brandId: string, options: PatternOptions) {
  const [pattern, setPattern] = useState<Pattern | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const latestId = useRef(0)

  useEffect(() => {
    const worker = new Worker(new URL('../lib/worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      if (e.data.id !== latestId.current) return
      setBusy(false)
      if (e.data.error) {
        setError('生成失败：' + e.data.error)
        return
      }
      setError(null)
      setPattern({ cols: e.data.cols, rows: e.data.rows, cells: e.data.cells })
    }
    worker.onerror = (e) => {
      setBusy(false)
      setError('生成失败：' + (e.message || '未知错误'))
    }
    return () => worker.terminate()
  }, [])

  useEffect(() => {
    if (!image) {
      latestId.current++
      setPattern(null)
      setBusy(false)
      return
    }
    setBusy(true)
    const timer = setTimeout(() => {
      const id = ++latestId.current
      const buffer = image.data.slice().buffer
      const req: WorkerRequest = { id, brandId, width: image.width, height: image.height, buffer, options }
      workerRef.current?.postMessage(req, [buffer])
    }, 120)
    return () => clearTimeout(timer)
  }, [image, brandId, options])

  return { pattern, busy, error }
}
