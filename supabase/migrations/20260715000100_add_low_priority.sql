insert into public.priority_levels (code, label, description, sort_order)
values ('low', 'Low', 'Can be completed after normal and high priority work', 0)
on conflict (code) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order;
