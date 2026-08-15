-- set_menu_item_image -- manager-only, lets the dashboard attach an
-- uploaded menu-photos object's public URL to a menu item.

create or replace function set_menu_item_image(p_id text, p_image_url text) returns menu_items
language plpgsql security definer set search_path = public as $$
declare v_item menu_items;
begin
  if not is_manager() then raise exception 'manager access required'; end if;
  update menu_items set image_url = p_image_url where id = p_id returning * into v_item;
  if v_item is null then raise exception 'menu item not found'; end if;
  return v_item;
end;
$$;
grant execute on function set_menu_item_image(text, text) to authenticated;
