<!--
  IMPORTAR DESDE EXCEL (3 pasos)
  1) Archivo: elegir o arrastrar (.xlsx, .xls, .ods, .csv; máx. 10 MB). Se lee en un Web Worker aislado.
  2) Columnas: EarlyStock adivina qué columna es cada dato (en verde); se puede corregir.
  3) Revisar: los que ya existen (mismo nombre, presentación y sabor) se reemplazan o se suman, nunca se duplican;
     los repetidos dentro del archivo se suman en uno solo. Vista previa antes de guardar.
-->
<script setup>
import { ref, computed } from 'vue'
import { useInventario } from '../../stores/inventario.js'
import { useAvisos } from '../../stores/avisos.js'
import { CAMPOS, analizarHoja, calcularImport } from '../../logica/excel.js'
import { fmt, dinero, fechaCorta, plural } from '../../logica/formato.js'
import { leerExcel } from '../../lib/excel.js'
import { descargarPlantilla } from '../../lib/exportar.js'
import Ventana from '../Ventana.vue'
import Icono from '../Icono.vue'

const emit = defineEmits(['cerrar'])
const inv = useInventario()
const avisos = useAvisos()
const paso = ref(1)
const leyendo = ref(false)
const encima = ref(false)
const archivo = ref(null)
const nombreArchivo = ref('')
const hojas = ref([])
const hoja = ref('')
const datos = ref({ enc: [], filas: [], mapa: {} })
const modo = ref('actualizar')
const entrada = ref(null)

async function leer (f) {
  if (!f) return
  leyendo.value = true
  try {
    hojas.value = await leerExcel(f)
    nombreArchivo.value = f.name
    // Se elige la primera hoja con datos.
    const h = hojas.value.find(x => x.aoa.length > 1) || hojas.value[0]
    elegirHoja(h.nombre)
    paso.value = 2
  } catch (e) { avisos.avisar('No se pudo leer el archivo: ' + e.message) }
  leyendo.value = false
}
function elegirHoja (n) { hoja.value = n; datos.value = analizarHoja(hojas.value.find(x => x.nombre === n).aoa) }
const soltar = e => { encima.value = false; leer(e.dataTransfer.files[0]) }
const letra = ci => { let s = ''; ci++; while (ci > 0) { const m = (ci - 1) % 26; s = String.fromCharCode(65 + m) + s; ci = Math.floor((ci - 1) / 26) } return s }
function cambiarCol (k, v) { const m = { ...datos.value.mapa }; if (v === '') delete m[k]; else m[k] = +v; datos.value = { ...datos.value, mapa: m } }
const detectadas = computed(() => Object.keys(datos.value.mapa).length)
const res = computed(() => (paso.value === 3 ? calcularImport(datos.value.filas, datos.value.mapa, modo.value, inv.productos, inv.unificarCategoria) : []))
const cuenta = a => res.value.filter(x => x.accion === a).length
const ETQ = { nuevo: ['ok', 'Nuevo'], actualizar: ['low', 'Ya existe'], sumado: ['ok', 'Sumado'], omitir: ['crit', 'Omitir'] }
function importar () { emit('cerrar'); inv.importar(res.value) }
</script>

<template>
  <Ventana titulo="Importar desde Excel" subtitulo="Sube tu lista y revisa antes de guardar" icono="upload" ancho="xl" @cerrar="emit('cerrar')">
    <ol class="pasos-imp">
      <li :class="{ activo: paso === 1, hecho: paso > 1 }">Archivo</li>
      <li :class="{ activo: paso === 2, hecho: paso > 2 }">Columnas</li>
      <li :class="{ activo: paso === 3 }">Revisar</li>
    </ol>

    <div v-if="paso === 1">
      <button type="button" class="soltar" :class="{ encima, cargando: leyendo }" @click="entrada.click()"
              @dragenter.prevent="encima = true" @dragover.prevent="encima = true" @dragleave.prevent="encima = false" @drop.prevent="soltar">
        <Icono n="upload" /><b>{{ leyendo ? 'Leyendo…' : 'Elige tu archivo o arrástralo aquí' }}</b><span>Excel (.xlsx, .xls), .ods o .csv · máximo 10 MB</span>
      </button>
      <input ref="entrada" type="file" accept=".xlsx,.xls,.ods,.csv" hidden @change="leer($event.target.files[0]); $event.target.value = ''">
      <div class="imp-ayuda">
        <div><b>¿No tienes un archivo?</b><span>Descarga la plantilla, llénala en Excel y súbela aquí.</span></div>
        <button type="button" class="sec sm" @click="descargarPlantilla(avisos)"><Icono n="file" sm />Descargar plantilla</button>
      </div>
      <p class="hint">Tu archivo se lee en tu dispositivo de forma aislada; solo se guardan los productos que confirmes.</p>
    </div>

    <div v-else-if="paso === 2">
      <div class="imp-archivo"><span class="ico-xls"><Icono n="file" /></span><div><b>{{ nombreArchivo }}</b><small>{{ plural(datos.filas.length, 'renglón', 'renglones') }} con datos · hoja "{{ hoja }}"</small></div></div>
      <label v-if="hojas.length > 1">Hoja<select :value="hoja" @change="elegirHoja($event.target.value)"><option v-for="h in hojas" :key="h.nombre">{{ h.nombre }}</option></select></label>
      <p class="hint">Detectamos <b>{{ detectadas }} de {{ CAMPOS.length }}</b> datos automáticamente (en verde). Si solo tienes la <b>existencia total</b>, la repartimos en paquetes y sueltas.</p>
      <div class="mapeo">
        <label v-for="c in CAMPOS" :key="c.k" :class="{ req: c.req }"><span>{{ c.t }}</span>
          <select :class="{ detectado: datos.mapa[c.k] != null }" :value="datos.mapa[c.k] ?? ''" @change="cambiarCol(c.k, $event.target.value)">
            <option value="">— No usar —</option>
            <option v-for="(h, ci) in datos.enc" :key="ci" :value="ci">Columna {{ letra(ci) }}{{ h ? ': ' + h : '' }}</option>
          </select>
        </label>
      </div>
    </div>

    <div v-else>
      <div class="imp-resumen">
        <span class="badge ok">{{ plural(cuenta('nuevo'), 'nuevo') }}</span>
        <span class="badge low">{{ cuenta('actualizar') }} ya existen</span>
        <span v-if="cuenta('sumado')" class="badge ok">{{ cuenta('sumado') }} repetidos se suman</span>
        <span class="badge crit">{{ plural(cuenta('omitir'), 'omitido') }}</span>
      </div>
      <div class="seg imp-modo" role="group" aria-label="Productos que ya existen">
        <button type="button" :aria-pressed="modo === 'actualizar'" @click="modo = 'actualizar'">Reemplazar cantidades (conteo)</button>
        <button type="button" :aria-pressed="modo === 'sumar'" @click="modo = 'sumar'">Sumar a lo que ya hay (llegó)</button>
      </div>
      <div class="tabla-wrap">
        <table class="tabla mini">
          <thead><tr><th v-for="(t, i) in ['', 'Producto', 'Presentación', 'Sabor', 'Observaciones', 'Categoría', 'Paquetes', 'Pzas/paq', 'Sueltas', 'Total', 'Mín.', 'Obj.', 'Costo', 'Precio', 'Caducidad']" :key="i" :class="{ num: i >= 6 && i <= 13 }"><span class="th-txt">{{ t }}</span></th></tr></thead>
          <tbody>
            <tr v-for="(x, i) in res.slice(0, 200)" :key="i" :class="x.accion">
              <td><span class="badge" :class="ETQ[x.accion][0]">{{ ETQ[x.accion][1] }}</span></td>
              <td><b>{{ x.nombre || '—' }}</b></td><td>{{ x.presentacion || '—' }}</td><td>{{ x.sabor || '—' }}</td><td class="err">{{ x.errores.join(' · ') }}</td><td>{{ x.vista ? x.vista.categoria || '—' : '—' }}</td>
              <td class="num">{{ x.vista.paquetes }}</td><td class="num">{{ x.vista.porPaquete }}</td><td class="num">{{ x.vista.sueltas }}</td><td class="num"><b>{{ x.total }}</b></td>
              <td class="num">{{ fmt(x.vista.minimo) }}</td><td class="num">{{ fmt(x.vista.objetivo) }}</td>
              <td class="num">{{ x.vista.costo != null ? dinero(x.vista.costo) : '—' }}</td><td class="num">{{ x.vista.precio != null ? dinero(x.vista.precio) : '—' }}</td>
              <td>{{ x.cad ? fechaCorta(x.cad) : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="res.length > 200" class="hint">Se muestran los primeros 200 renglones; se importarán todos.</p>
    </div>

    <div class="dlg-acciones">
      <button v-if="paso > 1" type="button" class="sec" @click="paso--"><Icono v-if="paso === 2" n="file" sm />{{ paso === 2 ? 'Elegir otro archivo' : 'Atrás' }}</button>
      <button v-if="paso === 2" type="button" :disabled="datos.mapa.nombre == null" @click="paso = 3">Revisar</button>
      <button v-if="paso === 3" type="button" :disabled="!(cuenta('nuevo') + cuenta('actualizar'))" @click="importar"><Icono n="upload" sm />Importar {{ plural(cuenta('nuevo') + cuenta('actualizar'), 'producto') }}</button>
    </div>
  </Ventana>
</template>
