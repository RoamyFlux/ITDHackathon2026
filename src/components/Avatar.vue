<!--
  FOTO DE PERFIL: la foto si existe; si no, las iniciales del negocio (o del correo) sobre el degradado.
  El aro alrededor indica el plan: ninguno en Gratis, plata en Pro y oro brillante en Max.
  El administrador lleva una coronita encima.
-->
<script setup>
import { computed } from 'vue'
import { useSesion } from '../stores/sesion.js'
import { usePlan } from '../stores/plan.js'
import { useSoporte } from '../stores/soporte.js'
import Icono from './Icono.vue'
import { iniciales } from '../logica/formato.js'

defineProps({ grande: Boolean })
const sesion = useSesion()
const plan = usePlan()
const soporte = useSoporte()
const ini = computed(() => iniciales(sesion.perfil.negocio, sesion.perfil.email))
</script>

<template>
  <span class="avatar-caja" :class="[{ xl: grande }, 'aro-' + plan.planId]">
    <span class="avatar" :class="{ xl: grande }"><img v-if="sesion.perfil.avatar" :src="sesion.perfil.avatar" alt=""><template v-else>{{ ini }}</template></span>
    <span v-if="soporte.esAdmin || plan.esAdmin" class="corona-avatar" title="Administrador"><Icono n="crown" sm /></span>
  </span>
</template>
