// EarlyStock 2.5 (pulido): cola de guardado, Ctrl+K sin perder formularios, foco al cerrar ventanas,
// números del resumen = filtros, pestañas accesibles y "Crear cuenta" desde la demostración.
const { abrir, estado, USER } = require('./simulado.cjs')
const OUT = require('path').join(__dirname, '..', '..', 'test-results', 'e2e')
require('fs').mkdirSync(OUT, { recursive: true })
const ok = (c, m) => { if (!c) throw new Error('FALLÓ: ' + m); console.log('  ✓ ' + m) }
const toast = async (pg, txt) => pg.waitForSelector(`#aviso:has-text("${txt}")`, { timeout: 10000 })

;(async () => {
  USER.user_metadata = { acepto_politicas: '2026-11b', negocio: 'Abarrotes Don Pepe' }
  const { b, pg, errs } = await abrir()
  await pg.addInitScript(() => localStorage.setItem('earlystock.guia', '1'))
  await pg.goto('https://app.test/ITDHackaton2026/'); await pg.waitForSelector('.portada')
  await pg.click('.nav-der >> text=Entrar')
  await pg.fill('.form-acceso input[type=email]', 'dueno@tienda.mx'); await pg.fill('.form-acceso .campo-clave input', 'tienda2026')
  await pg.click('.form-acceso button[type=submit]'); await pg.waitForSelector('.pestanas-panel')
  await pg.click('text=Probar con una tienda de ejemplo'); await toast(pg, 'cargada'); await pg.waitForTimeout(600)

  console.log('Pestañas accesibles')
  const tab = pg.locator('#panel-tab-hoy')
  ok(await tab.getAttribute('aria-controls') === 'panel-panel-hoy' && await pg.getAttribute('#panel-panel-hoy', 'aria-labelledby') === 'panel-tab-hoy', 'pestaña y panel enlazados (aria-controls / aria-labelledby)')
  await tab.focus(); await pg.keyboard.press('End')
  ok(await pg.getAttribute('.pestanas-panel .pestana.activa', 'data-pestana') === 'mas', 'tecla Fin va a la última pestaña')
  await pg.keyboard.press('Home')
  ok(await pg.getAttribute('.pestanas-panel .pestana.activa', 'data-pestana') === 'hoy', 'tecla Inicio va a la primera')
  ok(/urgente/.test(await pg.locator('#panel-tab-hoy .sr').innerText()), 'el contador de Hoy se lee como "N urgentes"')

  console.log('Números del resumen = filtros')
  for (const [stat, chip] of [['Urgentes', 'Urgentes'], ['Atención', 'Atención']]) {
    await pg.keyboard.press('1')
    const n = +(await pg.locator(`.stat:has-text("${stat}") b`).innerText())
    await pg.click(`.stat:has-text("${stat}")`); await pg.waitForTimeout(400)
    const enChip = +(await pg.locator(`#inventario .chip.activo:has-text("${chip}") .n`).innerText())
    ok(n === enChip, `"${stat}" (${n}) coincide con el filtro (${enChip})`)
  }
  await pg.click('#inventario .chip:has-text("Todos")')

  console.log('Cola de guardado (red lenta)')
  estado.retraso = 400
  const antes = estado.DB.movimientos.filter(m => m.tipo === 'salida').length
  await pg.keyboard.press('2'); await pg.waitForTimeout(300)
  const fila = pg.locator('.variante', { hasText: '600 ml · Cola' })
  for (let i = 0; i < 2; i++) {
    await fila.locator('button.principal:has-text("Vendí")').click()
    await pg.waitForSelector('dialog form'); await pg.click('dialog button[type=submit]')
    await pg.waitForTimeout(80)
  }
  await pg.waitForTimeout(3500)
  const despues = estado.DB.movimientos.filter(m => m.tipo === 'salida').length
  ok(despues - antes === 2, `dos ventas seguidas se guardan las dos (${despues - antes})`)
  estado.retraso = 0

  console.log('Ventanas: foco y Ctrl+K')
  const btnNuevo = pg.locator('.btn-nuevo-inv')
  await btnNuevo.click(); await pg.waitForSelector('dialog .dlg-cab')
  ok(await pg.getAttribute('dialog.ventana', 'aria-labelledby') !== null, 'la ventana tiene nombre accesible (su título)')
  await pg.fill('dialog input >> nth=0', 'Producto a medias')
  await pg.keyboard.press('Control+k'); await pg.waitForTimeout(250)
  ok(await pg.inputValue('dialog input >> nth=0') === 'Producto a medias' && !(await pg.isVisible('.cmd-buscar')), 'Ctrl+K no reemplaza un formulario abierto')
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(250)
  ok(await pg.evaluate(() => document.activeElement && document.activeElement.classList.contains('btn-nuevo-inv')), 'al cerrar, el foco regresa al botón que la abrió')

  console.log('Paleta en Administración regresa al panel')
  estado.admin = true
  await pg.goto('https://app.test/ITDHackaton2026/#/admin'); await pg.waitForTimeout(800)
  if (await pg.isVisible('.cmd-buscar')) await pg.keyboard.press('Escape')
  await pg.waitForSelector('.top'); await pg.keyboard.press('Control+k')
  await pg.waitForSelector('.cmd-buscar input'); await pg.fill('.cmd-buscar input', 'ir a compras'); await pg.keyboard.press('Enter')
  await pg.waitForSelector('#compras', { timeout: 8000 }); await pg.waitForTimeout(400)
  ok(/#\/app/.test(pg.url()) && await pg.getAttribute('.pestanas-panel .pestana.activa', 'data-pestana') === 'compras', '"Ir a Compras" desde Admin abre el panel en Compras')
  estado.admin = false
  ok(!errs.filter(e => /CSP|Content Security/.test(e)).length, 'sin violaciones de CSP')
  console.log('Errores:', errs.filter(e => !/Failed to load resource|401|400|403|404/.test(e)))
  await b.close()

  console.log('Demostración -> Crear cuenta')
  const m = await abrir({ ancho: 1280, alto: 860 })
  await m.pg.addInitScript(() => localStorage.setItem('earlystock.guia', '1'))
  await m.pg.goto('https://app.test/ITDHackaton2026/'); await m.pg.waitForSelector('.portada')
  await m.pg.click('text=Probar demo sin registrarse'); await m.pg.waitForSelector('.banner.demo')
  await m.pg.click('.banner.demo >> text=Crear cuenta'); await m.pg.waitForSelector('.portada'); await m.pg.waitForTimeout(900)
  ok(await m.pg.getAttribute('.acceso .pestanas button:has-text("Crear cuenta")', 'aria-pressed') === 'true', 'abre directo el formulario "Crear cuenta"')
  await m.b.close()
  console.log('TODO OK')
})().catch(e => { console.error(e); process.exit(1) })
