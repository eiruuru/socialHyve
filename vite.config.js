import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const metaAppId = env.VITE_META_APP_ID || env.META_APP_ID || '';

  return {
    server: {
      port: 5173,
      strictPort: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: metaAppId
      ? { 'import.meta.env.VITE_META_APP_ID': JSON.stringify(metaAppId) }
      : undefined,
    plugins: [
      react(),
      {
        name: 'inject-fb-app-id',
        transformIndexHtml(html) {
          if (!metaAppId || html.includes('property="fb:app_id"')) return html;
          return html.replace(
            '<meta property="og:locale"',
            `<meta property="fb:app_id" content="${metaAppId}" />\n    <meta property="og:locale"`,
          );
        },
      },
    ],
  };
});
