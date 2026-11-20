<p align="center"><img src="public/logo.svg" width="96" alt="Logo de EarlyStock"></p>

# EarlyStock 2.5 · Hackathon ITD 2026

**Eje:** Comercio y emprendimiento local
**Problemática:** Control de inventarios en pequeños negocios
**Pregunta:** ¿Cómo podría un negocio pequeño saber que se le está acabando algo?

EarlyStock avisa al dueño de un negocio **antes** de que se le acabe un producto o de que algo caduque, le **sugiere qué hacer** (pedir, retirar, hacer una oferta) y arma su lista de compras. Está hecha con **Vue 3 + Vite**, guarda los datos en **Supabase** y se publica sola en **GitHub Pages**.

## Novedades 2.5 (pulido)
Revisión completa de la app, la base de datos y el código, sin cambiar cómo se usa:
- **No se pierde nada al guardar:** las acciones entran a una cola. Dos ventas seguidas (o una venta mientras se importa) se guardan las dos.
- **Excel sin sorpresas:** exportar y volver a importar el mismo archivo ya no cambia las caducidades de los lotes. La columna "Estado" incluye la caducidad.
- **Fechas exactas:** las ofertas de algo que caduca hoy duran "solo hoy" (antes proponían una fecha pasada). Los planes vencen con la fecha de **México**, no la del servidor.
- **Números claros:** "Urgentes" y "Atención" del resumen cuentan lo mismo que muestran sus filtros. Las ventas de 7 días coinciden con la gráfica.
- **Accesibilidad:** pestañas completas para lector de pantalla y teclado (Inicio/Fin), ventanas que devuelven el foco, botones con el nombre completo del producto y errores anunciados de inmediato.
- **Más seguro:**
  - El límite de ofertas ya no se puede saltar, y nadie puede fingir eventos de "plan cambiado".
  - Las funciones internas de planes no se pueden llamar desde la app, y `anon` no tiene acceso a las tablas privadas.
  - En CI, las acciones están fijadas por commit y los permisos son mínimos.
- **Probada en navegador:** 6 recorridos completos con Playwright en `tests/e2e/` (`npm run e2e`), además de las pruebas de lógica. También corren en cada PR.
- Detalles:
  - **Ctrl + K** funciona también en Administración y no borra un formulario abierto.
  - "Crear cuenta" desde la demostración abre el formulario correcto.
  - Las notificaciones funcionan en Android y el botón "Instalar EarlyStock" aparece cuando el navegador lo permite.

**Para el equipo:** vuelvan a ejecutar `supabase/schema.sql` en Supabase (es seguro hacerlo varias veces).

## Interfaz compacta con pestañas (2.4)
El panel ya no es una página larga que hay que deslizar: está dividido en **pestañas**.

| Pestaña | Qué tiene |
| --- | --- |
| **Hoy** | Resumen, sugerencias y "Requiere atención" (grupos plegables) |
| **Inventario** | Buscador, filtros y productos (tarjetas o tabla); las tarjetas con 3+ presentaciones muestran 2 y "Ver más" |
| **Compras** | Lista de compras |
| **Ofertas** | Ofertas activas |
| **Reportes** | Ventas de 7 días y stock por categoría |
| **Más** | Tu plan y herramientas |

- En computadora las pestañas van arriba; en celular, en una barra fija abajo (como una app). Llevan contadores (urgentes, por comprar, ofertas).
- Atajos `1`–`6` y "Ir a…" en Ctrl + K. Los botones como "Ver lista de compras" o una alerta cambian solos de pestaña.
- La página de inicio agrupa "Cómo funciona / Beneficios / Sugerencias / Seguridad" en pestañas. Configuración usa bloques plegables, y Seguridad y Admin usan pestañas.

## Insignias y administración de usuarios (2.3)
- **Botón de plan** en el encabezado: en Gratis dice "Mejorar plan"; en Pro y Max muestra su insignia. Abre la ventana de planes.
- **Insignias:** Gratis no tiene; **Pro** lleva una insignia **plateada** (y aro plateado en la foto) y **Max** una **dorada brillante** con destello (y aro dorado). La tarjeta del saludo lleva una banda en la esquina con el plan.
- **Corona:** la cuenta administradora lleva una coronita dorada en su foto y junto a su nombre.
- **Admin → Usuarios y planes:** lista de todas las cuentas de la app (correo, negocio, plan, vencimiento, productos, último acceso y si confirmó su correo), con buscador. "Asignar plan" permite dar Gratis, Pro o Max a **cualquier cuenta**, incluida la propia, con fecha de vencimiento o **sin vencimiento** (cortesía o pruebas).
- La lista sale de la función `admin_usuarios()` (`schema.sql` §17), que solo responde al administrador. No muestra contraseñas ni inventarios.

## Planes (2.2)
| Plan | Precio (MXN, IVA incluido) | Productos | Ofertas activas | Soporte |
| --- | --- | --- | --- | --- |
| **Gratis** | $0 | hasta 1,000 | hasta 3 | correo (2 días hábiles) |
| **Pro** | $149 al mes · $1,490 al año | hasta 10,000 | ilimitadas | WhatsApp y correo (1 día hábil) + ayuda con el primer Excel |
| **Max** | $349 al mes · $3,490 al año | ilimitados | ilimitadas | prioritario (mismo día hábil) + alta de todo el inventario |

Cada presentación o sabor cuenta como un producto. Los límites los aplica la **base de datos** (triggers en `schema.sql` §16): no se pueden saltar modificando la página.

**¿Por qué esos precios?** Mantener el servicio cuesta aprox. **$835 MXN al mes**: Supabase Pro ~25 USD, Resend ~20 USD y un dominio ~$25 MXN; GitHub Pages es gratis. Con 6 clientes Pro, o 3 Max, se cubre. Los sistemas de inventario en la nube suelen costar de $300 a $1,000 MXN al mes, así que EarlyStock queda por debajo, pensado para tiendas pequeñas. Mientras haya pocos usuarios, el plan gratuito de Supabase (500 MB y 50,000 usuarios al mes) basta y el costo es casi $0.

**Cómo se cobra (sin pasarela de pago integrada todavía):**
1. El cliente toca *Mi plan → Contratar Pro/Max*. Se abre WhatsApp o el correo de soporte con el mensaje ya escrito.
2. Se le mandan los datos de pago (transferencia, OXXO o un link de cobro de Mercado Pago).
3. El administrador entra a **Admin → Usuarios y planes**, busca la cuenta del cliente, elige el plan y hasta qué día pagó (o "sin vencimiento").
4. Al vencer (fecha de México), la cuenta vuelve sola a Gratis (no se borra nada).

Siguiente paso recomendado: integrar Mercado Pago Suscripciones o Stripe para cobro automático. Requiere una cuenta del negocio y un servidor (Supabase Edge Function) para recibir la confirmación del pago.

## Novedades 2.1
- **Presentaciones y sabores:** cada producto muestra en UNA tarjeta todas sus presentaciones (600 ml, 2 L, 1 kg…) y sabores, con el stock de cada una y el total del producto.
- **Sin duplicados:** si agregas un producto que ya existe (mismo nombre, presentación y sabor, sin importar mayúsculas, acentos ni espacios de más), la app **suma** sus piezas al existente. Al importar Excel, los repetidos también se suman. Además, la base de datos lo impide con un índice único que ignora mayúsculas y espacios.
- **Stock por categoría** (piezas, productos y cuántos en riesgo) y **ofertas** que se ponen y quitan cuando quieras (% de descuento, 2×1 o precio especial, con fecha de fin opcional).
- **Correos reales:** al crear la cuenta se revisa que el dominio del correo reciba mensajes (MX) y la cuenta solo se activa con el enlace de confirmación.
- **Soporte:** botón "?" → *Ayuda y soporte* con los contactos que da de alta el **administrador** (WhatsApp, Telegram, Messenger, Facebook, Instagram, TikTok, X, YouTube, correo, teléfono o web) con sus logotipos originales. WhatsApp ya no se usa para clientes ni para la lista de compras.
- Arreglado: al agregar un producto, la columna derecha ya no queda encimada.

## Qué hace
- **Página de inicio para clientes nuevos:** qué resuelve, vista previa animada, cómo funciona en 3 pasos, beneficios, seguridad y **"Probar demo sin registrarse"** (tienda de ejemplo en memoria; no se guarda nada).
- **Sugerencias para hoy y notificaciones:**
  - *Haz una oferta:* si un lote va a caducar antes de venderse (compara venta diaria × días que faltan), propone **2×1 o 30 %** (≤ 2 días), **20 %** (≤ 5 días) o **10 %**, con el precio de oferta y la pérdida que evitas; la activas con un toque y la quitas cuando quieras.
  - *Retira lo caducado* · *Pide N paquetes* · *Tienes de más* · *Nadie lo ha comprado en 7 días* · *Tu más vendido*.
  - Campana con contador en el encabezado y **notificaciones del navegador** opcionales (un resumen al día al abrir la app).
- **Semáforo por producto** (urgente, atención, bien surtido) con leyenda "¿Qué significan los colores?", **"Alcanza ~N días"**, barra de nivel y mini gráfica de ventas.
- **Inventario por paquetes** (paquetes × piezas + sueltas; al vender abre paquetes solo) y **caducidad por lote** (se vende primero lo que caduca antes).
- Ventas y llegadas rápidas con vista previa, **Deshacer**, **Retirar caducados** (merma), lista de compras (copiar e imprimir), ventas de 7 días.
- **Tarjetas o Tabla**, filtros por estado y categoría, buscador, **importar y exportar Excel**, plantilla, paleta de comandos **Ctrl + K** y atajos.
- **Guía rápida** de 5 pasos la primera vez (y siempre en Ctrl + K → "Guía rápida").
- **Temas:** Claro, **Niebla** (gris claro), **Grafito** (gris medio), Oscuro y Automático; colores Vice, Neón, Ocaso, Lila, **Océano** y **Bosque**; densidad y animaciones.
- El **valor del inventario** ya no es protagonista: su lugar en el resumen lo ocupa **"Por comprar"**; el valor aparece discreto en Herramientas.
- **Se instala como app** (PWA) en celular y computadora.

## Seguridad
| Dónde | Qué hace |
| --- | --- |
| Cuentas | Correo **real** (enlace de confirmación + bloqueo de correos temporales) y contraseña propia de **mínimo 8 caracteres con letras y números** (revisado en la página y en Supabase). Medidor de fuerza, mostrar/ocultar. |
| Llaves de acceso | Entrar con **huella, rostro o PIN** (passkeys de Supabase). Se agregan, renombran y quitan en *Perfil → Seguridad*. |
| Administración automática | Bloqueo tras 5 intentos fallidos, **cierre por inactividad**, cerrar sesión en otros dispositivos, **revisión automática** de la cuenta y **bitácora de actividad**. La base de datos anota sola borrados, retiros, cambios masivos y cambios de plan (no se pueden fingir ni ocultar). Cada vez que la cuenta registra actividad, se borran sus eventos de más de 90 días. |
| Datos | Reglas RLS (cada cuenta solo ve lo suyo), límites en textos y números, **eliminar mi cuenta** (borra todo: derecho de cancelación). |
| Página | **CSP estricta** (sin scripts en línea ni de otros sitios), sin CDNs (librerías y fuentes incluidas), `no-referrer`, anti-iframe, Excel leído en un **Web Worker aislado** con límites, CSV protegido contra fórmulas. |
| Planes y admin | Los límites y el vencimiento los aplica la base (triggers). Las funciones de administrador solo responden a cuentas en `administradores` con correo confirmado. |
| GitHub | Workflow **Seguridad** en cada PR (pruebas, recorridos en navegador, `npm audit`, búsqueda de claves secretas, revisión de CSP y CodeQL del código y de los workflows), acciones fijadas por commit, **Dependabot** y [`SECURITY.md`](SECURITY.md). |

**Políticas:** [Aviso de Privacidad](src/views/Privacidad.vue) (LFPDPPP, derechos ARCO) y [Términos de Uso](src/views/Terminos.vue). Son plantillas: **llenen los datos entre corchetes** (`[Nombre del responsable]`, `[domicilio]`, `[correo de contacto]`, `[Proveedor de correo]`, `[ciudad y estado]`) y revísenlas con un asesor antes de usarlas con clientes reales. Si cambian el texto, suban `VERSION_POLITICAS` en `src/stores/sesion.js` para que se pida aceptarlas de nuevo.

## Cómo calcula sus avisos
- **"Alcanza ~N días"** = piezas en tienda ÷ venta diaria (piezas vendidas en los últimos 7 días ÷ días de historial, mínimo 1). Ej.: Refresco vendió 62 en 7 días → 8.9/día; hay 15 → "~1 día".
- **Semáforo:** urgente = agotado o en su mínimo (o lote caducado); atención = hasta 1.5× el mínimo, ≤ 2 días, o caduca pronto; bien surtido = suficiente. Los números "Urgentes" y "Atención" del resumen cuentan cantidad **y** caducidad, igual que los filtros.
- **Ventas de 7 días:** hoy y los 6 días de calendario anteriores (lo mismo en la gráfica, en "Alcanza ~N días" y en "Vendido").
- **% en riesgo:** productos con alguna alerta ÷ total (verde < 30 %, ámbar 30–59 %, rojo ≥ 60 %).
- **Ofertas:** para cada lote (el que caduca antes primero) se calcula cuánto se venderá antes de su fecha; lo que sobra se oferta.

## Desarrollo local
Requisito: **Node 20.19 o más nuevo** (recomendado Node 22).
```bash
npm install
npm run dev        # http://localhost:5173
npm test           # pruebas de la lógica (Vitest)
npm run build      # versión final en dist/
npm run preview    # probar dist/ en http://localhost:4173/ITDHackaton2026/
npm run revisar-seguridad
npx playwright install chromium   # solo la primera vez
npm run e2e        # recorridos completos en navegador con un Supabase simulado (no toca datos reales)
```
Para usar otro proyecto de Supabase en local, copien `.env.example` a `.env` y pongan su URL y su *publishable key*. La CSP se ajusta sola.
Ya no se abre con doble clic al `index.html`: hay que usar `npm run dev` o la dirección de GitHub Pages.

## Publicar en GitHub Pages (automático)
1. *Settings → Pages → Source:* **GitHub Actions** (una sola vez).
2. Cada fusión a `main` corre `.github/workflows/publicar.yml`: pruebas, compilación, revisión de seguridad y publicación en `https://roamyflux.github.io/ITDHackaton2026/`.

## Correos reales: configurar el envío (IMPORTANTE)
Sin un servicio de correo propio, **Supabase solo envía correos a los miembros del proyecto y muy pocos por hora**: por eso a otras personas no les llega la confirmación. Para que funcione con cualquier correo:
1. Crear cuenta gratis en **[Resend](https://resend.com)**.
   - **Domains → Add domain:** agregar su dominio y copiar los registros DNS que indica. Sin dominio propio, Resend solo deja enviar al correo con el que se registraron (sirve para probar).
   - **API Keys → Create API key:** crear una clave con permiso *Sending access* y copiarla. Es secreta: no la pongan en el código ni en el repositorio.
2. En Supabase: **Authentication → Emails → SMTP Settings → Enable custom SMTP**:
   - Host `smtp.resend.com`, Port `465`, Username `resend`, Password = la API key de Resend.
   - Sender email: por ejemplo `no-responder@su-dominio.com`. Sender name: `EarlyStock`.
3. **Authentication → Rate Limits:** subir "Rate limit for sending emails" (por ejemplo, a 30 por hora).
4. **Authentication → Emails → Templates:**
   - **Confirm signup:** pegar [`supabase/plantillas/confirmar.html`](supabase/plantillas/confirmar.html). Asunto: *Confirma tu cuenta de EarlyStock*.
   - **Reset password:** pegar [`supabase/plantillas/recuperar.html`](supabase/plantillas/recuperar.html). Asunto: *Crea una contraseña nueva para EarlyStock*.
5. Probar: crear una cuenta con un Gmail que no sea del equipo y abrir el enlace.

La página además rechaza correos cuyo dominio no recibe mensajes (por ejemplo, `ana@nadaexiste123.com`). Para eso consulta el DNS de Cloudflare enviando **solo el dominio**.

## Cuenta de administrador
El administrador edita los contactos de soporte en **Admin** (botón del encabezado, solo lo ve él). El correo NO va en el código (el repositorio es público). Para nombrarlo:
1. Ejecutar `supabase/schema.sql` (secciones 14 y 15).
2. En **SQL Editor**, ejecutar una vez (con el correo del administrador):
   ```sql
   insert into public.administradores (email) values (lower('correo-del-admin@ejemplo.com')) on conflict do nothing;
   ```
3. Crear la cuenta en la app con ese correo y su contraseña, y abrir el enlace de confirmación. Solo las cuentas con el correo confirmado tienen permisos de administrador.
4. Entrar: aparece el botón **Admin**. Recomendación: usar una contraseña larga y única y agregar una llave de acceso (huella) en *Perfil → Seguridad*.

Para quitar a un administrador: `delete from public.administradores where email = lower('…');`

## Configurar Supabase (una sola vez)
1. **SQL:** *SQL Editor → New query →* pegar todo [`supabase/schema.sql`](supabase/schema.sql) → *Run*. Se puede volver a ejecutar sin problema y **hay que hacerlo con cada versión nueva**:
   - 2.1 agregó presentación, sabor, ofertas, administradores y contactos de soporte.
   - 2.2 agregó suscripciones y límites por plan.
   - 2.3 agregó la lista de cuentas para el administrador.
   - 2.5 endurece permisos, límites y fechas.

   Si avisa "Hay productos repetidos", júntenlos en la app y vuelvan a ejecutarlo.
2. **Conexión:** `config/supabase.json` tiene la *Project URL* y la *publishable key* (públicas). Nunca pongan la *secret key*.
3. **URLs:** *Authentication → URL Configuration*: **Site URL** = `https://roamyflux.github.io/ITDHackaton2026/` y en **Redirect URLs** agregar esa misma y `http://localhost:5173/` (para los enlaces de confirmación y recuperación).
4. **Correos reales:** *Authentication → Sign In / Providers → Email*: activar **Confirm email** y configurar el SMTP propio (sección "Correos reales" de arriba).
5. **Contraseñas:** *Authentication → Sign In / Providers → Email → Password requirements*: **Minimum length 8** y **Letters and digits**. (Opcional en planes de pago: *Prevent leaked passwords*.)
6. **Llaves de acceso (beta):** *Authentication → Passkeys*: activar, **RP ID** = `roamyflux.github.io`, **Origins** = `https://roamyflux.github.io` (y `http://localhost:5173` para pruebas). Es una función beta de Supabase; si no está disponible en su proyecto, la app sigue funcionando con contraseña.
7. **(Opcional) Correos temporales bloqueados en el servidor:** *Authentication → Hooks → Before User Created → Postgres →* `public.hook_correos_reales`.
8. **Protección extra recomendada:** *Authentication → Rate Limits* (dejar los valores por defecto o bajarlos) y *Attack Protection → CAPTCHA* si reciben registros falsos.

## Archivos
```
index.html               página base (CSP se agrega al compilar)
vite.config.js           compilación, CSP y PWA
config/supabase.json     conexión pública a Supabase
public/                  logo, íconos (incluido el "maskable" para Android) y prefs.js (tema sin parpadeo + anti-iframe)
src/main.js · App.vue · router.js
src/logica/              cálculos puros: inventario, sugerencias, validación, Excel, formato, planes y soporte
src/lib/                 Supabase, almacén (real y demo), Excel, exportar, correo (DNS) y notificaciones
src/stores/              sesión, inventario, preferencias, seguridad, avisos, plan, soporte y ui (Pinia)
src/components/          encabezado, pestañas, resumen, sugerencias, inventario, tarjetas, tabla, ventanas/…
src/views/               Inicio, Panel, Admin, Privacidad y Términos
src/workers/             lector de Excel aislado
src/styles/              temas, base, panel, ventanas e inicio
tests/                   pruebas de la lógica (*.test.js) y recorridos en navegador (e2e/)
scripts/                 revisar-seguridad.mjs (claves secretas, CSP, código peligroso)
supabase/schema.sql      tablas, RLS, bitácora, triggers y funciones
supabase/plantillas/     correos en español (confirmar cuenta y recuperar contraseña)
presentacion/            presentación del proyecto (.pptx) y el código que la genera
.github/                 publicar, seguridad y dependabot
```
