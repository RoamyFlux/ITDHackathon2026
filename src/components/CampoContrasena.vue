<!--
  CAMPO DE CONTRASEÑA
  - Botón de ojo para mostrar u ocultar lo escrito.
  - con-reglas: muestra en vivo las reglas obligatorias (8+, letra, número) con palomita, y un medidor de fuerza.
-->
<script setup>
import { ref, computed } from 'vue'
import { validarContrasena } from '../logica/validacion.js'
import Icono from './Icono.vue'

const props = defineProps({ modelValue: String, etiqueta: String, autocomplete: String, conReglas: Boolean })
defineEmits(['update:modelValue'])
const ver = ref(false)
const v = computed(() => validarContrasena(props.modelValue || ''))
</script>

<template>
  <label class="campo-clave">{{ etiqueta }}
    <span class="con-ojo">
      <input :value="modelValue" :type="ver ? 'text' : 'password'" :autocomplete="autocomplete" required minlength="8" maxlength="72"
             @input="$emit('update:modelValue', $event.target.value)">
      <button type="button" class="ghost icono ojo" :aria-label="ver ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="ver = !ver"><Icono :n="ver ? 'eyeoff' : 'eye'" sm /></button>
    </span>
  </label>
  <div v-if="conReglas" class="reglas">
    <div class="fuerza" :class="'f' + v.fuerza" :aria-label="'Fuerza: ' + v.nivel"><i /><i /><i /><i /></div>
    <ul>
      <li v-for="r in v.reglas" :key="r.id" :class="{ ok: r.ok }"><Icono :n="r.ok ? 'check' : 'x'" sm />{{ r.texto }}</li>
      <li v-if="v.comun" class="mal"><Icono n="alert" sm />Es demasiado común</li>
    </ul>
    <small v-if="modelValue">Fuerza: <b>{{ v.nivel }}</b>. Tip: usa una frase con números, ej. "MiTienda-abre-a-las-7".</small>
  </div>
</template>
