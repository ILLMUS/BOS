import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null, // registration happens only in src/lib/pwa.ts
      filename: "sw.js",
      devOptions: { enabled: false },
      includeAssets: ["favicon.png", "icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "RST Spilworks — SOP Pipeline",
        short_name: "RST Spilworks",
        description: "SOP-controlled job pipeline for metal fabrication operations.",
        theme_color: "#1f2933",
        background_color: "#1f2933",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/~oauth/],
        runtimeCaching: [
          {
            // HTML navigations: network first so the app never serves stale pages
            urlPattern: ({ request }: { request: Request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "rst-pages",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            // Hashed build assets are immutable: cache first
            urlPattern: ({ url, request, sameOrigin }: { url: URL; request: Request; sameOrigin: boolean }) =>
              sameOrigin &&
              /\/assets\/.+\.[a-f0-9]{8,}\./i.test(url.pathname) &&
              ["script", "style", "worker", "font"].includes(request.destination),
            handler: "CacheFirst",
            options: {
              cacheName: "rst-assets",
              expiration: { maxEntries: 128, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
              sameOrigin && /\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$/.test(url.pathname),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "rst-static",
              expiration: { maxEntries: 128, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
