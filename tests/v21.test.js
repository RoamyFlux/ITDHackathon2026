/* =====================================================================
 * PRUEBAS DE EARLYSTOCK 2.1: presentaciones y sabores, sin duplicados, stock por categoría,
 * ofertas, importación que acumula repetidos y enlaces de soporte seguros.
 * ===================================================================== */
import { describe, it, expect } from 'vitest'
import { claveProducto, nombreCompleto, agruparPorNombre, stockPorCategoria, ofertaVigente, precioConOferta, etiquetaOferta, fechaISO, hoy0, DIA } from '../src/logica/inventario.js'
import { analizarHoja, calcularImport, detectarColumnas } from '../src/logica/excel.js'
import { validarContacto, enlaceContacto } from '../src/logica/soporte.js'

const AHORA = new Date(2026, 10, 20, 12).getTime()
const v = (o = {}) => ({ id: 'x', nombre: 'Refresco', presentacion: '600 ml', sabor: 'Cola', categoria: 'Bebidas', paquetes: 1, porPaquete: 12, sueltas: 0, minimo: 1, objetivo: 4, costo: 10, precio: 16, lotes: [], ...o })

describe('presentaciones y sabores', () => {
  it('la clave ignora mayúsculas, acentos y espacios (no se duplica)', () => {
    expect(claveProducto(v())).toBe(claveProducto(v({ nombre: ' refresco ', presentacion: '600 ML', sabor: 'cola' })))
    expect(claveProducto(v())).not.toBe(claveProducto(v({ sabor: 'Naranja' })))
  })
  it('nombre completo sin partes vacías', () => {
    expect(nombreCompleto(v())).toBe('Refresco · 600 ml · Cola')
    expect(nombreCompleto(v({ presentacion: '', sabor: '' }))).toBe('Refresco')
  })
  it('agrupa variantes en un solo producto con su total', () => {
    const g = agruparPorNombre([v({ id: 'a' }), v({ id: 'b', sabor: 'Naranja', sueltas: 5 }), v({ id: 'c', nombre: 'Leche' })])
    expect(g.map(x => [x.nombre, x.variantes.length, x.total])).toEqual([['Refresco', 2, 29], ['Leche', 1, 12]])
  })
  it('stock total por categoría', () => {
    const r = stockPorCategoria([v({ id: 'a' }), v({ id: 'b', sabor: 'Naranja' }), v({ id: 'c', nombre: 'Arroz', categoria: 'Básicos', paquetes: 3 })], p => (p.id === 'a' ? 'crit' : 'ok'))
    expect(r).toEqual([
      { categoria: 'Básicos', piezas: 36, productos: 1, variantes: 1, enRiesgo: 0 },
      { categoria: 'Bebidas', piezas: 24, productos: 1, variantes: 2, enRiesgo: 1 }
    ])
  })
})

describe('ofertas', () => {
  it('precio con descuento, 2×1 y precio fijo', () => {
    expect(precioConOferta(16, { tipo: 'porcentaje', valor: 20 })).toBe(12.8)
    expect(precioConOferta(16, { tipo: 'dos_por_uno' })).toBe(8)
    expect(precioConOferta(16, { tipo: 'precio', valor: 12 })).toBe(12)
    expect(etiquetaOferta({ tipo: 'porcentaje', valor: 20 })).toBe('−20 %')
  })
  it('vigencia: sin fecha sigue; con fecha pasada ya no', () => {
    expect(ofertaVigente({ termina: null }, AHORA)).toBe(true)
    expect(ofertaVigente({ termina: fechaISO(hoy0(AHORA)) }, AHORA)).toBe(true)
    expect(ofertaVigente({ termina: fechaISO(hoy0(AHORA) - DIA) }, AHORA)).toBe(false)
  })
})

describe('importar sin duplicados', () => {
  it('detecta presentación y sabor', () => {
    expect(detectarColumnas(['Producto', 'Presentación', 'Sabor', 'Contenido'])).toMatchObject({ nombre: 0, presentacion: 1, sabor: 2, porPaquete: 3 })
  })
  it('suma renglones repetidos y separa sabores distintos', () => {
    const { filas, mapa } = analizarHoja([['Producto', 'Presentación', 'Sabor', 'Existencia'], ['Refresco', '600 ml', 'Cola', 10], ['refresco', '600 ML', 'cola', 5], ['Refresco', '600 ml', 'Naranja', 7]])
    const r = calcularImport(filas, mapa, 'actualizar', [], c => c)
    expect(r.map(x => x.accion)).toEqual(['nuevo', 'sumado', 'nuevo'])
    expect(r[0].total).toBe(15)
  })
  it('modo sumar agrega a lo que ya hay; actualizar reemplaza', () => {
    const { filas, mapa } = analizarHoja([['Producto', 'Presentación', 'Sabor', 'Existencia'], ['Refresco', '600 ml', 'Cola', 10]])
    const existente = [v({ id: 'a' })] // 12 pzas
    expect(calcularImport(filas, mapa, 'sumar', existente, c => c)[0].total).toBe(22)
    expect(calcularImport(filas, mapa, 'actualizar', existente, c => c)[0].total).toBe(10)
  })
})

describe('contactos de soporte', () => {
  it('arma enlaces seguros por red', () => {
    expect(enlaceContacto('whatsapp', '+52 55 1234 5678')).toBe('https://wa.me/525512345678')
    expect(enlaceContacto('telegram', '@soporte_es')).toBe('https://t.me/soporte_es')
    expect(enlaceContacto('correo', 'ayuda@tienda.mx')).toBe('mailto:ayuda@tienda.mx')
    expect(enlaceContacto('instagram', 'https://instagram.com/earlystock')).toBe('https://instagram.com/earlystock')
  })
  it('rechaza enlaces peligrosos o mal escritos', () => {
    expect(enlaceContacto('web', 'javascript:alert(1)')).toBe(null)
    expect(enlaceContacto('facebook', 'javascript:alert(1)')).toBe(null)
    expect(enlaceContacto('web', 'http://sin-cifrar.com')).toBe(null)
    expect(validarContacto('whatsapp', '123')).toMatch(/dígitos/)
  })
})
