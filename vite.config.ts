import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

import { generateAssets } from './scripts/generate_assets';

export default defineConfig(async ({mode}) => {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
    // Generate assets during build/dev
    console.log('Generating assets with key length:', apiKey.length);
    await generateAssets(apiKey);
  } else {
    console.warn('GEMINI_API_KEY missing or invalid, skipping asset generation');
  }

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
