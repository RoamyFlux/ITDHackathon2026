/* =====================================================================
 * VALIDACIÓN DE CUENTAS: correos reales y contraseñas seguras
 * Se revisa aquí (al escribir) para dar ayuda inmediata, y TAMBIÉN en Supabase (servidor),
 * porque lo que se revisa en el navegador se puede saltar. Ver README: "Contraseñas" y "Auth Hook".
 * ===================================================================== */

/* ---- Contraseñas ----
 * Reglas obligatorias: mínimo 8 caracteres, al menos una letra y al menos un número.
 * Además se calcula una "fuerza" (0 a 4) solo como guía visual. */
export const REGLAS_CONTRASENA = [
  { id: 'largo', texto: 'Mínimo 8 caracteres', ok: c => c.length >= 8 },
  { id: 'letra', texto: 'Al menos una letra', ok: c => /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(c) },
  { id: 'numero', texto: 'Al menos un número', ok: c => /\d/.test(c) }
]

// Contraseñas tan comunes que se rechazan aunque cumplan las reglas (son las primeras que prueba un atacante).
const COMUNES = new Set(['password1', 'contrasena1', 'qwerty123', 'abc12345', 'abcd1234', 'a1234567', '12345678a', 'password123', 'admin123', 'usuario1', 'mexico123', 'tienda123'])

export function validarContrasena (c = '') {
  const reglas = REGLAS_CONTRASENA.map(r => ({ id: r.id, texto: r.texto, ok: r.ok(c) }))
  const comun = COMUNES.has(c.toLowerCase())
  const ok = reglas.every(r => r.ok) && !comun && c.length <= 72 // 72 = límite de Supabase (bcrypt)
  // Fuerza: suma puntos por largo y por variedad de caracteres.
  let fuerza = 0
  if (c.length >= 8) fuerza++
  if (c.length >= 12) fuerza++
  if (/[a-z]/.test(c) && /[A-Z]/.test(c)) fuerza++
  if (/[^A-Za-z0-9]/.test(c)) fuerza++
  if (!ok) fuerza = Math.min(fuerza, 1)
  const nivel = ['Muy débil', 'Débil', 'Aceptable', 'Fuerte', 'Muy fuerte'][fuerza]
  return { ok, reglas, comun, fuerza, nivel }
}

/* ---- Correos ----
 * 1) Formato válido (algo@dominio.ext).
 * 2) Se bloquean dominios de correos "desechables" (temporales), que se usan para crear cuentas falsas.
 * 3) La prueba definitiva de que el correo es real es el ENLACE DE CONFIRMACIÓN que manda Supabase:
 *    sin confirmarlo no se puede entrar (opción "Confirm email" activada, ver README). */
export const DOMINIOS_DESECHABLES = [
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'sharklasers.com', '10minutemail.com', '10minutemail.net',
  'tempmail.com', 'temp-mail.org', 'temp-mail.io', 'tempmail.net', 'throwawaymail.com', 'yopmail.com', 'yopmail.net',
  'getnada.com', 'nada.email', 'trashmail.com', 'trashmail.de', 'dispostable.com', 'maildrop.cc', 'mintemail.com',
  'fakeinbox.com', 'mailnesia.com', 'mohmal.com', 'emailondeck.com', 'tempail.com', 'tempr.email', 'discard.email',
  'spamgourmet.com', 'mytemp.email', 'burnermail.io', 'mailcatch.com', 'inboxkitten.com', 'moakt.com', 'tmail.ws',
  'tmpmail.org', 'tmpmail.net', 'emailfake.com', 'fakemail.net', 'luxusmail.org', 'mail.tm', 'linshiyouxiang.net'
]
const DESECHABLES = new Set(DOMINIOS_DESECHABLES)

// Errores típicos de dedo en dominios populares -> sugerencia ("¿Quisiste decir gmail.com?").
const TYPOS = { 'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'hotmial.com': 'hotmail.com', 'outlok.com': 'outlook.com', 'yaho.com': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'icloud.con': 'icloud.com' }

export function validarCorreo (correo = '') {
  const c = correo.trim().toLowerCase()
  if (!c) return { ok: false, motivo: 'Escribe tu correo.' }
  if (c.length > 254 || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(c)) return { ok: false, motivo: 'El correo no tiene un formato válido.' }
  const dominio = c.split('@')[1]
  if (DESECHABLES.has(dominio) || [...DESECHABLES].some(d => dominio.endsWith('.' + d))) {
    return { ok: false, motivo: 'No se permiten correos temporales. Usa tu correo real (te enviaremos un enlace para confirmarlo).' }
  }
  if (TYPOS[dominio]) return { ok: true, sugerencia: c.replace(/@.*/, '@' + TYPOS[dominio]) }
  return { ok: true }
}

/* ---- Bloqueo por intentos fallidos ----
 * Después de 5 intentos fallidos de inicio de sesión con el mismo correo, se espera 5 minutos
 * (cada intento extra suma 1 minuto). Supabase además limita intentos en su servidor. */
export const MAX_INTENTOS = 5
export function esperaTrasFallos (fallos, ultimo, ahora = Date.now()) {
  if (fallos < MAX_INTENTOS) return 0
  const espera = (5 + (fallos - MAX_INTENTOS)) * 60000
  return Math.max(0, ultimo + espera - ahora)
}
