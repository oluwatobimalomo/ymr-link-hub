const MAX_HTML_BYTES = 512 * 1024;

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function getMeta(html, property) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const propertyMatch = tag.match(/\bproperty\s*=\s*(["'])(.*?)\1/i);
    if (propertyMatch?.[2]?.toLowerCase() !== property) continue;
    const contentMatch = tag.match(/\bcontent\s*=\s*(["'])(.*?)\1/i);
    if (contentMatch) return decodeHtml(contentMatch[2]);
  }
  return "";
}

export async function fetchWhatsAppPreview(rawUrl) {
  let invite;
  try { invite = new URL(rawUrl); } catch { throw new Error("Enter a valid WhatsApp invite URL."); }
  if (invite.protocol !== "https:" || invite.hostname !== "chat.whatsapp.com" || invite.username || invite.password || !/^\/(?:invite\/)?[A-Za-z0-9_-]{8,}\/?$/.test(invite.pathname)) {
    throw new Error("Only public chat.whatsapp.com invite links are supported.");
  }
  invite.hash = "";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(invite, {
      headers: {
        "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml",
      },
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) throw new Error("WhatsApp did not return an invite preview.");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("WhatsApp returned an empty invite preview.");
    const chunks = [];
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_HTML_BYTES) { await reader.cancel(); throw new Error("WhatsApp invite preview is too large."); }
      chunks.push(value);
    }
    const html = new TextDecoder().decode(Buffer.concat(chunks));
    const groupName = getMeta(html, "og:title");
    const imageUrl = getMeta(html, "og:image");
    let image;
    try { image = new URL(imageUrl); } catch { image = null; }
    if (image?.protocol !== "https:" || !/(?:^|\.)(?:whatsapp\.net|fbcdn\.net)$/.test(image.hostname)) return { groupName, imageUrl: "" };
    return { groupName, imageUrl: image.toString() };
  } finally {
    clearTimeout(timer);
  }
}
