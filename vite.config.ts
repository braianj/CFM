import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: '/CFM/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    // The rules suite needs the Firestore emulator, so it runs from `npm run test:rules`.
    exclude: ['node_modules/**', 'dist/**', 'firestore.rules.test.ts'],
  },
})
