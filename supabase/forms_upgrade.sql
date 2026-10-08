-- Run once in Supabase Dashboard > SQL Editor for an existing YMR Link Hub database.
-- Adds the form settings and private/public Storage buckets used by the expanded form builder.

alter table public.forms add column if not exists header_image text;
alter table public.forms add column if not exists success_message text not null default 'Your response has been received.';

alter table public.links add column if not exists page_key text not null default 'main';
alter table public.links add column if not exists is_open boolean not null default true;

-- Preserve the intent of links that used the old free-form access label.
update public.links set is_open = false where lower(members_label) like 'closed%';

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'links_page_key_check' and conrelid = 'public.links'::regclass
  ) then
    alter table public.links add constraint links_page_key_check check (page_key in ('main', 'departments'));
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit)
values ('form-header-images', 'form-header-images', true, 5242880),
       ('form-response-files', 'form-response-files', false, 5242880)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

drop policy if exists "Public can view form header images" on storage.objects;
create policy "Public can view form header images" on storage.objects for select to anon, authenticated
  using (bucket_id = 'form-header-images');

drop policy if exists "Admins manage form header images" on storage.objects;
create policy "Admins manage form header images" on storage.objects for all to authenticated
  using (bucket_id = 'form-header-images' and public.is_link_hub_admin())
  with check (bucket_id = 'form-header-images' and public.is_link_hub_admin());

drop policy if exists "Public can upload files to published forms" on storage.objects;
create policy "Public can upload files to published forms" on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'form-response-files'
    and (storage.foldername(name))[1] = 'responses'
    and exists (
      select 1 from public.forms f
      where f.id::text = (storage.foldername(name))[2] and f.is_published
    )
  );

drop policy if exists "Admins can download form response files" on storage.objects;
create policy "Admins can download form response files" on storage.objects for select to authenticated
  using (bucket_id = 'form-response-files' and public.is_link_hub_admin());

-- Make PostgREST pick up the new forms columns immediately.
notify pgrst, 'reload schema';
