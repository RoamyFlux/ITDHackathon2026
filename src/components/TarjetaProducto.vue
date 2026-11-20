<!--
  TARJETA DE PRODUCTO (vista "Tarjetas")
  Una sola tarjeta por PRODUCTO (por nombre). Adentro, cada PRESENTACIÓN y SABOR en su propio renglón con:
  piezas (y su equivalente en paquetes), cuántos días alcanza, barra de nivel, lotes con caducidad, oferta activa
  y sus botones Vendí / Llegó / Oferta / Editar / Eliminar. Arriba: total de piezas del producto, su estado más
  urgente y el botón para agregar otra presentación o sabor.
  La franja de color de la izquierda = el estado más urgente de todas sus variantes.
-->
<script setup>
import { computed, ref } from 'vue'
import { useInventario } from '../stores/inventario.js'
import { useUI } from '../stores/ui.js'
import { totalPiezas, lotesDe, diasA, peor, nombreVariante, nombreCompleto, etiquetaOferta, precioConOferta } from '../logica/inventario.js'
import { ETIQ, cadTxt, fechaCorta, fmt, diasCorto, plural, dinero } from '../logica/formato.js'
import Icono from './Icono.vue'
import Spark from './Spark.vue'

// g = grupo {nombre, categoria, variantes, total}. todas = cuántas variantes tiene en total (aunque un filtro oculte algunas).
const props = defineProps({ g: { type: Object, required: true }, i: Number, todas: Number })
const inv = useInventario()
const ui = useUI()
const a = computed(() => inv.analisis)
const estadoGrupo = computed(() => props.g.variantes.reduce((e, p) => peor(e, a.value.estadoTotal(p)), 'ok'))
const multiples = computed(() => (props.todas || props.g.variantes.length) > 1 || props.g.variantes.some(p => nombreVariante(p)))

// Datos de cada variante, ya calculados para dibujarla.
const filas = computed(() => props.g.variantes.map(p => {
  const tot = totalPiezas(p)
  const consumo = a.value.consumoDiario(p)
  const obj = p.objetivo * p.porPaquete
  const h = a.value.diasHistorial(p)
  const oferta = inv.ofertaDe.get(p.id)
  return {
    p, tot, consumo, oferta,
    nombre: nombreVariante(p) || 'Presentación única',
    completo: nombreCompleto(p), // para los botones: "Editar Refresco · 600 ml · Cola" (lector de pantalla)
    es: a.value.estado(p), ec: a.value.estadoCad(p), e: a.value.estadoTotal(p),
    dias: diasCorto(a.value.diasRestantes(p)),
    explicacion: consumo > 0 ? `Vende ≈ ${consumo.toFixed(1)} pzas/día (últimos ${h} día${h === 1 ? '' : 's'}). ${tot} pzas ÷ ${consumo.toFixed(1)} = ${(tot / consumo).toFixed(1)} días.` : '',
    pct: obj > 0 ? Math.min(100, tot / obj * 100) : null,
    pctMin: obj > 0 ? Math.min(100, p.minimo / p.objetivo * 100) : 0,
    precioOferta: oferta ? precioConOferta(p.precio, oferta) : null,
    lotes: lotesDe(p).map(l => { const d = diasA(l.cad, inv.reloj); return { ...l, d, c: d < 0 ? 'crit' : d <= a.value.diasAviso ? 'low' : '' } })
  }
}).sort((x, y) => ({ crit: 0, low: 1, ok: 2 })[x.e] - ({ crit: 0, low: 1, ok: 2 })[y.e])) // las más urgentes primero
// Con 3 o más presentaciones/sabores se muestran 2 (las más urgentes van primero) y "Ver N más".
const verTodas = ref(false)
const MOSTRAR = 2
const filasVisibles = computed(() => (verTodas.value || filas.value.length < 3 ? filas.value : filas.value.slice(0, MOSTRAR)))
const nuevaVariante = () => ui.abrir('producto', { base: { nombre: props.g.nombre, categoria: props.g.categoria } })
</script>

<template>
  <article class="card prod grupo-prod" :class="estadoGrupo" :style="{ '--i': Math.min(i, 10) }">
    <header class="prod-cab">
      <div class="prod-top">
        <h3>{{ g.nombre }}</h3>
        <span v-if="!multiples" class="badge" :class="filas[0].es">{{ ETIQ[filas[0].es] }}</span>
        <span v-else-if="estadoGrupo !== 'ok'" class="badge" :class="estadoGrupo">{{ estadoGrupo === 'crit' ? 'Requiere atención' : 'Revisar' }}</span>
      </div>
      <div class="prod-meta">
        <span><Icono n="tag" sm />{{ g.categoria || 'Sin categoría' }}</span>
        <span v-if="multiples"><Icono n="layers" sm />{{ plural(todas || g.variantes.length, 'presentación o sabor', 'presentaciones o sabores') }}</span>
      </div>
      <div class="prod-total" :title="multiples ? 'Piezas de todas sus presentaciones y sabores' : ''">
        <b>{{ g.total }}</b><small>pzas{{ multiples ? ' en total' : '' }}</small>
      </div>
    </header>

    <ul class="variantes">
      <li v-for="f in filasVisibles" :key="f.p.id" class="variante" :class="f.e" :data-fila="f.p.id">
        <div class="var-info">
          <div class="var-top">
            <span v-if="multiples" class="var-nombre"><span class="dot" :class="f.e" />{{ f.nombre }}</span>
            <span v-if="multiples && f.es !== 'ok'" class="badge" :class="f.es">{{ ETIQ[f.es] }}</span>
            <span v-if="f.ec !== 'ok'" class="badge cad" :class="f.ec"><Icono n="clock" sm />{{ f.ec === 'crit' ? 'Caducado' : 'Por caducar' }}</span>
            <button v-if="f.oferta" type="button" class="badge oferta" :title="'Oferta activa' + (f.oferta.termina ? ' hasta ' + fechaCorta(f.oferta.termina) : '') + ' · tocar para cambiarla'" @click="ui.abrir('oferta', { producto: f.p })">
              <Icono n="gift" sm />Oferta {{ etiquetaOferta(f.oferta) }}<template v-if="f.precioOferta != null"> · {{ dinero(f.precioOferta) }}</template>
            </button>
          </div>
          <div class="prod-stock">
            <span class="total">{{ f.tot }} <small>pzas</small></span>
            <span v-if="f.p.porPaquete > 1" class="eq">{{ f.p.paquetes }} paq. × {{ f.p.porPaquete }}<template v-if="f.p.sueltas"> + {{ f.p.sueltas }} sueltas</template></span>
            <span v-if="f.dias" class="dias" :title="f.explicacion"><Icono n="clock" sm />Alcanza {{ f.dias }}<small class="ritmo">≈ {{ f.consumo.toFixed(1) }}/día</small></span>
            <span class="aviso-min" :title="'Te avisamos cuando queden ' + fmt(f.p.minimo) + ' paquetes'"><Icono n="bell" sm />{{ fmt(f.p.minimo * f.p.porPaquete) }} pzas</span>
            <Spark :dias="a.ventasDe(f.p.id).dias" />
          </div>
          <div v-if="f.pct !== null" class="nivel" :class="f.es" title="Nivel de stock respecto a lo que quieres tener (la rayita es tu mínimo)">
            <i :style="{ width: f.pct.toFixed(1) + '%' }" /><u :style="{ left: f.pctMin.toFixed(1) + '%' }" />
          </div>
          <div v-if="f.lotes.length" class="lotes">
            <span v-for="l in f.lotes" :key="l.id" class="lote" :class="l.c"><Icono n="clock" />{{ l.piezas }} pzas · {{ fechaCorta(l.cad) }} · {{ cadTxt(l.d) }}
              <button v-if="l.d < 0" type="button" class="lote-retirar" title="Quitar del inventario lo caducado" @click="inv.retirarCaducados([f.p])">Retirar</button>
            </span>
          </div>
        </div>
        <div class="actions">
          <button type="button" class="sm principal" :aria-label="'Vendí ' + f.completo" @click="ui.abrir('movimiento', { tipo: 'venta', producto: f.p })"><Icono n="minus" sm />Vendí</button>
          <button type="button" class="sm sec principal" :aria-label="'Llegó ' + f.completo" @click="ui.abrir('movimiento', { tipo: 'llegada', producto: f.p })"><Icono n="truck" sm />Llegó</button>
          <button type="button" class="sm ghost icono" :class="{ activo: f.oferta }" :aria-label="'Oferta de ' + f.completo" :title="f.oferta ? 'Cambiar o quitar la oferta' : 'Poner en oferta'" @click="ui.abrir('oferta', { producto: f.p })"><Icono n="gift" sm /></button>
          <button type="button" class="sm ghost icono" :aria-label="'Editar ' + f.completo" title="Editar" @click="ui.abrir('producto', { producto: f.p })"><Icono n="edit" sm /></button>
          <button type="button" class="sm ghost icono" :aria-label="'Eliminar ' + f.completo" title="Eliminar" @click="inv.eliminar(f.p)"><Icono n="trash" sm /></button>
        </div>
      </li>
    </ul>
    <button v-if="filas.length >= 3" type="button" class="ghost sm ver-variantes" @click="verTodas = !verTodas"><Icono :n="verTodas ? 'up' : 'dn'" sm />{{ verTodas ? 'Ver menos' : `Ver ${filas.length - MOSTRAR} más` }}</button>
    <button type="button" class="ghost sm agregar-var" @click="nuevaVariante"><Icono n="plus" sm />Agregar presentación o sabor</button>
  </article>
</template>
