create or replace function public.apply_ops(ops jsonb)
returns void
language plpgsql
as $$
declare
  op jsonb;
  t text;
  cols text;
  chk text;
  n integer;
begin
  for op in select * from jsonb_array_elements(ops) loop
    t := op->>'table';
    if not exists (select 1 from pg_tables where schemaname = 'public' and tablename = t) then
      raise exception 'BAD_TABLE %', t;
    end if;

    if op->>'op' = 'insert' then
      select string_agg(quote_ident(k), ', ') into cols from jsonb_object_keys(op->'row') k;
      execute format(
        'insert into public.%1$I (%2$s) select %2$s from jsonb_populate_record(null::public.%1$I, $1)',
        t, cols
      ) using op->'row';

    elsif op->>'op' = 'patch' then
      select string_agg(quote_ident(k), ', ') into cols from jsonb_object_keys(op->'set') k;
      if cols is null then
        continue;
      end if;
      select coalesce(string_agg(format('r.%1$I is not distinct from x.%1$I', k), ' and '), 'true')
        into chk from jsonb_object_keys(op->'expect') k;
      execute format(
        'update public.%1$I as r set (%2$s) = (select %2$s from jsonb_populate_record(null::public.%1$I, $2)) from jsonb_populate_record(null::public.%1$I, $3) as x where r.id = $1 and %3$s',
        t, cols, chk
      ) using (op->>'id')::uuid, op->'set', op->'expect';
      get diagnostics n = row_count;
      if n = 0 then
        raise exception 'OCC_CONFLICT %', t using errcode = 'PT409';
      end if;

    elsif op->>'op' = 'delete' then
      execute format('delete from public.%I where id = $1', t) using (op->>'id')::uuid;

    else
      raise exception 'BAD_OP %', op->>'op';
    end if;
  end loop;
end;
$$;

revoke all on function public.apply_ops(jsonb) from public, anon, authenticated;
grant execute on function public.apply_ops(jsonb) to service_role;

notify pgrst, 'reload schema';
