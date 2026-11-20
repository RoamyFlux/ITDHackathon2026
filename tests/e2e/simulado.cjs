/* =====================================================================
 * SUPABASE SIMULADO PARA LAS PRUEBAS EN NAVEGADOR (Playwright)
 * - Sirve la app compilada (carpeta dist-e2e/) en https://app.test/ITDHackaton2026/ sin abrir puertos.
 * - Responde como Supabase (cuentas, tablas, funciones, llaves de acceso) con datos en memoria: las pruebas
 *   no tocan ningún proyecto real ni necesitan internet.
 * - abrir({ ancho, alto, movil, escala }) abre un Chromium con la CSP activa y junta los errores de consola.
 * ===================================================================== */
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')
const DIST = path.join(__dirname, '..', '..', 'dist-e2e')
const API = 'https://fake.supabase.co'
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url')
const USER = { id: '11111111-1111-1111-1111-111111111111', email: 'dueno@tienda.mx', aud: 'authenticated', role: 'authenticated', email_confirmed_at: new Date().toISOString(), user_metadata: {} }
const jwt = () => b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({ sub: USER.id, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600, session_id: 's1' }) + '.sig'
const sesion = () => ({ access_token: jwt(), token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r', user: USER })
const estado = { DB: { productos: [], lotes: [], movimientos: [], eventos_seguridad: [], ofertas: [], contactos_soporte: [] }, log: [], passkeys: [], admin: false, dnsConsultas: [] }
let n = 0
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' }
const CT = { '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.html': 'text/html', '.webmanifest': 'application/manifest+json' }
function filtra (rows, q) {
  return rows.filter(r => {
    for (const [k, v] of q) {
      if (['select', 'order', 'limit', 'offset', 'columns'].includes(k)) continue
      const i = v.indexOf('.'); const op = v.slice(0, i); const val = v.slice(i + 1)
      if (op === 'eq' && String(r[k]) !== val) return false
      if (op === 'gte' && !(String(r[k]) >= val)) return false
      if (op === 'in' && !val.replace(/^\(|\)$/g, '').split(',').map(x => x.replace(/"/g, '')).includes(String(r[k]))) return false
    }
    return true
  })
}
const b64u = buf => Buffer.from(buf).toString('base64url')
async function abrir ({ ancho = 1360, alto = 900, movil = false, escala = 1 } = {}) {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: ancho, height: alto }, serviceWorkers: 'block', isMobile: movil, hasTouch: movil, deviceScaleFactor: escala })
  const pg = await ctx.newPage()
  const errs = []
  pg.on('pageerror', e => errs.push('pageerror ' + e.message))
  pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  await pg.addInitScript(() => { document.addEventListener('securitypolicyviolation', e => console.error('CSP: ' + e.violatedDirective + ' ' + e.blockedURI)) })
  await pg.route('**/*', async route => {
    const req = route.request(); const u = new URL(req.url())
    if (u.origin === 'https://app.test') {
      let f = u.pathname.replace(/^\/ITDHackaton2026\/?/, '')
      if (!f) f = 'index.html'
      const ruta = path.join(DIST, f)
      if (!fs.existsSync(ruta)) return route.fulfill({ status: 404 })
      return route.fulfill({ status: 200, contentType: CT[path.extname(f)] || 'text/plain', body: fs.readFileSync(ruta) })
    }
    if (u.hostname === 'cloudflare-dns.com') {
      const name = u.searchParams.get('name'); const type = u.searchParams.get('type'); estado.dnsConsultas.push(name + ' ' + type)
      const h = { 'access-control-allow-origin': '*', 'content-type': 'application/dns-json' }
      if (/nadaexiste/.test(name)) return route.fulfill({ status: 200, headers: h, body: JSON.stringify({ Status: 3 }) })
      return route.fulfill({ status: 200, headers: h, body: JSON.stringify({ Status: 0, Answer: [{ name, type: 15, data: '10 mx.' + name + '.' }] }) })
    }
    if (u.origin !== API) return route.abort()
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    const json = (o, s = 200) => route.fulfill({ status: s, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(o) })
    const p = u.pathname
    estado.log.push(req.method() + ' ' + p)
    // estado.retraso (ms): simula una red lenta en las escrituras (para probar la cola de guardado).
    if (estado.retraso && req.method() !== 'GET' && p.startsWith('/rest/v1/')) await new Promise(r => setTimeout(r, estado.retraso))
    if (p.startsWith('/auth/v1/token')) {
      const bd = JSON.parse(req.postData() || '{}')
      if (u.searchParams.get('grant_type') === 'password' && bd.password !== 'tienda2026') return json({ error: 'invalid_grant', error_description: 'Invalid login credentials', msg: 'Invalid login credentials', code: 'invalid_credentials' }, 400)
      return json(sesion())
    }
    if (p.startsWith('/auth/v1/signup')) { const bd = JSON.parse(req.postData()); estado.log.push('SIGNUP ' + JSON.stringify(bd.data)); return json({ ...USER, id: 'nuevo', email: bd.email, identities: [{}], email_confirmed_at: null }) }
    if (p.startsWith('/auth/v1/resend')) return json({})
    if (p.startsWith('/auth/v1/recover')) return json({})
    if (p.startsWith('/auth/v1/logout')) { estado.log.push('LOGOUT ' + u.search); return route.fulfill({ status: 204, headers: cors }) }
    if (p.startsWith('/auth/v1/user')) {
      if (req.method() === 'PUT') { const bd = JSON.parse(req.postData() || '{}'); USER.user_metadata = { ...USER.user_metadata, ...(bd.data || {}) }; if (bd.password) estado.log.push('PASSWORD ' + bd.password) }
      return json(USER)
    }
    // ---- Llaves de acceso ----
    if (p === '/auth/v1/passkeys/registration/options') {
      return json({ challenge_id: 'c1', expires_at: Math.floor(Date.now() / 1000) + 300, options: { challenge: b64u('reto-registro-123456789012'), rp: { id: 'app.test', name: 'EarlyStock' }, user: { id: b64u(USER.id), name: USER.email, displayName: USER.email }, pubKeyCredParams: [{ type: 'public-key', alg: -7 }], authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' }, timeout: 60000, attestation: 'none' } })
    }
    if (p === '/auth/v1/passkeys/registration/verify') { const pk = { id: 'pk' + (++n), friendly_name: null, created_at: new Date().toISOString() }; estado.passkeys.push(pk); return json(pk) }
    if (p === '/auth/v1/passkeys/authentication/options') return json({ challenge_id: 'c2', expires_at: Math.floor(Date.now() / 1000) + 300, options: { challenge: b64u('reto-acceso-1234567890123'), rpId: 'app.test', allowCredentials: [], userVerification: 'preferred', timeout: 60000 } })
    if (p === '/auth/v1/passkeys/authentication/verify') { estado.log.push('PASSKEY LOGIN'); return json(sesion()) }
    if (p === '/auth/v1/passkeys') return json(estado.passkeys)
    const mp = p.match(/^\/auth\/v1\/passkeys\/(.+)$/)
    if (mp) {
      const k = estado.passkeys.find(x => x.id === mp[1])
      if (req.method() === 'PATCH') { Object.assign(k, { friendly_name: JSON.parse(req.postData()).friendly_name }); return json(k) }
      if (req.method() === 'DELETE') { estado.passkeys = estado.passkeys.filter(x => x !== k); return json({}) }
    }
    if (p.startsWith('/storage/v1/object')) return json({ Key: 'x' })
    if (p === '/rest/v1/rpc/es_admin') return json(estado.admin)
    if (p === '/rest/v1/rpc/mi_plan') return json({ plan: estado.plan || 'gratis', plan_contratado: estado.plan || 'gratis', vence: estado.vence || null, productos: estado.DB.productos.length, es_admin: !!estado.admin })
    if (p === '/rest/v1/rpc/admin_asignar_plan') { const b = JSON.parse(req.postData()); estado.asignaciones = [...(estado.asignaciones || []), b]; return route.fulfill({ status: 204, headers: cors }) }
    if (p === '/rest/v1/rpc/admin_usuarios') {
      const q = (JSON.parse(req.postData() || '{}').p_buscar || '').toLowerCase()
      const base = [
        { email: 'dueno@tienda.mx', negocio: 'Abarrotes Don Pepe', creado: '2026-11-01T10:00:00Z', ultimo_acceso: '2026-11-20T09:00:00Z', confirmado: true, plan: estado.plan || 'gratis', plan_vigente: estado.plan || 'gratis', vence: estado.vence || null, productos: estado.DB.productos.length, es_admin: !!estado.admin },
        { email: 'lupita@gmail.com', negocio: 'Miscelánea Lupita', creado: '2026-11-10T10:00:00Z', ultimo_acceso: '2026-11-19T18:00:00Z', confirmado: true, plan: 'pro', plan_vigente: 'pro', vence: '2026-12-10', productos: 2300, es_admin: false },
        { email: 'nuevo@outlook.com', negocio: '', creado: '2026-11-19T10:00:00Z', ultimo_acceso: null, confirmado: false, plan: 'gratis', plan_vigente: 'gratis', vence: null, productos: 0, es_admin: false }
      ]
      return json(base.filter(u => !q || u.email.includes(q) || u.negocio.toLowerCase().includes(q)))
    }
    if (p === '/rest/v1/rpc/admin_suscripciones') return json((estado.asignaciones || []).map(b => ({ email: b.p_email, plan: b.p_plan, plan_vigente: b.p_plan, vence: b.p_vence, productos: 0, nota: b.p_nota, updated_at: new Date().toISOString() })))
    if (p === '/rest/v1/rpc/eliminar_mi_cuenta') { estado.log.push('ELIMINAR CUENTA'); estado.DB = { productos: [], lotes: [], movimientos: [], eventos_seguridad: [], ofertas: [], contactos_soporte: [] }; return route.fulfill({ status: 204, headers: cors }) }
    const m = p.match(/^\/rest\/v1\/(\w+)$/)
    if (!m) return json({ message: '?' }, 404)
    const t = m[1]; const q = [...u.searchParams.entries()]; const acc = req.headers().accept || ''; const pref = req.headers().prefer || ''
    const rep = pref.includes('return=representation')
    const DB = estado.DB
    if (req.method() === 'GET') {
      let rows = filtra(DB[t], q)
      if (t === 'eventos_seguridad') rows = [...rows].reverse()
      if (t === 'contactos_soporte') rows = rows.filter(r => r.activo || estado.admin).sort((a, b) => a.orden - b.orden)
      const off = +(u.searchParams.get('offset') || 0); const lim = u.searchParams.get('limit')
      if (lim != null) rows = rows.slice(off, off + +lim)
      return json(rows)
    }
    if (req.method() === 'POST') {
      const body = JSON.parse(req.postData()); const arr = Array.isArray(body) ? body : [body]
      const merge = pref.includes('merge-duplicates')
      const out = arr.map(r => {
        const ex = merge && r.id && DB[t].find(x => x.id === r.id)
        if (ex) { Object.assign(ex, r); return ex }
        const row = { id: 'id' + (++n), user_id: USER.id, created_at: new Date().toISOString(), ...(t === 'productos' ? { presentacion: '', sabor: '' } : {}), ...(t === 'contactos_soporte' ? { activo: true, orden: 0, etiqueta: '' } : {}), ...r }
        DB[t].push(row)
        // Imita los triggers de la base: retiro de caducados -> evento.
        if (t === 'movimientos' && r.tipo === 'merma') DB.eventos_seguridad.push({ id: ++n, tipo: 'retiro', detalle: r.piezas + ' piezas caducadas retiradas', created_at: new Date().toISOString() })
        return row
      })
      if (!rep) return route.fulfill({ status: 201, headers: cors })
      return acc.includes('object') ? json(out[0], 201) : json(out, 201)
    }
    if (req.method() === 'PATCH') { const ch = JSON.parse(req.postData()); const rows = filtra(DB[t], q); rows.forEach(r => Object.assign(r, ch)); return rep ? json(rows) : route.fulfill({ status: 204, headers: cors }) }
    if (req.method() === 'DELETE') {
      const rows = new Set(filtra(DB[t], q)); DB[t] = DB[t].filter(r => !rows.has(r))
      if (t === 'productos') {
        const ids = new Set([...rows].map(r => r.id)); ['lotes', 'movimientos'].forEach(k => { DB[k] = DB[k].filter(r => !ids.has(r.producto_id)) })
        if (rows.size) DB.eventos_seguridad.push({ id: ++n, tipo: 'borrado', detalle: rows.size + ' productos eliminados', created_at: new Date().toISOString() })
      }
      return route.fulfill({ status: 204, headers: cors })
    }
    return json({}, 405)
  })
  return { b, ctx, pg, errs }
}
module.exports = { abrir, estado, USER }
