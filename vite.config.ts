/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/pindou/',
  plugins: [react(), tailwindcss()],
  worker: { format: 'es' },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
