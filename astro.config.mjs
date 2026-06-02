import { defineConfig, fontProviders } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';

export default defineConfig({
  integrations: [
    react(),
    icon({
      iconDir: 'src/icons',
      svgoOptions: {
        plugins: [
          'preset-default',
          { name: 'convertColors', params: { currentColor: true } },
        ],
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  site: process.env.SITE_URL || 'https://badgecraft.app',
  output: 'static',
  fonts: [
    {
      name: 'Inter',
      cssVariable: '--font-sans',
      provider: fontProviders.google(),
      weights: [400, 500, 600, 700, 800],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
    },
    {
      name: 'JetBrains Mono',
      cssVariable: '--font-mono',
      provider: fontProviders.google(),
      weights: [400, 500, 600],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],
});
