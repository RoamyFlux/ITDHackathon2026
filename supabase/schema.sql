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
-- 3) MOVIMIENTOS: historial de ventas (salida) y llegadas (entrada).
--    Sirve para calcular cuántas piezas se venden por día y cuántos días alcanza el stock.
-- ---------------------------------------------------------------------
create table if not exists public.movimientos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete cascade,
  tipo        text not null check (tipo in ('entrada', 'salida')),
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
