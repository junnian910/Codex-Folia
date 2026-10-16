import path from 'node:path';
import { defineConfig } from 'vite';
import originalConfig from './vite.config';

// vite.codex.config.ts
// A single runtime bundle for a blank embedded document, with original workers inlined.
export default defineConfig(async env => {
  const config = await originalConfig(env);
  const plugins = ((config.plugins ?? []) as any[]).flat(Infinity).filter((plugin: any) => !plugin?.name?.includes('pwa'));
  return {
    ...config,
    define: { ...config.define, 'process.env.NODE_ENV': JSON.stringify('production'), 'import.meta.env.VITE_NETEASE_API_BASE': JSON.stringify('/folia/api/netease') },
    plugins: [
      ...plugins,
      {
        name: 'codex-inline-workers',
        enforce: 'pre' as const,
        transform(code: string, id: string) {
          if (!/src\/(utils\/(lyrics\/workerClient|localMetadataWorkerClient)|services\/automix\/analysisOffThread)\.ts$/.test(id.replaceAll('\\', '/'))) return;
          let source = '';
          const transformed = code.replace(/new Worker\(\s*new URL\('([^']+)', import\.meta\.url\),\s*\{\s*type: 'module'\s*,?\s*\}\s*\)/g, (_, workerPath) => {
            source = workerPath;
            return 'new CodexInlineWorker()';
          });
          return source ? `import CodexInlineWorker from '${source}?worker&inline';\n${transformed}` : null;
        },
      },
    ],
    base: './',
    build: {
      outDir: process.env.FOLIA_CODEX_DIST_DIR ? path.join(process.env.FOLIA_CODEX_DIST_DIR, 'embedded') : '../../outputs/Codex-Folia/embedded',
      emptyOutDir: true,
      assetsInlineLimit: Number.MAX_SAFE_INTEGER,
      cssCodeSplit: false,
      lib: { entry: path.resolve('src/codex.ts'), formats: ['iife' as const], name: 'FoliaEmbedded', fileName: () => 'folia.js' },
      rolldownOptions: { output: { codeSplitting: false } },
    },
  };
});
