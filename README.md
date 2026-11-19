<p align="center"><img src="assets/logo.svg" width="96" alt="Logo de EarlyStock"></p>

# EarlyStock · Hackathon ITD 2026

**Eje:** Comercio y emprendimiento local
**Problemática:** Control de inventarios en pequeños negocios

EarlyStock es una página web (un solo `index.html`) que avisa al dueño de un negocio pequeño **antes** de que se le acabe un producto o de que algo caduque.

## Qué hace
- **Semáforo por producto** (bien surtido, por acabarse, crítico) según el mínimo que define el dueño y lo que realmente vende (últimos 7 días).
- **Barra de nivel** en cada producto y **días estimados** que alcanza el stock.
- **Panel "Requiere atención"**: al tocar un producto, la página baja hasta él y lo resalta.
- **Inventario por paquetes:** paquetes × piezas + sueltas; al vender, abre paquetes automáticamente.
- **Caducidad por lote:** aviso 7 días antes y venta primero del lote que caduca antes.
- **Ventas y llegadas rápidas:** botones − / +, atajos (1, 5, 10, 1 paquete) y vista previa de cuánto quedará.
- **Lista de compras** en paquetes: copiar, enviar por WhatsApp o imprimir.
- **Perfil:** nombre del negocio y **foto de perfil** (se guarda en Supabase Storage).
- Filtros por estado, buscador, exportar a CSV y tienda de ejemplo para la demo.
- Diseño en morados, lilas y rosas, con animaciones suaves, iconos propios y modo oscuro automático.

## Cómo usarla
Abre `index.html` en el navegador (celular o computadora), crea tu cuenta y pulsa **"Probar con una tienda de ejemplo"**. Los datos se guardan en tu cuenta de Supabase, así que los ves desde cualquier dispositivo.

## Conectar con Supabase (una sola vez)
1. Crea una cuenta y un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor** → *New query*: pega todo `supabase/schema.sql` y pulsa **Run**. Crea las tablas `productos`, `lotes` y `movimientos`, sus permisos, la seguridad por usuario (RLS) y el espacio `avatars` para las fotos de perfil. Se puede volver a ejecutar sin problema: **hay que volver a correrlo** si ya tenían el proyecto, para que funcionen las fotos.
3. En **Authentication → Providers → Email**, para la demo desactiva **Confirm email**.
4. En **Project Settings → API** copia el **Project URL** y la **publishable key** y pégalos en `SUPABASE_URL` y `SUPABASE_ANON_KEY` al inicio del `<script>` de `index.html`.

**Seguridad:** la *publishable key* es pública por diseño (la protegen las reglas RLS: cada usuario solo ve sus filas y solo puede cambiar su propia foto). **Nunca** pegues la *secret key* ni la *service_role key* en el código.

## Archivos
- `index.html`: la app completa (HTML, CSS y JavaScript), comentada por bloques en español.
- `supabase/schema.sql`: tablas, permisos, seguridad y almacenamiento de fotos.
- `assets/logo.svg`: logo de EarlyStock (una "E" hecha de barras de stock que bajan, con un punto de alerta).

## Equipo
Abel, Joto, Marika
