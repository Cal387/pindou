/** 像素级处理：高斯模糊、缩小、对比度/饱和度。不依赖浏览器 API，方便测试。 */

export interface RawImage {
  /** RGBA，每像素 4 字节 */
  data: Uint8ClampedArray
  width: number
  height: number
}

export function gaussianKernel(sigma: number): Float32Array {
  const radius = Math.max(1, Math.ceil(sigma * 2.5))
  const k = new Float32Array(radius * 2 + 1)
  let sum = 0
  for (let i = -radius; i <= radius; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma))
    k[i + radius] = v
    sum += v
  }
  for (let i = 0; i < k.length; i++) k[i] /= sum
  return k
}

/** 可分离高斯模糊；sigma <= 0 时原样返回。边缘按最近像素延伸。 */
export function gaussianBlur(img: RawImage, sigma: number): RawImage {
  if (sigma <= 0) return img
  const { width: w, height: h, data } = img
  const k = gaussianKernel(sigma)
  const r = (k.length - 1) / 2
  const tmp = new Float32Array(data.length)
  const out = new Uint8ClampedArray(data.length)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let a0 = 0, a1 = 0, a2 = 0, a3 = 0
      for (let i = -r; i <= r; i++) {
        const xx = x + i < 0 ? 0 : x + i >= w ? w - 1 : x + i
        const p = (y * w + xx) * 4
        const kv = k[i + r]
        a0 += data[p] * kv
        a1 += data[p + 1] * kv
        a2 += data[p + 2] * kv
        a3 += data[p + 3] * kv
      }
      const o = (y * w + x) * 4
      tmp[o] = a0
      tmp[o + 1] = a1
      tmp[o + 2] = a2
      tmp[o + 3] = a3
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let a0 = 0, a1 = 0, a2 = 0, a3 = 0
      for (let i = -r; i <= r; i++) {
        const yy = y + i < 0 ? 0 : y + i >= h ? h - 1 : y + i
        const p = (yy * w + x) * 4
        const kv = k[i + r]
        a0 += tmp[p] * kv
        a1 += tmp[p + 1] * kv
        a2 += tmp[p + 2] * kv
        a3 += tmp[p + 3] * kv
      }
      const o = (y * w + x) * 4
      out[o] = a0
      out[o + 1] = a1
      out[o + 2] = a2
      out[o + 3] = a3
    }
  }
  return { data: out, width: w, height: h }
}

/** 按原图比例算行数 */
export function rowsFor(cols: number, srcWidth: number, srcHeight: number): number {
  return Math.max(1, Math.round((cols * srcHeight) / srcWidth))
}

/** 面积平均法缩小到 cols × rows（每个格子取覆盖区域的平均色） */
export function downsample(img: RawImage, cols: number, rows: number): RawImage {
  const { width: w, height: h, data } = img
  const out = new Uint8ClampedArray(cols * rows * 4)
  for (let cy = 0; cy < rows; cy++) {
    const y0 = Math.floor((cy * h) / rows)
    const y1 = Math.max(y0 + 1, Math.floor(((cy + 1) * h) / rows))
    for (let cx = 0; cx < cols; cx++) {
      const x0 = Math.floor((cx * w) / cols)
      const x1 = Math.max(x0 + 1, Math.floor(((cx + 1) * w) / cols))
      let r = 0, g = 0, b = 0, a = 0, n = 0
      for (let y = y0; y < y1 && y < h; y++) {
        for (let x = x0; x < x1 && x < w; x++) {
          const p = (y * w + x) * 4
          const al = data[p + 3]
          r += data[p] * al
          g += data[p + 1] * al
          b += data[p + 2] * al
          a += al
          n++
        }
      }
      const o = (cy * cols + cx) * 4
      if (a > 0) {
        out[o] = r / a
        out[o + 1] = g / a
        out[o + 2] = b / a
      }
      out[o + 3] = n ? a / n : 0
    }
  }
  return { data: out, width: cols, height: rows }
}

/**
 * 对比度 / 饱和度微调，两个参数范围都是 -50 ~ 50，0 表示不变。
 * 直接修改并返回传入的图像。
 */
export function adjust(img: RawImage, contrast: number, saturation: number): RawImage {
  if (contrast === 0 && saturation === 0) return img
  const c = 1 + contrast / 100
  const s = 1 + saturation / 100
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2]
    const gray = 0.299 * r + 0.587 * g + 0.114 * b
    r = gray + (r - gray) * s
    g = gray + (g - gray) * s
    b = gray + (b - gray) * s
    d[i] = (r - 128) * c + 128
    d[i + 1] = (g - 128) * c + 128
    d[i + 2] = (b - 128) * c + 128
  }
  return img
}
