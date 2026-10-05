import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// En desarrollo, Vite reenvía /auth y /feria a sus servicios. Así el frontend y la API
// comparten origen, igual que en producción detrás de nginx o del balanceador de AWS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:4001',
      '/feria': 'http://localhost:4002',
    },
  },
});
