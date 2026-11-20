/* =====================================================================
 * SESIÓN Y CUENTA
 * Maneja todo lo de la cuenta: entrar (contraseña o llave de acceso), crear cuenta con correo real,
 * confirmar correo, recuperar contraseña, perfil, llaves de acceso, aceptar políticas, salir y borrar cuenta.
 * modo:
 *   'cargando' -> aún se revisa si hay sesión      'fuera' -> sin sesión (se ve la página de inicio)
 *   'dentro'   -> con cuenta real (Supabase)       'demo'  -> demostración en memoria (sin cuenta)
 * ===================================================================== */
import { defineStore } from 'pinia'
import { ref, computed, shallowRef } from 'vue'
import { sb, configurado, urlRegreso, BUCKET_FOTOS } from '../lib/supabase.js'
import { almacenSupabase, crearAlmacenDemo } from '../lib/almacen.js'
import { validarContrasena, validarCorreo, esperaTrasFallos } from '../logica/validacion.js'
import { dominioRecibeCorreo } from '../lib/correo.js'
import { usePreferencias } from './preferencias.js'

// Versión de los Términos y el Aviso de Privacidad. Si cambian, súbela: se pedirá aceptarlos otra vez.
export const VERSION_POLITICAS = '2026-11b' // 2026-11b: se agregaron los planes y pagos a los Términos

// Mensajes de Supabase (en inglés) -> mensajes claros en español.
export function msgAuth (e) {
  const m = (e && (e.message || e.code)) || ''
  if (/Invalid login/i.test(m)) return 'Correo o contraseña incorrectos.'
  if (/already registered|already exists/i.test(m)) return 'Ese correo ya tiene cuenta. Entra o recupera tu contraseña.'
  if (/Email not confirmed/i.test(m)) return 'Primero confirma tu correo: abre el enlace que te enviamos.'
  if (/over_email_send_rate|email rate limit/i.test(m)) return 'Se alcanzó el límite de correos por hora del servidor. Intenta más tarde (el administrador debe configurar un servicio de correo propio, ver README).'
  if (/Error sending confirmation|sending.*email|smtp/i.test(m)) return 'No se pudo enviar el correo de confirmación. Avísale al administrador (falta configurar el servicio de correo).'
  if (/email.*invalid|invalid.*email|email_address_invalid/i.test(m)) return 'Ese correo no es válido o no puede recibir mensajes.'
  if (/rate limit|too many/i.test(m)) return 'Demasiados intentos. Espera unos minutos y vuelve a intentar.'
  if (/weak|pwned|password should/i.test(m)) return 'Esa contraseña es muy débil o aparece en filtraciones conocidas. Elige otra.'
  if (/same.*password|different from the old/i.test(m)) return 'La contraseña nueva debe ser distinta a la anterior.'
  if (/not allowed|disposable|signups not allowed/i.test(m)) return 'No se pudo crear la cuenta con ese correo. Usa tu correo real.'
  if (/NotAllowedError|aborted|cancel/i.test(m)) return 'Se canceló la llave de acceso.'
  if (/passkey|webauthn/i.test(m)) return 'No se pudo usar la llave de acceso en este dispositivo. Entra con tu contraseña.'
  if (/fetch|network/i.test(m)) return 'Sin conexión. Revisa tu internet.'
  return m || 'No se pudo conectar. Revisa tu internet.'
}

// Intentos fallidos por correo (solo en este dispositivo). Se guarda una huella del correo, no el correo.
const CLAVE_FALLOS = 'earlystock.intentos'
const huella = s => { let h = 0; for (const c of s.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) | 0; return 'h' + (h >>> 0).toString(36) }
function leerFallos () { try { return JSON.parse(localStorage.getItem(CLAVE_FALLOS)) || {} } catch (e) { return {} } }
function guardarFallos (f) { try { localStorage.setItem(CLAVE_FALLOS, JSON.stringify(f)) } catch (e) {} }

// "Chrome en Android", "Safari en iPhone"… para la actividad de seguridad (sin guardar datos de más).
export function dispositivo () {
  const ua = navigator.userAgent
  const nav = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Navegador'
  const so = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'otro sistema'
  return `${nav} en ${so}`
}

export const useSesion = defineStore('sesion', () => {
  const modo = ref('cargando')
  const usuario = shallowRef(null)
  const recuperando = ref(false) // volvió desde el correo para crear una contraseña nueva
  const passkeys = ref([])
  const almacen = shallowRef(null)
  const prefsStore = usePreferencias()
  let listo
  const listoPromesa = new Promise(r => { listo = r })

  const dentro = computed(() => modo.value === 'dentro' || modo.value === 'demo')
  const esDemo = computed(() => modo.value === 'demo')
  const meta = computed(() => (usuario.value && usuario.value.user_metadata) || {})
  const perfil = computed(() => ({
    negocio: meta.value.negocio || '',
    avatar: meta.value.avatar_url || null,
    email: (usuario.value && usuario.value.email) || ''
  }))
  const correoConfirmado = computed(() => !!(usuario.value && (usuario.value.email_confirmed_at || usuario.value.confirmed_at)))
  const debeAceptarPoliticas = computed(() => modo.value === 'dentro' && meta.value.acepto_politicas !== VERSION_POLITICAS)
  // Las llaves de acceso necesitan un navegador moderno (WebAuthn) y una conexión segura (https).
  const soportaPasskeys = typeof window !== 'undefined' && !!window.PublicKeyCredential && window.isSecureContext

  // Registra en la bitácora de seguridad sin detener la app si falla (por ejemplo, si falta la tabla).
  function registrarEvento (tipo, detalle) {
    if (almacen.value) almacen.value.registrarEvento(tipo, detalle).catch(() => {})
  }

  function aplicarSesion (s) {
    if (modo.value === 'demo') return
    usuario.value = s ? s.user : null
    if (s) {
      if (almacen.value !== almacenSupabase) almacen.value = almacenSupabase
      if (modo.value !== 'dentro' && s.user.user_metadata && s.user.user_metadata.prefs) prefsStore.aplicarDeCuenta(s.user.user_metadata.prefs)
      modo.value = 'dentro'
    } else {
      almacen.value = null
      passkeys.value = []
      modo.value = 'fuera'
    }
  }

  /* ---- ARRANQUE ----
   * onAuthStateChange avisa cuando alguien entra, sale, renueva la sesión o vuelve del correo de recuperación. */
  function iniciar () {
    prefsStore.conectarCuenta(async p => {
      if (modo.value !== 'dentro') return
      const r = await sb.auth.updateUser({ data: { prefs: p } })
      if (!r.error) usuario.value = r.data.user
    })
    if (!sb) { modo.value = 'fuera'; listo(); return }
    // Por si el aviso de recuperación llega antes de empezar a escuchar.
    if (/type=recovery/.test(location.hash + location.search)) recuperando.value = true
    sb.auth.onAuthStateChange((evento, s) => {
      if (evento === 'PASSWORD_RECOVERY') recuperando.value = true
      // No se llama a Supabase directamente aquí dentro (recomendación de supabase-js): se difiere.
      setTimeout(() => { aplicarSesion(s); listo() }, 0)
    })
    sb.auth.getSession().then(r => { aplicarSesion(r.data.session); listo() }).catch(() => { modo.value = 'fuera'; listo() })
  }

  /* ---- ENTRAR CON CONTRASEÑA ----
   * Tras 5 intentos fallidos con el mismo correo hay que esperar (ver logica/validacion.js). */
  function esperaPara (email) {
    const f = leerFallos()[huella(email)]
    return f ? esperaTrasFallos(f.n, f.t) : 0
  }
  async function entrar (email, password) {
    email = email.trim().toLowerCase()
    const espera = esperaPara(email)
    if (espera > 0) throw new Error(`Demasiados intentos fallidos. Por seguridad espera ${Math.ceil(espera / 60000)} min y vuelve a intentar, o recupera tu contraseña.`)
    const r = await sb.auth.signInWithPassword({ email, password })
    const fallos = leerFallos()
    const k = huella(email)
    if (r.error) {
      if (/Invalid login/i.test(r.error.message)) { fallos[k] = { n: ((fallos[k] && fallos[k].n) || 0) + 1, t: Date.now() }; guardarFallos(fallos) }
      const quedan = 5 - ((fallos[k] && fallos[k].n) || 0)
      throw new Error(msgAuth(r.error) + (quedan > 0 && quedan <= 2 ? ` Te quedan ${quedan} intento${quedan === 1 ? '' : 's'}.` : ''))
    }
    delete fallos[k]; guardarFallos(fallos)
    almacen.value = almacenSupabase
    registrarEvento('inicio_sesion', `Con contraseña · ${dispositivo()}`)
  }

  /* ---- LLAVES DE ACCESO (passkeys) ----
   * Usan la huella, el rostro o el PIN del dispositivo. La llave privada nunca sale del dispositivo:
   * no hay contraseña que se pueda robar o adivinar. Funciona después de agregar una llave en Seguridad. */
  async function entrarConLlave () {
    const r = await sb.auth.signInWithPasskey()
    if (r.error) throw new Error(msgAuth(r.error))
    almacen.value = almacenSupabase
    registrarEvento('inicio_sesion', `Con llave de acceso · ${dispositivo()}`)
  }
  async function cargarPasskeys () {
    if (modo.value !== 'dentro') return
    const r = await sb.auth.passkey.list()
    if (!r.error) passkeys.value = r.data || []
    return r.error
  }
  async function agregarPasskey () {
    const r = await sb.auth.registerPasskey()
    if (r.error) throw new Error(msgAuth(r.error))
    const nombre = `Llave de ${dispositivo()}`
    if (r.data && r.data.id) await sb.auth.passkey.update({ passkeyId: r.data.id, friendlyName: nombre })
    registrarEvento('llave_agregada', nombre)
    await cargarPasskeys()
  }
  async function renombrarPasskey (id, nombre) {
    const r = await sb.auth.passkey.update({ passkeyId: id, friendlyName: nombre.trim().slice(0, 120) })
    if (r.error) throw new Error(msgAuth(r.error))
    await cargarPasskeys()
  }
  async function borrarPasskey (id) {
    const r = await sb.auth.passkey.delete({ passkeyId: id })
    if (r.error) throw new Error(msgAuth(r.error))
    registrarEvento('llave_borrada', 'Se quitó una llave de acceso')
    await cargarPasskeys()
  }

  /* ---- CREAR CUENTA ----
   * 1) Se revisa correo (formato y que no sea temporal) y contraseña (8+, letras y números) aquí y en Supabase.
   * 2) Supabase envía un correo con un enlace: hasta abrirlo no se puede entrar (así se comprueba que es real).
   * 3) Se guarda que aceptó los Términos y el Aviso de Privacidad (versión y fecha). */
  async function registrar ({ email, password, negocio }) {
    const vc = validarCorreo(email)
    if (!vc.ok) throw new Error(vc.motivo)
    if (!validarContrasena(password).ok) throw new Error('La contraseña debe tener al menos 8 caracteres, letras y números.')
    // El dominio debe recibir correo (si no se puede revisar, se sigue: el enlace de confirmación lo comprueba).
    if (await dominioRecibeCorreo(email.split('@')[1]) === 'no') throw new Error('Ese correo no existe: su dominio no recibe mensajes. Revisa que esté bien escrito.')
    const r = await sb.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: urlRegreso(),
        data: { negocio: String(negocio || '').trim().slice(0, 60), acepto_politicas: VERSION_POLITICAS, acepto_fecha: new Date().toISOString() }
      }
    })
    if (r.error) throw new Error(msgAuth(r.error))
    // Correo ya registrado: por seguridad Supabase no lo dice (para que nadie averigüe qué correos tienen cuenta)
    // y devuelve un usuario sin "identities". Se avisa de forma neutral.
    if (r.data.user && Array.isArray(r.data.user.identities) && r.data.user.identities.length === 0) {
      throw new Error('Si ese correo ya tiene cuenta, entra o usa "¿Olvidaste tu contraseña?".')
    }
    // Si Supabase NO pide confirmar el correo, entra directo. (Recomendado: activar "Confirm email", ver README.)
    if (r.data.session) { almacen.value = almacenSupabase; registrarEvento('cuenta_creada', dispositivo()) }
    return { pendiente: !r.data.session }
  }
  async function reenviarConfirmacion (email) {
    const r = await sb.auth.resend({ type: 'signup', email: email.trim().toLowerCase(), options: { emailRedirectTo: urlRegreso() } })
    if (r.error) throw new Error(msgAuth(r.error))
  }
  async function recuperar (email) {
    const vc = validarCorreo(email)
    if (!vc.ok) throw new Error(vc.motivo)
    const r = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: urlRegreso() })
    if (r.error) throw new Error(msgAuth(r.error))
  }
  async function cambiarContrasena (password) {
    if (!validarContrasena(password).ok) throw new Error('La contraseña debe tener al menos 8 caracteres, letras y números.')
    const r = await sb.auth.updateUser({ password })
    if (r.error) throw new Error(msgAuth(r.error))
    recuperando.value = false
    registrarEvento('contrasena_cambiada', dispositivo())
  }

  /* ---- PERFIL ---- (en demo solo se cambia en memoria) */
  async function actualizarMeta (data) {
    if (esDemo.value) { usuario.value = { ...usuario.value, user_metadata: { ...meta.value, ...data } }; return }
    const r = await sb.auth.updateUser({ data })
    if (r.error) throw new Error(msgAuth(r.error))
    usuario.value = r.data.user
  }
  const aceptarPoliticas = () => actualizarMeta({ acepto_politicas: VERSION_POLITICAS, acepto_fecha: new Date().toISOString() })

  // Sube la foto (ya recortada a JPG) a avatars/<id>/avatar.jpg y guarda su dirección en la cuenta.
  async function subirFoto (blob) {
    if (esDemo.value) return actualizarMeta({ avatar_url: URL.createObjectURL(blob) })
    const ruta = `${usuario.value.id}/avatar.jpg`
    const up = await sb.storage.from(BUCKET_FOTOS).upload(ruta, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' })
    if (up.error) throw up.error
    await actualizarMeta({ avatar_url: sb.storage.from(BUCKET_FOTOS).getPublicUrl(ruta).data.publicUrl + '?v=' + Date.now() })
  }
  async function quitarFoto () {
    if (!esDemo.value) await sb.storage.from(BUCKET_FOTOS).remove([`${usuario.value.id}/avatar.jpg`])
    await actualizarMeta({ avatar_url: null })
  }

  /* ---- MODO DEMOSTRACIÓN ---- sin cuenta y sin internet: todo vive en memoria. */
  function entrarDemo () {
    almacen.value = crearAlmacenDemo()
    usuario.value = { id: 'demo', email: 'demo@earlystock.app', user_metadata: { negocio: 'Abarrotes La Esquina' } }
    modo.value = 'demo'
    registrarEvento('inicio_sesion', `Demostración · ${dispositivo()}`)
  }

  /* ---- SALIR ----
   * scope 'local'  -> solo este dispositivo.   scope 'others' -> todos los demás (este sigue dentro). */
  async function salir (motivo = '') {
    if (esDemo.value) { almacen.value = null; usuario.value = null; modo.value = 'fuera'; return }
    if (motivo) registrarEvento('cierre_sesion', motivo)
    if (sb) await sb.auth.signOut({ scope: 'local' })
  }
  async function salirDeOtros () {
    const r = await sb.auth.signOut({ scope: 'others' })
    if (r.error) throw new Error(msgAuth(r.error))
    registrarEvento('cierre_otros', 'Se cerró la sesión en los demás dispositivos')
  }

  /* ---- ELIMINAR MI CUENTA (derecho de cancelación) ----
   * Borra la foto y llama a la función eliminar_mi_cuenta() de schema.sql, que borra la cuenta y,
   * en cascada, todos sus productos, lotes, ventas y bitácora. No se puede deshacer. */
  async function eliminarCuenta () {
    if (esDemo.value) return salir()
    await sb.storage.from(BUCKET_FOTOS).remove([`${usuario.value.id}/avatar.jpg`]).catch(() => {})
    const r = await sb.rpc('eliminar_mi_cuenta')
    if (r.error) throw new Error(/function|not find/i.test(r.error.message) ? 'Falta actualizar la base de datos: ejecuta de nuevo supabase/schema.sql.' : msgAuth(r.error))
    await sb.auth.signOut({ scope: 'local' }).catch(() => {})
    aplicarSesion(null)
  }

  return {
    modo, usuario, recuperando, passkeys, almacen, listoPromesa, configurado,
    dentro, esDemo, perfil, correoConfirmado, debeAceptarPoliticas, soportaPasskeys,
    iniciar, entrar, esperaPara, entrarConLlave, cargarPasskeys, agregarPasskey, renombrarPasskey, borrarPasskey,
    registrar, reenviarConfirmacion, recuperar, cambiarContrasena, actualizarMeta, aceptarPoliticas, subirFoto, quitarFoto,
    entrarDemo, salir, salirDeOtros, eliminarCuenta, registrarEvento
  }
})
