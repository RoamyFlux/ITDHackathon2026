<!--
  HERRAMIENTAS
  Importar / exportar Excel, plantilla, tienda de ejemplo y borrar todo. El valor aproximado del inventario
  aparece aquí, discreto (no es el dato principal de la app).
-->
<script setup>
import { useInventario } from '../stores/inventario.js'
import { useUI } from '../stores/ui.js'
import { useAvisos } from '../stores/avisos.js'
import { useSesion } from '../stores/sesion.js'
import { dinero } from '../logica/formato.js'
import { descargarPlantilla, exportarInventario } from '../lib/exportar.js'
import Icono from './Icono.vue'

const inv = useInventario()
const ui = useUI()
const avisos = useAvisos()
const sesion = useSesion()
const plantilla = () => descargarPlantilla(avisos)
const exportar = () => exportarInventario(inv, sesion, avisos)
</script>

<template>
  <section id="herramientas" class="card herr">
    <div class="sec-tit"><h2><Icono n="sliders" />Herramientas</h2></div>
    <div class="acciones">
      <button type="button" class="sm" @click="ui.abrir('importar')"><Icono n="upload" sm />Importar Excel</button>
      <button type="button" class="sec sm" @click="exportar"><Icono n="download" sm />Exportar Excel</button>
      <button type="button" class="sec sm" @click="plantilla"><Icono n="file" sm />Plantilla</button>
      <button type="button" class="sec sm" @click="inv.cargarEjemplo()"><Icono n="spark" sm />Tienda de ejemplo</button>
      <button type="button" class="peligro sm" @click="inv.borrarTodo()"><Icono n="trash" sm />Borrar todo el inventario</button>
    </div>
    <p v-if="inv.resumen.valor" class="valor-discreto"><Icono n="wallet" sm />Valor aprox. en tienda (a costo): {{ dinero(inv.resumen.valor) }}</p>
  </section>
</template>
