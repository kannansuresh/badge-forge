import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import { defineConfig, fontProviders } from 'astro/config';
import process from 'node:process'; // Adds the explicit import to fix the ESLint error

export default defineConfig({
  // Use environment variables for deployment, fallback to defaults
  site: process.env.SITE_URL || 'https://badgeforge.app',
  base: process.env.BASE_PATH || '/',
  output: 'static',
  integrations: [
    react(),
    icon({
      iconDir: 'src/icons',
      svgoOptions: {
        plugins: ['preset-default', { name: 'convertColors', params: { currentColor: true } }],
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  fonts: [
    {
      name: 'Outfit',
      cssVariable: '--font-sans',
      provider: fontProviders.google(),
      weights: [400, 500, 600, 700, 800],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
    },
    {
      name: 'Geist Mono',
      cssVariable: '--font-mono',
      provider: fontProviders.google(),
      weights: [400, 500, 600],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],
});
