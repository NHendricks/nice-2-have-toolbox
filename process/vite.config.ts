import { builtinModules } from 'module';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import dependencies from './package.json';

export default defineConfig({
  build: {
    sourcemap: true,
    minify: false,
    lib: {
      entry: 'main.ts',
      formats: ['cjs'],
    },
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
      },
      external: [
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
        ...Object.keys(dependencies || {}),
      ],
    },
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: './preload.js',
          dest: '',
        },
      ],
    }),
  ],
});
