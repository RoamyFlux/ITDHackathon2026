<!--
  PANEL "REQUIERE ATENCIÓN"
  Tres grupos: se acaba (rojo), pronto hay que comprar (ámbar) y caducidad. Tocar un renglón lleva al producto.
  Sin productos: tarjeta de bienvenida con pasos y botones para importar o cargar la tienda de ejemplo.
-->
<script setup>
import { computed } from 'vue'
import { useInventario } from '../stores/inventario.js'
import { useUI } from '../stores/ui.js'
import { totalPiezas, piezasCaducadas } from '../logica/inventario.js'
import { cadTxt, diasCorto } from '../logica/formato.js'
import Icono from './Icono.vue'

const emit = defineEmits(['ir'])
const inv = useInventario()
const ui = useUI()
const r = computed(() => inv.resumen)
const MAX = 6
const detalle = p => `${totalPiezas(p)} pzas${diasCorto(inv.analisis.diasRestantes(p)) ? ' · ' + diasCorto(inv.analisis.diasRestantes(p)) : ''}`
const conCaducados = computed(() => inv.productos.filter(p => piezasCaducadas(p, inv.reloj) > 0))
const nAtencion = computed(() => new Set([...r.value.crit, ...r.value.low, ...r.value.lotesAlerta.map(x => x.p)]).size)
function verGrupo (estado) { inv.filtros = { q: '', estado, categoria: '' }; ui.irA('inventario') }
</script>

<template>
  <div v-if="inv.cargando && !inv.productos.length" class="esqueleto alto" />
  <div v-else-if="!inv.productos.length" class="card bienvenida">
    <h2><Icono n="spark" />Empecemos</h2>
    <ol class="pasos">
      <li>Agrega tus productos con "Nuevo producto" (cuéntalos por paquetes) o súbelos desde Excel.</li>
      <li>Registra lo que vendes con "Vendí" y lo que te llega con "Llegó".</li>
      <li>EarlyStock te avisará aquí antes de que algo se acabe o caduque, y te sugerirá qué hacer.</li>
    </ol>
    <button type="button" @click="ui.abrir('importar')"><Icono n="upload" sm />Importar mis productos desde Excel</button>
    <button type="button" class="sec" @click="inv.cargarEjemplo()"><Icono n="spark" sm />Probar con una tienda de ejemplo</button>
  </div>
  <section v-else-if="nAtencion" id="alertas" class="card alertas">
    <div class="sec-tit"><h2><Icono n="bell" />Requiere atención</h2><span class="contador crit">{{ nAtencion }}</span></div>
    <div v-if="r.crit.length" class="grupo crit">
      <h3><span class="dot crit" />Se acaba o se acabó</h3>
      <ul>
        <li v-for="p in r.crit.slice(0, MAX)" :key="p.id"><button type="button" class="fila-alerta" @click="emit('ir', p.id)"><b>{{ p.nombre }}</b><span>{{ detalle(p) }}</span></button></li>
        <li v-if="r.crit.length > MAX"><button type="button" class="ghost sm ver-mas" @click="verGrupo('crit')">Ver {{ r.crit.length - MAX }} más</button></li>
      </ul>
    </div>
    <div v-if="r.low.length" class="grupo low">
      <h3><span class="dot low" />Pronto hay que comprar</h3>
      <ul>
        <li v-for="p in r.low.slice(0, MAX)" :key="p.id"><button type="button" class="fila-alerta" @click="emit('ir', p.id)"><b>{{ p.nombre }}</b><span>{{ detalle(p) }}</span></button></li>
        <li v-if="r.low.length > MAX"><button type="button" class="ghost sm ver-mas" @click="verGrupo('low')">Ver {{ r.low.length - MAX }} más</button></li>
      </ul>
    </div>
    <div v-if="r.lotesAlerta.length" class="grupo" :class="r.lotesAlerta[0].d < 0 ? 'crit' : 'low'">
      <h3><Icono n="clock" sm />Caducidad
        <button v-if="conCaducados.length" type="button" class="lote-retirar grande" @click="inv.retirarCaducados(conCaducados)"><Icono n="trash" sm />Retirar caducados ({{ conCaducados.length }})</button>
      </h3>
      <ul>
        <li v-for="x in r.lotesAlerta.slice(0, MAX)" :key="x.l.id"><button type="button" class="fila-alerta" @click="emit('ir', x.p.id)"><b>{{ x.p.nombre }}</b><span>{{ x.l.piezas }} pzas · {{ cadTxt(x.d) }}</span></button></li>
      </ul>
    </div>
  </section>
  <div v-else class="card estado-vacio"><span class="ico-grande"><Icono n="check" /></span><div><b>Todo en orden</b><br><small>Nada por acabarse ni por caducar.</small></div></div>
</template>
