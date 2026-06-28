alter table public.profiles
add column if not exists username text;

update public.profiles
set username = 'user-' || substr(replace(id::text, '-', ''), 1, 12)
where username is null;

create unique index if not exists profiles_username_lower_key
on public.profiles (lower(username))
where username is not null;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_username text;
begin
  generated_username :=
    nullif(
      lower(regexp_replace(coalesce(new.raw_user_meta_data ->> 'username', ''), '[^a-zA-Z0-9._-]+', '-', 'g')),
      ''
    );

  if generated_username is null then
    generated_username := 'user-' || substr(replace(new.id::text, '-', ''), 1, 12);
  end if;

  insert into public.profiles (
    id,
    role_code,
    display_name,
    phone,
    username
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role_code', 'field_worker'),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, 'User'), '@', 1)),
    new.raw_user_meta_data ->> 'phone',
    generated_username
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
