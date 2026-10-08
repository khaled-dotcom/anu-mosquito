import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
    rolldownOptions: {
      output: {
        // Long-lived vendor chunks: app deploys don't invalidate cached
        // React / Supabase code in users' browsers.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[/\\](react|react-dom|scheduler)[/\\]/ },
            { name: 'supabase', test: /node_modules[/\\]@supabase[/\\]/ },
          ],
        },
      },
    },
  },
})
