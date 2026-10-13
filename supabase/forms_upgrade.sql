-- Run once in Supabase Dashboard > SQL Editor for an existing YMR Link Hub database.
-- Adds the form settings and private/public Storage buckets used by the expanded form builder.

alter table public.forms add column if not exists header_image text;
alter table public.forms add column if not exists success_message text not null default 'Your response has been received.';

alter table public.links add column if not exists page_key text not null default 'main';
alter table public.links add column if not exists is_open boolean not null default true;

-- Preserve the intent of links that used the old free-form access label.
update public.links set is_open = false where lower(members_label) like 'closed%';

alter table public.links drop constraint if exists links_page_key_check;
alter table public.links add constraint links_page_key_check check (page_key in ('main', 'departments', 'campuses'));

-- Import the campus group links from the supplied CSV. Re-running this block does not duplicate rows.
insert into public.links (name, description, destination_url, members_label, is_open, page_key, position, is_active)
select campus.name, 'Join the YMR group for ' || campus.name || '.', campus.destination_url, 'Open to all', true, 'campuses', row_number() over (order by campus.name collate "C") - 1, true
from (values
  ('Abia State University', 'https://chat.whatsapp.com/L62z87bFzK935awy5U6F4E?s=cl&p=a&mlu=4&ilr=4'),
  ('Achievers University', 'https://chat.whatsapp.com/DU5W7zw0P7r0ZuP330yTRU?s=cl&p=a&mlu=4&ilr=4'),
  ('Adeleke University', 'https://chat.whatsapp.com/GJ5Qacov94iBpHHLNPmCja?s=cl&p=a&mlu=4&ilr=4'),
  ('Adeseun Ogundoyin Polytechnic', 'https://chat.whatsapp.com/GYWLAzbcdLfIH4CFr4QKhC?s=cl&p=a&mlu=4&ilr=4'),
  ('Afe Babalola University', 'https://chat.whatsapp.com/D7hm8NDh6TGCHq5NsTISL2?s=cl&p=a&mlu=4&ilr=4'),
  ('AFUED Ondo', 'https://chat.whatsapp.com/CB1zP38s1Tg29ZoakFC8Uc?s=cl&p=a&mlu=4&ilr=4'),
  ('Ambrose Ali University', 'https://chat.whatsapp.com/HGeKXr1Hagz7VMGIje2k3j?s=cl&p=a&mlu=4&ilr=4'),
  ('Anchor University', 'https://chat.whatsapp.com/J6fCDKsfcX7JYXcnrQF01x?s=cl&p=a&mlu=4&ilr=4'),
  ('AOCOED/LASUED', 'https://chat.whatsapp.com/IBiHZ6F1mREFMnDWyRdwh6?s=cl&p=a&mlu=4&ilr=4'),
  ('Babcock', 'https://chat.whatsapp.com/FKnDtoxUNYeF6qRw0YFzoj?s=cl&p=a&mlu=4&ilr=4'),
  ('Bayero University', 'https://chat.whatsapp.com/HuPMDf5HM3sCCXJxwqt5PJ?s=cl&p=a&mlu=4&ilr=4'),
  ('Bells University', 'https://chat.whatsapp.com/GiyPYWNfCko6GFIvd1kx2D?s=cl&p=a&mlu=4&ilr=4'),
  ('Benson Idahosa University', 'https://chat.whatsapp.com/IWj7IeuFj2v2NBUz7s3Y2B?s=cl&p=a&mlu=4&ilr=4'),
  ('BOUSETI', 'https://chat.whatsapp.com/HGCOhYDgwaDKbwuFQIcWfP?s=cl&p=a&mlu=4&ilr=4'),
  ('Bowen University', 'https://chat.whatsapp.com/EwHmcyUnyni7PW7KiQ4pUG?s=cl&p=a&mlu=4&ilr=4'),
  ('Caleb University', 'https://chat.whatsapp.com/KLgR6OdaVxNBohHT2WZb52?s=cl&p=a&mlu=4&ilr=4'),
  ('Chrisland University', 'https://chat.whatsapp.com/I6FgoCW4SIsIhHSeDaXoyF?s=cl&p=a&mlu=4&ilr=4'),
  ('College of Health, Ijero-Ekiti', 'https://chat.whatsapp.com/Jl9a5SNi7k3LIl2qCYxBnp?s=cl&p=a&mlu=4&ilr=4'),
  ('College of Nursing, Igbobi Lagos', 'https://chat.whatsapp.com/Cs6s6QD7erZGekFobQPJ3G?s=cl&p=a&mlu=4&ilr=4'),
  ('College of Nursing, Ilaro', 'https://chat.whatsapp.com/BrWxXiSNbDiIiYacjunDnM?s=cl&p=a&mlu=4&ilr=4'),
  ('CONS, Saki', 'https://chat.whatsapp.com/HcaV0VzWat4FXxzT1ZxuQu?s=cl&p=a&mlu=4&ilr=4'),
  ('Crawford', 'https://chat.whatsapp.com/LUR1gOIPZoEIfQBXkJ9gfY?s=cl&p=a&mlu=4&ilr=4'),
  ('DELSU Abraka', 'https://chat.whatsapp.com/EVfcHWfa7UL96S7dJrFEpT?s=cl&p=a&mlu=4&ilr=4'),
  ('Ebonyi State University', 'https://chat.whatsapp.com/IOKP4mEVaLsB2Mgf51tOsd?s=cl&p=a&mlu=4&ilr=4'),
  ('EKSU', 'https://chat.whatsapp.com/FZzPOaTQKWdCI43XzmNw1d?s=cl&p=a&mlu=4&ilr=4'),
  ('Emmanuel Alayande, Oyo', 'https://chat.whatsapp.com/Lx1mPhHFmXC0gT5G7lf9HK'),
  ('FCE Abeokuta', 'https://chat.whatsapp.com/KB0DmDct019ERkpRjYoQT5?s=cl&p=a&mlu=4&ilr=4'),
  ('FCE Special, Oyo', 'https://chat.whatsapp.com/IjWGLJBJD3a7QKAX5wyNQT?s=cl&p=a&mlu=4&ilr=4'),
  ('Federal Polytechnic Ilaro', 'https://chat.whatsapp.com/IsocsTySoSGFZKIpaQQr4a?s=cl&p=a&mlu=4&ilr=4'),
  ('Federal Polytechnic, Ado', 'https://chat.whatsapp.com/HMiID5UU03f4SHiXL0aXl1?s=cl&p=a&mlu=4&ilr=4'),
  ('Federal Polytechnic, Ede', 'https://chat.whatsapp.com/E2mSPFc3oTzB6HqeODVw6m?s=cl&p=a&mlu=4&ilr=4'),
  ('Federal Polytechnic, Offa', 'https://chat.whatsapp.com/EBUxjFuvMfR0ghPLd4CM99?s=cl&p=a&mlu=4&ilr=4'),
  ('Federal University Enugu', 'https://chat.whatsapp.com/HBtoHtaqiuYDQEwpa6NOry?s=cl&p=a&mlu=4&ilr=4'),
  ('First Technical University', 'https://chat.whatsapp.com/LFHub2X4jS6DnDGZG4mIhT?s=cl&p=a&mlu=4&ilr=4'),
  ('FUAHS, Enugu', 'https://chat.whatsapp.com/HBtoHtaqiuYDQEwpa6NOry'),
  ('FUNAAB', 'https://chat.whatsapp.com/HDPKaS6vJuC5KZH58AlU4u?s=cl&p=a&mlu=4&ilr=4'),
  ('FUOYE', 'https://chat.whatsapp.com/HxPKGJ14HAj6FODuUNnwIU?s=cl&p=a&mlu=4&ilr=4'),
  ('FUTA', 'https://chat.whatsapp.com/LmjETfZRC3q7Gw4XQPtg3k?s=cl&p=a&mlu=4&ilr=4'),
  ('FUTMINNA', 'https://chat.whatsapp.com/FMZEjOTSBSH3cyDB8W1uXe?s=cl&p=a&mlu=4&ilr=4'),
  ('Gateway Polytechnic', 'https://chat.whatsapp.com/I929RcEF95U21XLIvR31er?s=cl&p=a&mlu=4&ilr=4'),
  ('Hallmark University', 'https://chat.whatsapp.com/GdcV9q5EpNJ2ey2QIdGb6q?s=cl&p=a&mlu=4&ilr=4'),
  ('Harvard College of Business', 'https://chat.whatsapp.com/GTv4GGQ4iKA3oTYEyuwaVJ?s=cl&p=a&mlu=4&ilr=4'),
  ('JABU', 'https://chat.whatsapp.com/GMYCxAJF3oiBtbGnyyxRRr?s=cl&p=a&mlu=4&ilr=4'),
  ('Kogi State University & Polytechnic', 'https://chat.whatsapp.com/KJO9ozRAFxp7s0myCiPeMz?s=cl&p=a&mlu=4&ilr=4'),
  ('KWASU', 'https://chat.whatsapp.com/LiD253DNyeq3pUqfkBcTV2?s=cl&p=a&mlu=4&ilr=4'),
  ('LASPOTECH', 'https://chat.whatsapp.com/I14O9XccyDbEuCJEwJ7rED?s=cl&p=a&mlu=4&ilr=4'),
  ('LASU Ojo', 'https://chat.whatsapp.com/L1f0RZ7qb8L3htJkubXcBF?s=cl&p=a&mlu=4&ilr=4'),
  ('LASUCOM', 'https://chat.whatsapp.com/CYOZGlsCkvR2P789wvr9en?s=cl&p=a&mlu=4&ilr=4'),
  ('LASUED Ijanikin', 'https://chat.whatsapp.com/LqUUT98pj8bC13nYgZUDUP?s=cl&p=a&mlu=4&ilr=4'),
  ('LASUSTECH', 'https://chat.whatsapp.com/Kgdl0tSJ53c9yqhK40EziN?s=cl&p=a&mlu=4&ilr=4'),
  ('LAUTECH', 'https://chat.whatsapp.com/HG7LjYXDkGlHusWm2kGfgt?s=cl&p=a&mlu=4&ilr=4'),
  ('Lead City University', 'https://chat.whatsapp.com/K3SUF5tceFz01kOp31iPSj?s=cl&p=i&mlu=4&ilr=4'),
  ('MAPOLY', 'https://chat.whatsapp.com/Gc0xnUezQWJKDDEAaksqdM?s=cl&p=a&mlu=4&ilr=4'),
  ('Moor Plantation', 'https://chat.whatsapp.com/KcsnhhS34cLLkJRvUWM5UA?s=cl&p=a&mlu=4&ilr=4'),
  ('MOUAU, Abia', 'https://chat.whatsapp.com/Ddamj8V1KjO4wjDD4oK9EH?s=cl&p=a&mlu=4&ilr=4'),
  ('Mount Zion Institute', 'https://chat.whatsapp.com/B78WTYiFTNB32QFHZzvVmJ?s=cl&p=a&mlu=4&ilr=4'),
  ('Niger Delta University', 'https://chat.whatsapp.com/EVxRCKJM8cXFftLPz6r8i6?s=cl&p=a&mlu=4&ilr=4'),
  ('Nigeria Maritime University, Okerenkoko', 'https://chat.whatsapp.com/BhspOJ68UrRAMi9JAQN8gs?s=cl&p=a&mlu=4&ilr=4'),
  ('Noun Abeokuta', 'https://chat.whatsapp.com/L07K1kRxwMG2baMbhCnDZz?s=cl&p=a&mlu=4&ilr=4'),
  ('OAU', 'https://chat.whatsapp.com/HSGvIUL3UlrDBTSF8pV6NJ?mode=gi_t'),
  ('Oduduwa University', 'https://chat.whatsapp.com/DdcHdt5ZVyk9wQz7y0oXp9?s=cl&p=a&mlu=4&ilr=4'),
  ('Ogun State Polytechnic, Ilese-Ijebu', 'https://chat.whatsapp.com/ETN5oc1kdir8rE4LM6hYQo?s=cl&p=a&mlu=4&ilr=4'),
  ('OOU Ago-Iwoye', 'https://chat.whatsapp.com/ExYmRcuhMYMCzMhe4uduSy?s=cl&p=a&mlu=4&ilr=4'),
  ('OOU Ayetoro', 'https://chat.whatsapp.com/CC0xpF2nVKX8zW9Ep5zDld?s=cl&p=a&mlu=4&ilr=4'),
  ('OOU Sagamu', 'https://chat.whatsapp.com/LIv1qzz4LntEK98O8ZErfp?s=cl&p=a&mlu=4&ilr=4'),
  ('Osun State College of Nursing', 'https://chat.whatsapp.com/GlN6rlX9yeg5WxpfysDRPR?s=cl&p=a&mlu=4&ilr=4'),
  ('Osun Students Movement', 'https://chat.whatsapp.com/Js2akP7moY85xkDBIO10S4?s=sw&p=a&mlu=4&ilr=4'),
  ('OYSCATECH', 'https://chat.whatsapp.com/JRyT66KdEQi20bakULL558?s=cl&p=a&mlu=4&ilr=4'),
  ('Pan-Atlantic University', 'https://chat.whatsapp.com/Js2akP7moY85xkDBIO10S4?s=sw&p=a&mlu=4&ilr=4'),
  ('Redeemers University', 'https://chat.whatsapp.com/I1gCrJuLnIc6i59NoBBZWj?s=cl&p=a&mlu=4&ilr=4'),
  ('RONIK Polytechnic', 'https://chat.whatsapp.com/Jo0EnFifD7X1WJVtM7qqA3?s=cl&p=a&mlu=4&ilr=4'),
  ('TASUED', 'https://chat.whatsapp.com/BW1FnSHF6iA3V72ZckhM3Z?s=cl&p=a&mlu=4&ilr=4'),
  ('Thomas Adewunmi University', 'https://chat.whatsapp.com/BlwOkstNOykDMzjIbw1QpA?s=cl&p=a&mlu=4&ilr=4'),
  ('University of Benin', 'https://chat.whatsapp.com/LDcLUjS6hCZEZ1tFUNYrcy?s=cl&p=a&mlu=4&ilr=4'),
  ('University of Calabar', 'https://chat.whatsapp.com/JwhFOM1ssiZGQj0pIbrDWQ?s=cl&p=a&mlu=4&ilr=4'),
  ('University of Calabar II', 'https://chat.whatsapp.com/Kpfes2aEnDp1kqcVVHt17Q?s=cl&p=a&mlu=4&ilr=4'),
  ('University of Ibadan', 'https://chat.whatsapp.com/HeHx2Kp1pn52rEfhX7URmN?s=cl&p=a&mlu=4&ilr=4'),
  ('University of Ilesa', 'https://chat.whatsapp.com/KptdcJzGKx74j49pemiMpN?s=cl&p=a&mlu=4&ilr=4'),
  ('University of Ilorin', 'https://chat.whatsapp.com/EVO1CiF3tSkKf6SkJk95fg?s=cl&p=a&mlu=4&ilr=4'),
  ('University of Jos', 'https://chat.whatsapp.com/GPPNRxPuhmk4Ba9epVQZuQ?s=cl&p=a&mlu=4&ilr=4'),
  ('University of Lagos', 'https://chat.whatsapp.com/HvHrHlcIHGnIli9cKPV1EI?s=cl&p=a&mlu=4&ilr=4'),
  ('University of Port Harcourt', 'https://chat.whatsapp.com/Etw4JGeFUxWEI88WIFkSTM?s=cl&p=a&mlu=4&ilr=4'),
  ('UNIZIK', 'https://chat.whatsapp.com/Gl8FTft3tkGBLcEAy0NtHg?s=cl&p=a&mlu=4&ilr=4'),
  ('UNN', 'https://chat.whatsapp.com/KkLe19WrDiFJJ6faTzoNiA?s=cl&p=a&mlu=4&ilr=4'),
  ('YABATECH', 'https://chat.whatsapp.com/FEJVefokeKG6DpfqcTWxcK?s=cl&p=a&mlu=4&ilr=4')
) as campus(name, destination_url)
where not exists (
  select 1 from public.links existing
  where existing.page_key = 'campuses' and lower(existing.name) = lower(campus.name)
);

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
