import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/App-de-control-de-gastos/",
  server: {
    allowedHosts: [".ngrok-free.app", ".ngrok.app"],
  },
});

