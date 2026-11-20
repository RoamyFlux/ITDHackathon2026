<!--
  AYUDA Y SOPORTE
  Botones para hablar con el equipo de soporte por cada medio que dio de alta el administrador (con el logo
  y color original de cada red). Cada enlace se arma de forma segura (logica/soporte.js) y se abre aparte.
  También da acceso a la guía rápida y a los atajos de teclado.
-->
<script setup>
import { computed, onMounted } from 'vue'
import { useSoporte } from '../../stores/soporte.js'
import { useUI } from '../../stores/ui.js'
import { useSesion } from '../../stores/sesion.js'
import { REDES, enlaceContacto } from '../../logica/soporte.js'
import Ventana from '../Ventana.vue'
import Icono from '../Icono.vue'
import IconoRed from '../IconoRed.vue'

const emit = defineEmits(['cerrar'])
const soporte = useSoporte()
const ui = useUI()
const sesion = useSesion()
onMounted(() => soporte.cargar())
const lista = computed(() => soporte.contactos.filter(c => c.activo).map(c => ({ ...c, url: enlaceContacto(c.red, c.valor), nombre: REDES[c.red] ? REDES[c.red].t : c.red })).filter(c => c.url))
</script>

<template>
  <Ventana titulo="Ayuda y soporte" subtitulo="¿Dudas o algo no funciona? Escríbenos" icono="help" ancho="sm" @cerrar="emit('cerrar')">
    <div v-if="!soporte.cargado" class="esqueleto" />
    <p v-else-if="soporte.error" class="nota low">{{ soporte.error }}</p>
    <ul v-else-if="lista.length" class="contactos">
      <li v-for="c in lista" :key="c.id">
        <a class="contacto" :href="c.url" target="_blank" rel="noopener noreferrer">
          <IconoRed :red="c.red" grande />
          <span><b>{{ c.etiqueta || c.nombre }}</b><small>{{ c.etiqueta ? c.nombre + ' · ' : '' }}{{ c.valor }}</small></span>
          <Icono n="arrow" sm />
        </a>
      </li>
    </ul>
    <p v-else class="nota">Aún no hay contactos de soporte.</p>
    <div class="lista-opciones">
      <button v-if="sesion.dentro" type="button" class="opcion" @click="ui.abrir('guia')"><Icono n="spark" /><span><b>Guía rápida</b><small>Cómo usar EarlyStock en 5 pasos</small></span><Icono n="arrow" sm /></button>
      <button v-if="sesion.dentro" type="button" class="opcion" @click="ui.abrir('atajos')"><Icono n="keyboard" /><span><b>Atajos de teclado</b><small>Ctrl + K, N, / y más</small></span><Icono n="arrow" sm /></button>
    </div>
  </Ventana>
</template>
