// EarlyStock 2.2: planes Gratis / Pro / Max, límites, contratación y asignación por el administrador.
const { abrir, estado, USER } = require('./simulado.cjs')
const OUT = require('path').join(__dirname, '..', '..', 'test-results', 'e2e')
require('fs').mkdirSync(OUT, { recursive: true })
const ok = (c, m) => { if (!c) throw new Error('FALLÓ: ' + m); console.log('  ✓ ' + m) }
const tab = async (pg, id) => { await pg.click(`.pestanas-panel [data-pestana=${id}]`); await pg.waitForTimeout(150) }
const toast = async (pg, txt) => pg.waitForSelector(`#aviso:has-text("${txt}")`, { timeout: 8000 })
const llenar = n => { estado.DB.productos = Array.from({ length: n }, (_, i) => ({ id: 'p' + i, user_id: USER.id, nombre: 'Producto ' + i, presentacion: '', sabor: '', categoria: 'General', paquetes: 1, por_paquete: 1, sueltas: 0, minimo: 0, objetivo: 1, costo: null, precio: 10, created_at: new Date(Date.now() - 864e6).toISOString() })) }
async function entrar (pg) {
  await pg.goto('https://app.test/ITDHackaton2026/'); await pg.waitForSelector('.portada')
  await pg.click('.nav-der >> text=Entrar')
  await pg.fill('.form-acceso input[type=email]', 'dueno@tienda.mx'); await pg.fill('.form-acceso .campo-clave input', 'tienda2026')
  await pg.click('.form-acceso button[type=submit]'); await pg.waitForSelector('.hero')
}
;(async () => {
  USER.user_metadata = { acepto_politicas: '2026-11b', negocio: 'Abarrotes Don Pepe' }
  estado.DB.contactos_soporte = [{ id: 'c1', red: 'whatsapp', valor: '+52 55 1234 5678', etiqueta: 'Ventas', orden: 0, activo: true }]
  const { b, pg, errs } = await abrir()
  await pg.addInitScript(() => localStorage.setItem('earlystock.guia', '1'))
  console.log('Página de inicio')
  await pg.goto('https://app.test/ITDHackaton2026/'); await pg.waitForSelector('#planes .plan')
  ok(await pg.$$eval('#planes .plan', x => x.length) === 3, '3 planes en la página de inicio')
  const precios = await pg.$$eval('#planes .plan-precio b', x => x.map(e => e.innerText))
  ok(JSON.stringify(precios) === '["Gratis","$149","$349"]', 'precios mensuales ' + precios.join(' · '))
  await pg.click('#planes .periodo >> text=Anual')
  ok((await pg.$$eval('#planes .plan-precio b', x => x.map(e => e.innerText)))[1] === '$1,490', 'precio anual Pro $1,490')
  await pg.locator('#planes').screenshot({ path: OUT + '/p-landing.png' })

  console.log('Límite del plan Gratis')
  llenar(1000)
  await entrar(pg)
  await tab(pg, 'mas'); await pg.waitForSelector('#tu-plan')
  ok((await pg.innerText('#tu-plan .uso-txt')).includes('1,000 de 1,000'), 'Tu plan: 1,000 de 1,000 productos')
  await tab(pg, 'inventario'); await pg.click('.btn-nuevo >> visible=true'); await pg.fill('dialog input[maxlength="60"]', 'Nuevo'); await pg.click('dialog >> button[type=submit]')
  await toast(pg, 'ya llegaste al límite')
  ok(estado.DB.productos.length === 1000, 'no se agregó el producto 1,001')
  await pg.click('#aviso >> text=Ver planes'); await pg.waitForSelector('dialog .mi-plan')
  ok((await pg.innerText('dialog .plan.actual h3')) === 'Gratis', 'la ventana marca Gratis como plan actual')
  await pg.click('dialog .p-pro >> text=Contratar Pro'); await pg.waitForSelector('#como-contratar a.contacto')
  const href = await pg.getAttribute('#como-contratar a.contacto', 'href')
  ok(href.startsWith('https://wa.me/525512345678?text=') && decodeURIComponent(href).includes('plan Pro') && decodeURIComponent(href).includes('dueno@tienda.mx'), 'WhatsApp a soporte con el mensaje listo')
  await pg.screenshot({ path: OUT + '/p-ventana.png' })
  await pg.keyboard.press('Escape')

  console.log('Administrador asigna Pro')
  estado.admin = true
  await pg.reload(); await pg.waitForSelector('.admin-btn'); await pg.click('.admin-btn')
  await pg.waitForSelector('#form-plan')
  await pg.fill('#form-plan input[type=email]', 'dueno@tienda.mx')
  await pg.click('#form-plan >> text=Pro · $149')
  await pg.fill('#form-plan input[maxlength="200"]', 'Transferencia 1234')
  await pg.click('#form-plan button[type=submit]'); await toast(pg, 'Plan asignado')
  const asig = estado.asignaciones[0]
  ok(asig.p_email === 'dueno@tienda.mx' && asig.p_plan === 'pro' && /^\d{4}-\d{2}-\d{2}$/.test(asig.p_vence), 'llama a admin_asignar_plan con correo, plan y fecha')
  ok(await pg.isVisible('.admin-lista >> text=dueno@tienda.mx'), 'aparece en la lista de suscripciones')
  await pg.screenshot({ path: OUT + '/p-admin.png' })

  console.log('Con Pro ya puede agregar')
  estado.admin = false; estado.plan = 'pro'; estado.vence = '2026-12-20'
  await pg.goto('https://app.test/ITDHackaton2026/#/app'); await pg.reload(); await tab(pg, 'mas'); await pg.waitForSelector('#tu-plan')
  ok((await pg.innerText('#tu-plan .plan-chip')) === 'Pro' && (await pg.innerText('#tu-plan .uso-txt')).includes('1,000 de 10,000'), 'Tu plan: Pro, 1,000 de 10,000')
  await tab(pg, 'inventario'); await pg.click('.btn-nuevo >> visible=true'); await pg.fill('dialog input[maxlength="60"]', 'Nuevo con Pro'); await pg.click('dialog >> button[type=submit]')
  await toast(pg, 'agregado'); ok(estado.DB.productos.length === 1001, 'producto 1,001 agregado con Pro')

  console.log('Límite de ofertas en Gratis')
  estado.plan = 'gratis'; estado.vence = null; llenar(5); estado.DB.ofertas = []
  await pg.reload(); await tab(pg, 'inventario'); await pg.waitForSelector('.variante')
  for (let i = 0; i < 4; i++) {
    await pg.locator('.variante').nth(i).locator('[aria-label^="Oferta de"]').click()
    await pg.click('dialog >> text=Activar oferta')
    if (i < 3) await toast(pg, 'Oferta activa')
  }
  await toast(pg, 'hasta 3 ofertas activas')
  ok(estado.DB.ofertas.length === 3, 'la cuarta oferta se bloquea en Gratis')
  const csp = errs.filter(e => /CSP|Content Security/.test(e))
  ok(!csp.length, 'sin violaciones de CSP')
  console.log('Errores:', errs.filter(e => !/Failed to load resource/.test(e)))
  await b.close()
  console.log('TODO OK')
})().catch(e => { console.error(e); process.exit(1) })
