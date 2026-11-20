// EarlyStock 2.3: botón de plan, insignias plata/oro, corona del admin y lista de usuarios en Admin.
const { abrir, estado, USER } = require('./simulado.cjs')
const OUT = require('path').join(__dirname, '..', '..', 'test-results', 'e2e')
require('fs').mkdirSync(OUT, { recursive: true })
const ok = (c, m) => { if (!c) throw new Error('FALLÓ: ' + m); console.log('  ✓ ' + m) }
const toast = async (pg, txt) => pg.waitForSelector(`#aviso:has-text("${txt}")`, { timeout: 8000 })
async function entrar (pg) {
  await pg.goto('https://app.test/ITDHackaton2026/'); await pg.waitForSelector('.portada')
  await pg.click('.nav-der >> text=Entrar')
  await pg.fill('.form-acceso input[type=email]', 'dueno@tienda.mx'); await pg.fill('.form-acceso .campo-clave input', 'tienda2026')
  await pg.click('.form-acceso button[type=submit]'); await pg.waitForSelector('.hero')
}
;(async () => {
  USER.user_metadata = { acepto_politicas: '2026-11b', negocio: 'Abarrotes Don Pepe' }
  const { b, pg, errs } = await abrir()
  await pg.addInitScript(() => localStorage.setItem('earlystock.guia', '1'))

  console.log('Gratis')
  await entrar(pg); await pg.waitForTimeout(500)
  ok(await pg.isVisible('.plan-btn.p-gratis >> text=Mejorar plan'), 'botón "Mejorar plan" en el encabezado')
  ok(await pg.locator('.insignia-plan').count() === 0 && await pg.locator('.banda-plan').count() === 0, 'Gratis: sin insignia ni banda')
  await pg.click('.plan-btn'); await pg.waitForSelector('dialog .mi-plan'); ok(true, 'el botón abre la ventana de planes'); await pg.keyboard.press('Escape')

  console.log('Pro (plata)')
  estado.plan = 'pro'; estado.vence = '2026-12-20'
  await pg.reload(); await pg.waitForSelector('.banda-plan.pro')
  ok(await pg.isVisible('.plan-btn .insignia-plan.plata'), 'insignia PRO plateada en el encabezado')
  ok(await pg.locator('.avatar-caja.aro-pro').count() > 0, 'aro plateado en la foto')
  ok(await pg.locator('.corona-avatar').count() === 0, 'sin corona (no es admin)')
  await pg.locator('.top-in').screenshot({ path: OUT + '/i-pro-top.png' })
  await pg.locator('.hero').screenshot({ path: OUT + '/i-pro-hero.png' })

  console.log('Admin con Max (oro + corona)')
  estado.plan = 'max'; estado.vence = null; estado.admin = true
  await pg.reload(); await pg.waitForSelector('.banda-plan.max')
  ok(await pg.isVisible('.plan-btn .insignia-plan.oro'), 'insignia MAX dorada')
  ok(await pg.locator('.corona-avatar').count() > 0 && await pg.isVisible('.btn-perfil .corona'), 'coronita del administrador')
  await pg.locator('.top-in').screenshot({ path: OUT + '/i-max-top.png' })
  await pg.locator('.hero').screenshot({ path: OUT + '/i-max-hero.png' })

  console.log('Admin: usuarios y planes')
  await pg.click('.admin-btn'); await pg.waitForSelector('.lista-usuarios .contacto')
  ok(await pg.locator('.lista-usuarios .contacto').count() === 3, 've las 3 cuentas de la app')
  ok(await pg.isVisible('.lista-usuarios >> text=sin confirmar correo'), 'marca las cuentas sin confirmar')
  await pg.fill('.usuarios input[type=search]', 'lupita'); await pg.waitForTimeout(700)
  ok(await pg.locator('.lista-usuarios .contacto').count() === 1, 'buscador por correo o negocio')
  await pg.click('.lista-usuarios >> text=Asignar plan')
  ok((await pg.inputValue('#form-plan input[type=email]')) === 'lupita@gmail.com', 'llena el formulario con la cuenta elegida')
  await pg.click('#form-plan >> text=Max · $349'); await pg.check('#form-plan input[type=checkbox]')
  await pg.click('#form-plan button[type=submit]'); await toast(pg, 'Plan asignado')
  const a = estado.asignaciones.at(-1)
  ok(a.p_email === 'lupita@gmail.com' && a.p_plan === 'max' && a.p_vence === null, 'asigna Max sin vencimiento a cualquier cuenta')
  await pg.fill('.usuarios input[type=search]', ''); await pg.waitForTimeout(700)
  await pg.screenshot({ path: OUT + '/i-admin.png' })
  ok(!errs.filter(e => /CSP|Content Security/.test(e)).length, 'sin violaciones de CSP')
  console.log('Errores:', errs.filter(e => !/Failed to load resource/.test(e)))
  await b.close()
  console.log('TODO OK')
})().catch(e => { console.error(e); process.exit(1) })
