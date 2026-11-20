/* =====================================================================
 * REVISIÓN AUTOMÁTICA DE SEGURIDAD (npm run revisar-seguridad)
 * Se corre en cada pull request (ver .github/workflows/seguridad.yml) y también a mano. Revisa:
 *   1) Que no haya claves SECRETAS en el código (secret key de Supabase, service_role, llaves privadas, tokens).
 *   2) Que la versión compilada (dist/) tenga la Política de Seguridad de Contenido y no cargue scripts de otros sitios.
 *   3) Que no se use v-html, eval ni innerHTML con datos (formas comunes de inyectar código).
 * Si encuentra algo, termina con error y el pull request se marca en rojo.
 * ===================================================================== */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'

const problemas = []
const IGNORAR = new Set(['node_modules', 'dist', '.git', 'test-results', 'playwright-report'])
const EXT = new Set(['.js', '.mjs', '.vue', '.json', '.html', '.css', '.sql', '.md', '.yml', '.yaml', '.env', ''])

function archivos (dir) {
  return readdirSync(dir).flatMap(n => {
    if (IGNORAR.has(n) || n === 'package-lock.json') return []
    const r = join(dir, n)
    return statSync(r).isDirectory() ? archivos(r) : EXT.has(extname(n)) ? [r] : []
  })
}

// 1) Claves secretas
const SECRETOS = [
  [/sb_secret_[A-Za-z0-9_-]{10,}/, 'secret key de Supabase'],
  [/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]*cm9sZSI6InNlcnZpY2Vfcm9sZS[A-Za-z0-9_-]*/, 'JWT con rol service_role'],
  [/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'llave privada'],
  [/gh[pousr]_[A-Za-z0-9]{30,}/, 'token de GitHub'],
  [/AKIA[0-9A-Z]{16}/, 'llave de AWS']
]
for (const f of archivos('.')) {
  if (f.includes('revisar-seguridad')) continue
  const txt = readFileSync(f, 'utf8')
  for (const [re, que] of SECRETOS) if (re.test(txt)) problemas.push(`${f}: parece contener una ${que}`)
  // 3) Código peligroso en la app
  if (f.startsWith('src')) {
    if (/v-html\s*=/.test(txt)) problemas.push(`${f}: usa v-html (podría mostrar código de un usuario como HTML)`)
    if (/\beval\s*\(|new Function\s*\(/.test(txt)) problemas.push(`${f}: usa eval/new Function`)
    if (/\.innerHTML\s*=/.test(txt)) problemas.push(`${f}: asigna innerHTML`)
  }
}

// 2) Versión compilada
if (existsSync('dist/index.html')) {
  const html = readFileSync('dist/index.html', 'utf8')
  const csp = (html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1]
  if (!csp) problemas.push('dist/index.html no tiene Content-Security-Policy')
  else {
    for (const d of ["script-src 'self'", "object-src 'none'", "base-uri 'self'", "default-src 'self'"]) if (!csp.includes(d)) problemas.push(`La CSP no incluye "${d}"`)
    if (/unsafe-inline|unsafe-eval/.test(csp.match(/script-src[^;]*/)[0])) problemas.push('La CSP permite scripts en línea o eval')
  }
  if (/<script(?![^>]*\bsrc=)[^>]*>[^<]+<\/script>/.test(html)) problemas.push('dist/index.html tiene scripts en línea')
  if (/<script[^>]*src="https?:\/\//.test(html)) problemas.push('dist/index.html carga scripts de otro sitio')
} else console.log('Aviso: no existe dist/ (corre "npm run build" para revisar también la CSP).')

if (problemas.length) {
  console.error('Problemas de seguridad encontrados:\n- ' + problemas.join('\n- '))
  process.exit(1)
}
console.log('Revisión de seguridad: todo en orden.')
