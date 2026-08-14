-- A kliensanyagok csak az előre vállalt formátumokban és legfeljebb
-- 20 MB/fájl méretben kerülhetnek a privát bucketbe. A böngészős ellenőrzés
-- mellett ezt a Storage réteg is kikényszeríti.
update storage.buckets
set
  file_size_limit = 20971520,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-zip-compressed'
  ]
where id = 'client-assets';

-- A jelenlegi brief-folyamatban a feltöltések felhasználói mappába kerülnek,
-- ezért a 250 MB-os projektkeret a még be nem küldött projektnél ezzel a
-- felhasználói mappával azonos. A korlát szerveroldali, így nem kerülhető meg
-- a kliens JavaScript kikapcsolásával.
create or replace function public.enforce_client_assets_quota()
returns trigger
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  owner_folder text;
  current_bytes bigint;
  incoming_bytes bigint;
begin
  if new.bucket_id <> 'client-assets' then
    return new;
  end if;

  owner_folder := (storage.foldername(new.name))[1];
  incoming_bytes := coalesce((new.metadata ->> 'size')::bigint, 0);

  select coalesce(sum(coalesce((metadata ->> 'size')::bigint, 0)), 0)
    into current_bytes
  from storage.objects
  where bucket_id = 'client-assets'
    and (storage.foldername(name))[1] = owner_folder
    and name <> new.name;

  if current_bytes + incoming_bytes > 262144000 then
    raise exception 'A projekthez feltölthető fájlok összmérete legfeljebb 250 MB.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_client_assets_quota on storage.objects;
create trigger enforce_client_assets_quota
before insert or update of metadata, name, bucket_id on storage.objects
for each row execute function public.enforce_client_assets_quota();
