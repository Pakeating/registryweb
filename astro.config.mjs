import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import { VitePWA } from 'vite-plugin-pwa';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: netlify(),
  server: {
    // Esto hace que el servidor sea accesible desde la red
    host: true
  },
  vite: {
    plugins: [
      VitePWA({
        registerType: 'autoUpdate',
        // El manifiesto se incrusta manualmente en Layout.astro para evitar problemas de CORS
        // en entornos de desarrollo con autenticación.
        manifest: false
      })
    ]
  }
});
