<!--
  AVISO FLOTANTE (toast) Y VENTANA DE CONFIRMACIÓN
  Ambos se controlan desde el store "avisos" (avisar / confirmar). El texto se muestra con {{ }}:
  Vue lo escapa siempre, así nunca se interpreta como código HTML (seguridad).
-->
<script setup>
import { useAvisos } from '../stores/avisos.js'
import Icono from './Icono.vue'
import Ventana from './Ventana.vue'

const avisos = useAvisos()
function accion () { const a = avisos.aviso.accion; avisos.cerrarAviso(); a.fn() }
</script>

<template>
  <Transition name="toast">
    <div v-if="avisos.aviso" :key="avisos.aviso.id" id="aviso" :class="avisos.aviso.tipo" role="status" aria-live="polite">
      <span class="ico-aviso"><Icono :n="avisos.aviso.tipo === 'ok' ? 'check' : 'alert'" sm /></span>
      <span class="aviso-txt">{{ avisos.aviso.texto }}</span>
      <button v-if="avisos.aviso.accion" type="button" class="sec sm aviso-accion" @click="accion"><Icono n="refresh" sm />{{ avisos.aviso.accion.texto }}</button>
      <button type="button" class="ghost icono sm aviso-x" aria-label="Cerrar aviso" @click="avisos.cerrarAviso()"><Icono n="x" sm /></button>
    </div>
  </Transition>

  <Ventana v-if="avisos.confirmacion" ancho="sm" sin-cabecera @cerrar="avisos.responder(false)">
    <div class="confirmar">
      <div v-if="avisos.confirmacion.peligro" class="ico-conf"><Icono n="alert" /></div>
      <h2>{{ avisos.confirmacion.titulo }}</h2>
      <p>{{ avisos.confirmacion.mensaje }}</p>
      <div class="dlg-acciones">
        <button type="button" class="sec" @click="avisos.responder(false)">Cancelar</button>
        <button type="button" :class="{ rojo: avisos.confirmacion.peligro }" @click="avisos.responder(true)">{{ avisos.confirmacion.boton }}</button>
      </div>
    </div>
  </Ventana>
</template>
