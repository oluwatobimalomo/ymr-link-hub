import { fetchWhatsAppPreview } from "../src/lib/whatsappPreview.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed." });
  }

  try {
    const requestUrl = new URL(request.url, `https://${request.headers.host || "links.ymrglobal.org"}`);
    const preview = await fetchWhatsAppPreview(requestUrl.searchParams.get("url") || "");
    response.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=240");
    return response.status(200).json(preview);
  } catch (error) {
    const message = error.message || "Unable to read WhatsApp invite preview.";
    const status = message.startsWith("Only public") || message.startsWith("Enter a valid") ? 400 : 502;
    return response.status(status).json({ error: message });
  }
}
