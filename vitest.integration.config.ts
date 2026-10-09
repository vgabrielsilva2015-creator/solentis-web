import { defineConfig } from 'vitest/config'
import path from 'path'

/**
 * Testes de integração (T-28): rodam contra um Postgres de verdade, com as migrations aplicadas.
 *
 *   INTEGRATION_DATABASE_URL=postgresql://user:senha@localhost:5432/solentis_int npm run test:integration
 *
 * - só arquivos `*.int.test.ts` (os testes unitários não tocam em banco);
 * - um arquivo por vez e na ordem: eles compartilham o mesmo banco e o limpam a cada teste;
 * - `src/test/setup-integration.ts` RECUSA rodar contra um banco que não seja local e de teste.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.int.test.ts'],
    setupFiles: ['src/test/setup-integration.ts'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
  },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
})
