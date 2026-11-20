/* PRUEBAS DE LOS PLANES: límites de productos y ofertas, vencimiento y precios. */
import { describe, it, expect } from 'vitest'
import { PLANES, planPorId, cabenProductos, cabenOfertas, usoPct, planVigente, ahorroAnual, limiteTxt } from '../src/logica/planes.js'

describe('planes', () => {
  it('Gratis 1,000 · Pro 10,000 · Max ilimitado', () => {
    expect(PLANES.map(p => [p.id, p.limites.productos])).toEqual([['gratis', 1000], ['pro', 10000], ['max', null]])
    expect(limiteTxt(null)).toBe('Ilimitados')
  })
  it('respeta el límite de productos', () => {
    expect(cabenProductos('gratis', 999, 1).ok).toBe(true)
    expect(cabenProductos('gratis', 1000, 1)).toMatchObject({ ok: false, disponibles: 0, limite: 1000 })
    expect(cabenProductos('gratis', 990, 50)).toMatchObject({ ok: false, disponibles: 10 })
    expect(cabenProductos('pro', 9999, 1).ok).toBe(true)
    expect(cabenProductos('max', 500000, 1000).ok).toBe(true)
  })
  it('ofertas: 3 en Gratis, ilimitadas en Pro', () => {
    expect(cabenOfertas('gratis', 3).ok).toBe(false)
    expect(cabenOfertas('pro', 300).ok).toBe(true)
  })
  it('uso en porcentaje y plan vencido vuelve a Gratis', () => {
    expect(usoPct('gratis', 250)).toBe(25)
    expect(usoPct('max', 250)).toBe(null)
    const hoy = new Date(2026, 10, 20).getTime()
    expect(planVigente({ plan: 'pro', vence: '2026-11-19' }, hoy)).toBe('gratis')
    expect(planVigente({ plan: 'pro', vence: '2026-11-20' }, hoy)).toBe('pro')
    expect(planVigente({ plan: 'max', vence: null }, hoy)).toBe('max')
    expect(planVigente(null)).toBe('gratis')
    expect(planPorId('raro').id).toBe('gratis')
  })
  it('pagar el año ahorra 2 meses', () => {
    expect(ahorroAnual(planPorId('pro'))).toBe(298)
  })
})
