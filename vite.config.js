import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/trade-calc/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "TradeCalc",
        short_name: "TradeCalc",
        description: "Mobile trading position calculator",
        theme_color: "#0a0c0f",
        background_color: "#0a0c0f",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "/trade-calc/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/trade-calc/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
    }),
  ],
});
