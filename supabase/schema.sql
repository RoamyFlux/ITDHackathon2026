-- =====================================================================
-- StockAlerta · Esquema de base de datos para Supabase
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
-- 4) SEGURIDAD (RLS = Row Level Security)
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
