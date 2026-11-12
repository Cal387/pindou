import { useEffect, useMemo, useState } from 'react'

export interface ExportItem {
  kind: 'png' | 'csv'
  blob: Blob
  filename: string
  /** CSV 的文字内容，用来显示和复制 */
  text?: string
}

/**
 * 导出结果弹窗。
 * 有些浏览器（微信内置浏览器、部分手机浏览器、嵌在 App 里的网页）不支持自动下载，
 * 所以这里把结果直接显示出来，并提供几种保存方式：
 * 下载链接、系统分享（可存到相册/文件）、长按图片保存、复制文字。
 */
export default function ExportDialog({ item, onClose }: { item: ExportItem; onClose: () => void }) {
  const url = useMemo(() => URL.createObjectURL(item.blob), [item.blob])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  const [message, setMessage] = useState<string | null>(null)

  // 图片用 data URL 显示：iPhone 上的 Chrome 等浏览器对 blob 地址的图片
  // 不能长按保存，也不能下载，data URL 的图片则可以长按存到相册。
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  useEffect(() => {
    if (item.kind !== 'png') return
    let cancelled = false
    const reader = new FileReader()
    reader.onload = () => !cancelled && setDataUrl(reader.result as string)
    reader.readAsDataURL(item.blob)
    return () => {
      cancelled = true
    }
  }, [item])

  const file = useMemo(
    () => new File([item.blob], item.filename, { type: item.kind === 'png' ? 'image/png' : 'text/csv' }),
    [item],
  )
  const canShare = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
  // 手机上优先用系统分享（里面有"存储图像 / 存储到文件"），它在各家手机浏览器里最可靠
  const touch = window.matchMedia('(pointer: coarse)').matches
  const shareFirst = canShare && touch

  const share = async () => {
    try {
      await navigator.share({ files: [file], title: item.filename })
    } catch (e) {
      // 用户自己取消分享不算错误
      if ((e as DOMException)?.name !== 'AbortError') setMessage('分享失败，请试试其他保存方式')
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText((item.text ?? '').replace(/^﻿/, ''))
      setMessage('已复制，可以粘贴到备忘录或表格里')
    } catch {
      setMessage('复制失败，请长按下面的文字手动复制')
    }
  }

  const primary = 'rounded-xl bg-rose-500 px-4 py-3 text-center font-semibold text-white active:bg-rose-600'
  const secondary =
    'rounded-xl border border-slate-300 bg-white px-4 py-3 text-center font-semibold text-slate-700 active:bg-slate-100'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="保存文件"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col gap-3 rounded-2xl bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">
            {item.kind === 'png' ? '图纸已生成' : '用量清单已生成'}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-slate-500 active:bg-slate-100">
            关闭
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-xl bg-slate-100 p-2">
          {item.kind === 'png' ? (
            dataUrl ? (
              <img src={dataUrl} alt="拼豆图纸" className="mx-auto block max-w-full [-webkit-touch-callout:default]" />
            ) : (
              <p className="py-10 text-center text-sm text-slate-400">正在准备图片…</p>
            )
          ) : (
            <pre className="select-text whitespace-pre-wrap break-all text-xs leading-relaxed text-slate-700">
              {(item.text ?? '').replace(/^﻿/, '')}
            </pre>
          )}
        </div>

        <p className="text-xs text-slate-500">
          {item.kind === 'png'
            ? shareFirst
              ? '点"保存到相册 / 分享"，在弹出的菜单里选"存储图像"。也可以长按上面的图片，选"存储到照片 / 保存图片"。'
              : '如果点"下载"没反应（比如在微信里打开）：长按上面的图片，选"保存图片"。'
            : '如果点"下载"没反应：点"复制内容"，再粘贴到备忘录或表格里。'}
        </p>
        {message && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{message}</p>}

        <div className="grid gap-2 sm:grid-cols-2">
          {shareFirst && (
            <button type="button" onClick={share} className={primary}>
              {item.kind === 'png' ? '保存到相册 / 分享' : '分享 / 存到文件'}
            </button>
          )}
          <a href={url} download={item.filename} className={shareFirst ? secondary : primary}>
            下载{item.kind === 'png' ? '图片' : '文件'}
          </a>
          {canShare && !shareFirst && (
            <button type="button" onClick={share} className={secondary}>
              {item.kind === 'png' ? '分享' : '分享 / 存到文件'}
            </button>
          )}
          {item.kind === 'csv' && (
            <button type="button" onClick={copy} className={secondary}>
              复制内容
            </button>
          )}
          {item.kind === 'png' && !touch && (
            <a href={url} target="_blank" rel="noreferrer" className={secondary}>
              在新页面打开
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
