# Política de seguridad de EarlyStock

## Cómo reportar una falla

Si encuentras una vulnerabilidad, **no abras un issue público**. Escribe a **[correo de contacto]** con:

- qué encontraste y cómo reproducirlo,
- qué impacto crees que tiene.

Responderemos en un máximo de 5 días hábiles. Pedimos no acceder a datos de otras personas ni afectar el servicio mientras investigas.

## Cómo está protegida la app

| Capa | Protección |
| --- | --- |
| Datos | Reglas RLS en Supabase: cada cuenta solo lee y escribe sus filas. `anon` no tiene acceso. Límites (`check`) en textos y números. |
| Cuentas | Correo confirmado, contraseñas de 8+ con letras y números, bloqueo de correos temporales, llaves de acceso (passkeys), bloqueo tras 5 intentos, cierre por inactividad, cerrar sesión en otros dispositivos. |
| Auditoría | Tabla `eventos_seguridad`: la app anota inicios de sesión y cambios; la base anota sola borrados, retiros y cambios masivos (no se pueden fingir ni borrar desde la app). Limpieza a los 90 días. |
| Página | CSP estricta (`script-src 'self'`, sin scripts en línea, sin CDNs), `no-referrer`, protección anti-iframe, Excel leído en un Web Worker aislado con límites, CSV protegido contra fórmulas, sin `v-html`. |
| Código | Workflow "Seguridad" en cada PR: pruebas, `npm audit`, búsqueda de claves secretas, revisión de CSP y CodeQL. Dependabot semanal. |

## Claves

La `publishable key` de Supabase (`config/supabase.json`) es pública por diseño. **Nunca** se debe subir la `secret key` ni la `service_role key`; el workflow lo revisa.
