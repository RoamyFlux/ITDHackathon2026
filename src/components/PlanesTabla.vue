<!--
  TARJETAS DE PLANES (Gratis · Pro · Max)
  Se usan en la página de inicio y en la ventana "Planes". Cada tarjeta muestra precio mensual (o anual),
  límite de productos, beneficios y limitaciones. El plan Pro va resaltado como el recomendado.
  Emite "elegir" con el id del plan cuando tocan su botón. actual = plan que ya tiene la cuenta (si hay sesión).
-->
<script setup>
import { ref } from 'vue'
import { PLANES, precioTxt, limiteTxt, ahorroAnual } from '../logica/planes.js'
import Icono from './Icono.vue'

const props = defineProps({ actual: String, textoBoton: Function })
const emit = defineEmits(['elegir'])
const anual = ref(false)
const boton = p => (props.textoBoton ? props.textoBoton(p) : p.precio ? `Elegir ${p.nombre}` : 'Empezar gratis')
</script>

<template>
  <div class="planes">
    <div class="seg periodo" role="group" aria-label="Forma de pago">
      <button type="button" :aria-pressed="!anual" @click="anual = false">Mensual</button>
      <button type="button" :aria-pressed="anual" @click="anual = true">Anual <small>2 meses gratis</small></button>
    </div>
    <div class="planes-rejilla">
      <article v-for="p in PLANES" :key="p.id" class="card plan" :class="['p-' + p.id, { recomendado: p.destacado, actual: actual === p.id }]">
        <span v-if="actual === p.id" class="plan-cinta actual">Tu plan</span>
        <span v-else-if="p.destacado" class="plan-cinta">Más popular</span>
        <h3>{{ p.nombre }}</h3>
        <p class="plan-lema">{{ p.lema }}</p>
        <div class="plan-precio">
          <b>{{ precioTxt(anual ? p.precioAnual : p.precio) }}</b>
          <span v-if="p.precio">MXN / {{ anual ? 'año' : 'mes' }}</span>
          <span v-else>para siempre</span>
        </div>
        <p class="plan-nota">
          <template v-if="p.precio && anual">Equivale a {{ precioTxt(Math.round(p.precioAnual / 12)) }} al mes · ahorras {{ precioTxt(ahorroAnual(p)) }}</template>
          <template v-else-if="p.precio">IVA incluido · cancela cuando quieras</template>
          <template v-else>Sin tarjeta · sin fecha de vencimiento</template>
        </p>
        <div class="plan-limite"><Icono n="box" sm /><b>{{ limiteTxt(p.limites.productos) }}</b> productos</div>
        <ul class="plan-lista">
          <li v-for="b in p.beneficios" :key="b"><Icono n="check" sm />{{ b }}</li>
          <li v-for="l in p.limitaciones" :key="l" class="limitacion"><Icono n="x" sm />{{ l }}</li>
        </ul>
        <button type="button" class="ancho" :class="{ sec: !p.destacado }" :disabled="actual === p.id" @click="emit('elegir', p.id)">
          {{ actual === p.id ? 'Plan actual' : boton(p) }}
        </button>
      </article>
    </div>
  </div>
</template>
