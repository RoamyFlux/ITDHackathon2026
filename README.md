<p align="center"><img src="public/logo.svg" width="96" alt="Logo de EarlyStock"></p>

# EarlyStock 2.0 · Hackathon ITD 2026

**Eje:** Comercio y emprendimiento local
**Problemática:** Control de inventarios en pequeños negocios
**Pregunta:** ¿Cómo podría un negocio pequeño saber que se le está acabando algo?

EarlyStock avisa al dueño de un negocio **antes** de que se le acabe un producto o de que algo caduque, le **sugiere qué hacer** (pedir, retirar, hacer una oferta) y arma su lista de compras. Está hecha con **Vue 3 + Vite**, guarda los datos en **Supabase** y se publica sola en **GitHub Pages**.

## Qué hace
- **Página de inicio para clientes nuevos:** qué resuelve, vista previa animada, cómo funciona en 3 pasos, beneficios, seguridad y **"Probar demo sin registrarse"** (tienda de ejemplo en memoria; no se guarda nada).
- **Sugerencias para hoy y notificaciones:**
  - *Haz una oferta:* si un lote va a caducar antes de venderse (compara venta diaria × días que faltan), propone **2×1 o 30 %** (≤ 2 días), **20 %** (≤ 5 días) o **10 %**, con el precio de oferta, la pérdida que evitas y el **texto listo para WhatsApp**.
  - *Retira lo caducado* · *Pide N paquetes* · *Tienes de más* · *Nadie lo ha comprado en 7 días* · *Tu más vendido*.
  - Campana con contador en el encabezado y **notificaciones del navegador** opcionales (un resumen al día al abrir la app).
- **Semáforo por producto** (urgente, atención, bien surtido) con leyenda "¿Qué significan los colores?", **"Alcanza ~N días"**, barra de nivel y mini gráfica de ventas.
- **Inventario por paquetes** (paquetes × piezas + sueltas; al vender abre paquetes solo) y **caducidad por lote** (se vende primero lo que caduca antes).
- Ventas y llegadas rápidas con vista previa, **Deshacer**, **Retirar caducados** (merma), lista de compras (copiar, WhatsApp, imprimir), ventas de 7 días.
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

## Configurar Supabase (una sola vez)
1. **SQL:** *SQL Editor → New query →* pegar todo [`supabase/schema.sql`](supabase/schema.sql) → *Run* (se puede volver a ejecutar sin problema; agrega la bitácora, triggers, límites y `eliminar_mi_cuenta`).
2. **Conexión:** `config/supabase.json` tiene la *Project URL* y la *publishable key* (públicas). Nunca pongan la *secret key*.
3. **URLs:** *Authentication → URL Configuration*: **Site URL** = `https://roamyflux.github.io/ITDHackaton2026/` y en **Redirect URLs** agregar esa misma y `http://localhost:5173/` (para los enlaces de confirmación y recuperación).
4. **Correos reales:** *Authentication → Sign In / Providers → Email*: activar **Confirm email**.
   El correo integrado de Supabase solo envía a los miembros del proyecto y muy pocos por hora: para clientes reales configuren **SMTP propio** en *Authentication → Emails → SMTP Settings* (por ejemplo Resend o Brevo, tienen plan gratuito) y pongan ese proveedor en el Aviso de Privacidad.
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
