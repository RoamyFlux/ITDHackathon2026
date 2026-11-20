/* =====================================================================
 * TRABAJADOR DE EXCEL (Web Worker)
 * Lee y escribe archivos de Excel en un hilo APARTE de la página. Ventajas:
 *   - Seguridad: la librería que interpreta el archivo no tiene acceso a la página, a la sesión
 *     (localStorage) ni a lo que se ve en pantalla. Si un archivo malicioso intentara algo, quedaría aislado.
 *   - Rendimiento: un archivo grande no congela la pantalla.
 * Límites: archivos de hasta 10 MB, 20 hojas y 5000 renglones por hoja (de sobra para una tienda).
 * Mensajes que entiende:
 *   {tipo:'leer', buf, csv}        -> responde {hojas:[{nombre, aoa}]}  (aoa = renglones como arreglos)
 *   {tipo:'escribir', filas, hoja} -> responde {buf} (archivo .xlsx listo para descargar)
 * ===================================================================== */
import * as XLSX from '@e965/xlsx'

const MAX_BYTES = 10 * 1024 * 1024
const MAX_HOJAS = 20
const MAX_FILAS = 5000
const ANCHOS = [28, 14, 10, 18, 14, 18, 19, 15, 15, 22, 12, 14]

self.onmessage = ({ data }) => {
  try {
    if (data.tipo === 'leer') {
      if (data.buf.byteLength > MAX_BYTES) throw new Error('El archivo pesa más de 10 MB.')
      let wb
      if (data.csv) {
        // CSV: se lee como texto UTF-8 y, si salen símbolos raros, como Windows-1252 (como lo guarda Excel en Windows).
        let txt = new TextDecoder('utf-8').decode(data.buf)
        if (txt.includes('�')) txt = new TextDecoder('windows-1252').decode(data.buf)
        wb = XLSX.read(txt, { type: 'string', raw: true, dense: true })
      } else {
        // cellFormula:false y cellHTML:false: no se leen fórmulas ni HTML, solo los valores.
        wb = XLSX.read(new Uint8Array(data.buf), { type: 'array', dense: true, cellFormula: false, cellHTML: false, sheetRows: MAX_FILAS + 12 })
      }
      const hojas = wb.SheetNames.slice(0, MAX_HOJAS).map(nombre => ({
        nombre: String(nombre).slice(0, 60),
        // raw:true conserva números y fechas de Excel tal cual; la app los interpreta (ver logica/excel.js).
        aoa: XLSX.utils.sheet_to_json(wb.Sheets[nombre], { header: 1, raw: true, defval: '' }).slice(0, MAX_FILAS + 12)
          .map(r => r.map(c => (typeof c === 'string' ? c.slice(0, 200) : c instanceof Date ? c.toISOString().slice(0, 10) : c)))
      }))
      self.postMessage({ hojas })
    } else if (data.tipo === 'escribir') {
      const ws = XLSX.utils.aoa_to_sheet(data.filas)
      ws['!cols'] = data.filas[0].map((_, i) => ({ wch: ANCHOS[i] || 14 }))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, data.hoja || 'Inventario')
      const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
      self.postMessage({ buf }, [buf])
    }
  } catch (e) {
    self.postMessage({ error: (e && e.message) || 'Formato no válido' })
  }
}
