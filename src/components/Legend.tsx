import { isDark } from '../lib/color'
import type { UsageItem } from '../lib/pattern'

interface Props {
  usage: UsageItem[]
  highlight: number | null
  onPick: (index: number | null) => void
}

/** 用量清单：点某个颜色可以在预览图上高亮它的位置 */
export default function Legend({ usage, highlight, onPick }: Props) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-1.5">
      {usage.map((u) => {
        const active = highlight === u.index
        return (
          <button
            key={u.index}
            type="button"
            aria-pressed={active}
            onClick={() => onPick(active ? null : u.index)}
            className={`flex items-center gap-1.5 rounded-lg border p-1 text-left transition ${
              active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-[10px] font-semibold ring-1 ring-black/10"
              style={{ background: u.color.hex, color: isDark(u.color.hex) ? '#fff' : '#1e293b' }}
            >
              {u.color.code}
            </span>
            <span className="text-xs leading-tight tabular-nums">
              <b className="block text-sm">{u.color.code}</b>
              {u.count} 颗
            </span>
          </button>
        )
      })}
    </div>
  )
}
