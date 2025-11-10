import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [
    vue(),
    nodePolyfills({
      // 显式包含 buffer 模块
      include: ["buffer"],
    }),
  ],
  // 配置构建目标以支持现代特性
  build: {
    target: ["es2022", "chrome100", "safari15"],

    // 启用 top-level await 支持
    polyfillModulePreload: true,

    // 配置 rollup 选项
    rollupOptions: {
      output: {
        // 确保正确处理模块
        format: "es",
      },
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
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
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
