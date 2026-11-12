import { isDark } from '../lib/color'
import { MARD } from '../palettes'

const brand = MARD

/** 色卡页：按色系列出所有颜色，方便拿实物色卡对照 */
export default function PalettePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{brand.name}色卡</h1>
        <p className="mt-1 text-sm text-slate-500">
          共 {brand.colors.length} 色。屏幕显示和实物豆子会有色差，建议拿实物色卡对照着看。
        </p>
      </div>
      {brand.series.map((s) => {
        const colors = brand.colors.filter((c) => c.series === s.id)
        return (
          <section key={s.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 text-base font-semibold text-slate-900">
              {s.id} · {s.name}
              <span className="ml-2 text-sm font-normal text-slate-400">{colors.length} 色</span>
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-2">
              {colors.map((c) => (
                <div
                  key={c.code}
                  className="flex aspect-square flex-col items-center justify-center rounded-xl ring-1 ring-black/10"
                  style={{ background: c.hex, color: isDark(c.hex) ? '#fff' : '#1e293b' }}
                >
                  <span className="text-base font-bold leading-tight">{c.code}</span>
                  <span className="text-[10px] opacity-75">{c.hex}</span>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
