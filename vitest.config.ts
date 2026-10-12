import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    env: {
      NEXT_PUBLIC_API_URL: 'http://localhost:8000',
    },
    setupFiles: [path.resolve(__dirname, './vitest.setup.ts')],
    include: ['src/tests/**/*.test.{ts,tsx}', 'src/lib/thermal/__tests__/**/*.test.ts'],
    exclude: ['src/tests/e2e/**', 'node_modules/**'],
    css: false,
  },
})
