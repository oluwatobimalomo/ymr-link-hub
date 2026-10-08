import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = url && key ? createClient(url, key) : null;
export const supabaseConfigured = Boolean(supabase);

export function toLink(row) {
  const isOpen = typeof row.is_open === "boolean" ? row.is_open : !/^closed/i.test(row.members_label || "");
  return { id: row.id, name: row.name, desc: row.description || "", link: row.destination_url, isOpen, members: isOpen ? "Open to all" : "Closed Group", clicks: row.clicks || 0, pageKey: row.page_key || "main" };
}

export function toForm(row) {
  return { id: row.id, slug: row.slug, title: row.title, description: row.description || "", fields: row.fields || [], headerImage: row.header_image || "", successMessage: row.success_message || "Your response has been received." };
}

export function toResponse(row) {
  return { id: row.id, formId: row.form_id, values: row.answers || {}, createdAt: row.submitted_at };
}

export function toQr(row) {
  return { id: row.id, slug: row.slug, name: row.name, destination: row.destination_url, scans: Number(row.scan_count || 0), createdAt: row.created_at };
}
