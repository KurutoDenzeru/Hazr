import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { tsunamiDevProxy } from "./vite-plugin-tsunami-dev"
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), tsunamiDevProxy()],
  server: {
    proxy: {
      "/api/openaq": {
        target: "https://api.openaq.org",
        changeOrigin: true,
        rewrite: (pathName) => pathName.replace(/^\/api\/openaq/, "/v3"),
      },
      "/api/ip-location": {
        target: "http://ip-api.com",
        changeOrigin: true,
        rewrite: () => "/json/?fields=query,status,country,countryCode,region,regionName,city,timezone,isp,org,lat,lon",
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
