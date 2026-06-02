import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
  // GitHub Pages deployment — set via env or default
  site: process.env.SITE_URL || 'https://badgecraft.app',
  // Output fully static
  output: 'static',
});
