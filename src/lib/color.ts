/** 颜色空间转换与 CIEDE2000 色差 */

export type RGB = [number, number, number]
export type Lab = [number, number, number]

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function srgbToLinear(v: number): number {
  const c = v / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function labF(t: number): number {
  return t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116
}

/** sRGB (0–255) → CIELAB，D65 白点 */
export function rgbToLab(r: number, g: number, b: number): Lab {
  const R = srgbToLinear(r)
  const G = srgbToLinear(g)
  const B = srgbToLinear(b)
  const x = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047
  const y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B
  const z = (0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883
  const fx = labF(x)
  const fy = labF(y)
  const fz = labF(z)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

const DEG = Math.PI / 180
const POW25_7 = Math.pow(25, 7)

/** CIEDE2000 色差（kL = kC = kH = 1） */
export function ciede2000(L1: number, a1: number, b1: number, L2: number, a2: number, b2: number): number {
  const C1 = Math.hypot(a1, b1)
  const C2 = Math.hypot(a2, b2)
  const Cbar = (C1 + C2) / 2
  const Cbar7 = Math.pow(Cbar, 7)
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + POW25_7)))
  const a1p = (1 + G) * a1
  const a2p = (1 + G) * a2
  const C1p = Math.hypot(a1p, b1)
  const C2p = Math.hypot(a2p, b2)
  let h1p = C1p === 0 ? 0 : Math.atan2(b1, a1p) / DEG
  if (h1p < 0) h1p += 360
  let h2p = C2p === 0 ? 0 : Math.atan2(b2, a2p) / DEG
  if (h2p < 0) h2p += 360

  const dLp = L2 - L1
  const dCp = C2p - C1p
  let dhp = 0
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p
    if (dhp > 180) dhp -= 360
    else if (dhp < -180) dhp += 360
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * DEG)

  const Lbarp = (L1 + L2) / 2
  const Cbarp = (C1p + C2p) / 2
  let hbarp = h1p + h2p
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) <= 180) hbarp = (h1p + h2p) / 2
    else if (h1p + h2p < 360) hbarp = (h1p + h2p + 360) / 2
    else hbarp = (h1p + h2p - 360) / 2
  }

  const T =
    1 -
    0.17 * Math.cos((hbarp - 30) * DEG) +
    0.24 * Math.cos(2 * hbarp * DEG) +
    0.32 * Math.cos((3 * hbarp + 6) * DEG) -
    0.2 * Math.cos((4 * hbarp - 63) * DEG)
  const dTheta = 30 * Math.exp(-Math.pow((hbarp - 275) / 25, 2))
  const Cbarp7 = Math.pow(Cbarp, 7)
  const Rc = 2 * Math.sqrt(Cbarp7 / (Cbarp7 + POW25_7))
  const Lm50 = (Lbarp - 50) * (Lbarp - 50)
  const Sl = 1 + (0.015 * Lm50) / Math.sqrt(20 + Lm50)
  const Sc = 1 + 0.045 * Cbarp
  const Sh = 1 + 0.015 * Cbarp * T
  const Rt = -Math.sin(2 * dTheta * DEG) * Rc

  const tL = dLp / Sl
  const tC = dCp / Sc
  const tH = dHp / Sh
  return Math.sqrt(tL * tL + tC * tC + tH * tH + Rt * tC * tH)
}

export function deltaE(x: Lab, y: Lab): number {
  return ciede2000(x[0], x[1], x[2], y[0], y[1], y[2])
}

/** 相对亮度 0–1，用来决定格子里的字用白色还是深色 */
export function luminance(r: number, g: number, b: number): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}

/** 深色格返回 true（应该用白字） */
export function isDark(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex)
  return luminance(r, g, b) < 0.36
}
