import { defineConfig } from 'tsup';
import { writeFileSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

export default defineConfig({
  entry: ['src/pages/web/index.tsx'],
  format: ['esm'],
  dts: true,
  splitting: true,
  sourcemap: false,
  clean: true,
  treeshake: true,
  minify: true,
  env: {
    BUILD_TARGET: 'web',
    NODE_ENV: 'production',
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
      'process.env.NODE_ENV': '"production"',
      'process.env.DEBUG': 'false',
      'process.env.IS_DEV': 'false',
    };
    options.pure = ['console.log'];
    options.target = 'es2020';
    options.legalComments = 'none';
    options.ignoreAnnotations = false;
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
      name: "@infinilabs/search-chat",
      version: "1.0.0",
      main: "index.js",
      module: "index.js",
      type: "module",
      types: "index.d.ts",
      dependencies: projectPackageJson.dependencies,
      peerDependencies: {
        "react": "^18.0.0",
        "react-dom": "^18.0.0"
      },
      "sideEffects": [
        "*.css",
        "*.scss"
      ],
      "publishConfig": {
        "access": "public",
        "registry": "https://registry.npmjs.org/"
      }    
    };
    
    const noNeedDeps = [
        "@wavesurfer/react",
        "dotenv",
        "uuid",
        "wavesurfer.js",
    ]

    const tauriDeps = Object.keys(packageJson.dependencies).filter(dep =>
      dep.includes('@tauri-apps') ||
      dep.includes('tauri-plugin') ||
      noNeedDeps.includes(dep)
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