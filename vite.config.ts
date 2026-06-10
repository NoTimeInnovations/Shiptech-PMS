import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: "autoUpdate",
    devOptions: {
      enabled: true,
      type: "module",
    },
    workbox: {
      maximumFileSizeToCacheInBytes: 25 * 1024 * 1024,
    },
    manifest: {
      name: "ShipTechPMS",
      short_name: "ShipTechPMS",
      description: "A powerful project management system",
      theme_color: "#ffffff",
      background_color: "#ffffff",
      display: "standalone",
      icons: [  
        {
          src: "/logo-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
      ],
    },
  }),
  ],
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
