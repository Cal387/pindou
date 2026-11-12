import { useCallback, useEffect, useMemo, useState } from 'react'
import Uploader from '../components/Uploader'
import CropBox from '../components/CropBox'
import Settings from '../components/Settings'
import PreviewCanvas from '../components/PreviewCanvas'
import SheetCanvas from '../components/SheetCanvas'
import Legend from '../components/Legend'
import { usePattern } from '../hooks/usePattern'
import {
  canvasToPngBlob,
  cropToRaw,
  downloadBlob,
  loadImageFile,
  safeFileName,
  type CropRect,
  type SourceImage,
} from '../lib/browser'
import { countUsage, DEFAULT_OPTIONS, totalBeads, type PatternOptions } from '../lib/pattern'
import { rowsFor } from '../lib/image'
import { renderSheet } from '../lib/render'
import { usageToCsv } from '../lib/csv'
import { MARD } from '../palettes'

const brand = MARD

function Card(props: { title?: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      {(props.title || props.extra) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">{props.title}</h2>
          {props.extra}
        </div>
      )}
      {props.children}
    </section>
  )
}

export default function Home() {
  const [source, setSource] = useState<SourceImage | null>(null)
  const [crop, setCrop] = useState<CropRect | null>(null)
  const [options, setOptions] = useState<PatternOptions>(DEFAULT_OPTIONS)
  const [title, setTitle] = useState('')
  const [tab, setTab] = useState<'preview' | 'sheet'>('preview')
  const [highlight, setHighlight] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const handleFile = useCallback(async (file: File) => {
    setLoadError(null)
    try {
      const img = await loadImageFile(file)
      setCrop(null)
      setHighlight(null)
      setSource((old) => {
        if (old) URL.revokeObjectURL(old.url)
        return img
      })
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  // 支持直接粘贴图片（电脑上 Ctrl/Cmd + V）
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = [...(e.clipboardData?.files ?? [])].find((x) => x.type.startsWith('image/'))
      if (f) handleFile(f)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [handleFile])

  const raw = useMemo(() => (source && crop ? cropToRaw(source, crop) : null), [source, crop])
  const { pattern, busy, error } = usePattern(raw, brand.id, options)
  const usage = useMemo(() => (pattern ? countUsage(pattern, brand) : []), [pattern])
  const total = totalBeads(usage)
  const rows = raw ? rowsFor(options.cols, raw.width, raw.height) : null

  // 高亮的颜色如果在新结果里已经不存在了，就取消高亮
  useEffect(() => {
    if (highlight !== null && !usage.some((u) => u.index === highlight)) setHighlight(null)
  }, [usage, highlight])

  const baseName = pattern ? `${safeFileName(title)}_${pattern.cols}x${pattern.rows}` : ''

  const exportPng = async () => {
    if (!pattern) return
    setExporting(true)
    try {
      const canvas = document.createElement('canvas')
      renderSheet(canvas, { pattern, brand, usage, title })
      downloadBlob(await canvasToPngBlob(canvas), `${baseName}.png`)
      canvas.width = canvas.height = 0 // 及时释放内存
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e))
    } finally {
      setExporting(false)
    }
  }

  const exportCsv = () => {
    const names = Object.fromEntries(brand.series.map((s) => [s.id, s.name]))
    downloadBlob(new Blob([usageToCsv(usage, names)], { type: 'text/csv;charset=utf-8' }), `${baseName}_用量.csv`)
  }

  if (!source) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Uploader onFile={handleFile} />
        {loadError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>}
        <ol className="space-y-1 rounded-2xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200">
          <li>1. 选一张图片，裁剪出想要的部分</li>
          <li>2. 调整图纸大小、颜色数等参数，实时看效果</li>
          <li>3. 下载高清图纸和用量清单，照着拼</li>
        </ol>
      </div>
    )
  }

  const highlighted = usage.find((u) => u.index === highlight)

  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_1fr] lg:items-start">
      <div className="space-y-4">
        <Card title="1. 裁剪图片" extra={<Uploader compact onFile={handleFile} />}>
          <CropBox source={source} onCrop={setCrop} />
          {loadError && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>}
        </Card>
        <Card title="2. 调整参数">
          <Settings brand={brand} options={options} onChange={setOptions} rows={rows} />
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-sm">
              {(
                [
                  ['preview', '拼好效果'],
                  ['sheet', '图纸'],
                ] as const
              ).map(([t, label]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`rounded-md px-4 py-1.5 font-medium ${tab === t ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-sm tabular-nums text-slate-500">
              {busy ? (
                <span className="text-rose-600">正在生成…</span>
              ) : pattern ? (
                <>
                  {pattern.cols} 列 × {pattern.rows} 行 · {usage.length} 种颜色 · 共 {total} 颗
                </>
              ) : null}
            </p>
          </div>

          {error && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          {pattern ? (
            <div className={busy ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
              {tab === 'preview' ? (
                <>
                  <PreviewCanvas pattern={pattern} brand={brand} highlight={highlight} onPick={setHighlight} />
                  <p className="mt-2 text-center text-xs text-slate-400">
                    {highlighted ? (
                      <>
                        正在高亮 <b className="text-slate-700">{highlighted.color.code}</b>（{highlighted.count} 颗），
                        <button type="button" className="text-rose-600 underline" onClick={() => setHighlight(null)}>
                          取消高亮
                        </button>
                      </>
                    ) : (
                      '点图上的豆子或下面的颜色，可以高亮这个颜色的所有位置'
                    )}
                  </p>
                </>
              ) : (
                <>
                  <SheetCanvas pattern={pattern} brand={brand} usage={usage} title={title} />
                  <p className="mt-2 text-center text-xs text-slate-400">这里是缩小显示，下载的 PNG 是高清的，可以放大看色号</p>
                </>
              )}
            </div>
          ) : (
            <div className="grid h-48 place-items-center text-sm text-slate-400">正在生成…</div>
          )}
        </Card>

        {pattern && (
          <>
            <Card title="3. 导出">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">作品名（显示在图纸右侧，可以不填）</span>
                <input
                  type="text"
                  value={title}
                  maxLength={30}
                  placeholder="比如：我家的猫"
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                />
              </label>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={exportPng}
                  disabled={exporting || busy}
                  className="rounded-xl bg-rose-500 px-4 py-3 font-semibold text-white active:bg-rose-600 disabled:opacity-50"
                >
                  {exporting ? '正在导出…' : '下载高清图纸（PNG）'}
                </button>
                <button
                  type="button"
                  onClick={exportCsv}
                  disabled={busy}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 active:bg-slate-100 disabled:opacity-50"
                >
                  下载用量清单（CSV）
                </button>
              </div>
            </Card>

            <Card title={`用量清单 · ${usage.length} 种颜色 · 共 ${total} 颗`}>
              <Legend
                usage={usage}
                highlight={highlight}
                onPick={(i) => {
                  setHighlight(i)
                  if (i !== null) setTab('preview')
                }}
              />
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
