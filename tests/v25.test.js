/* =====================================================================
 * PRUEBAS DE EARLYSTOCK 2.5 (pulido): fechas de calendario, fin de oferta que nunca queda en el pasado,
 * ventas de 7 días que coinciden con la gráfica, sugerencias de oferta para lo que caduca hoy y mensajes de
 * error en español.
 * ===================================================================== */
import { describe, it, expect } from 'vitest'
import { sumarDias, finDeOferta, indiceVentas, crearAnalisis, fechaISO, hoy0, DIA } from '../src/logica/inventario.js'
import { generarSugerencias, PRIORIDAD } from '../src/logica/sugerencias.js'
import { msgError } from '../src/logica/formato.js'

const AHORA = new Date(2026, 10, 20, 12).getTime() // 20 de noviembre de 2026, mediodía
const HOY = fechaISO(hoy0(AHORA))
const prod = (o = {}) => ({ id: 'h', nombre: 'Huevo', presentacion: 'Cartón 30', sabor: '', categoria: 'Básicos', paquetes: 4, porPaquete: 6, sueltas: 2, minimo: 1, objetivo: 3, costo: 95, precio: 120, lotes: [], creado: AHORA - 10 * DIA, ...o })

describe('Fechas de calendario', () => {
  it('sumarDias cruza meses y años sin errores', () => {
    expect(sumarDias('2026-12-01', -1)).toBe('2026-11-30')
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01')
    expect(sumarDias('2028-03-01', -1)).toBe('2028-02-29') // año bisiesto
  })
  it('el fin de una oferta es el día antes de caducar, pero nunca antes de hoy', () => {
    expect(finDeOferta(sumarDias(HOY, 5), AHORA)).toBe(sumarDias(HOY, 4))
    expect(finDeOferta(sumarDias(HOY, 1), AHORA)).toBe(HOY)
    expect(finDeOferta(HOY, AHORA)).toBe(HOY) // caduca hoy: oferta "solo hoy", no ayer
  })
})

describe('Ventas de 7 días', () => {
  it('la suma es igual a las barras de la gráfica (7 días de calendario)', () => {
    const movs = [
      { pid: 'h', tipo: 'salida', piezas: 3, t: AHORA - 1 * 3600e3 }, // hoy
      { pid: 'h', tipo: 'salida', piezas: 2, t: hoy0(AHORA) - 6 * DIA + 3600e3 }, // hace 6 días (entra)
      { pid: 'h', tipo: 'salida', piezas: 9, t: hoy0(AHORA) - 6 * DIA - 3600e3 }, // hace 7 días (no entra)
      { pid: 'h', tipo: 'entrada', piezas: 50, t: AHORA - DIA } // las llegadas no cuentan
    ]
    const { por, todos } = indiceVentas(movs, AHORA)
    const v = por.get('h')
    expect(v.suma).toBe(5)
    expect(v.dias.reduce((a, b) => a + b, 0)).toBe(v.suma)
    expect(v.dias[6]).toBe(3)
    expect(v.dias[0]).toBe(2)
    expect(todos.suma).toBe(5)
  })
})

describe('Sugerencias', () => {
  it('lo que caduca HOY y no se venderá tiene oferta "solo hoy" (y es urgente)', () => {
    const p = prod({ lotes: [{ id: 'l1', piezas: 26, cad: HOY }] })
    const movs = [{ pid: 'h', tipo: 'salida', piezas: 1, t: AHORA - DIA }]
    const a = crearAnalisis([p], movs, { ahora: AHORA })
    const s = generarSugerencias([p], a).find(x => x.tipo === 'oferta')
    expect(s).toBeTruthy()
    expect(s.datos.hasta).toBe('solo hoy')
    expect(s.prioridad).toBeGreaterThanOrEqual(PRIORIDAD.urgente)
  })
  it('las prioridades compartidas están en orden (urgente > pendiente)', () => {
    expect(PRIORIDAD.urgente).toBeGreaterThan(PRIORIDAD.pendiente)
  })
})

describe('Mensajes de error en español', () => {
  it('traduce los errores de red del navegador', () => {
    expect(msgError(new TypeError('Failed to fetch'))).toMatch(/sin conexión/)
    expect(msgError(new Error('NetworkError when attempting to fetch resource.'))).toMatch(/sin conexión/)
    expect(msgError(new Error('Load failed'))).toMatch(/sin conexión/)
    expect(msgError(null)).toMatch(/sin conexión/)
  })
  it('deja los mensajes de la base tal cual (por ejemplo el límite del plan)', () => {
    expect(msgError(new Error('LIMITE_PLAN: Tu plan Gratis permite hasta 1,000 productos.'))).toMatch(/^LIMITE_PLAN/)
  })
})
