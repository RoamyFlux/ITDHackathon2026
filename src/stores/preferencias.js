/* =====================================================================
 * PREFERENCIAS (Configuración)
 * Se guardan en este dispositivo (localStorage) y, con sesión, en la cuenta (user_metadata.prefs),
 * así se aplican también en otros dispositivos.
 * Se reflejan como atributos data-* en <html>; el CSS cambia solo (ver styles/temas.css).
 *   tema        light (Claro) · niebla (gris claro) · grafito (gris medio) · dark (Oscuro) · auto
 *   acento      vice · neon · ocaso · lila · oceano · bosque
 *   densidad    comoda · compact        movimiento  on · off
 *   diasAviso   días antes de la caducidad para avisar
 *   vista       tarjetas · tabla
 *   inactividad minutos sin usar la app para cerrar sesión solo (0 = nunca)
 *   notificaciones  avisos del navegador (resumen una vez al día al abrir)
 * ===================================================================== */
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const CLAVE_PREFS = 'earlystock.prefs'
export const PREFS_DEF = { tema: 'auto', acento: 'vice', densidad: 'comoda', movimiento: 'on', diasAviso: 7, vista: 'tarjetas', inactividad: 30, notificaciones: false }
export const TEMAS = [
  { v: 'light', t: 'Claro', icono: 'sun' },
  { v: 'niebla', t: 'Niebla', icono: 'cloud' },
  { v: 'grafito', t: 'Grafito', icono: 'layers' },
  { v: 'dark', t: 'Oscuro', icono: 'moon' },
  { v: 'auto', t: 'Automático', icono: 'monitor' }
]
export const ACENTOS = [
  { v: 'vice', t: 'Vice' }, { v: 'neon', t: 'Neón' }, { v: 'ocaso', t: 'Ocaso' },
  { v: 'lila', t: 'Lila' }, { v: 'oceano', t: 'Océano' }, { v: 'bosque', t: 'Bosque' }
]
const VALIDOS = {
  tema: TEMAS.map(x => x.v), acento: ACENTOS.map(x => x.v), densidad: ['comoda', 'compact'],
  movimiento: ['on', 'off'], vista: ['tarjetas', 'tabla']
}

// Limpia lo que venga de localStorage o de la cuenta: solo valores conocidos (nada raro llega al HTML).
export function limpiarPrefs (p = {}) {
  const r = { ...PREFS_DEF }
  for (const k of Object.keys(VALIDOS)) if (VALIDOS[k].includes(p[k])) r[k] = p[k]
  if (Number.isInteger(+p.diasAviso) && +p.diasAviso >= 1 && +p.diasAviso <= 60) r.diasAviso = +p.diasAviso
  if ([0, 15, 30, 60, 120].includes(+p.inactividad)) r.inactividad = +p.inactividad
  r.notificaciones = p.notificaciones === true
  return r
}

function leerLocal () {
  try { return limpiarPrefs(JSON.parse(localStorage.getItem(CLAVE_PREFS)) || {}) } catch (e) { return { ...PREFS_DEF } }
}

export const usePreferencias = defineStore('preferencias', () => {
  const prefs = ref(leerLocal())
  let alGuardarEnCuenta = null // la pone el store de sesión (para no depender uno del otro)

  // Aplica a <html> y guarda en este dispositivo cada vez que algo cambia.
  watch(prefs, p => {
    const r = document.documentElement
    r.dataset.theme = p.tema
    r.dataset.accent = p.acento
    r.dataset.density = p.densidad
    r.dataset.motion = p.movimiento
    try { localStorage.setItem(CLAVE_PREFS, JSON.stringify(p)) } catch (e) {}
  }, { deep: true, immediate: true })

  // Cambia una preferencia y (con sesión) la guarda en la cuenta 0.7 s después del último cambio.
  let t = null
  function cambiar (k, v) {
    prefs.value = limpiarPrefs({ ...prefs.value, [k]: v })
    clearTimeout(t)
    t = setTimeout(() => alGuardarEnCuenta && alGuardarEnCuenta(prefs.value), 700)
  }
  const aplicarDeCuenta = p => { if (p) prefs.value = limpiarPrefs({ ...prefs.value, ...p }) }
  const restablecer = () => { prefs.value = { ...PREFS_DEF }; alGuardarEnCuenta && alGuardarEnCuenta(prefs.value) }
  const conectarCuenta = fn => { alGuardarEnCuenta = fn }

  // ¿Se ve oscura la app ahora? (Oscuro/Grafito, o Automático con el dispositivo en modo oscuro)
  const esOscuro = () => ['dark', 'grafito'].includes(prefs.value.tema) || (prefs.value.tema === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches)
  const movimientoActivo = () => prefs.value.movimiento !== 'off' && !matchMedia('(prefers-reduced-motion: reduce)').matches

  return { prefs, cambiar, aplicarDeCuenta, restablecer, conectarCuenta, esOscuro, movimientoActivo }
})
