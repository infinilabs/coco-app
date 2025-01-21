import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from 'path';
import { config } from "dotenv";

config();

const host = process.env.TAURI_DEV_HOST;
// console.log("process.env", process.env)

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
        protocol: "ws",
        host,
        port: 1421,
      }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
    proxy: {
      "/chat": {
        target: process.env.COCO_SERVER_URL,
        changeOrigin: true,
        secure: false,
      },
      "/query": {
        target: process.env.COCO_SERVER_URL,
        changeOrigin: true,
        secure: false,
      },
      "/connector": {
        target: process.env.COCO_SERVER_URL,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          lodash: ['lodash'],
          katex: ['rehype-katex'],
          highlight: ['rehype-highlight'],
          mermaid: ['mermaid'],
        }
      },
    },
    chunkSizeWarningLimit: 600,
  },
}));
