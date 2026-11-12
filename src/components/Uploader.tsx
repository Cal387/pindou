import { useRef, useState } from 'react'

interface Props {
  onFile: (file: File) => void
  compact?: boolean
}

/** 上传区：点击选择（手机上会打开相册）、拖拽、粘贴都可以 */
export default function Uploader({ onFile, compact }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  const pick = (files: FileList | null) => {
    const f = files?.[0]
    if (f) onFile(f)
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        pick(e.target.files)
        e.target.value = ''
      }}
    />
  )

  if (compact) {
    return (
      <>
        {input}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 active:bg-slate-100"
        >
          换一张图片
        </button>
      </>
    )
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        pick(e.dataTransfer.files)
      }}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition ${
        over ? 'border-rose-500 bg-rose-50' : 'border-slate-300 bg-white hover:border-rose-400'
      }`}
    >
      {input}
      <div className="mb-3 grid grid-cols-3 gap-1">
        {['#FD543D', '#FFDA45', '#63F347', '#41CCFF', '#AC7BDE', '#F551A2', '#FE8B4C', '#2F2B2F', '#FDD3CC'].map((c) => (
          <span key={c} className="h-4 w-4 rounded-full" style={{ background: c }} />
        ))}
      </div>
      <p className="text-lg font-semibold text-slate-800">点这里选择图片</p>
      <p className="mt-1 text-sm text-slate-500">手机可以从相册选；电脑也可以把图片拖进来</p>
      <p className="mt-3 text-xs text-slate-400">图片只在你的浏览器里处理，不会上传到任何服务器</p>
    </div>
  )
}
