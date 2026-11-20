/* =====================================================================
 * NOTIFICACIONES DEL NAVEGADOR
 * En Chrome para Android "new Notification()" no existe (da error): ahí se usa el service worker de la app
 * (registration.showNotification). En computadora se usa el método normal como respaldo.
 * Devuelve true si se mostró.
 * ===================================================================== */
export async function notificar (titulo, opciones = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null
    if (reg && reg.showNotification) { await reg.showNotification(titulo, opciones); return true }
  } catch (e) { /* sin service worker: se intenta abajo */ }
  try { new Notification(titulo, opciones); return true } catch (e) { return false } // eslint-disable-line no-new
}
