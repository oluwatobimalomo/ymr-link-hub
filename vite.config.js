import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fetchWhatsAppPreview } from "./src/lib/whatsappPreview.js";

const landingPages = {
  campuses: {
    title: "YMR Global — Campuses",
    description: "Join your YMR Campus WhatsApp group.",
  },
  departments: {
    title: "YMR Global — Departments",
    description: "Join your YMR Department WhatsApp group.",
  },
};

function landingPagePreviewMetadata() {
  let buildDirectory;

  return {
    name: "ymr-landing-page-preview-metadata",
    apply: "build",
    configResolved(config) {
      buildDirectory = resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const template = await readFile(resolve(buildDirectory, "index.html"), "utf8");

      for (const [slug, metadata] of Object.entries(landingPages)) {
        const pageUrl = `https://links.ymrglobal.org/${slug}`;
        const html = template
          .replace(/<title>.*?<\/title>/, `<title>${metadata.title}</title>`)
          .replace(/(<meta name="description" content=")[^"]*("\s*\/?>)/, `$1${metadata.description}$2`)
          .replace(/(<meta property="og:title" content=")[^"]*("\s*\/?>)/, `$1${metadata.title}$2`)
          .replace(/(<meta property="og:description" content=")[^"]*("\s*\/?>)/, `$1${metadata.description}$2`)
          .replace(/(<meta property="og:url" content=")[^"]*("\s*\/?>)/, `$1${pageUrl}$2`)
          .replace(/(<meta name="twitter:title" content=")[^"]*("\s*\/?>)/, `$1${metadata.title}$2`)
          .replace(/(<meta name="twitter:description" content=")[^"]*("\s*\/?>)/, `$1${metadata.description}$2`)
          .replace(/(<link rel="canonical" href=")[^"]*("\s*\/?>)/, `$1${pageUrl}$2`);

        const pageDirectory = resolve(buildDirectory, slug);
        await mkdir(pageDirectory, { recursive: true });
        await writeFile(resolve(pageDirectory, "index.html"), html);
      }
    },
  };
}

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
  plugins: [react(), landingPagePreviewMetadata(), whatsappPreviewDevEndpoint()],
});
