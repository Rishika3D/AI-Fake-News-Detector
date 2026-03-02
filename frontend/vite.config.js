import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',          // explicit — required by Render/Vercel/Netlify
    emptyOutDir: true,       // clear old build before each fresh build
    sourcemap: false,        // smaller bundle in production
  },
  server: {
    port: 5173,
  },
})
