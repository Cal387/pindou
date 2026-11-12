import type { ReactNode } from 'react'
import { DEFAULT_OPTIONS, type PatternOptions } from '../lib/pattern'
import { MAX_DESPECKLE } from '../lib/despeckle'
import type { Brand } from '../palettes'

interface Props {
  brand: Brand
  options: PatternOptions
  onChange: (next: PatternOptions) => void
  rows: number | null
}

const DESPECKLE_LABELS = ['关', '弱', '中', '强', '最强']

function Slider(props: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  display?: ReactNode
  hint?: string
  onChange: (v: number) => void
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-medium text-slate-700">{props.label}</span>
        <span className="tabular-nums text-slate-500">{props.display ?? props.value}</span>
      </div>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        className="w-full accent-rose-500"
      />
      {props.hint && <p className="mt-0.5 text-xs text-slate-400">{props.hint}</p>}
    </label>
  )
}

function Toggle(props: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3">
      <span>
        <span className="block text-sm font-medium text-slate-700">{props.label}</span>
        {props.hint && <span className="block text-xs text-slate-400">{props.hint}</span>}
      </span>
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-rose-500 peer-focus-visible:ring-2 peer-focus-visible:ring-rose-300 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
    </label>
  )
}

export default function Settings({ brand, options, onChange, rows }: Props) {
  const set = <K extends keyof PatternOptions>(key: K, value: PatternOptions[K]) =>
    onChange({ ...options, [key]: value })

  const toggleSeries = (id: string) => {
    const on = options.enabledSeries.includes(id)
    if (on && options.enabledSeries.length === 1) return // 至少留一个色系
    set('enabledSeries', on ? options.enabledSeries.filter((s) => s !== id) : [...options.enabledSeries, id])
  }

  return (
    <div className="space-y-5">
      <Slider
        label="图纸宽度"
        min={20}
        max={100}
        value={options.cols}
        display={rows ? `${options.cols} 列 × ${rows} 行` : `${options.cols} 列`}
        onChange={(v) => set('cols', v)}
      />
      <Slider
        label="最大颜色数"
        min={8}
        max={60}
        value={options.maxColors}
        display={`${options.maxColors} 种`}
        onChange={(v) => set('maxColors', v)}
      />

      <div>
        <div className="mb-1.5 flex items-baseline justify-between text-sm">
          <span className="font-medium text-slate-700">色系</span>
          <button
            type="button"
            className="text-xs text-rose-600"
            onClick={() => set('enabledSeries', brand.series.map((s) => s.id))}
          >
            全部打开
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {brand.series.map((s) => {
            const on = options.enabledSeries.includes(s.id)
            const sample = brand.colors.filter((c) => c.series === s.id).slice(3, 6)
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleSeries(s.id)}
                className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left text-sm transition ${
                  on ? 'border-rose-300 bg-rose-50 text-slate-800' : 'border-slate-200 bg-slate-50 text-slate-400 line-through'
                }`}
              >
                <span className={`flex shrink-0 -space-x-1 ${on ? '' : 'opacity-30'}`}>
                  {sample.map((c) => (
                    <span key={c.code} className="h-3 w-3 rounded-full ring-1 ring-white" style={{ background: c.hex }} />
                  ))}
                </span>
                <span className="truncate">
                  <b>{s.id}</b> {s.name}
                </span>
              </button>
            )
          })}
        </div>
        <p className="mt-1 text-xs text-slate-400">做人像时可以关掉 B、C、D，避免头发里出现绿色、蓝色杂点</p>
      </div>

      <Toggle
        label="去除背景"
        hint="把四周接近纯色的背景留空，不放豆子"
        checked={options.removeBackground}
        onChange={(v) => set('removeBackground', v)}
      />
      {options.removeBackground && (
        <Slider
          label="背景范围"
          min={3}
          max={35}
          value={options.backgroundThreshold}
          hint="背景没去干净就调大，主体被误删就调小"
          onChange={(v) => set('backgroundThreshold', v)}
        />
      )}

      <Slider
        label="肤色柔和"
        min={0}
        max={100}
        step={5}
        value={options.skinSoften}
        display={options.skinSoften === 0 ? '关' : options.skinSoften}
        hint="减轻脸上的阴影，让肤色更均匀。脸显得太平就调小，不是人像可以关掉"
        onChange={(v) => set('skinSoften', v)}
      />
      <Slider
        label="去杂点"
        min={0}
        max={MAX_DESPECKLE}
        value={options.despeckle}
        display={DESPECKLE_LABELS[options.despeckle]}
        hint="合并孤立的单颗异色豆子。眼睛、嘴唇被抹掉了就调弱一点"
        onChange={(v) => set('despeckle', v)}
      />
      <Slider
        label="对比度"
        min={-50}
        max={50}
        value={options.contrast}
        display={options.contrast > 0 ? `+${options.contrast}` : options.contrast}
        onChange={(v) => set('contrast', v)}
      />
      <Slider
        label="饱和度"
        min={-50}
        max={50}
        value={options.saturation}
        display={options.saturation > 0 ? `+${options.saturation}` : options.saturation}
        onChange={(v) => set('saturation', v)}
      />

      <button
        type="button"
        onClick={() => onChange(DEFAULT_OPTIONS)}
        className="w-full rounded-lg border border-slate-300 py-2 text-sm text-slate-600 active:bg-slate-100"
      >
        恢复默认参数
      </button>
    </div>
  )
}
