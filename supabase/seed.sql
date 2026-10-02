-- Optional starter group links. Safe to run more than once.
insert into public.links (name, description, destination_url, members_label, position)
select seed.name, seed.description, seed.destination_url, seed.members_label, seed.position
from (values
  ('Volunteers Group 28', 'Join to serve.', 'https://chat.whatsapp.com/K4NfS0pS08J4i9eJhYwfXl', 'Open to all', 0),
  ('Volunteers Group 29', 'Join to serve.', 'https://chat.whatsapp.com/Izgqpnffvy42OgdYAERYSR', 'Open to all', 1),
  ('YMR Mass Choir Team', 'Minstrels, singers, and musicians.', 'https://chat.whatsapp.com/CQ1cXSIGK8FL7qH0QkdC', 'Closed to new members', 2)
) as seed(name, description, destination_url, members_label, position)
where not exists (select 1 from public.links existing where existing.name = seed.name);
