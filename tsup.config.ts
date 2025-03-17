import { defineConfig } from 'tsup';
import { writeFileSync, readFileSync } from 'fs';
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
    const projectPackageJson = JSON.parse(
      readFileSync(join(__dirname, 'package.json'), 'utf-8')
    );

    const packageJson = {
      name: "search-chat",
      version: "1.0.0",
      main: "SearchChat.cjs",
      module: "SearchChat.js",
      types: "SearchChat.d.ts",
      dependencies: projectPackageJson.dependencies,
      peerDependencies: {
        "react": "^18.0.0",
        "react-dom": "^18.0.0"
      }
    };

    const tauriDeps = Object.keys(packageJson.dependencies).filter(dep => 
      dep.includes('@tauri-apps') || 
      dep.includes('tauri-plugin')
    );
    tauriDeps.forEach(dep => {
      delete packageJson.dependencies[dep];
    });

    writeFileSync(
      join(__dirname, 'dist/search-chat/package.json'),
      JSON.stringify(packageJson, null, 2)
    );
  }
});