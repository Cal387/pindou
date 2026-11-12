import { useEffect, useState } from 'react'
import ReactCrop, { centerCrop, makeAspectCrop, type PercentCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import type { CropRect, SourceImage } from '../lib/browser'

export type CropMode = 'free' | 'square'

const FULL: PercentCrop = { unit: '%', x: 0, y: 0, width: 100, height: 100 }

function initialCrop(mode: CropMode, src: SourceImage): PercentCrop {
  if (mode === 'free') return FULL
  return centerCrop(makeAspectCrop({ unit: '%', width: 100 }, 1, src.width, src.height), src.width, src.height)
}

interface Props {
  source: SourceImage
  onCrop: (crop: CropRect) => void
}

/** 裁剪框：拖动四角调整范围，可选正方形或自由比例 */
export default function CropBox({ source, onCrop }: Props) {
  const [mode, setMode] = useState<CropMode>('free')
  const [crop, setCrop] = useState<PercentCrop>(FULL)

  // 换图或切换比例时重置裁剪框
  useEffect(() => {
    const c = initialCrop(mode, source)
    setCrop(c)
    onCrop(c)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, source])

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-sm">
          {(
            [
              ['free', '自由比例'],
              ['square', '正方形'],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-md px-3 py-1 font-medium ${mode === m ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400">拖动边框选择范围</span>
      </div>
      <div className="flex justify-center rounded-xl bg-slate-100 p-2">
        <ReactCrop
          crop={crop}
          aspect={mode === 'square' ? 1 : undefined}
          keepSelection
          ruleOfThirds
          minWidth={24}
          minHeight={24}
          onChange={(_, percent) => setCrop(percent)}
          onComplete={(_, percent) => {
            if (percent.width > 0 && percent.height > 0) onCrop(percent)
          }}
        >
          <img src={source.url} alt="原图" className="max-h-[46vh] w-auto select-none" draggable={false} />
        </ReactCrop>
      </div>
    </div>
  )
}
