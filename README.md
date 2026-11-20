<p align="center"><img src="public/logo.svg" width="96" alt="Logo de EarlyStock"></p>

# EarlyStock 2.0 · Hackathon ITD 2026

**Eje:** Comercio y emprendimiento local
**Problemática:** Control de inventarios en pequeños negocios
**Pregunta:** ¿Cómo podría un negocio pequeño saber que se le está acabando algo?

EarlyStock avisa al dueño de un negocio **antes** de que se le acabe un producto o de que algo caduque, le **sugiere qué hacer** (pedir, retirar, hacer una oferta) y arma su lista de compras. Está hecha con **Vue 3 + Vite**, guarda los datos en **Supabase** y se publica sola en **GitHub Pages**.

## Novedades 2.1
- **Presentaciones y sabores:** cada producto muestra en UNA tarjeta todas sus presentaciones (600 ml, 2 L, 1 kg…) y sabores, con el stock de cada una y el total del producto.
- **Sin duplicados:** si agregas un producto que ya existe (mismo nombre, presentación y sabor, sin importar mayúsculas o acentos), se **suman** sus piezas al existente. Al importar Excel, los repetidos también se suman. La base de datos lo impide además con un índice único.
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
- **Guía rápida** de 5 pasos la primera vez (y siempre en el botón "?").
- **Temas:** Claro, **Niebla** (gris claro), **Grafito** (gris medio), Oscuro y Automático; colores Vice, Neón, Ocaso, Lila, **Océano** y **Bosque**; densidad y animaciones.
- El **valor del inventario** ya no es protagonista: su lugar en el resumen lo ocupa **"Por comprar"**; el valor aparece discreto en Herramientas.
- **Se instala como app** (PWA) en celular y computadora.

## Seguridad
| Dónde | Qué hace |
| --- | --- |
| Cuentas | Correo **real** (enlace de confirmación + bloqueo de correos temporales) y contraseña propia de **mínimo 8 caracteres con letras y números** (revisado en la página y en Supabase). Medidor de fuerza, mostrar/ocultar. |
| Llaves de acceso | Entrar con **huella, rostro o PIN** (passkeys de Supabase). Se agregan, renombran y quitan en *Perfil → Seguridad*. |
| Administración automática | Bloqueo tras 5 intentos fallidos, **cierre por inactividad**, cerrar sesión en otros dispositivos, **revisión automática** de la cuenta y **bitácora de actividad**. La base de datos anota sola borrados, retiros y cambios masivos (no se pueden fingir ni ocultar) y borra la bitácora a los 90 días. |
| Datos | Reglas RLS (cada cuenta solo ve lo suyo), límites en textos y números, **eliminar mi cuenta** (borra todo: derecho de cancelación). |
| Página | **CSP estricta** (sin scripts en línea ni de otros sitios), sin CDNs (librerías y fuentes incluidas), `no-referrer`, anti-iframe, Excel leído en un **Web Worker aislado** con límites, CSV protegido contra fórmulas. |
| GitHub | Workflow **Seguridad** en cada PR (pruebas, `npm audit`, búsqueda de claves secretas, revisión de CSP, CodeQL), **Dependabot** y [`SECURITY.md`](SECURITY.md). |

**Políticas:** [Aviso de Privacidad](src/views/Privacidad.vue) (LFPDPPP, derechos ARCO) y [Términos de Uso](src/views/Terminos.vue). Son plantillas: **llenen los datos entre corchetes** (`[Nombre del responsable]`, `[domicilio]`, `[correo de contacto]`, `[Proveedor de correo]`, `[ciudad y estado]`) y revísenlas con un asesor antes de usarla con clientes reales. Si cambian el texto, suban `VERSION_POLITICAS` en `src/stores/sesion.js` para que se pida aceptarlas de nuevo.

## Cómo calcula sus avisos
- **"Alcanza ~N días"** = piezas en tienda ÷ venta diaria (piezas vendidas en los últimos 7 días ÷ días de historial, mínimo 1). Ej.: Refresco vendió 62 en 7 días → 8.9/día; hay 15 → "~1 día".
- **Semáforo:** urgente = agotado o en su mínimo (o lote caducado); atención = hasta 1.5× el mínimo, ≤ 2 días, o caduca pronto; bien surtido = suficiente.
- **% en riesgo:** productos con alguna alerta ÷ total (verde < 30 %, ámbar 30–59 %, rojo ≥ 60 %).
- **Ofertas:** para cada lote (el que caduca antes primero) se calcula cuánto se venderá antes de su fecha; lo que sobra se oferta.

## Desarrollo local
```bash
npm install
npm run dev        # http://localhost:5173
npm test           # pruebas de la lógica (Vitest)
npm run build      # versión final en dist/
npm run preview    # probar dist/ en http://localhost:4173/ITDHackaton2026/
npm run revisar-seguridad
```
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
4. **Authentication → Emails → Templates → Confirm signup:** pegar [`supabase/plantillas/confirmar.html`](supabase/plantillas/confirmar.html) (correo en español). Asunto: *Confirma tu cuenta de EarlyStock*.
5. Probar: crear una cuenta con un Gmail que no sea del equipo y abrir el enlace.

La página además rechaza correos cuyo dominio no recibe mensajes (por ejemplo, `ana@nadaexiste123.com`). Para eso consulta el DNS de Cloudflare enviando **solo el dominio**.

## Cuenta de administrador
El administrador edita los contactos de soporte en **Admin** (botón del encabezado, solo lo ve él). El correo NO va en el código (el repositorio es público). Para nombrarlo:
1. Ejecutar `supabase/schema.sql` (secciones 14 y 15).
2. En **SQL Editor**, ejecutar una vez (con el correo del administrador):
   ```sql
   insert into public.administradores (email) values ('correo-del-admin@ejemplo.com') on conflict do nothing;
   ```
3. Crear la cuenta en la app con ese correo y su contraseña, y abrir el enlace de confirmación. Solo las cuentas con el correo confirmado tienen permisos de administrador.
4. Entrar: aparece el botón **Admin**. Recomendación: usar una contraseña larga y única y agregar una llave de acceso (huella) en *Perfil → Seguridad*.

Para quitar a un administrador: `delete from public.administradores where email = '…';`

## Configurar Supabase (una sola vez)
1. **SQL:** *SQL Editor → New query →* pegar todo [`supabase/schema.sql`](supabase/schema.sql) → *Run*. Se puede volver a ejecutar sin problema y **hay que hacerlo con cada versión nueva**: la 2.1 agrega presentación, sabor, ofertas, administradores y contactos de soporte. Si avisa "Hay productos repetidos", júntenlos en la app y vuelvan a ejecutarlo.
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
public/                  logo, íconos y prefs.js (tema sin parpadeo + anti-iframe)
src/main.js · App.vue · router.js
src/logica/              cálculos puros (inventario, sugerencias, validación, Excel) con pruebas en tests/
src/lib/                 Supabase, almacén (real y demo), Excel y exportar
src/stores/              sesión, inventario, preferencias, seguridad, avisos, ventanas (Pinia)
src/components/          encabezado, resumen, sugerencias, inventario, tarjetas, tabla, ventanas/…
src/views/               Inicio, Panel, Privacidad, Términos
src/workers/             lector de Excel aislado
src/styles/              temas, base, panel, ventanas e inicio
supabase/schema.sql      tablas, RLS, bitácora, triggers y funciones
.github/                 publicar, seguridad y dependabot
```

## Equipo
Abel, Joto, Marika
