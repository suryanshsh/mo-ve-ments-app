create or replace function public.batch_update_moment_positions(p_updates jsonb)
returns setof public.moments
language plpgsql
set search_path = public
as $$
declare
  update_item jsonb;
  updated_moment public.moments;
  updated_moments public.moments[] := array[]::public.moments[];
begin
  if jsonb_typeof(p_updates) <> 'array' then
    raise exception 'p_updates must be a JSON array';
  end if;

  for update_item in select value from jsonb_array_elements(p_updates)
  loop
    update public.moments
    set position = (update_item ->> 'position')::integer,
        updated_at = now()
    where id = (update_item ->> 'id')::uuid
    returning * into updated_moment;

    if not found then
      raise exception 'Moment % not found or not editable', update_item ->> 'id';
    end if;

    updated_moments := array_append(updated_moments, updated_moment);
  end loop;

  return query
    select (moment_row).*
    from unnest(updated_moments) as moment_row
    order by (moment_row).position;
end;
$$;