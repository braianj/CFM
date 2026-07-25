import { defineConfig } from 'vitest/config'

// The rules suite talks to the Firestore emulator, so it runs on its own with
// `npm run test:rules` instead of alongside the unit tests.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['firestore.rules.test.ts'],
  },
})
