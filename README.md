# 📦 StockAlerta — Hackathon ITD 2026

**Eje:** Comercio y emprendimiento local
**Problemática:** Control de inventarios en pequeños negocios
**Pregunta guía:** ¿Cómo podría un negocio pequeño saber que se le está acabando?

## Solución
Una página web (un solo `index.html`, sin instalación ni internet) que avisa al dueño *antes* de quedarse sin producto:

- **Semáforo** por producto: 🟢 bien · 🟡 por acabarse · 🔴 crítico/agotado, según el stock mínimo que el dueño define.
- **Días restantes estimados** según lo que realmente se vende (últimos 7 días).
- **Panel de alertas** arriba de todo y contador en la pestaña del navegador.
- **Inventario por paquetes:** se registra cuántos paquetes hay y cuántas piezas trae cada uno; la app calcula el total sin contar pieza por pieza. Al vender, abre paquetes automáticamente.
- **Caducidad por lote:** al registrar la llegada de paquetes se anota la fecha de caducidad de ese lote. Avisa 7 días antes (⏳ por caducar) y cuando ya caducó (⌛), y al vender descuenta primero del lote que caduca antes.
- **Lista de compras automática** en paquetes, que se puede copiar, mandar por WhatsApp o imprimir.
- Buscador, filtros, exportar CSV y datos de ejemplo para demostrar.

## Cómo usarla
Abre `index.html` en cualquier navegador (celular o computadora), entra con tu correo y contraseña y pulsa **"Cargar ejemplo"** para ver una tiendita de abarrotes. Los datos se guardan en tu cuenta de Supabase, así que los ves desde cualquier dispositivo.

## Conectar con Supabase (una sola vez)
1. Crea una cuenta y un proyecto en [supabase.com](https://supabase.com) (guarda la contraseña de la base).
2. En **SQL Editor** → *New query*: pega todo `supabase/schema.sql` y pulsa **Run**. Crea las tablas `productos`, `lotes` y `movimientos` con seguridad por usuario (RLS).
3. En **Authentication → Providers → Email**, para la demo desactiva **Confirm email** (así se puede entrar justo al crear la cuenta).
4. En **Project Settings → API** copia el **Project URL** y la **anon public key** y pégalos en `SUPABASE_URL` y `SUPABASE_ANON_KEY` al inicio del `<script>` de `index.html`.
5. Abre la página, pulsa **Crear cuenta** y listo.

**Seguridad:** la *anon key* es pública por diseño (la protegen las reglas RLS: cada usuario solo ve sus filas). **Nunca** pegues la *service_role key* en el código.

## Equipo
Abel, Joto, Marika
