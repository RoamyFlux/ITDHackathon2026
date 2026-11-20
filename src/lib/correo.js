/* =====================================================================
 * ¿EL CORREO PUEDE RECIBIR MENSAJES?
 * Antes de crear la cuenta se revisa que el DOMINIO del correo (lo que va después de la @) tenga servidor de
 * correo (registros MX del DNS). Así se rechazan correos inventados como "ana@nadaexiste123.com".
 *   - Se usa el DNS cifrado de Cloudflare (https://cloudflare-dns.com). Solo se envía el DOMINIO (gmail.com),
 *     nunca el correo completo.
 *   - Si no hay MX pero el dominio existe (registro A/AAAA), también se acepta: así lo marca el estándar
 *     de correo (RFC 5321, "MX implícito").
 *   - Si la consulta falla (sin internet), NO se bloquea: de todos modos la cuenta no se activa hasta abrir
 *     el enlace de confirmación que llega al correo, que es la prueba definitiva de que existe.
 * Resultado: 'si' (recibe correo), 'no' (no existe o no recibe correo) o 'desconocido'.
 * ===================================================================== */
const DOH = 'https://cloudflare-dns.com/dns-query'
const cache = new Map()

async function consultar (nombre, tipo, signal) {
  const r = await fetch(`${DOH}?name=${encodeURIComponent(nombre)}&type=${tipo}`, { headers: { accept: 'application/dns-json' }, signal, referrerPolicy: 'no-referrer', credentials: 'omit' })
  if (!r.ok) throw new Error('dns')
  return r.json()
}
// Status DNS: 0 = existe, 3 = NXDOMAIN (el dominio no existe).
const tiene = (j, tipoNum) => (j.Answer || []).some(a => a.type === tipoNum && a.data && a.data !== '.' && !/^0 \.$/.test(a.data))

export async function dominioRecibeCorreo (dominio) {
  dominio = String(dominio || '').trim().toLowerCase().replace(/\.$/, '')
  // Dominio válido: letras, números, guiones y puntos; la terminación puede ser internacional (xn--…).
  if (!/^[a-z0-9.-]+\.(?:[a-z]{2,}|xn--[a-z0-9-]{2,})$/.test(dominio)) return 'no'
  if (cache.has(dominio)) return cache.get(dominio)
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), 5000)
  let res = 'desconocido'
  try {
    const mx = await consultar(dominio, 'MX', ctl.signal)
    if (mx.Status === 3) res = 'no'
    else if (tiene(mx, 15)) res = 'si'
    // "MX nulo" (0 .) = el dominio declara que NO recibe correo.
    else if ((mx.Answer || []).some(a => a.type === 15 && /^0 \.?$/.test(String(a.data).trim()))) res = 'no'
    else {
      // Sin MX: vale si el dominio tiene dirección IPv4 (A) o IPv6 (AAAA), "MX implícito".
      const a = await consultar(dominio, 'A', ctl.signal)
      if (tiene(a, 1)) res = 'si'
      else res = tiene(await consultar(dominio, 'AAAA', ctl.signal), 28) ? 'si' : 'no'
    }
  } catch (e) { res = 'desconocido' }
  clearTimeout(t)
  if (res !== 'desconocido') cache.set(dominio, res)
  return res
}
