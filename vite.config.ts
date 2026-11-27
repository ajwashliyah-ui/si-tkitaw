import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const rootDir = import.meta.dirname;
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(rootDir, 'dist');
          const srcAssets = path.resolve(rootDir, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
          const rootConfigJs = path.resolve(rootDir, 'config.js');
          if (fs.existsSync(distDir) && fs.existsSync(rootConfigJs)) {
            fs.copyFileSync(rootConfigJs, path.resolve(distDir, 'config.js'));
          }
        },
      },
    ],
    build: {
      chunkSizeWarningLimit: 700,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {name: 'vendor-react', test: /node_modules[\\/](react|react-dom|scheduler)/},
              {name: 'vendor-firebase', test: /node_modules[\\/](firebase|@firebase)/},
              {name: 'vendor-xlsx', test: /node_modules[\\/](xlsx|cfb|codepage|ssf|wmf)/},
              {name: 'vendor-charts', test: /node_modules[\\/](chart\.js|@kurkle)/},
              {name: 'vendor-ui', test: /node_modules[\\/](lucide-react|motion|framer-motion)/},
            ],
          },
        },
      },
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(rootDir, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
