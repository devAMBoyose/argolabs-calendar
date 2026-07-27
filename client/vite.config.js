import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  build: {
    outDir: "dist",
    emptyOutDir: true,

    rollupOptions: {
      output: {
        entryFileNames: "assets/index.js",
        chunkFileNames: "assets/chunk-[name].js",
        assetFileNames(assetInfo) {
          const fileName = assetInfo.name || "";

          if (fileName.endsWith(".css")) {
            return "assets/index.css";
          }

          return "assets/[name][extname]";
        },
      },
    },
  },
});