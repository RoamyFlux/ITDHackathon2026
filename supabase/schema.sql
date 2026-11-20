-- =====================================================================
-- EarlyStock · Esquema de base de datos para Supabase
-- Cómo usarlo: Supabase -> SQL Editor -> New query -> pegar TODO esto -> Run.
-- Se puede ejecutar más de una vez sin romper nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) PRODUCTOS: un renglón por producto del inventario.
--    user_id = dueño del producto. Se llena solo con el usuario que inició sesión.
--    paquetes / por_paquete / sueltas: así se evita contar pieza por pieza.
--    minimo y objetivo están en PAQUETES.
-- ---------------------------------------------------------------------
create table if not exists public.productos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre      text not null check (char_length(nombre) between 1 and 60),
  categoria   text not null default '',
  paquetes    integer not null default 0 check (paquetes >= 0),
  por_paquete integer not null default 1 check (por_paquete >= 1),
  sueltas     integer not null default 0 check (sueltas >= 0),
  minimo      numeric not null default 1 check (minimo >= 0),
  objetivo    numeric not null default 4 check (objetivo >= 0),
  costo       numeric check (costo >= 0),
  precio      numeric check (precio >= 0),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2) LOTES: grupos de piezas de un producto que comparten fecha de caducidad.
--    Si se borra el producto, se borran sus lotes (on delete cascade).
-- ---------------------------------------------------------------------
create table if not exists public.lotes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete cascade,
  piezas      integer not null check (piezas > 0),
  caducidad   date not null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3) MOVIMIENTOS: historial de ventas (salida), llegadas (entrada) y mermas (merma = retirado por caducidad).
--    Sirve para calcular cuántas piezas se venden por día y cuántos días alcanza el stock.
-- ---------------------------------------------------------------------
create table if not exists public.movimientos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete cascade,
  tipo        text not null check (tipo in ('entrada', 'salida', 'merma')),
  piezas      integer not null check (piezas > 0),
  created_at  timestamptz not null default now()
);

-- Índices para que las consultas por usuario y por producto sean rápidas.
create index if not exists productos_user_idx    on public.productos (user_id);
create index if not exists lotes_user_idx        on public.lotes (user_id);
create index if not exists lotes_producto_idx    on public.lotes (producto_id);
create index if not exists movimientos_user_idx  on public.movimientos (user_id, created_at);
create index if not exists movimientos_prod_idx  on public.movimientos (producto_id);

-- ---------------------------------------------------------------------
-- 4) PERMISOS DE ACCESO (GRANT)
--    Los proyectos nuevos de Supabase ya NO dan acceso automático a las tablas nuevas.
--    Sin estas líneas la página recibe "permission denied" aunque el usuario haya iniciado sesión.
--    Solo se le da acceso a "authenticated" (usuarios con sesión); "anon" (sin sesión) queda sin acceso.
--    Estos permisos no abren nada por sí solos: las reglas RLS de abajo siguen limitando cada usuario a sus filas.
-- ---------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.productos, public.lotes, public.movimientos to authenticated;

-- ---------------------------------------------------------------------
-- 5) SEGURIDAD (RLS = Row Level Security)
--    Con RLS activado, cada usuario SOLO puede ver y modificar sus propias filas,
--    aunque alguien conozca la URL y la anon key (que son públicas).
--    No hay política para usuarios sin sesión (anon): no pueden leer ni escribir nada.
-- ---------------------------------------------------------------------
alter table public.productos   enable row level security;
alter table public.lotes       enable row level security;
alter table public.movimientos enable row level security;

drop policy if exists "productos: solo el dueño" on public.productos;
create policy "productos: solo el dueño" on public.productos
  for all to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- En lotes y movimientos, además se exige que el producto sea del mismo usuario.
drop policy if exists "lotes: solo el dueño" on public.lotes;
create policy "lotes: solo el dueño" on public.lotes
  for all to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.productos p
                          where p.id = producto_id and p.user_id = (select auth.uid())));

drop policy if exists "movimientos: solo el dueño" on public.movimientos;
create policy "movimientos: solo el dueño" on public.movimientos
  for all to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.productos p
                          where p.id = producto_id and p.user_id = (select auth.uid())));

-- ---------------------------------------------------------------------
-- 6) FOTOS DE PERFIL (Supabase Storage)
--    Crea el "bucket" (carpeta) público "avatars" para las fotos de perfil:
--      - público: cualquiera puede VER una foto si tiene su dirección (así se muestra en la app).
--      - máximo 2 MB por archivo y solo imágenes JPG, PNG o WebP.
--    Cada usuario guarda su foto en avatars/<su-id>/avatar.jpg.
--    Las políticas de abajo permiten que cada usuario suba, cambie o borre SOLO archivos de su propia carpeta.
--    (storage.foldername(name))[1] = primera carpeta de la ruta del archivo = id del usuario.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars: ver propias" on storage.objects;
create policy "avatars: ver propias" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars: subir propias" on storage.objects;
create policy "avatars: subir propias" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars: cambiar propias" on storage.objects;
create policy "avatars: cambiar propias" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars: borrar propias" on storage.objects;
create policy "avatars: borrar propias" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------
-- 7) ACTUALIZACIONES PARA BASES YA CREADAS
--    Si las tablas ya existían, "create table if not exists" no las cambia. Aquí se actualiza lo necesario:
--    - movimientos.tipo ahora acepta 'merma' (piezas retiradas por caducidad).
-- ---------------------------------------------------------------------
alter table public.movimientos drop constraint if exists movimientos_tipo_check;
alter table public.movimientos add constraint movimientos_tipo_check check (tipo in ('entrada', 'salida', 'merma'));

-- =====================================================================
-- EarlyStock 2.0 · SEGURIDAD AUTOMÁTICA Y PROTECCIÓN DE DATOS
-- (todo lo de abajo también se puede ejecutar varias veces)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 8) LÍMITES DE LOS DATOS (restricciones)
--    Aunque alguien se salte la página y escriba directo a la API, la base rechaza datos absurdos:
--    textos demasiado largos o cantidades gigantes. "not valid" = no revisa filas viejas (no falla si ya había).
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'productos_limites') then
    alter table public.productos add constraint productos_limites check (
      char_length(categoria) <= 30 and paquetes <= 1000000 and por_paquete <= 100000 and sueltas <= 1000000
      and minimo <= 100000 and objetivo <= 100000 and coalesce(costo, 0) <= 1000000 and coalesce(precio, 0) <= 1000000
    ) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'lotes_limites') then
    alter table public.lotes add constraint lotes_limites check (piezas <= 100000000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'movimientos_limites') then
    alter table public.movimientos add constraint movimientos_limites check (piezas <= 100000000) not valid;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 9) BITÁCORA DE SEGURIDAD (eventos_seguridad)
--    Guarda inicios de sesión, cambios de contraseña, llaves de acceso, importaciones y exportaciones
--    (los anota la app) y, AUTOMÁTICAMENTE con triggers, borrados, retiros de caducados y cambios masivos.
--    Cada usuario solo ve sus propios eventos. Los eventos no se pueden editar ni borrar desde la app.
-- ---------------------------------------------------------------------
create table if not exists public.eventos_seguridad (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tipo       text not null check (tipo in ('inicio_sesion','cierre_sesion','cierre_otros','cuenta_creada','contrasena_cambiada',
                                            'llave_agregada','llave_borrada','importacion','exportacion','borrado','retiro','cambio_masivo')),
  detalle    text not null default '' check (char_length(detalle) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists eventos_user_idx on public.eventos_seguridad (user_id, created_at desc);

grant select, insert on public.eventos_seguridad to authenticated;
alter table public.eventos_seguridad enable row level security;
drop policy if exists "eventos: ver propios" on public.eventos_seguridad;
create policy "eventos: ver propios" on public.eventos_seguridad
  for select to authenticated using (user_id = (select auth.uid()));
-- Desde la app solo se pueden anotar eventos "de la app"; los automáticos (borrado, retiro, cambio_masivo)
-- solo los escribe la base de datos (así nadie puede fingirlos ni ocultarlos).
drop policy if exists "eventos: anotar propios" on public.eventos_seguridad;
create policy "eventos: anotar propios" on public.eventos_seguridad
  for insert to authenticated
  with check (user_id = (select auth.uid()) and tipo not in ('borrado','retiro','cambio_masivo'));

-- Limpieza automática: al anotar un evento se borran los de ese usuario con más de 90 días.
create or replace function public.limpiar_eventos_viejos() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.eventos_seguridad where user_id = new.user_id and created_at < now() - interval '90 days';
  return new;
end $$;
drop trigger if exists eventos_limpieza on public.eventos_seguridad;
create trigger eventos_limpieza after insert on public.eventos_seguridad
  for each row execute function public.limpiar_eventos_viejos();

-- Trigger: productos borrados (uno o muchos en una sola operación) -> un evento con cuántos.
create or replace function public.registrar_borrado_productos() returns trigger
language plpgsql security definer set search_path = '' as $$
declare n int; u uuid;
begin
  select count(*), min(user_id::text)::uuid into n, u from viejas;
  if n > 0 and u is not null and exists (select 1 from auth.users where id = u) then
    insert into public.eventos_seguridad (user_id, tipo, detalle)
    values (u, 'borrado', n || case when n = 1 then ' producto eliminado' else ' productos eliminados' end);
  end if;
  return null;
end $$;
drop trigger if exists productos_borrado_evento on public.productos;
create trigger productos_borrado_evento after delete on public.productos
  referencing old table as viejas for each statement execute function public.registrar_borrado_productos();

-- Trigger: cambios masivos (20 o más productos modificados en una sola operación, por ejemplo al importar).
create or replace function public.registrar_cambio_masivo() returns trigger
language plpgsql security definer set search_path = '' as $$
declare n int; u uuid;
begin
  select count(*), min(user_id::text)::uuid into n, u from nuevas;
  if n >= 20 then
    insert into public.eventos_seguridad (user_id, tipo, detalle) values (u, 'cambio_masivo', n || ' productos modificados a la vez');
  end if;
  return null;
end $$;
drop trigger if exists productos_masivo_evento on public.productos;
create trigger productos_masivo_evento after update on public.productos
  referencing new table as nuevas for each statement execute function public.registrar_cambio_masivo();

-- Trigger: retiro de caducados (movimientos tipo 'merma').
create or replace function public.registrar_retiro() returns trigger
language plpgsql security definer set search_path = '' as $$
declare n int; pz int; u uuid;
begin
  select count(*), coalesce(sum(piezas), 0), min(user_id::text)::uuid into n, pz, u from nuevos where tipo = 'merma';
  if n > 0 then
    insert into public.eventos_seguridad (user_id, tipo, detalle) values (u, 'retiro', pz || ' piezas caducadas retiradas');
  end if;
  return null;
end $$;
drop trigger if exists movimientos_retiro_evento on public.movimientos;
create trigger movimientos_retiro_evento after insert on public.movimientos
  referencing new table as nuevos for each statement execute function public.registrar_retiro();

-- Las funciones de los triggers no se pueden llamar directo desde la API.
revoke execute on function public.limpiar_eventos_viejos(), public.registrar_borrado_productos(),
  public.registrar_cambio_masivo(), public.registrar_retiro() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 10) ELIMINAR MI CUENTA (derecho de cancelación, ARCO)
--     Borra al usuario que la llama. Por "on delete cascade" se borran también todos sus productos,
--     lotes, movimientos y eventos. La foto se borra antes desde la app (Storage no permite borrarla aquí).
-- ---------------------------------------------------------------------
create or replace function public.eliminar_mi_cuenta() returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'Sin sesión'; end if;
  delete from public.productos where user_id = u;
  delete from public.eventos_seguridad where user_id = u;
  delete from auth.users where id = u;
end $$;
revoke execute on function public.eliminar_mi_cuenta() from public, anon;
grant execute on function public.eliminar_mi_cuenta() to authenticated;

-- ---------------------------------------------------------------------
-- 11) (OPCIONAL) BLOQUEAR CORREOS TEMPORALES EN EL SERVIDOR
--     La página ya los rechaza, pero esto lo hace también en Supabase (no se puede saltar).
--     Para activarlo: Authentication -> Hooks -> "Before User Created" -> Postgres -> public.hook_correos_reales.
-- ---------------------------------------------------------------------
create or replace function public.hook_correos_reales(event jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare dominio text := lower(split_part(coalesce(event->'user'->>'email', ''), '@', 2));
begin
  if dominio = any (array['mailinator.com','guerrillamail.com','guerrillamail.net','sharklasers.com','10minutemail.com',
      '10minutemail.net','tempmail.com','temp-mail.org','temp-mail.io','tempmail.net','throwawaymail.com','yopmail.com',
      'yopmail.net','getnada.com','nada.email','trashmail.com','trashmail.de','dispostable.com','maildrop.cc','mintemail.com',
      'fakeinbox.com','mailnesia.com','mohmal.com','emailondeck.com','tempail.com','tempr.email','discard.email',
      'spamgourmet.com','mytemp.email','burnermail.io','mailcatch.com','inboxkitten.com','moakt.com','tmail.ws',
      'tmpmail.org','tmpmail.net','emailfake.com','fakemail.net','luxusmail.org','mail.tm','linshiyouxiang.net']) then
    return jsonb_build_object('error', jsonb_build_object('http_code', 400, 'message', 'No se permiten correos temporales.'));
  end if;
  return '{}'::jsonb;
end $$;
revoke execute on function public.hook_correos_reales(jsonb) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.hook_correos_reales(jsonb) to supabase_auth_admin;
  end if;
end $$;
