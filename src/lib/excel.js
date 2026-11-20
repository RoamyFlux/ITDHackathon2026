/* =====================================================================
 * EXCEL DESDE LA PÁGINA
 * Manda el trabajo al Web Worker (src/workers/excel.worker.js) y espera la respuesta.
 * Si el trabajador tarda más de 20 s se detiene (protege contra archivos hechos para trabar la página).
 * ===================================================================== */
import { aCSV } from '../logica/excel.js'

function conTrabajador (mensaje, transferir = []) {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL('../workers/excel.worker.js', import.meta.url), { type: 'module' })
    const fin = setTimeout(() => { w.terminate(); reject(new Error('El archivo tardó demasiado en procesarse.')) }, 20000)
    w.onmessage = ({ data }) => {
      clearTimeout(fin); w.terminate()
      data.error ? reject(new Error(data.error)) : resolve(data)
    }
    w.onerror = () => { clearTimeout(fin); w.terminate(); reject(new Error('No se pudo leer el archivo.')) }
    w.postMessage(mensaje, transferir)
  })
}

// Solo se aceptan estas extensiones (y se revisa el tamaño antes de leer).
export const EXTENSIONES = /\.(xlsx|xls|csv|ods)$/i

export async function leerExcel (archivo) {
  if (!archivo) throw new Error('No se eligió archivo.')
  if (!EXTENSIONES.test(archivo.name)) throw new Error('Usa un archivo de Excel (.xlsx, .xls), .ods o .csv.')
  if (archivo.size > 10 * 1024 * 1024) throw new Error('El archivo pesa más de 10 MB.')
  const buf = await archivo.arrayBuffer()
  return (await conTrabajador({ tipo: 'leer', buf, csv: /\.csv$/i.test(archivo.name) }, [buf])).hojas
}

// Descarga un archivo generado en la página (Blob) con el nombre indicado.
export function descargar (blob, nombre) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nombre
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

// Crea un .xlsx con una hoja "Inventario". Si falla, descarga lo mismo en CSV.
export async function descargarLibro (nombre, filas) {
  try {
    const { buf } = await conTrabajador({ tipo: 'escribir', filas, hoja: 'Inventario' })
    descargar(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nombre)
    return 'xlsx'
  } catch (e) {
    descargar(new Blob([aCSV(filas)], { type: 'text/csv;charset=utf-8' }), nombre.replace(/\.xlsx$/, '.csv'))
    return 'csv'
  }
}
