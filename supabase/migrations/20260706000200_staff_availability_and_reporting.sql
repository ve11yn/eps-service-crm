alter table public.profiles
add column if not exists availability_status text not null default 'available';

alter table public.profiles
add column if not exists availability_note text;

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
    username,
    email,
    availability_status
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role_code', 'field_worker'),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, 'User'), '@', 1)),
    new.raw_user_meta_data ->> 'phone',
    generated_username,
    new.email,
    'available'
  )
  on conflict (id) do update
  set
    email = coalesce(excluded.email, public.profiles.email),
    username = coalesce(excluded.username, public.profiles.username),
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    updated_at = timezone('utc', now());

  return new;
end;
$$;
