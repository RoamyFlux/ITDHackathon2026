<!-- ÍCONO: dibuja un símbolo del sprite (SpriteIconos.vue). Uso: <Icono n="cart" /> o <Icono n="cart" sm /> -->
<script setup>
defineProps({ n: { type: String, required: true }, sm: Boolean })
</script>

<template>
  <svg class="ic" :class="{ sm }" aria-hidden="true"><use :href="'#i-' + n" /></svg>
</template>
