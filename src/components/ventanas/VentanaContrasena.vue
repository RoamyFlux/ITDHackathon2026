<!--
  CAMBIAR CONTRASEÑA (también se abre al volver del correo de recuperación)
  Mismas reglas que al crear la cuenta: mínimo 8 caracteres, letras y números. Se escribe dos veces.
-->
<script setup>
import { ref, computed } from 'vue'
import { useSesion } from '../../stores/sesion.js'
import { useAvisos } from '../../stores/avisos.js'
import { validarContrasena } from '../../logica/validacion.js'
import Ventana from '../Ventana.vue'
import CampoContrasena from '../CampoContrasena.vue'

const props = defineProps({ desdeCorreo: Boolean })
const emit = defineEmits(['cerrar'])
const sesion = useSesion()
const avisos = useAvisos()
const c1 = ref('')
const c2 = ref('')
const guardando = ref(false)
const error = ref('')
const valida = computed(() => validarContrasena(c1.value).ok && c1.value === c2.value)

async function guardar () {
  error.value = ''
  if (c1.value !== c2.value) { error.value = 'Las contraseñas no coinciden.'; return }
  guardando.value = true
  try { await sesion.cambiarContrasena(c1.value); emit('cerrar'); avisos.avisar('Contraseña actualizada', 'ok') } catch (e) { error.value = e.message }
  guardando.value = false
}
</script>

<template>
  <Ventana titulo="Nueva contraseña" :subtitulo="props.desdeCorreo ? 'Entraste con el enlace del correo: crea tu contraseña nueva.' : 'Escríbela dos veces para confirmar.'" icono="lock" ancho="sm" @cerrar="emit('cerrar')">
    <form @submit.prevent="guardar">
      <CampoContrasena v-model="c1" etiqueta="Contraseña nueva" autocomplete="new-password" con-reglas />
      <CampoContrasena v-model="c2" etiqueta="Repite la contraseña" autocomplete="new-password" />
      <p v-if="c2 && c1 !== c2" class="pista mal">Las contraseñas no coinciden.</p>
      <p v-if="error" class="error-form" role="alert">{{ error }}</p>
      <div class="dlg-acciones">
        <button type="button" class="sec" @click="emit('cerrar')">Cancelar</button>
        <button type="submit" :disabled="!valida || guardando">{{ guardando ? 'Guardando…' : 'Guardar contraseña' }}</button>
      </div>
    </form>
  </Ventana>
</template>
