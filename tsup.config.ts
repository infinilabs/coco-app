import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/pages/web/SearchChat.tsx'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'react-dom',
  ],
  esbuildPlugins: [
    {
      name: 'jsx-import-source',
      setup(build) {
        build.initialOptions.jsx = 'automatic';
        build.initialOptions.jsxImportSource = 'react';
      },
    },
  ],
  outDir: 'dist/search-chat',
});