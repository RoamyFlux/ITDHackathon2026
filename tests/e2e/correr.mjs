/* =====================================================================
 * CORRER LAS PRUEBAS EN NAVEGADOR (npm run e2e)
 * 1) Compila la app en dist-e2e/ apuntando a un Supabase FALSO (https://fake.supabase.co): las pruebas nunca
 *    tocan un proyecto real ni necesitan internet; el Supabase lo simula tests/e2e/simulado.cjs.
 * 2) Corre cada recorrido (01-…cjs, 02-…cjs…) en orden, en Chromium (Playwright), y se detiene si uno falla.
 * Las capturas de pantalla quedan en test-results/e2e/ (no se suben al repositorio).
 * Requisito la primera vez: npx playwright install chromium
 * ===================================================================== */
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const raiz = path.join(aqui, '..', '..')
const correr = (cmd, args, env = {}) => spawnSync(cmd, args, { cwd: raiz, stdio: 'inherit', env: { ...process.env, ...env }, shell: process.platform === 'win32' }).status

console.log('Compilando la app de prueba (Supabase simulado)…')
const comp = correr('npx', ['vite', 'build', '--outDir', 'dist-e2e', '--emptyOutDir', '--logLevel', 'warn'], {
  VITE_SUPABASE_URL: 'https://fake.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_prueba', BASE_PATH: '/ITDHackaton2026/'
})
if (comp !== 0) process.exit(comp)

const pruebas = readdirSync(aqui).filter(f => /^\d+-.*\.cjs$/.test(f)).sort()
for (const f of pruebas) {
  console.log(`\n=== ${f} ===`)
  if (correr(process.execPath, [path.join(aqui, f)]) !== 0) { console.error(`\nFalló ${f}`); process.exit(1) }
}
console.log(`\nListo: ${pruebas.length} recorridos pasaron.`)
