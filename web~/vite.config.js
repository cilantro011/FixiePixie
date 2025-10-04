import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,                // listen on all interfaces
    allowedHosts: ['penetration-candle-illinois-reuters.trycloudflare.com']
      // allow Cloudflare (or any) tunnel host
  
  },
})
