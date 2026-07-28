import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Permite Host headers externos (necesario para exponer el dev server
    // vía un tunnel como cloudflared, cuya subdomain cambia en cada corrida).
    allowedHosts: true,
  },
})
