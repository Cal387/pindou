/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 网站放在哪个路径下：
// - GitHub Pages 是 https://用户名.github.io/pindou/ ，所以默认是 '/pindou/'
// - 用自己的域名（比如 Cloudflare Pages）时网站在根路径，构建时设置环境变量 BASE_PATH=/
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}
const base = env.BASE_PATH || '/pindou/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  worker: { format: 'es' },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
