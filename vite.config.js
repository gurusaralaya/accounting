import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ⚠️ Change 'accounting' to match your exact GitHub repo name
export default defineConfig({
  plugins: [react()],
  base: '/accounting/',
})
