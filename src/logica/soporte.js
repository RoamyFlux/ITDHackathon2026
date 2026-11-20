/* =====================================================================
 * CONTACTOS DE SOPORTE
 * El administrador da de alta uno o varios contactos (WhatsApp, Telegram, correo, etc.) y los usuarios
 * los ven en la ventana "Soporte". Aquí se define cada red, cómo se valida lo que escribe el administrador
 * y cómo se arma el enlace de forma SEGURA (solo https:, mailto: y tel:; nunca "javascript:").
 * ===================================================================== */

// Redes disponibles. tipo = qué se escribe: 'telefono' (dígitos), 'usuario' (@usuario o enlace), 'correo', 'url'.
export const REDES = {
  whatsapp: { t: 'WhatsApp', tipo: 'telefono', ayuda: 'Número con código de país, ej. +52 55 1234 5678' },
  telegram: { t: 'Telegram', tipo: 'usuario', ayuda: 'Usuario (@soporte) o enlace t.me', base: 'https://t.me/' },
  messenger: { t: 'Messenger', tipo: 'usuario', ayuda: 'Usuario o enlace de la página (m.me/tupagina)', base: 'https://m.me/' },
  facebook: { t: 'Facebook', tipo: 'usuario', ayuda: 'Usuario o enlace de la página', base: 'https://facebook.com/' },
  instagram: { t: 'Instagram', tipo: 'usuario', ayuda: 'Usuario (@cuenta) o enlace', base: 'https://instagram.com/' },
  tiktok: { t: 'TikTok', tipo: 'usuario', ayuda: 'Usuario (@cuenta) o enlace', base: 'https://www.tiktok.com/@' },
  x: { t: 'X (Twitter)', tipo: 'usuario', ayuda: 'Usuario (@cuenta) o enlace', base: 'https://x.com/' },
  youtube: { t: 'YouTube', tipo: 'usuario', ayuda: 'Canal (@canal) o enlace', base: 'https://www.youtube.com/@' },
  correo: { t: 'Correo', tipo: 'correo', ayuda: 'soporte@tuempresa.com' },
  telefono: { t: 'Teléfono', tipo: 'telefono', ayuda: 'Número con lada, ej. +52 55 1234 5678' },
  web: { t: 'Sitio web', tipo: 'url', ayuda: 'https://tuempresa.com/ayuda' }
}

const soloDigitos = v => String(v || '').replace(/[^\d+]/g, '')

// Revisa lo que escribió el administrador. Devuelve un mensaje de error o '' si está bien.
export function validarContacto (red, valor) {
  const r = REDES[red]
  const v = String(valor || '').trim()
  if (!r) return 'Elige una red.'
  if (!v) return 'Escribe el contacto.'
  if (v.length > 200) return 'Es demasiado largo.'
  if (r.tipo === 'telefono') { const d = soloDigitos(v).replace(/^\+/, ''); return /^\d{8,15}$/.test(d) ? '' : 'Escribe un número de 8 a 15 dígitos (con código de país).' }
  if (r.tipo === 'correo') return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v) ? '' : 'El correo no es válido.'
  if (r.tipo === 'url') return /^https:\/\/[^\s<>"']+\.[^\s<>"']+$/i.test(v) ? '' : 'Debe ser una dirección que empiece con https://'
  // usuario: @nombre o un enlace https
  if (/^https:\/\//i.test(v)) return /^https:\/\/[^\s<>"']+$/.test(v) ? '' : 'El enlace no es válido.'
  return /^@?[\w.]{2,60}$/.test(v) ? '' : 'Escribe el usuario (letras, números, punto o guion bajo) o un enlace https://'
}

// Arma el enlace. Si el dato no es válido devuelve null (y la app no muestra el botón).
export function enlaceContacto (red, valor) {
  if (validarContacto(red, valor)) return null
  const r = REDES[red]
  const v = String(valor).trim()
  if (red === 'whatsapp') return 'https://wa.me/' + soloDigitos(v).replace(/^\+/, '')
  if (r.tipo === 'telefono') return 'tel:' + soloDigitos(v)
  if (r.tipo === 'correo') return 'mailto:' + encodeURIComponent(v).replace('%40', '@')
  if (/^https:\/\//i.test(v)) return v
  return r.base + encodeURIComponent(v.replace(/^@/, ''))
}

// Enlace con un mensaje ya escrito (para "Quiero contratar el plan Pro"): WhatsApp y correo lo permiten;
// en las demás redes se abre el chat normal.
export function enlaceConMensaje (red, valor, mensaje, asunto = 'EarlyStock') {
  const base = enlaceContacto(red, valor)
  if (!base) return null
  if (red === 'whatsapp') return base + '?text=' + encodeURIComponent(mensaje)
  if (red === 'correo') return base + '?subject=' + encodeURIComponent(asunto) + '&body=' + encodeURIComponent(mensaje)
  return base
}
