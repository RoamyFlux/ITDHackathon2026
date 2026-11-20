/* =====================================================================
 * PRUEBAS DE LA LÓGICA (Vitest). Se corren con: npm test
 * Cada "it" revisa un caso concreto; si alguien cambia una fórmula y rompe algo, la prueba lo avisa.
 * ===================================================================== */
import { describe, it, expect } from 'vitest'
import { totalPiezas, descontar, paquetesAPedir, consumirLotes, ajustarLotes, crearAnalisis, fechaISO, hoy0, DIA, piezasCaducadas } from '../src/logica/inventario.js'
import { generarSugerencias, descuentoPara, sobrantesPorLote, textoOferta } from '../src/logica/sugerencias.js'
import { validarContrasena, validarCorreo, esperaTrasFallos } from '../src/logica/validacion.js'
import { detectarColumnas, numero, parseFecha, calcularImport, analizarHoja, celdaSegura, aCSV } from '../src/logica/excel.js'

// Un "ahora" fijo para que las pruebas den siempre lo mismo: 20 nov 2026, 12:00.
const AHORA = new Date(2026, 10, 20, 12).getTime()
const enDias = d => fechaISO(hoy0(AHORA) + d * DIA)
const prod = (o = {}) => ({ id: 'p1', nombre: 'Leche 1 L', categoria: 'Lácteos', creado: AHORA - 30 * DIA, paquetes: 2, porPaquete: 12, sueltas: 0, minimo: 1, objetivo: 4, costo: 19, precio: 25, lotes: [], ...o })
// Ventas de N piezas cada día durante los últimos 7 días.
const ventasDiarias = (pid, n) => Array.from({ length: 7 }, (_, i) => ({ pid, tipo: 'salida', piezas: n, t: AHORA - (i + 0.2) * DIA }))

describe('paquetes y piezas', () => {
  it('cuenta paquetes × piezas + sueltas', () => {
    expect(totalPiezas(prod({ paquetes: 5, sueltas: 3 }))).toBe(63)
  })
  it('al vender abre un paquete y deja el resto suelto', () => {
    const p = prod({ paquetes: 2, sueltas: 0 })
    descontar(p, 5)
    expect([p.paquetes, p.sueltas]).toEqual([1, 7])
  })
  it('paquetes a pedir para llegar al objetivo', () => {
    expect(paquetesAPedir(prod({ paquetes: 1, sueltas: 3, objetivo: 4 }))).toBe(3) // faltan 33 pzas -> 3 paq.
  })
})

describe('lotes (FEFO) y caducidad', () => {
  it('vende primero el lote que caduca antes', () => {
    const p = prod({ lotes: [{ id: 'b', piezas: 10, cad: enDias(20) }, { id: 'a', piezas: 5, cad: enDias(3) }] })
    consumirLotes(p, 7)
    expect(p.lotes).toEqual([{ id: 'b', piezas: 8, cad: enDias(20) }])
  })
  it('al bajar el stock a mano recorta los lotes que caducan más tarde', () => {
    const p = prod({ paquetes: 1, sueltas: 0, lotes: [{ id: 'a', piezas: 10, cad: enDias(3) }, { id: 'b', piezas: 10, cad: enDias(20) }] })
    ajustarLotes(p)
    expect(p.lotes.map(l => l.piezas)).toEqual([10, 2])
  })
  it('detecta piezas caducadas', () => {
    expect(piezasCaducadas(prod({ lotes: [{ id: 'a', piezas: 4, cad: enDias(-1) }] }), AHORA)).toBe(4)
  })
})

describe('semáforo y días que alcanza', () => {
  it('rojo en o bajo el mínimo, ámbar hasta 1.5× y verde con suficiente', () => {
    const a = crearAnalisis([], [], { ahora: AHORA })
    expect(a.estado(prod({ paquetes: 1, sueltas: 0 }))).toBe('crit') // 12 = mínimo
    expect(a.estado(prod({ paquetes: 1, sueltas: 5 }))).toBe('low') // 17 ≤ 18
    expect(a.estado(prod({ paquetes: 3, sueltas: 0 }))).toBe('ok')
  })
  it('estima los días con la venta diaria de la semana', () => {
    const p = prod({ paquetes: 3 }) // 36 pzas
    const a = crearAnalisis([p], ventasDiarias('p1', 6), { ahora: AHORA })
    expect(a.consumoDiario(p)).toBeCloseTo(6)
    expect(a.diasRestantes(p)).toBeCloseTo(6)
  })
  it('un producto nuevo no divide entre 7 días', () => {
    const p = prod({ creado: AHORA - 2 * DIA })
    const a = crearAnalisis([p], [{ pid: 'p1', tipo: 'salida', piezas: 10, t: AHORA - DIA }], { ahora: AHORA })
    expect(a.diasHistorial(p)).toBe(2)
  })
  it('el % en riesgo cuenta productos con alerta', () => {
    const ps = [prod({ id: 'a', paquetes: 0 }), prod({ id: 'b', paquetes: 9 }), prod({ id: 'c', paquetes: 9 }), prod({ id: 'd', paquetes: 9 })]
    expect(crearAnalisis(ps, [], { ahora: AHORA }).resumen().pct).toBe(25)
  })
})

describe('sugerencias', () => {
  it('descuento según los días que faltan', () => {
    expect(descuentoPara(2).pct).toBe(30)
    expect(descuentoPara(5).pct).toBe(20)
    expect(descuentoPara(7).pct).toBe(10)
  })
  it('sugiere oferta cuando un lote no alcanzará a venderse (≤ 2 días: 2×1 o 30 %)', () => {
    const p = prod({ paquetes: 3, lotes: [{ id: 'l', piezas: 20, cad: enDias(2) }] })
    const a = crearAnalisis([p], ventasDiarias('p1', 3), { ahora: AHORA })
    const s = generarSugerencias([p], a).find(x => x.tipo === 'oferta')
    expect(s.datos.sobrante).toBe(14) // vende 3/día × 2 días = 6; sobran 14
    expect(s.datos.pct).toBe(30)
    expect(s.datos.precioOferta).toBe(17.5)
    expect(textoOferta(s, 'Don Pepe')).toContain('2×1')
  })
  it('≤ 5 días sugiere 20 %', () => {
    const p = prod({ paquetes: 3, lotes: [{ id: 'l', piezas: 30, cad: enDias(5) }] })
    const a = crearAnalisis([p], ventasDiarias('p1', 1), { ahora: AHORA })
    expect(generarSugerencias([p], a).find(x => x.tipo === 'oferta').datos.pct).toBe(20)
  })
  it('no sugiere oferta si se venderá a tiempo', () => {
    const p = prod({ paquetes: 3, lotes: [{ id: 'l', piezas: 10, cad: enDias(3) }] })
    const a = crearAnalisis([p], ventasDiarias('p1', 6), { ahora: AHORA })
    expect(generarSugerencias([p], a).some(x => x.tipo === 'oferta')).toBe(false)
  })
  it('los lotes anteriores se venden primero al calcular sobrantes', () => {
    const p = prod({ lotes: [{ id: 'a', piezas: 10, cad: enDias(2) }, { id: 'b', piezas: 10, cad: enDias(4) }] })
    const r = sobrantesPorLote(p, 4, AHORA) // 4/día: lote a vende 8 (sobran 2); lote b: 16 − 8 = 8 (sobran 2)
    expect(r.map(x => x.sobrante)).toEqual([2, 2])
  })
  it('caducado -> retirar, agotado -> pedir, y el más vendido', () => {
    const p1 = prod({ id: 'a', paquetes: 0, sueltas: 4, lotes: [{ id: 'x', piezas: 4, cad: enDias(-2) }] })
    const p2 = prod({ id: 'b', nombre: 'Refresco', paquetes: 9 })
    const a = crearAnalisis([p1, p2], ventasDiarias('b', 9), { ahora: AHORA })
    const tipos = generarSugerencias([p1, p2], a).map(s => s.tipo)
    expect(tipos[0]).toBe('retirar')
    expect(tipos).toContain('pedir')
    expect(tipos).toContain('estrella')
  })
  it('sin ventas en 7 días -> exhibir; mucho de más -> promocionar', () => {
    const p = prod({ paquetes: 20, objetivo: 4 })
    const tipos = generarSugerencias([p], crearAnalisis([p], [], { ahora: AHORA })).map(s => s.tipo)
    expect(tipos).toEqual(expect.arrayContaining(['exhibir', 'promocionar']))
  })
})

describe('contraseñas y correos', () => {
  it('rechaza contraseñas sin letras, sin números o cortas', () => {
    expect(validarContrasena('abcdefgh').ok).toBe(false)
    expect(validarContrasena('12345678').ok).toBe(false)
    expect(validarContrasena('abc123').ok).toBe(false)
    expect(validarContrasena('abc12345').ok).toBe(false) // demasiado común
  })
  it('acepta contraseñas con 8+, letras y números', () => {
    expect(validarContrasena('tienda2026').ok).toBe(true)
    expect(validarContrasena('Tienda-2026!x').fuerza).toBeGreaterThanOrEqual(3)
  })
  it('bloquea correos temporales y sugiere corregir errores de dedo', () => {
    expect(validarCorreo('x@mailinator.com').ok).toBe(false)
    expect(validarCorreo('hola').ok).toBe(false)
    expect(validarCorreo('ana@gmial.com').sugerencia).toBe('ana@gmail.com')
    expect(validarCorreo('ana@empresa.mx').ok).toBe(true)
  })
  it('espera 5 minutos tras 5 intentos fallidos', () => {
    expect(esperaTrasFallos(4, AHORA, AHORA)).toBe(0)
    expect(esperaTrasFallos(5, AHORA, AHORA)).toBe(5 * 60000)
  })
})

describe('Excel', () => {
  it('detecta columnas aunque se llamen distinto', () => {
    const m = detectarColumnas(['Artículo', 'Depto', 'Cajas', 'Piezas por caja', 'Existencia', 'Vence'])
    expect(m).toEqual({ nombre: 0, categoria: 1, paquetes: 2, porPaquete: 3, total: 4, cad: 5 })
  })
  it('lee números y fechas en formatos comunes', () => {
    expect(numero('$1,250.50')).toBe(1250.5)
    expect(numero('1,5')).toBe(1.5)
    expect(Number.isNaN(numero('abc'))).toBe(true)
    expect(parseFecha('15/12/2026')).toBe('2026-12-15')
    expect(parseFecha(46371)).toBe('2026-12-15') // número de serie de Excel
    expect(parseFecha('31/02/2026')).toBe(undefined)
  })
  it('reparte la existencia total y marca nuevos, actualizados y omitidos', () => {
    const { filas, mapa } = analizarHoja([['Inventario de mi tienda'], ['Producto', 'Existencia', 'Pzas/paq'], ['Leche 1 L', 63, 12], ['Pan', 'mucho', 1], ['Café', 10, 1]])
    const r = calcularImport(filas, mapa, 'actualizar', [prod()], c => c)
    expect(r.map(x => x.accion)).toEqual(['actualizar', 'omitir', 'nuevo'])
    expect([r[0].vista.paquetes, r[0].vista.sueltas]).toEqual([5, 3])
  })
  it('protege el CSV contra fórmulas', () => {
    expect(celdaSegura('=HYPERLINK("x")')).toBe('\'=HYPERLINK("x")')
    expect(aCSV([['+1'], ['ok']])).toContain('"\'+1"')
  })
})
