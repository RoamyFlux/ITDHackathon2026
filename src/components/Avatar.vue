<!-- FOTO DE PERFIL: la foto si existe; si no, las iniciales del negocio (o del correo) sobre el degradado. -->
<script setup>
import { computed } from 'vue'
import { useSesion } from '../stores/sesion.js'
import { iniciales } from '../logica/formato.js'

defineProps({ grande: Boolean })
const sesion = useSesion()
const ini = computed(() => iniciales(sesion.perfil.negocio, sesion.perfil.email))
</script>

<template>
  <span class="avatar" :class="{ xl: grande }"><img v-if="sesion.perfil.avatar" :src="sesion.perfil.avatar" alt=""><template v-else>{{ ini }}</template></span>
</template>
