import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ThemeProvider } from "next-themes"

import "./index.css"
import App from "./App.tsx"

if (
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  (import.meta.env.PROD || window.location.hostname === "localhost")
) {
  window.addEventListener(
    "load",
    () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Ignore registration failures to avoid blocking app startup.
      })
    },
    { once: true }
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class">
      <App />
    </ThemeProvider>
  </StrictMode>
)
