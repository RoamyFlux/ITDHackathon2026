/* =====================================================================
 * EXPORTAR INVENTARIO Y PLANTILLA DE EXCEL
 * Ambos usan los mismos encabezados, así lo exportado se puede editar en Excel y volver a importar.
 * La columna "Caducidad" es la del lote más próximo; al reimportar con la MISMA fecha los lotes no se tocan.
 * Los textos pasan por celdaSegura (protección contra fórmulas maliciosas al abrir el archivo).
 * ===================================================================== */
import { totalPiezas, lotesDe } from '../logica/inventario.js'
import { ENC_PLANTILLA, ddmmaaaa, celdaSegura } from '../logica/excel.js'
import { ETIQ } from '../logica/formato.js'
import { descargarLibro } from './excel.js'

export async function descargarPlantilla (avisos) {
  await descargarLibro('plantilla-earlystock.xlsx', [ENC_PLANTILLA, ['Refresco', '600 ml', 'Cola', 'Bebidas', 2, 12, 3, 1.5, 5, 11, 16, ''], ['Refresco', '600 ml', 'Naranja', 'Bebidas', 1, 12, 0, 1, 3, 11, 16, ''], ['Leche', '1 L', 'Entera', 'Lácteos', 3, 12, 0, 2, 4, 19, 25, '15/12/2026']])
  avisos.avisar('Plantilla descargada: llénala y súbela con "Importar Excel"', 'ok')
}

// Estado como en pantalla: el de la cantidad y, si aplica, el de la caducidad ("Bien surtido · caducado").
const estadoTxt = (a, p) => ETIQ[a.estado(p)] + ({ crit: ' · caducado', low: ' · por caducar' }[a.estadoCad(p)] || '')

export async function exportarInventario (inv, sesion, avisos) {
  const filas = [[...ENC_PLANTILLA, 'Total piezas', 'Estado']].concat(inv.productos.map(p => [
    celdaSegura(p.nombre), celdaSegura(p.presentacion || ''), celdaSegura(p.sabor || ''), celdaSegura(p.categoria || ''), p.paquetes, p.porPaquete, p.sueltas, p.minimo, p.objetivo,
    p.costo ?? '', p.precio ?? '', ddmmaaaa((lotesDe(p)[0] || {}).cad), totalPiezas(p), estadoTxt(inv.analisis, p)]))
  const tipo = await descargarLibro('earlystock-inventario.xlsx', filas)
  sesion.registrarEvento('exportacion', `${inv.productos.length} productos (${tipo})`)
  avisos.avisar(tipo === 'xlsx' ? 'Inventario exportado a Excel' : 'Se descargó en formato CSV', 'ok')
}
