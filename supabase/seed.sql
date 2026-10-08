-- Optional starter group links. Safe to run more than once.
insert into public.links (name, description, destination_url, members_label, is_open, position)
select seed.name, seed.description, seed.destination_url, seed.members_label, seed.is_open, seed.position
from (values
  ('Volunteers Group 28', 'Join to serve.', 'https://chat.whatsapp.com/K4NfS0pS08J4i9eJhYwfXl', 'Open to all', true, 0),
  ('Volunteers Group 29', 'Join to serve.', 'https://chat.whatsapp.com/Izgqpnffvy42OgdYAERYSR', 'Open to all', true, 1),
  ('YMR Mass Choir Team', 'Minstrels, singers, and musicians.', 'https://chat.whatsapp.com/CQ1cXSIGK8FL7qH0QkdC', 'Closed Group', false, 2)
) as seed(name, description, destination_url, members_label, is_open, position)
where not exists (select 1 from public.links existing where existing.name = seed.name);
