/* =====================================================================
 * TEXTOS Y FORMATOS
 * Funciones pequeñas que solo cambian CÓMO se muestra un dato (no lo calculan).
 * ===================================================================== */

// Nombre visible de cada estado del semáforo.
export const ETIQ = { ok: 'Bien surtido', low: 'Por acabarse', crit: 'Urgente' }

// "caduca en 3 días", "caduca hoy", "caducó hace 2 días".
export function cadTxt (d) {
  if (d < 0) return `caducó hace ${-d} día${d === -1 ? '' : 's'}`
  if (d === 0) return 'caduca hoy'
  return `caduca en ${d} día${d === 1 ? '' : 's'}`
}

// "15 dic" a partir de "AAAA-MM-DD".
export const fechaCorta = cad => new Date(cad + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

// Números: enteros sin decimales y el resto con 1 decimal (1.5 paquetes).
export const fmt = n => (Number.isInteger(n) ? String(n) : n.toFixed(1))

// Dinero en pesos mexicanos: $1,234.50
export const dinero = n => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Plural sencillo: plural(3, 'producto') -> "3 productos".
export const plural = (n, s, p = s + 's') => `${n} ${n === 1 ? s : p}`

// "~3 días" que alcanza (vacío si no hay ventas para estimar).
export function diasCorto (d) {
  if (d === null || d === undefined) return ''
  if (d < 1) return 'menos de 1 día'
  const n = Math.floor(d)
  return `~${n} día${n === 1 ? '' : 's'}`
}

// Quita acentos y mayúsculas: sirve para buscar "camara" y encontrar "Cámara".
export const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Iniciales para el avatar sin foto: "Abarrotes Don Pepe" -> "AD"; sin nombre se usan las del correo.
export function iniciales (negocio, email) {
  const base = (negocio || email || '?').replace(/@.*/, '').trim()
  const partes = base.split(/[\s._-]+/).filter(Boolean)
  return ((partes[0] || '?')[0] + (partes[1] ? partes[1][0] : '')).toUpperCase()
}

// Fecha y hora cortas para la actividad de seguridad: "20 nov, 14:05".
export const fechaHora = ms => new Date(ms).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
