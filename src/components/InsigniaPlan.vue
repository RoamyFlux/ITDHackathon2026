<!--
  INSIGNIA DEL PLAN Y CORONA DEL ADMINISTRADOR
  - Gratis: no muestra nada (a propósito: la insignia es un distintivo de los planes de pago).
  - Pro: insignia PLATA (degradado metálico gris claro).
  - Max: insignia ORO BRILLANTE (degradado dorado con un destello que pasa cada pocos segundos).
  - Administrador: coronita dorada al lado (aunque su plan sea Gratis).
  Props: plan ('gratis' | 'pro' | 'max'), admin (booleano), grande (para el perfil y el saludo).
-->
<script setup>
import Icono from './Icono.vue'
defineProps({ plan: { type: String, default: 'gratis' }, admin: Boolean, grande: Boolean })
</script>

<template>
  <span v-if="plan !== 'gratis' || admin" class="insignias" :class="{ grande }">
    <span v-if="admin" class="corona" title="Administrador" role="img" aria-label="Administrador"><Icono n="crown" sm /></span>
    <span v-if="plan === 'pro'" class="insignia-plan plata" title="Plan Pro">PRO</span>
    <span v-else-if="plan === 'max'" class="insignia-plan oro" title="Plan Max">MAX</span>
  </span>
</template>
