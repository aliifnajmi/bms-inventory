-- Restore category-table access and split the combined consumables/chemicals category.
-- This matches the current BMS IMS publishable-key access model; add Supabase Auth
-- and role-based policies before exposing category writes to untrusted users.

alter table public.categories enable row level security;

drop policy if exists "BMS IMS categories access" on public.categories;
create policy "BMS IMS categories access"
on public.categories
for all
to anon, authenticated
using (true)
with check (true);

grant select, insert, update, delete on public.categories to anon, authenticated;
grant usage, select on sequence public.categories_id_seq to anon, authenticated;

update public.categories
set name = 'Consumables',
    description = 'General maintenance consumables such as tapes, solder wire, sealants and puller rope.'
where name = 'Consumables, Chemicals & Maintenance';

insert into public.categories (name, description)
values ('Chemicals & Maintenance', 'Cleaning chemicals, maintenance sprays and chemical maintenance products.')
on conflict (name) do update set description = excluded.description;

update public.items
set category = case
  when item_name ilike '%cleaner%' or item_name ilike '%wd40%'
    then 'Chemicals & Maintenance'
  else 'Consumables'
end,
updated_at = now()
where category = 'Consumables, Chemicals & Maintenance';

update public.items
set category = 'Tools & Equipment', updated_at = now()
where coalesce(trim(category), '') = '' and item_code = 'TOOL-0010';
