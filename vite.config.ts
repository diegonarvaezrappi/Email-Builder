import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Rutas relativas en el build: la app se sirve bajo una subruta en Coolify
  // (app.vibes.rappi.com/email-builder) y también en la raíz del VPS de Hetzner.
  base: './',
  server: {
    // Permite Host headers externos (necesario para exponer el dev server
    // vía un tunnel como cloudflared, cuya subdomain cambia en cada corrida).
    allowedHosts: true,
  },
})
