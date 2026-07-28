import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    // bcrypt custo 12 pode estourar o default (5s) quando as suítes rodam em
    // paralelo (ex.: no CI com --no-cache). Margem maior evita falha flaky.
    testTimeout: 20000,
    hookTimeout: 20000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
