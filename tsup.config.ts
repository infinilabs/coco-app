import { defineConfig } from 'tsup';
import { writeFileSync } from 'fs';
import { join, resolve } from 'path';

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
  treeshake: true,
  minify: true,
  esbuildOptions(options) {
    options.bundle = true;
    options.platform = 'browser';
    options.loader = {
      '.css': 'css',
      '.scss': 'css',
      '.svg': 'dataurl',
      '.png': 'dataurl',
      '.jpg': 'dataurl',
    },
    options.alias = {
      '@': resolve(__dirname, './src')
    }
  },
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
  async onSuccess() {
    const packageJson = {
      name: "search-chat",
      version: "1.0.0",
      main: "index.cjs",
      module: "index.js",
      types: "index.d.ts",
      peerDependencies: {
        "react": "^18.0.0",
        "react-dom": "^18.0.0"
      }
    };

    writeFileSync(
      join(__dirname, 'dist/search-chat/package.json'),
      JSON.stringify(packageJson, null, 2)
    );
  }
});