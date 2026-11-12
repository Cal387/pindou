import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import PalettePage from './pages/PalettePage'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-rose-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`

export default function App() {
  // HashRouter：地址是 /pindou/#/palette 这种形式，在 GitHub Pages 上刷新不会 404
  return (
    <HashRouter>
      <div className="min-h-dvh bg-slate-50 text-slate-900">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
            <NavLink to="/" className="flex items-center gap-2 text-base font-bold">
              <span className="grid h-7 w-7 grid-cols-2 gap-0.5 rounded-lg bg-rose-500 p-1">
                <i className="rounded-full bg-white" />
                <i className="rounded-full bg-white" />
                <i className="rounded-full bg-white" />
                <i className="rounded-full bg-amber-200" />
              </span>
              拼豆图纸生成器
            </NavLink>
            <nav className="flex gap-1">
              <NavLink to="/" end className={navClass}>
                做图纸
              </NavLink>
              <NavLink to="/palette" className={navClass}>
                色卡
              </NavLink>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/palette" element={<PalettePage />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
