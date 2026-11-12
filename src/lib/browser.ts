/** 只能在浏览器里用的小工具：读图片、裁剪取像素、下载文件 */
import type { RawImage } from './image'

export interface SourceImage {
  /** 原图（长边最多 1600 像素） */
  canvas: HTMLCanvasElement
  /** 给裁剪框显示用的地址 */
  url: string
  width: number
  height: number
}

/** 裁剪区域，百分比 0–100 */
export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

const MAX_SOURCE = 1600
/** 送去计算的图像宽度上限：100 列时每格仍有 8 个像素可以取平均 */
const MAX_WORK = 800

export function loadImageFile(file: File): Promise<SourceImage> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const scale = Math.min(1, MAX_SOURCE / Math.max(img.naturalWidth, img.naturalHeight))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('图片处理失败'))
        resolve({ canvas, url: URL.createObjectURL(blob), width: canvas.width, height: canvas.height })
      }, 'image/png')
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      const heic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)
      reject(
        new Error(
          heic
            ? '这个浏览器打不开 HEIC 格式的照片，请先转成 JPG 或 PNG（或者用 iPhone 的 Safari 直接从相册选）'
            : '这张图片打不开，请换一张 JPG 或 PNG 图片试试',
        ),
      )
    }
    img.src = objectUrl
  })
}

/** 取出裁剪区域的像素（必要时缩小），交给算法处理 */
export function cropToRaw(src: SourceImage, crop: CropRect): RawImage {
  const sx = Math.round((crop.x / 100) * src.width)
  const sy = Math.round((crop.y / 100) * src.height)
  const sw = Math.max(1, Math.min(src.width - sx, Math.round((crop.width / 100) * src.width)))
  const sh = Math.max(1, Math.min(src.height - sy, Math.round((crop.height / 100) * src.height)))
  const scale = Math.min(1, MAX_WORK / sw)
  const w = Math.max(1, Math.round(sw * scale))
  const h = Math.max(1, Math.round(sh * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src.canvas, sx, sy, sw, sh, 0, 0, w, h)
  const data = ctx.getImageData(0, 0, w, h)
  return { data: data.data, width: w, height: h }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('导出失败，图片可能太大了'))), 'image/png')
  })
}

/** 文件名里不能出现的字符换掉 */
export function safeFileName(name: string): string {
  return name.trim().replace(/[\\/:*?"<>|\s]+/g, '_') || '拼豆图纸'
}
