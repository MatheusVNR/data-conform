import { defineConfig } from 'vitest/config';

// Config de testes isolada do vite.config.ts de produção.
// Usa o transform JSX automático do esbuild em vez do @vitejs/plugin-react
// (o plugin é acoplado à versão do Vite da aplicação, diferente da usada pelo Vitest).
export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
