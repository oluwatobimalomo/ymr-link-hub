import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fetchWhatsAppPreview } from "./src/lib/whatsappPreview.js";

function whatsappPreviewDevEndpoint() {
  return {
    name: "ymr-whatsapp-preview-dev-endpoint",
    configureServer(server) {
      server.middlewares.use("/api/whatsapp-group-preview", async (request, response, next) => {
        if (request.method !== "GET") return next();
        try {
          const requestUrl = new URL(request.url, "http://localhost");
          const preview = await fetchWhatsAppPreview(requestUrl.searchParams.get("url") || "");
          response.setHeader("Content-Type", "application/json");
          response.setHeader("Cache-Control", "no-store");
          response.end(JSON.stringify(preview));
        } catch (error) {
          response.statusCode = error.message?.startsWith("Only public") || error.message?.startsWith("Enter a valid") ? 400 : 502;
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ error: error.message || "Unable to read WhatsApp invite preview." }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), whatsappPreviewDevEndpoint()],
});
