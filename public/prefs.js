/* =====================================================================
 * ANTES DE DIBUJAR LA PÁGINA
 * 1) Anti-iframe ("clickjacking"): si otra página intenta mostrar EarlyStock dentro de un marco para
 *    engañar al usuario, se oculta todo y se intenta abrir la app en su propia ventana.
 * 2) Aplica el tema, color, densidad y animaciones guardados en este dispositivo (sin parpadeo).
 * ===================================================================== */
(function () {
  if (window.top !== window.self) {
    document.documentElement.style.display = 'none'
    try { window.top.location = window.self.location } catch (e) {}
    return
  }
  var r = document.documentElement, p = {}
  try { p = JSON.parse(localStorage.getItem('earlystock.prefs')) || {} } catch (e) {}
  var ok = function (v, lista, d) { return lista.indexOf(v) >= 0 ? v : d }
  r.dataset.theme = ok(p.tema, ['light', 'niebla', 'grafito', 'dark', 'auto'], 'auto')
  r.dataset.accent = ok(p.acento, ['vice', 'neon', 'ocaso', 'lila', 'oceano', 'bosque'], 'vice')
  r.dataset.density = ok(p.densidad, ['comoda', 'compact'], 'comoda')
  r.dataset.motion = ok(p.movimiento, ['on', 'off'], 'on')
})()
