-- YMR Link Hub schema for Supabase (Postgres).
-- Run this once in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_link_hub_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users where user_id = (select auth.uid())
  );
$$;

create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  destination_url text not null,
  members_label text not null default 'Open to all',
  page_key text not null default 'main' check (page_key in ('main', 'departments')),
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  fields jsonb not null default '[]'::jsonb,
  header_image text,
  success_message text not null default 'Your response has been received.',
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.form_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  answers jsonb not null,
  submitted_at timestamptz not null default now()
);

create table if not exists public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique default encode(gen_random_bytes(9), 'hex'),
  name text not null,
  destination_url text not null,
  scan_count bigint not null default 0 check (scan_count >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.link_clicks (
  id bigint generated always as identity primary key,
  link_id uuid references public.links(id) on delete set null,
  clicked_at timestamptz not null default now()
);

create table if not exists public.qr_scans (
  id bigint generated always as identity primary key,
  qr_code_id uuid references public.qr_codes(id) on delete set null,
  scanned_at timestamptz not null default now()
);

create index if not exists form_responses_form_time_idx on public.form_responses (form_id, submitted_at desc);
create index if not exists link_clicks_link_time_idx on public.link_clicks (link_id, clicked_at desc);
create index if not exists qr_scans_code_time_idx on public.qr_scans (qr_code_id, scanned_at desc);

alter table public.admin_users enable row level security;
alter table public.links enable row level security;
alter table public.forms enable row level security;
alter table public.form_responses enable row level security;
alter table public.qr_codes enable row level security;
alter table public.link_clicks enable row level security;
alter table public.qr_scans enable row level security;

create policy "Admins can read admin list" on public.admin_users for select to authenticated
  using (public.is_link_hub_admin());
create policy "Public can read active links" on public.links for select to anon, authenticated
  using (is_active or public.is_link_hub_admin());
create policy "Admins manage links" on public.links for all to authenticated
  using (public.is_link_hub_admin()) with check (public.is_link_hub_admin());
create policy "Public can read published forms" on public.forms for select to anon, authenticated
  using (is_published or public.is_link_hub_admin());
create policy "Admins manage forms" on public.forms for all to authenticated
  using (public.is_link_hub_admin()) with check (public.is_link_hub_admin());
create policy "Public can submit to published forms" on public.form_responses for insert to anon, authenticated
  with check (exists (select 1 from public.forms where id = form_id and is_published));
create policy "Admins read form responses" on public.form_responses for select to authenticated
  using (public.is_link_hub_admin());
create policy "Admins manage QR codes" on public.qr_codes for all to authenticated
  using (public.is_link_hub_admin()) with check (public.is_link_hub_admin());
create policy "Admins read link clicks" on public.link_clicks for select to authenticated
  using (public.is_link_hub_admin());
create policy "Admins read QR scans" on public.qr_scans for select to authenticated
  using (public.is_link_hub_admin());

-- Public tracking endpoints only return the destination and record an event.
create or replace function public.track_qr_scan(code_slug text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare target text;
declare code_id uuid;
begin
  update public.qr_codes set scan_count = scan_count + 1
    where slug = code_slug returning id, destination_url into code_id, target;
  if target is null then return null; end if;
  insert into public.qr_scans(qr_code_id) values (code_id);
  return target;
end;
$$;

create or replace function public.track_link_click(link_uuid uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare target text;
begin
  select destination_url into target from public.links where id = link_uuid and is_active;
  if target is null then return null; end if;
  insert into public.link_clicks(link_id) values (link_uuid);
  return target;
end;
$$;

create or replace function public.link_click_totals()
returns table(link_id uuid, click_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select clicks.link_id, count(*)::bigint
  from public.link_clicks as clicks
  where public.is_link_hub_admin()
  group by clicks.link_id;
$$;

revoke all on function public.track_qr_scan(text) from public;
grant execute on function public.track_qr_scan(text) to anon, authenticated;
revoke all on function public.track_link_click(uuid) from public;
grant execute on function public.track_link_click(uuid) to anon, authenticated;
revoke all on function public.link_click_totals() from public;
grant execute on function public.link_click_totals() to authenticated;

grant select on public.links, public.forms to anon, authenticated;
grant insert on public.form_responses to anon, authenticated;
grant select, insert, update, delete on public.links, public.forms, public.qr_codes to authenticated;
grant select on public.admin_users, public.form_responses, public.link_clicks, public.qr_scans to authenticated;

-- Form images are public; submitted attachments stay private and are downloaded with signed URLs.
insert into storage.buckets (id, name, public, file_size_limit)
values ('form-header-images', 'form-header-images', true, 5242880),
       ('form-response-files', 'form-response-files', false, 5242880)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

create policy "Public can view form header images" on storage.objects for select to anon, authenticated
  using (bucket_id = 'form-header-images');
create policy "Admins manage form header images" on storage.objects for all to authenticated
  using (bucket_id = 'form-header-images' and public.is_link_hub_admin())
  with check (bucket_id = 'form-header-images' and public.is_link_hub_admin());
create policy "Public can upload files to published forms" on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'form-response-files'
    and (storage.foldername(name))[1] = 'responses'
    and exists (select 1 from public.forms f where f.id::text = (storage.foldername(name))[2] and f.is_published)
  );
create policy "Admins can download form response files" on storage.objects for select to authenticated
  using (bucket_id = 'form-response-files' and public.is_link_hub_admin());
