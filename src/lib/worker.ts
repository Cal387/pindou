/// <reference lib="webworker" />
import { generatePattern, type PatternOptions } from './pattern'
import { getBrand } from '../palettes'

export interface WorkerRequest {
  id: number
  brandId: string
  width: number
  height: number
  buffer: ArrayBuffer
  options: PatternOptions
}

export interface WorkerResponse {
  id: number
  cols: number
  rows: number
  cells: Int16Array
  error?: string
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, brandId, width, height, buffer, options } = e.data
  try {
    const pattern = generatePattern(
      { data: new Uint8ClampedArray(buffer), width, height },
      getBrand(brandId),
      options,
    )
    const res: WorkerResponse = { id, ...pattern }
    ;(self as DedicatedWorkerGlobalScope).postMessage(res, [pattern.cells.buffer])
  } catch (err) {
    const res: WorkerResponse = { id, cols: 0, rows: 0, cells: new Int16Array(0), error: String(err) }
    ;(self as DedicatedWorkerGlobalScope).postMessage(res)
  }
}
