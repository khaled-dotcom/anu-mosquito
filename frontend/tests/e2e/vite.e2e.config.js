import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// Serves the real app, but swaps src/supabase.js for an in-memory mock.
const mock = fileURLToPath(new URL('./mockSupabase.js', import.meta.url))
const root = fileURLToPath(new URL('../..', import.meta.url))

export default defineConfig({
  root,
  logLevel: 'warn',
  plugins: [
    {
      name: 'e2e-mock-supabase',
      enforce: 'pre',
      resolveId(source, importer) {
        if (importer && importer.includes('/src/') && /(^|\/)supabase(\.js)?$/.test(source)) return mock
      },
    },
    react(),
  ],
  server: { port: Number(process.env.E2E_PORT || 5199), strictPort: true },
})
