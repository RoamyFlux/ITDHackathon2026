<!--
  OFERTA DE UN PRODUCTO (poner, cambiar o quitar a voluntad)
  - Tipo: porcentaje de descuento, 2×1 o precio especial. Fecha de fin opcional (sin fecha = hasta quitarla).
  - Si se abre desde una sugerencia "Haz una oferta", trae el descuento sugerido y el porqué.
  - Muestra el precio de oferta y un texto para copiar (letrero en la tienda). Un producto tiene una sola
    oferta a la vez: guardar otra la reemplaza. "Quitar oferta" lo regresa a su precio normal.
-->
<script setup>
import { ref, computed } from 'vue'
import { useInventario } from '../../stores/inventario.js'
import { useSesion } from '../../stores/sesion.js'
import { useAvisos } from '../../stores/avisos.js'
import { nombreCompleto, precioConOferta, etiquetaOferta, fechaISO, hoy0, DIA } from '../../logica/inventario.js'
import { dinero, fechaCorta } from '../../logica/formato.js'
import Ventana from '../Ventana.vue'
import Icono from '../Icono.vue'

const props = defineProps({ producto: { type: Object, required: true }, sugerencia: Object })
const emit = defineEmits(['cerrar'])
const inv = useInventario()
const sesion = useSesion()
const avisos = useAvisos()
const p = props.producto
const actual = inv.ofertaDe.get(p.id) || null
const s = props.sugerencia

// Valores iniciales: la oferta actual, o la sugerida, o 10 % por defecto.
const tipo = ref(actual ? actual.tipo : 'porcentaje')
const valor = ref(actual ? actual.valor : s ? s.datos.pct : 10)
const termina = ref(actual ? (actual.termina || '') : s && s.datos.cad ? fechaISO(new Date(s.datos.cad + 'T00:00:00').getTime() - DIA) : '')
const nota = ref(actual ? actual.nota : '')
const hoy = fechaISO(hoy0())

const oferta = computed(() => ({ tipo: tipo.value, valor: Number(valor.value) || 0, termina: termina.value || null, nota: nota.value }))
const precio = computed(() => precioConOferta(p.precio, oferta.value))
const valida = computed(() => {
  const v = oferta.value.valor
  if (tipo.value === 'porcentaje') return v >= 1 && v <= 90
  if (tipo.value === 'precio') return v > 0 && (p.precio == null || v < p.precio)
  return true
})
// Texto para un letrero o para copiar (sin enviarlo a clientes por WhatsApp).
const texto = computed(() => `¡Oferta${sesion.perfil.negocio ? ' en ' + sesion.perfil.negocio : ''}! ${nombreCompleto(p)}: ` +
  (tipo.value === 'dos_por_uno' ? 'lleva 2 y paga 1' : tipo.value === 'porcentaje' ? `${oferta.value.valor} % de descuento` : 'precio especial') +
  (precio.value != null && tipo.value !== 'dos_por_uno' ? ` (${dinero(precio.value)})` : '') +
  (termina.value ? `. Válido hasta el ${fechaCorta(termina.value)}` : '') + '.')

async function guardar () { if (!valida.value) return; emit('cerrar'); await inv.crearOferta(p, oferta.value) }
function quitar () { emit('cerrar'); inv.quitarOferta(actual) }
async function copiar () { try { await navigator.clipboard.writeText(texto.value); avisos.avisar('Texto copiado: úsalo para tu letrero', 'ok') } catch (e) { avisos.avisar('No se pudo copiar; selecciona el texto y cópialo.') } }
</script>

<template>
  <Ventana :titulo="actual ? 'Oferta activa' : 'Poner en oferta'" :subtitulo="nombreCompleto(p) + (p.precio ? ' · precio normal ' + dinero(p.precio) : '')" icono="gift" ancho="sm" @cerrar="emit('cerrar')">
    <form @submit.prevent="guardar">
      <p v-if="s" class="nota"><Icono n="bulb" sm /> {{ s.detalle }}</p>
      <p v-else-if="actual" class="nota">Ahora: {{ etiquetaOferta(actual) }}{{ actual.termina ? ' hasta el ' + fechaCorta(actual.termina) : ' sin fecha de fin' }}. Puedes cambiarla o quitarla.</p>
      <div class="campo"><span>Tipo de oferta</span>
        <div class="seg">
          <button type="button" :aria-pressed="tipo === 'porcentaje'" @click="tipo = 'porcentaje'">% descuento</button>
          <button type="button" :aria-pressed="tipo === 'dos_por_uno'" @click="tipo = 'dos_por_uno'">2×1</button>
          <button type="button" :aria-pressed="tipo === 'precio'" @click="tipo = 'precio'">Precio especial</button>
        </div>
      </div>
      <div v-if="tipo === 'porcentaje'" class="rapidos">
        <button v-for="d in [10, 20, 30, 50]" :key="d" type="button" class="chip" :class="{ activo: +valor === d }" @click="valor = d">{{ d }} %</button>
      </div>
      <div class="row2">
        <label v-if="tipo === 'porcentaje'">Descuento (%)<input v-model="valor" type="number" min="1" max="90" step="1" required></label>
        <label v-else-if="tipo === 'precio'">Precio de oferta ($)<input v-model="valor" type="number" min="0.01" step="0.01" required></label>
        <label>Termina <small>(opcional)</small><input v-model="termina" type="date" :min="hoy"></label>
      </div>
      <label>Nota interna <small>(opcional)</small><input v-model="nota" maxlength="120" placeholder="Ej. para sacar el lote que caduca"></label>
      <div v-if="precio != null" class="previa">{{ tipo === 'dos_por_uno' ? 'Precio por pieza llevando 2' : 'Precio de oferta' }} <b>{{ dinero(precio) }}</b></div>
      <p v-if="!valida" class="pista mal">{{ tipo === 'porcentaje' ? 'El descuento debe ser de 1 a 90 %.' : 'El precio de oferta debe ser menor al precio normal.' }}</p>
      <label>Texto para tu letrero<textarea :value="texto" rows="3" readonly /></label>
      <div class="dlg-acciones">
        <button v-if="actual" type="button" class="peligro" @click="quitar"><Icono n="trash" sm />Quitar oferta</button>
        <button type="button" class="sec" @click="copiar"><Icono n="copy" sm />Copiar texto</button>
        <button type="submit" :disabled="!valida">{{ actual ? 'Guardar cambios' : 'Activar oferta' }}</button>
      </div>
    </form>
  </Ventana>
</template>
