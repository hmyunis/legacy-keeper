import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import ts from 'typescript';

function vitestTsTranspilePlugin(): Plugin {
  return {
    name: 'vitest-ts-transpile',
    apply: 'serve',
    enforce: 'pre',
    transform(code, id) {
      const cleanId = id.split('?')[0];

      if (cleanId.includes('/node_modules/') || cleanId.includes('\\node_modules\\')) {
        return null;
      }

      if (!/\.[cm]?[jt]sx?$/.test(cleanId)) {
        return null;
      }

      const result = ts.transpileModule(code, {
        fileName: cleanId,
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          moduleResolution: ts.ModuleResolutionKind.Bundler,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
          sourceMap: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      });

      return {
        code: result.outputText,
        map: result.sourceMapText ? JSON.parse(result.sourceMapText) : null,
      };
    },
  };
}

export default defineConfig(() => {
  const isVitest = process.env.VITEST === 'true' || process.env.VITEST === '1';

  return {
    server: {
      port: 5173,
    },
    plugins: isVitest ? [vitestTsTranspilePlugin(), tailwindcss()] : [react(), tailwindcss()],
    esbuild: isVitest ? false : undefined,
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: true,
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      pool: 'threads',
      fileParallelism: false,
      poolOptions: {
        threads: {
          singleThread: true,
          isolate: false,
        },
      },
      deps: {
        optimizer: {
          web: {
            enabled: false,
          },
          ssr: {
            enabled: false,
          },
        },
      },
    },
  };
});
