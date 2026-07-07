create index if not exists profiles_username_idx
on public.profiles (username)
where username is not null;

create index if not exists profiles_email_idx
on public.profiles (email)
where email is not null;
