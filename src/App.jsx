import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Check, Copy, Download, ExternalLink, FilePlus2, Link2, LoaderCircle, LogOut, Plus, QrCode, Trash2, X } from "lucide-react";
import RayBurst from "./components/RayBurst.jsx";
import GroupCard from "./components/GroupCard.jsx";
import { groups as starterGroups, page } from "./data/groups.js";
import logo from "./assets/ymr-logo.png";
import { supabase, supabaseConfigured, toForm, toLink, toQr, toResponse } from "./lib/supabase.js";
import "./App.css";

const makeId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const normalizeUrl = (value) => {
  const input = value.trim();
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(input) ? input : `https://${input}`;
  const parsed = new URL(candidate);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Enter a web address that starts with a domain name, http://, or https://.");
  return parsed.toString();
};
const qrImage = (value, size = 280) => `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
const blankData = { links: [], forms: [], submissions: [], qrCodes: [] };
async function fetchClickTotals() {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const result = await supabase.from("link_clicks").select("link_id").range(offset, offset + 999);
    if (result.error) return { data: null, error: result.error };
    rows.push(...result.data);
    if (result.data.length < 1000) break;
  }
  return { data: rows.map((row) => ({ link_id: row.link_id, click_count: 1 })), error: null };
}

function PublicPage({ links }) {
  useEffect(() => { document.title = `${page.title} — Join a Group`; }, []);
  const trackedLinks = links.map((link) => ({ ...link, link: link.id.startsWith("starter-") ? link.link : `${window.location.origin}/l/${link.id}` }));
  return <div className="page"><RayBurst /><header className="hero"><img src={logo} alt="YMR Global" className="hero__logo" /><p className="hero__kicker">{page.kicker}</p><h1 className="hero__title">{page.title}</h1><p className="hero__subtitle">{page.subtitle}</p></header><main className="groups">{trackedLinks.map((group, i) => <GroupCard key={group.id} group={group} index={i} />)}{!links.length && <p className="empty-state">Group links will appear here.</p>}</main><footer className="footer"><div className="footer__rule" /><p className="footer__note">{page.footerNote}</p><a href={`mailto:${page.footerContact}`} className="footer__contact">{page.footerContact}</a></footer></div>;
}

function SharedForm({ form }) {
  const [state, setState] = useState("ready");
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault(); setState("saving"); setError("");
    const answers = Object.fromEntries(new FormData(event.currentTarget));
    const { error: saveError } = await supabase.from("form_responses").insert({ form_id: form.id, answers });
    if (saveError) { setError("Unable to submit. Check your connection and try again."); setState("ready"); return; }
    setState("done");
  };
  return <div className="page"><RayBurst /><main className="share-form"><a className="back-link" href="/"><ArrowLeft size={16} /> YMR Global</a><img src={logo} alt="YMR Global" className="hero__logo" /><p className="eyebrow">YMR GLOBAL · FORM</p><h1>{form.title}</h1>{form.description && <p className="share-form__intro">{form.description}</p>}{state === "done" ? <div className="success-panel"><Check size={20} /><div><strong>Response submitted</strong><p>Your response has been received.</p></div></div> : <form className="form-stack" onSubmit={submit}>{form.fields.map((field) => <label className="field" key={field.id}><span>{field.label}{field.required && <b> *</b>}</span>{field.type === "textarea" ? <textarea name={field.label} required={field.required} rows="4" /> : field.type === "select" ? <select name={field.label} required={field.required} defaultValue=""><option value="" disabled>Select an option</option>{(field.options || "").split(",").map((option) => <option key={option.trim()}>{option.trim()}</option>)}</select> : <input name={field.label} type={field.type || "text"} required={field.required} />}</label>)}{error && <p role="alert" className="form-error">{error}</p>}<button className="button button--primary" type="submit" disabled={state === "saving"}>{state === "saving" ? <><LoaderCircle size={16} /> Sending…</> : <>Submit response <ArrowUpRight size={16} /></>}</button></form>}</main></div>;
}

function AdminLogin({ onSignedIn }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError("Unable to sign in. Check your email and password."); setBusy(false); return; }
    const { data: admin } = await supabase.from("admin_users").select("user_id").eq("user_id", data.user.id).maybeSingle();
    if (!admin) { await supabase.auth.signOut(); setError("This account is not an administrator. Ask a project owner to grant access."); setBusy(false); return; }
    onSignedIn(data.session);
  };
  return <main className="login-wrap"><form className="login-card" onSubmit={submit}><img src={logo} alt="YMR Global" /><p className="eyebrow">ADMIN ACCESS</p><h1>Sign in</h1><p>Use your YMR Link Hub administrator account.</p><label className="field"><span>Email</span><input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><label className="field"><span>Password</span><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>{error && <p role="alert" className="form-error">{error}</p>}<button className="button button--primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button></form></main>;
}

function AdminWorkspace() {
  const [session, setSession] = useState(null); const [data, setData] = useState(blankData); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const loadData = async () => {
    setLoading(true); setError("");
    const [linksRes, formsRes, responsesRes, qrRes, clickTotalsRes] = await Promise.all([
      supabase.from("links").select("*").order("position"),
      supabase.from("forms").select("*").order("created_at", { ascending: false }),
      supabase.from("form_responses").select("*").order("submitted_at", { ascending: false }),
      supabase.from("qr_codes").select("*").order("created_at", { ascending: false }),
      fetchClickTotals(),
    ]);
    let clickTotals = clickTotalsRes.data;
    if (clickTotalsRes.error) {
      clickTotals = [];
      for (let offset = 0; ; offset += 1000) {
        const page = await supabase.from("link_clicks").select("link_id").range(offset, offset + 999);
        if (page.error) { setError(`Unable to load click analytics: ${page.error.message}`); setLoading(false); return; }
        clickTotals.push(...page.data.map((row) => ({ link_id: row.link_id, click_count: 1 })));
        if (page.data.length < 1000) break;
      }
    }
    const queryError = linksRes.error || formsRes.error || responsesRes.error || qrRes.error;
    if (queryError) { setError(`Unable to load Supabase data: ${queryError.message}`); setLoading(false); return; }
    const clickCounts = (clickTotals || []).reduce((counts, row) => ({ ...counts, [row.link_id]: (counts[row.link_id] || 0) + Number(row.click_count || 0) }), {});
    setData({ links: (linksRes.data || []).map((row) => ({ ...toLink(row), clicks: clickCounts[row.id] || 0 })), forms: (formsRes.data || []).map(toForm), submissions: (responsesRes.data || []).map(toResponse), qrCodes: (qrRes.data || []).map(toQr) }); setLoading(false);
  };
  useEffect(() => {
    let live = true;
    supabase.auth.getSession().then(({ data: result }) => { if (live) { setSession(result.session); setLoading(false); } });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, value) => { if (live) { setSession(value); if (!value) setData(blankData); } });
    return () => { live = false; listener.subscription.unsubscribe(); };
  }, []);
  useEffect(() => { if (session) loadData(); }, [session?.user?.id]);
  const saveData = async (next, previous) => {
    setError("");
    const linkRows = next.links.map((link, position) => ({ id: link.id, name: link.name, description: link.desc || "", destination_url: link.link, members_label: link.members || "Open to all", position, is_active: true }));
    const formRows = next.forms.map((form) => ({ id: form.id, slug: form.slug, title: form.title, description: form.description || "", fields: form.fields, is_published: true }));
    const jobs = [];
    if (linkRows.length) jobs.push(supabase.from("links").upsert(linkRows));
    if (formRows.length) jobs.push(supabase.from("forms").upsert(formRows));
    const removedLinks = previous.links.filter((item) => !next.links.some((candidate) => candidate.id === item.id)).map((item) => item.id);
    const removedForms = previous.forms.filter((item) => !next.forms.some((candidate) => candidate.id === item.id)).map((item) => item.id);
    if (removedLinks.length) jobs.push(supabase.from("links").delete().in("id", removedLinks));
    if (removedForms.length) jobs.push(supabase.from("forms").delete().in("id", removedForms));
    const results = await Promise.all(jobs); const failure = results.find((result) => result.error);
    if (failure) { setError(`Unable to save changes: ${failure.error.message}`); await loadData(); return; }
    await loadData();
  };
  if (!supabaseConfigured) return <main className="login-wrap"><section className="login-card"><h1>Supabase is not configured</h1><p>Add the Supabase URL and publishable key to your Vercel environment variables and redeploy.</p></section></main>;
  if (loading && !session) return <main className="login-wrap"><LoaderCircle className="loading-spin" /></main>;
  if (!session) return <AdminLogin onSignedIn={setSession} />;
  if (loading) return <main className="login-wrap"><LoaderCircle className="loading-spin" /></main>;
  return <AdminPage data={data} saveData={saveData} refreshData={loadData} error={error} onSignOut={() => supabase.auth.signOut()} />;
}

function AdminPage({ data, saveData, refreshData, error, onSignOut }) {
  const [tab, setTab] = useState("links"); const [editing, setEditing] = useState(null); const [viewingForm, setViewingForm] = useState(null); const [qrValue, setQrValue] = useState(""); const [qrName, setQrName] = useState(""); const [copied, setCopied] = useState(false); const [busy, setBusy] = useState(false);
  const saveLink = async (event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); const item = { ...values, id: editing?.id || makeId(), members: values.members || "Open to all" }; await saveData({ ...data, links: editing ? data.links.map((link) => link.id === editing.id ? item : link) : [...data.links, item] }, data); setEditing(null); };
  const newForm = () => setEditing({ id: makeId(), title: "New form", slug: "new-form", description: "", fields: [{ id: makeId(), label: "Full name", type: "text", required: true }, { id: makeId(), label: "Email address", type: "email", required: true }] });
  const saveForm = async (form) => { if (!form.title.trim() || !form.slug.trim() || !form.fields.length) { window.alert("Add a form title, URL name, and at least one question."); return; } await saveData({ ...data, forms: data.forms.some((item) => item.id === form.id) ? data.forms.map((item) => item.id === form.id ? form : item) : [...data.forms, form] }, data); setEditing(null); };
  const formUrl = (form) => `${window.location.origin}/form/${form.slug}`;
  const copy = async (text) => { try { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1500); } catch { setError("Unable to copy. Select and copy the link manually."); } };
  const deleteLink = (id) => saveData({ ...data, links: data.links.filter((link) => link.id !== id) }, data);
  const deleteForm = (id) => saveData({ ...data, forms: data.forms.filter((form) => form.id !== id) }, data);
  const createQr = async (event) => { event.preventDefault(); setBusy(true); setError(""); let destination; try { destination = normalizeUrl(qrValue); } catch (urlError) { setError(urlError.message); setBusy(false); return; } const { error: saveError } = await supabase.from("qr_codes").insert({ name: qrName.trim() || "Custom QR code", destination_url: destination }); if (saveError) setError(`Unable to create QR code: ${saveError.message}`); else { setQrValue(""); setQrName(""); await refreshData(); } setBusy(false); };
  const deleteQr = async (id) => { const { error: deleteError } = await supabase.from("qr_codes").delete().eq("id", id); if (deleteError) setError(`Unable to delete QR code: ${deleteError.message}`); else refreshData(); };
  const trackedQrUrl = (qr) => `${window.location.origin}/r/${qr.slug}`;
  useEffect(() => { document.title = "Admin — YMR Link Hub"; }, []);
  return <div className="admin-shell"><header className="admin-header"><a href="/" className="admin-brand"><img src={logo} alt="" /><span>YMR <small>LINK HUB</small></span></a><div className="header-actions"><a href="/" className="button button--quiet"><ExternalLink size={15} /> View site</a><button className="button button--quiet" onClick={onSignOut}><LogOut size={15} /> Sign out</button></div></header><main className="admin-main"><div className="admin-heading"><div><p className="eyebrow">CONTROL ROOM</p><h1>Manage your links</h1><p>Keep your community connected.</p></div><span className="admin-status"><i /> Connected to Supabase</span></div>{error && <div className="backend-error" role="alert">{error}</div>}<nav className="admin-tabs">{[["links", Link2, "Links"], ["forms", FilePlus2, "Forms"], ["qr", QrCode, "QR codes"]].map(([id, Icon, label]) => <button key={id} className={tab === id ? "is-active" : ""} onClick={() => { setTab(id); setEditing(null); setViewingForm(null); }}><Icon size={16} />{label}</button>)}</nav>
  {tab === "links" && <section className="admin-panel"><div className="panel-heading"><div><h2>Group links</h2><p>Public links and their tracked clicks.</p></div><button className="button button--primary" onClick={() => setEditing({ name: "", desc: "", link: "", members: "Open to all" })}><Plus size={16} /> Add link</button></div>{editing && !editing.fields && <form className="editor-card" onSubmit={saveLink}><div className="editor-title"><strong>{editing.id ? "Edit link" : "Add a group link"}</strong><button type="button" className="icon-button" onClick={() => setEditing(null)}><X size={16} /></button></div><div className="form-grid"><label className="field"><span>Link name</span><input name="name" defaultValue={editing.name} required /></label><label className="field"><span>Destination URL</span><input name="link" type="url" defaultValue={editing.link} required placeholder="https://…" /></label><label className="field"><span>Description</span><input name="desc" defaultValue={editing.desc} /></label><label className="field"><span>Availability</span><input name="members" defaultValue={editing.members} /></label></div><button className="button button--primary">Save link</button></form>}{data.links.length ? <div className="managed-list">{data.links.map((link) => <div className="managed-row" key={link.id}><div className="managed-icon"><Link2 size={17} /></div><div className="managed-copy"><strong>{link.name}</strong><span>{link.link}</span></div><span className="metric-pill">{link.clicks} clicks</span><button className="icon-button" onClick={() => setEditing(link)}>Edit</button><button className="icon-button icon-button--danger" onClick={() => deleteLink(link.id)} aria-label={`Delete ${link.name}`}><Trash2 size={16} /></button></div>)}</div> : <div className="empty-admin">No links yet. Add your first group link.</div>}</section>}
  {tab === "forms" && <section className="admin-panel"><div className="panel-heading"><div><h2>Custom forms</h2><p>Manage forms and review submissions.</p></div><button className="button button--primary" onClick={newForm}><Plus size={16} /> Create form</button></div>{editing?.fields && <FormEditor form={editing} onChange={setEditing} onSave={() => saveForm(editing)} onClose={() => setEditing(null)} />}{viewingForm && <FormDetail form={viewingForm} data={data} onClose={() => setViewingForm(null)} />}{data.forms.length ? <div className="managed-list">{data.forms.map((form) => { const responses = data.submissions.filter((item) => item.formId === form.id); return <div className="managed-row" key={form.id}><div className="managed-icon managed-icon--form"><FilePlus2 size={17} /></div><div className="managed-copy"><strong>{form.title}</strong><span>{responses.length} responses · {form.fields.length} questions · /form/{form.slug}</span></div><button className="icon-button" onClick={() => setViewingForm(form)}>View responses</button><button className="icon-button" onClick={() => setEditing(form)}>Edit</button><button className="icon-button" onClick={() => copy(formUrl(form))}>{copied ? <Check size={16} /> : <Copy size={16} />}<span>{copied ? "Copied" : "Copy link"}</span></button><button className="icon-button icon-button--danger" onClick={() => deleteForm(form.id)} aria-label={`Delete ${form.title}`}><Trash2 size={16} /></button></div>; })}</div> : !editing && <div className="empty-admin">No forms yet. Create one to start collecting responses.</div>}</section>}
  {tab === "qr" && <section className="admin-panel"><div className="panel-heading"><div><h2>QR code maker</h2><p>Each code has a tracked redirect and scan count.</p></div></div><form className="editor-card qr-form" onSubmit={createQr}><div className="form-grid"><label className="field"><span>QR code name</span><input value={qrName} onChange={(e) => setQrName(e.target.value)} placeholder="e.g. Registration flyer" /></label><label className="field"><span>Destination URL</span><input type="text" inputMode="url" autoCapitalize="none" spellCheck="false" value={qrValue} onChange={(e) => setQrValue(e.target.value)} required placeholder="example.com or https://example.com" /></label></div><p className="url-hint">If you omit https://, we’ll add it for you.</p><button className="button button--primary" disabled={busy}>{busy ? "Creating…" : <><Plus size={16} /> Create tracked QR</>}</button></form>{data.qrCodes.length ? <div className="managed-list">{data.qrCodes.map((qr) => <div className="managed-row" key={qr.id}><div className="managed-icon managed-icon--form"><QrCode size={17} /></div><div className="managed-copy"><strong>{qr.name}</strong><span>{qr.destination}</span></div><span className="metric-pill">{qr.scans} scans</span><a className="icon-button" href={qrImage(trackedQrUrl(qr), 800)} download={`${slugify(qr.name)}.png`} target="_blank" rel="noreferrer"><Download size={16} /> Download</a><button className="icon-button icon-button--danger" onClick={() => deleteQr(qr.id)} aria-label={`Delete ${qr.name}`}><Trash2 size={16} /></button></div>)}</div> : <div className="empty-admin">Your tracked QR codes will appear here.</div>}<div className="notice"><strong>Tracking</strong><span>QR codes redirect through YMR before opening the destination. Each redirect increments the scan count.</span></div></section>}
  <footer className="admin-footer">{data.submissions.length} form responses · {data.qrCodes.reduce((total, item) => total + item.scans, 0)} tracked QR scans</footer></main></div>;
}

function FormEditor({ form, onChange, onSave, onClose }) {
  const change = (key, value) => onChange({ ...form, [key]: value });
  const updateField = (id, key, value) => change("fields", form.fields.map((field) => field.id === id ? { ...field, [key]: value } : field));
  return <div className="editor-card form-editor"><div className="editor-title"><div><strong>Build your form</strong><span>Give it a title, then add the fields you need.</span></div><button type="button" className="icon-button" onClick={onClose}><X size={16} /></button></div><div className="form-grid"><label className="field"><span>Form title</span><input value={form.title} onChange={(e) => { const title = e.target.value; onChange({ ...form, title, slug: slugify(title) }); }} /></label><label className="field"><span>Form URL slug</span><input value={form.slug} onChange={(e) => change("slug", slugify(e.target.value))} /></label><label className="field field--wide"><span>Intro text</span><textarea rows="2" value={form.description} onChange={(e) => change("description", e.target.value)} /></label></div><div className="field-list">{form.fields.map((field) => <div className="field-builder" key={field.id}><input aria-label="Field label" value={field.label} onChange={(e) => updateField(field.id, "label", e.target.value)} /><select aria-label="Field type" value={field.type} onChange={(e) => updateField(field.id, "type", e.target.value)}><option value="text">Short answer</option><option value="email">Email</option><option value="tel">Phone</option><option value="textarea">Long answer</option><option value="select">Dropdown</option></select><label className="required-toggle"><input type="checkbox" checked={field.required} onChange={(e) => updateField(field.id, "required", e.target.checked)} /> Required</label><button type="button" className="icon-button icon-button--danger" onClick={() => change("fields", form.fields.filter((item) => item.id !== field.id))} aria-label="Remove field"><Trash2 size={15} /></button>{field.type === "select" && <input className="field-options" value={field.options || ""} onChange={(e) => updateField(field.id, "options", e.target.value)} placeholder="Options separated by commas" />}</div>)}</div><button type="button" className="button button--quiet add-field" onClick={() => change("fields", [...form.fields, { id: makeId(), label: "New question", type: "text", required: false }])}><Plus size={15} /> Add a field</button><div className="editor-actions"><button className="button button--quiet" onClick={onClose}>Cancel</button><button className="button button--primary" onClick={onSave}>Save form</button></div></div>;
}

function FormDetail({ form, data, onClose }) {
  const responses = data.submissions.filter((row) => row.formId === form.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const exportCsv = () => { const columns = ["Submitted at", ...form.fields.map((field) => field.label)]; const rows = responses.map((row) => [new Date(row.createdAt).toLocaleString(), ...form.fields.map((field) => row.values[field.label] || "")]); const csv = [columns, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n"); const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${slugify(form.title)}-responses.csv`; anchor.click(); URL.revokeObjectURL(url); };
  const activeDays = new Set(responses.map((row) => new Date(row.createdAt).toDateString())).size;
  return <section className="response-detail"><div className="panel-heading"><div><h3>{form.title} responses</h3><p>{responses.length} submissions · {activeDays} active days</p></div><div className="response-actions"><button className="button button--quiet" disabled={!responses.length} onClick={exportCsv}><Download size={15} /> Download CSV</button><button className="icon-button" onClick={onClose} aria-label="Close response viewer"><X size={17} /></button></div></div>{responses.length ? <div className="response-table-wrap"><table className="response-table"><thead><tr><th>Submitted</th>{form.fields.map((field) => <th key={field.id}>{field.label}</th>)}</tr></thead><tbody>{responses.map((row) => <tr key={row.id}><td>{new Date(row.createdAt).toLocaleString()}</td>{form.fields.map((field) => <td key={field.id}>{row.values[field.label] || "—"}</td>)}</tr>)}</tbody></table></div> : <div className="empty-admin">No responses yet. Share this form to collect responses.</div>}</section>;
}

function Redirect({ kind, value }) {
  const [message, setMessage] = useState("Redirecting…");
  useEffect(() => { let active = true; const fn = kind === "qr" ? "track_qr_scan" : "track_link_click"; const args = kind === "qr" ? { code_slug: value } : { link_uuid: value }; supabase.rpc(fn, args).then(({ data, error }) => { if (!active) return; if (error || !data) setMessage("This tracked link is unavailable."); else window.location.replace(data); }); return () => { active = false; }; }, [kind, value]);
  return <main className="login-wrap"><p>{message}</p></main>;
}

export default function App() {
  const [route, setRoute] = useState({ pathname: window.location.pathname, search: window.location.search });
  const [links, setLinks] = useState(starterGroups.map((link, i) => ({ ...link, id: `starter-${i}` })));
  const [form, setForm] = useState(null); const [loading, setLoading] = useState(true);
  useEffect(() => { const update = () => setRoute({ pathname: window.location.pathname, search: window.location.search }); window.addEventListener("popstate", update); return () => window.removeEventListener("popstate", update); }, []);
  useEffect(() => { let active = true; if (!supabaseConfigured) { setLoading(false); return; } supabase.from("links").select("*").eq("is_active", true).order("position").then(({ data, error }) => { if (!active) return; if (!error && data) setLinks(data.map(toLink)); setLoading(false); }); return () => { active = false; }; }, []);
  useEffect(() => { let active = true; if (!route.pathname.startsWith("/form/")) return; const slug = decodeURIComponent(route.pathname.split("/").filter(Boolean)[1] || ""); if (!supabase) { setForm(null); return; } supabase.from("forms").select("*").eq("slug", slug).eq("is_published", true).maybeSingle().then(({ data, error }) => { if (active) setForm(error ? null : data ? toForm(data) : null); }); return () => { active = false; }; }, [route.pathname]);
  if (route.pathname === "/admin" || route.pathname === "/admin/") return <AdminWorkspace />;
  if (route.pathname.startsWith("/r/")) return <Redirect kind="qr" value={decodeURIComponent(route.pathname.split("/").filter(Boolean)[1] || "")} />;
  if (route.pathname.startsWith("/l/")) return <Redirect kind="link" value={decodeURIComponent(route.pathname.split("/").filter(Boolean)[1] || "")} />;
  if (route.pathname.startsWith("/form/")) return loading || !form ? <main className="share-form"><h1>{loading ? "Loading form…" : "Form not found"}</h1><p>{!loading && "Check the form link or ask the administrator for a new one."}</p></main> : <SharedForm form={form} />;
  return <PublicPage links={links} />;
}
