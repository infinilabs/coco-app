import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { config } from "dotenv";
import packageJson from "./package.json";

config();

const host = process.env.TAURI_DEV_HOST;
// console.log("process.env", process.env)

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    "process.env.VERSION": JSON.stringify(packageJson.version),
  },
  // Keep Tailwind first so its scanner runs early and consistently
  plugins: [tailwindcss() as any, react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 6060,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 6061,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
    proxy: {
      "/account": {
        target: process.env.COCO_SERVER_URL,
        changeOrigin: true,
        secure: false,
      },
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
      "/integration": {
        target: process.env.COCO_SERVER_URL,
        changeOrigin: true,
        secure: false,
      },
      "/assistant": {
        target: process.env.COCO_SERVER_URL,
        changeOrigin: true,
        secure: false,
      },
      "/datasource": {
        target: process.env.COCO_SERVER_URL,
        changeOrigin: true,
        secure: false,
      },
      "/settings": {
        target: process.env.COCO_SERVER_URL,
        changeOrigin: true,
        secure: false,
      },
      "/mcp_server": {
        target: process.env.COCO_SERVER_URL,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  optimizeDeps: {
    exclude: [
      "@tauri-apps/api",
      "@tauri-apps/api/core",
      "@tauri-apps/api/event",
      "@tauri-apps/api/window",
      "@tauri-apps/api/dpi",
      "@tauri-apps/api/webviewWindow",
      "@tauri-apps/plugin-dialog",
      "@tauri-apps/plugin-process",
      "tauri-plugin-fs-pro-api",
      "tauri-plugin-macos-permissions-api",
      "tauri-plugin-screenshots-api",
      "tauri-plugin-windows-version-api",
    ],
    force: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          router: ["react-router-dom"],
          markdown: [
            "react-markdown",
            "remark-gfm",
            "remark-breaks",
            "remark-math",
            "rehype-highlight",
            "rehype-katex",
            "mdast-util-gfm-autolink-literal",
          ],
          mermaid: ["mermaid"],
          icons: ["lucide-react", "@infinilabs/custom-icons"],
          utils: ["lodash-es", "dayjs", "uuid", "nanoid", "axios"],
          "tauri-api": [
            "@tauri-apps/api/core",
            "@tauri-apps/api/event",
            "@tauri-apps/api/window",
            "@tauri-apps/api/dpi",
            "@tauri-apps/api/webviewWindow",
          ],
          "tauri-plugins": [
            "@tauri-apps/plugin-dialog",
            "@tauri-apps/plugin-process",
            "tauri-plugin-fs-pro-api",
            "tauri-plugin-macos-permissions-api",
            "tauri-plugin-screenshots-api",
          ],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
