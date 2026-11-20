<!--
  CENTRO DE NOTIFICACIONES (campana del encabezado)
  El número rojo = sugerencias urgentes (retirar caducados, ofertas, pedir lo que se acaba).
  Al abrirla muestra las más importantes; tocar una lleva a la acción. "Ver todas" baja al panel de sugerencias.
  Las ya vistas se recuerdan en este dispositivo para que el contador no moleste con lo mismo.
-->
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useInventario } from '../stores/inventario.js'
import { useUI } from '../stores/ui.js'
import Icono from './Icono.vue'
import { ICONO_SUG, accionSugerencia } from './sugerenciaAcciones.js'

const inv = useInventario()
const ui = useUI()
const abierto = ref(false)
const caja = ref(null)
const CLAVE = 'earlystock.vistas'
const vistas = ref(new Set((() => { try { return JSON.parse(localStorage.getItem(CLAVE)) || [] } catch (e) { return [] } })()))

const urgentes = computed(() => inv.sugerencias.filter(s => s.prioridad >= 60))
const nuevas = computed(() => urgentes.value.filter(s => !vistas.value.has(s.id)).length)

function alternar () {
  abierto.value = !abierto.value
  if (abierto.value) {
    // Al abrir, todas cuentan como vistas.
    vistas.value = new Set([...vistas.value, ...urgentes.value.map(s => s.id)].slice(-300))
    try { localStorage.setItem(CLAVE, JSON.stringify([...vistas.value])) } catch (e) {}
  }
}
function elegir (s) { abierto.value = false; accionSugerencia(s, inv, ui) }
function verTodas () { abierto.value = false; ui.irA('sugerencias') }
// Clic fuera o Esc la cierran.
const fuera = e => { if (abierto.value && caja.value && !caja.value.contains(e.target)) abierto.value = false }
const esc = e => { if (e.key === 'Escape') abierto.value = false }
onMounted(() => { addEventListener('pointerdown', fuera); addEventListener('keydown', esc) })
onUnmounted(() => { removeEventListener('pointerdown', fuera); removeEventListener('keydown', esc) })
</script>

<template>
  <div ref="caja" class="notif">
    <button type="button" class="btn-top icono" :aria-expanded="abierto" :aria-label="`Notificaciones${nuevas ? ': ' + nuevas + ' nuevas' : ''}`" title="Notificaciones" @click="alternar">
      <Icono n="bell" /><span v-if="nuevas" class="burbuja">{{ nuevas > 9 ? '9+' : nuevas }}</span>
    </button>
    <Transition name="baja">
      <div v-if="abierto" class="notif-panel card" role="dialog" aria-label="Notificaciones">
        <div class="notif-cab"><b>Notificaciones</b><small>{{ urgentes.length }} por atender</small></div>
        <ul v-if="urgentes.length">
          <li v-for="s in urgentes.slice(0, 6)" :key="s.id">
            <button type="button" class="notif-item" :class="s.tipo" @click="elegir(s)">
              <span class="ico-s"><Icono :n="ICONO_SUG[s.tipo]" sm /></span>
              <span><b>{{ s.titulo }}</b><small>{{ s.detalle }}</small></span>
            </button>
          </li>
        </ul>
        <div v-else class="vacio-mini"><Icono n="check" />Todo en orden. Te avisaremos aquí.</div>
        <button type="button" class="sec sm ancho" @click="verTodas">Ver todas las sugerencias</button>
      </div>
    </Transition>
  </div>
</template>
