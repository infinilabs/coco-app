import { defineConfig } from 'tsup';
import { writeFileSync, readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import postcss from 'postcss';
import tailwindcssPostcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';

const projectPackageJson = JSON.parse(
  readFileSync(join(__dirname, 'package.json'), 'utf-8')
);

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const name of entries) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

function hasTauriRefs(content: string): boolean {
  return /@tauri-apps|tauri-plugin/i.test(content);
}

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
    // Enable Tailwind v4 CSS import resolution using the "style" condition
    // so that `@import "tailwindcss";` in CSS can be resolved by esbuild.
    // See: https://tailwindcss.com/docs/installation#bundlers
    (options as any).conditions = ["style", "browser", "module", "default"];
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
      'process.env.VERSION': `"${projectPackageJson.version}"`,
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
    const outDir = join(__dirname, 'out/search-chat');
    const files = walk(outDir).filter(f => /\.(m?js|cjs)$/i.test(f));
    const tauriFiles = files.filter(f => {
      const content = readFileSync(f, 'utf-8');
      return hasTauriRefs(content);
    });

    if (tauriFiles.length) {
      throw new Error(
        `Build output contains Tauri references:\n${tauriFiles.map(f => ` - ${f}`).join('\n')}`
      );
    }
    const projectPackageJson = JSON.parse(
      readFileSync(join(__dirname, 'package.json'), 'utf-8')
    );

    const packageJson = {
      name: "@infinilabs/search-chat",
      version: "1.2.54-beat.3",
      main: "index.js",
      module: "index.js",
      type: "module",
      types: "index.d.ts",
      dependencies: projectPackageJson.dependencies as Record<string, string>,
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

    try {
      const readmePath = join(__dirname, 'src/pages/web/README.md');
      const readmeContent = readFileSync(readmePath, 'utf-8');
      writeFileSync(
        join(__dirname, 'out/search-chat/README.md'),
        readmeContent
      );
    } catch (error) {
      console.error('Failed to copy README.md:', error);
    }

    // Ensure Tailwind v4 directives (@import, @source, @apply, @theme) are compiled
    // into a final CSS for the library consumer. Esbuild doesn't process Tailwind,
    // so we run PostCSS with Tailwind + Autoprefixer here to produce index.css.
    try {
      const cssInPath = join(__dirname, 'src/main.css');
      const cssOutPath = join(__dirname, 'out/search-chat/index.css');
      const cssIn = readFileSync(cssInPath, 'utf-8');

      const result = await postcss([
        // Use the Tailwind v4 PostCSS plugin from @tailwindcss/postcss
        tailwindcssPostcss,
        autoprefixer,
      ]).process(cssIn, {
        from: cssInPath,
        to: cssOutPath,
        map: false,
      });

      // Inline absolute asset URLs as Base64 data URIs to avoid shipping extra files
      // This fixes consumer bundlers failing to resolve "/assets/*.png" from node_modules
      const assetRegex = /url\((['"])\/assets\/([^'"\)]+)\1\)/g;
      const rewrittenCss = result.css.replace(assetRegex, (_m, quote, file) => {
        const srcAssetPath = join(__dirname, 'src/assets', file);
        if (!existsSync(srcAssetPath)) {
          console.warn(`[build:web] Asset not found: ${srcAssetPath}`);
          return `url(${quote}/assets/${file}${quote})`;
        }
        try {
          const buffer = readFileSync(srcAssetPath);
          const ext = file.split('.').pop()?.toLowerCase() ?? 'png';
          const mime = ext === 'svg'
            ? 'image/svg+xml'
            : ext === 'jpg' || ext === 'jpeg'
            ? 'image/jpeg'
            : 'image/png';
          const base64 = buffer.toString('base64');
          const dataUrl = `data:${mime};base64,${base64}`;
          return `url(${quote}${dataUrl}${quote})`;
        } catch (err) {
          console.error(`[build:web] Failed to inline asset ${file}:`, err);
          return `url(${quote}/assets/${file}${quote})`;
        }
      });

      writeFileSync(cssOutPath, rewrittenCss);
    } catch (error) {
      console.error('Failed to compile Tailwind CSS with PostCSS:', error);
    }
  }
});
