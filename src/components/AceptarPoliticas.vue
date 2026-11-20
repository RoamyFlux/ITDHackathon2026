<!--
  ACEPTAR POLÍTICAS
  Aparece si la cuenta no ha aceptado la versión actual de los Términos de Uso y del Aviso de Privacidad
  (por ejemplo, cuentas creadas antes de que existieran o si se actualizaron). Sin aceptar no se puede usar
  la app; se puede salir. Se guarda la versión y la fecha en la cuenta.
-->
<script setup>
import { ref } from 'vue'
import { useSesion } from '../stores/sesion.js'
import { useAvisos } from '../stores/avisos.js'
import Ventana from './Ventana.vue'

const sesion = useSesion()
const avisos = useAvisos()
const acepto = ref(false)
const guardando = ref(false)
async function aceptar () {
  guardando.value = true
  try { await sesion.aceptarPoliticas(); avisos.avisar('Gracias. Ya puedes usar EarlyStock.', 'ok') } catch (e) { avisos.avisar(e.message) }
  guardando.value = false
}
</script>

<template>
  <Ventana titulo="Antes de continuar" subtitulo="Actualizamos cómo cuidamos tus datos" icono="shield" ancho="sm" @cerrar="() => {}">
    <p class="texto">Para usar EarlyStock necesitas aceptar los <router-link to="/terminos" target="_blank">Términos de Uso</router-link> y el
      <router-link to="/privacidad" target="_blank">Aviso de Privacidad</router-link>. Ahí explicamos qué datos guardamos, para qué y cómo puedes borrarlos.</p>
    <label class="check"><input v-model="acepto" type="checkbox"> <span>Leí y acepto los Términos de Uso y el Aviso de Privacidad.</span></label>
    <div class="dlg-acciones">
      <button type="button" class="sec" @click="sesion.salir()">Salir</button>
      <button type="button" :disabled="!acepto || guardando" @click="aceptar">Aceptar y continuar</button>
    </div>
  </Ventana>
</template>
