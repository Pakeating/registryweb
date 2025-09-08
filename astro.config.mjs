import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: netlify(),
  server: {
    // Esto hace que el servidor sea accesible desde la red
    host: true
  }
});