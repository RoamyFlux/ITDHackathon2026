/* =====================================================================
 * SEGURIDAD AUTOMÁTICA
 *   - Actividad reciente: bitácora de la tabla eventos_seguridad (inicios de sesión, cambios de contraseña,
 *     llaves de acceso, importaciones y, anotados solos por la base de datos, borrados, retiros y cambios masivos).
 *   - Revisión automática: una lista de puntos que protegen la cuenta, con su estado.
 *   - Cierre por inactividad: si nadie usa la app N minutos, se cierra la sesión sola.
 * ===================================================================== */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSesion } from './sesion.js'
import { usePreferencias } from './preferencias.js'
import { useAvisos } from './avisos.js'

// Cómo se muestra cada tipo de evento.
export const EVENTOS = {
  inicio_sesion: { t: 'Inicio de sesión', i: 'user' },
  cierre_sesion: { t: 'Sesión cerrada', i: 'logout' },
  cierre_otros: { t: 'Sesión cerrada en otros dispositivos', i: 'logout' },
  cuenta_creada: { t: 'Cuenta creada', i: 'spark' },
  contrasena_cambiada: { t: 'Contraseña cambiada', i: 'lock' },
  llave_agregada: { t: 'Llave de acceso agregada', i: 'key' },
  llave_borrada: { t: 'Llave de acceso quitada', i: 'key' },
  importacion: { t: 'Importación de Excel', i: 'upload' },
  exportacion: { t: 'Exportación de inventario', i: 'download' },
  borrado: { t: 'Productos eliminados', i: 'trash' },
  retiro: { t: 'Caducados retirados', i: 'clock' },
  cambio_masivo: { t: 'Cambio masivo de productos', i: 'layers' }
}

export const useSeguridad = defineStore('seguridad', () => {
  const sesion = useSesion()
  const prefsStore = usePreferencias()
  const avisos = useAvisos()
  const eventos = ref([])
  const errorEventos = ref('')

  async function cargarEventos () {
    errorEventos.value = ''
    try { eventos.value = await sesion.almacen.leerEventos() } catch (e) {
      eventos.value = []
      errorEventos.value = /does not exist|relation|schema cache/i.test((e && e.message) || '')
        ? 'Para ver la actividad, ejecuta de nuevo supabase/schema.sql en Supabase (crea la bitácora).'
        : 'No se pudo cargar la actividad.'
    }
  }

  // Revisión automática: cada punto dice si está bien y cómo arreglarlo.
  const revision = computed(() => [
    { id: 'correo', ok: sesion.esDemo || sesion.correoConfirmado, t: 'Correo confirmado', d: 'Tu correo es real y puedes recuperar tu cuenta si olvidas la contraseña.' },
    { id: 'llave', ok: sesion.passkeys.length > 0, t: 'Llave de acceso', d: sesion.passkeys.length ? 'Puedes entrar con tu huella, rostro o PIN.' : 'Agrega una para entrar con tu huella o rostro, sin escribir contraseña.' },
    { id: 'inactividad', ok: prefsStore.prefs.inactividad > 0, t: 'Cierre por inactividad', d: prefsStore.prefs.inactividad > 0 ? `La sesión se cierra sola tras ${prefsStore.prefs.inactividad} min sin uso.` : 'Actívalo si alguien más usa este dispositivo.' },
    { id: 'conexion', ok: location.protocol === 'https:' || location.hostname === 'localhost', t: 'Conexión cifrada (https)', d: 'Lo que envías viaja cifrado entre tu dispositivo y el servidor.' }
  ])
  const puntaje = computed(() => revision.value.filter(r => r.ok).length)

  /* ---- Cierre por inactividad ----
   * Cualquier toque, tecla o movimiento reinicia la cuenta. Se revisa cada 30 s. */
  let ultimo = Date.now()
  let iniciado = false
  function vigilarInactividad () {
    if (iniciado) return
    iniciado = true
    const actividad = () => { ultimo = Date.now() }
    ;['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(ev => addEventListener(ev, actividad, { passive: true }))
    setInterval(async () => {
      const min = prefsStore.prefs.inactividad
      if (!min || !sesion.dentro || sesion.esDemo) { ultimo = Date.now(); return }
      if (Date.now() - ultimo > min * 60000) {
        ultimo = Date.now()
        await sesion.salir(`Por inactividad (${min} min)`)
        avisos.avisar(`Cerramos tu sesión porque no se usó en ${min} minutos. Vuelve a entrar cuando quieras.`, 'ok')
      }
    }, 30000)
  }

  return { eventos, errorEventos, cargarEventos, revision, puntaje, vigilarInactividad }
})
