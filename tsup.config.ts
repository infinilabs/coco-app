import { defineConfig } from 'tsup';
import { writeFileSync, readFileSync, copyFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';

export default defineConfig({
  entry: ['src/pages/web/index.tsx'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: false,
  clean: true,
  treeshake: true,
  minify: true,
  env: {
    BUILD_TARGET: 'web',
  },
  external: [
    'react',
    'react-dom',
  ],
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
    options.external = [
      '@tauri-apps/api',
      '@tauri-apps/plugin-*',
      'tauri-plugin-*',
    ];
    options.treeShaking = true;
    options.define = {
      'process.env.BUILD_TARGET': '"web"',
    };
    options.pure = ['console.log'];
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
  outDir: 'out/search-chat',
  async onSuccess() {
    const projectPackageJson = JSON.parse(
      readFileSync(join(__dirname, 'package.json'), 'utf-8')
    );

    const packageJson = {
      name: "search-chat",
      version: "0.0.23",
      main: "index.cjs",
      module: "index.js",
      types: "index.d.ts",
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
      join(__dirname, 'out/search-chat/package.json'),
      JSON.stringify(packageJson, null, 2)
    );
  }
});