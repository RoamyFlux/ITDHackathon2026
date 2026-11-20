/* =====================================================================
 * CONEXIÓN CON SUPABASE
 * Los datos de conexión están en config/supabase.json (son PÚBLICOS por diseño: la seguridad real la dan
 * las reglas RLS de supabase/schema.sql). Se pueden cambiar sin tocar código con variables de entorno:
 *   VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY (ver .env.example).
 * NUNCA uses aquí la "secret key" ni la "service_role key": darían acceso total a la base de datos.
 * ===================================================================== */
import { createClient } from '@supabase/supabase-js'
import config from '../../config/supabase.json'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || config.url
const CLAVE_PUBLICA = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || config.publishableKey

// "configurado" es falso si siguen los textos de ejemplo: entonces la app avisa en lugar de fallar.
export const configurado = /^https:\/\//.test(SUPABASE_URL || '') && !!CLAVE_PUBLICA && !CLAVE_PUBLICA.startsWith('TU_')

// Protección extra: si alguien pega por error una clave secreta, la app se niega a usarla.
if (/^sb_secret_|service_role/.test(CLAVE_PUBLICA || '')) {
  throw new Error('Se configuró una clave SECRETA de Supabase en la página. Usa solo la publishable key.')
}

/* Opciones de sesión:
 *   flowType 'pkce'      -> los enlaces de correo (confirmar cuenta, recuperar contraseña) regresan con un
 *                           código de un solo uso en lugar del token completo en la dirección (más seguro).
 *   persistSession       -> la sesión se recuerda al recargar la página.
 *   autoRefreshToken     -> el permiso de sesión se renueva solo antes de vencer.
 *   detectSessionInUrl   -> al volver desde el correo, se lee el código de la dirección y se inicia sesión.
 * Las llaves de acceso (passkeys) ya vienen activadas en esta versión de supabase-js. */
export const sb = configurado
  ? createClient(SUPABASE_URL, CLAVE_PUBLICA, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  })
  : null

// Carpeta (bucket) de Supabase Storage para las fotos de perfil.
export const BUCKET_FOTOS = 'avatars'

// Dirección a la que regresan los enlaces de los correos (la página principal de la app).
export const urlRegreso = () => location.origin + location.pathname
