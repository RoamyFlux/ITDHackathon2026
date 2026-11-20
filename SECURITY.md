# Política de seguridad de EarlyStock

## Cómo reportar una falla

Si encuentras una vulnerabilidad, **no abras un issue público**. Repórtala de forma privada en GitHub:
**[Security → Report a vulnerability](https://github.com/RoamyFlux/ITDHackaton2026/security/advisories/new)**. Incluye:

- qué encontraste y cómo reproducirlo,
- qué impacto crees que tiene.

Responderemos en un máximo de 5 días hábiles. Pedimos no acceder a datos de otras personas ni afectar el servicio mientras investigas.

> Para el equipo: el reporte privado se activa una vez en *Settings → Code security → Private vulnerability reporting → Enable*.

## Versiones con soporte

Solo la versión publicada en `main` (la que está en GitHub Pages) recibe correcciones de seguridad.

## Cómo está protegida la app

| Capa | Protección |
| --- | --- |
| Datos | Reglas RLS en Supabase: cada cuenta solo lee y escribe sus filas. `anon` (sin sesión) no tiene permisos sobre las tablas del inventario, la bitácora, las ofertas ni las suscripciones; solo puede leer los contactos de soporte **activos** (para la página de inicio) y preguntar `es_admin()` (responde "no"). Límites (`check`) en textos y números. |
| Cuentas | Correo confirmado, contraseñas de 8+ con letras y números, bloqueo de correos temporales, llaves de acceso (passkeys), bloqueo tras 5 intentos, cierre por inactividad, cerrar sesión en otros dispositivos. |
| Planes | Los límites de productos y ofertas los aplica la base con triggers (también al cambiar la fecha de una oferta). El plan vence con la fecha de México. Nadie puede cambiarse el plan: solo el administrador con `admin_asignar_plan()`. Las funciones internas (`plan_de`, `limite_*`) no se pueden llamar desde la app. |
| Administración | Las funciones de admin (`admin_usuarios`, `admin_asignar_plan`) y la edición de contactos solo responden a correos de la tabla `administradores` con el correo **confirmado**. La lista de administradores no se puede leer ni cambiar desde la app. |
| Auditoría | Tabla `eventos_seguridad`: la app anota inicios de sesión y cambios; la base anota sola borrados, retiros, cambios masivos y cambios de plan (no se pueden fingir ni borrar desde la app). Al registrar actividad nueva se borran los eventos de esa cuenta con más de 90 días. |
| Archivos | Bucket `avatars`: cada cuenta solo sube, cambia y borra fotos dentro de su propia carpeta (`<id>/…`). Las fotos de perfil se pueden ver con su enlace. |
| Página | CSP estricta (`script-src 'self'`, sin scripts en línea, sin CDNs), `no-referrer`, Excel leído en un Web Worker aislado con límites, CSV protegido contra fórmulas, sin `v-html`. Anti-iframe con `public/prefs.js`: GitHub Pages no permite enviar el encabezado `frame-ancestors`, así que la protección depende de ese script (con un dominio propio detrás de Cloudflare se puede agregar el encabezado). |
| Código | Workflow "Seguridad" en cada PR: pruebas, recorridos en navegador, `npm audit`, búsqueda de claves secretas (incluido el JWT `service_role`), revisión de CSP y CodeQL del código y de los workflows. Acciones fijadas por commit. Dependabot semanal. |

## Claves

La `publishable key` de Supabase (`config/supabase.json`) es pública por diseño. **Nunca** se debe subir la `secret key` ni la `service_role key`; el workflow lo revisa.
