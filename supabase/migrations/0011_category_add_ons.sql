-- Add-ons were stored per menu item, so two items in the same category
-- (e.g. two burgers) could silently drift apart -- editing "Extra Cheese"
-- on one item never touched the other. Add-ons are actually a property of
-- the category ("burgers all take the same extras"), so make that the
-- single source of truth: one row per category, and every item in that
-- category always mirrors it.
create table category_add_ons (
  cat menu_category primary key,
  add_ons jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table category_add_ons enable row level security;
create policy category_add_ons_select on category_add_ons for select using (true);
create policy category_add_ons_write on category_add_ons for all using (is_manager()) with check (is_manager());

-- Seed one row per category from whichever existing item in that category
-- already has add-ons defined, so nothing already configured is lost.
insert into category_add_ons (cat, add_ons)
select distinct on (cat) cat, add_ons
from menu_items
where jsonb_array_length(add_ons) > 0
order by cat, sort_order;

insert into category_add_ons (cat)
select unnest(enum_range(null::menu_category))
on conflict (cat) do nothing;

-- Bring every existing item in line with its category immediately.
update menu_items m
set add_ons = c.add_ons
from category_add_ons c
where m.cat = c.cat;

create or replace function set_category_add_ons(p_cat menu_category, p_add_ons jsonb)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_manager() then
    raise exception 'manager access required';
  end if;

  insert into category_add_ons (cat, add_ons, updated_at)
  values (p_cat, coalesce(p_add_ons, '[]'::jsonb), now())
  on conflict (cat) do update set add_ons = excluded.add_ons, updated_at = now();

  update menu_items set add_ons = coalesce(p_add_ons, '[]'::jsonb) where cat = p_cat;
end;
$$;
grant execute on function set_category_add_ons(menu_category, jsonb) to authenticated;

-- upsert_menu_item now always derives add_ons from category_add_ons instead
-- of trusting whatever jsonb the caller passes, so a new or renamed item can
-- never start out of sync with the rest of its category.
create or replace function upsert_menu_item(
  p_id text, p_cat menu_category, p_name text, p_name_fr text,
  p_description text, p_description_fr text, p_price integer,
  p_add_ons jsonb, p_sizes jsonb
) returns menu_items
language plpgsql security definer set search_path = public as $$
declare
  v_item menu_items;
  v_cat_add_ons jsonb;
begin
  if not is_manager() then raise exception 'manager access required'; end if;

  select add_ons into v_cat_add_ons from category_add_ons where cat = p_cat;
  v_cat_add_ons := coalesce(v_cat_add_ons, '[]'::jsonb);

  if p_id is null then
    insert into menu_items (cat, name, name_fr, description, description_fr, price, add_ons, sizes)
      values (p_cat, p_name, p_name_fr, coalesce(p_description, ''), coalesce(p_description_fr, ''), p_price,
              v_cat_add_ons, coalesce(p_sizes, '[]'::jsonb))
      returning * into v_item;
  else
    update menu_items set
      cat = p_cat, name = p_name, name_fr = p_name_fr,
      description = coalesce(p_description, description), description_fr = coalesce(p_description_fr, description_fr),
      price = p_price, add_ons = v_cat_add_ons, sizes = coalesce(p_sizes, sizes)
      where id = p_id returning * into v_item;
    if v_item is null then raise exception 'menu item not found'; end if;
  end if;
  return v_item;
end;
$$;
grant execute on function upsert_menu_item(text, menu_category, text, text, text, text, integer, jsonb, jsonb) to authenticated;

alter publication supabase_realtime add table category_add_ons;
