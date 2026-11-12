// 把 "A1 FAF4C8 A2 FFFFD5 ..." 形式的原始色卡文本转换成 src/palettes/mard.json
// 用法：node scripts/build-palette.mjs
import { readFileSync, writeFileSync } from 'node:fs'
const raw = readFileSync(new URL('./mard-raw.txt', import.meta.url), 'utf8')
const tokens = raw.split(/\s+/).filter(Boolean)
if (tokens.length % 2) throw new Error('色号和颜色值没有成对出现')
const out = []
for (let i = 0; i < tokens.length; i += 2) {
  const code = tokens[i]
  const hex = tokens[i + 1]
  if (!/^[A-Z]\d+$/.test(code) || !/^[0-9A-F]{6}$/.test(hex)) throw new Error(`格式不对: ${code} ${hex}`)
  out.push({ code, hex: '#' + hex, series: code[0] })
}
const body = out.map((c) => '  ' + JSON.stringify(c)).join(',\n')
writeFileSync(new URL('../src/palettes/mard.json', import.meta.url), `[\n${body}\n]\n`)
console.log(`写入 ${out.length} 个颜色`)
