<!--
  GUÍA RÁPIDA (5 pasos)
  Aparece la primera vez que se entra en un dispositivo y siempre desde el botón "?" del encabezado.
  Explica con palabras simples cómo se usa EarlyStock. Se avanza con Siguiente / Atrás o las flechas.
-->
<script setup>
import { ref } from 'vue'
import { useUI } from '../../stores/ui.js'
import { useInventario } from '../../stores/inventario.js'
import Ventana from '../Ventana.vue'
import Icono from '../Icono.vue'

const emit = defineEmits(['cerrar'])
const ui = useUI()
const inv = useInventario()
const i = ref(0)
const PASOS = [
  { ic: 'spark', t: 'Bienvenido a EarlyStock', d: 'Te ayudamos a saber, ANTES de que pase, qué se te va a acabar o caducar. Son 5 pasos rápidos.' },
  { ic: 'box', t: '1. Registra tus productos', d: 'Con "Nuevo producto" o desde tu Excel. Cuéntalos por paquetes y agrega sus presentaciones (600 ml, 2 L…) y sabores: todo queda en una sola tarjeta y nunca se duplica.' },
  { ic: 'minus', t: '2. Anota lo que vendes y lo que llega', d: '"Vendí" resta piezas (abre paquetes sola). "Llegó" suma mercancía y puedes poner su fecha de caducidad.' },
  { ic: 'bell', t: '3. Fíjate en los colores', d: 'Rojo = urgente (se acabó o caducó). Ámbar = atención (queda poco o caduca pronto). Verde = todo bien. "Alcanza ~N días" te dice cuánto te dura.' },
  { ic: 'bulb', t: '4. Sigue las sugerencias', d: 'Te decimos qué hacer: pedir N paquetes, retirar lo caducado o poner una oferta (2×1 o descuento) que activas y quitas cuando quieras.' },
  { ic: 'cart', t: '5. Compra sin pensar', d: 'La lista de compras se arma sola: cópiala o imprímela para tu proveedor. ¿Dudas? Toca "?" y escríbenos a soporte.' }
]
function tecla (e) { if (e.key === 'ArrowRight') i.value = Math.min(PASOS.length - 1, i.value + 1); if (e.key === 'ArrowLeft') i.value = Math.max(0, i.value - 1) }
function terminar () { emit('cerrar'); if (!inv.productos.length) setTimeout(() => ui.abrir('producto'), 80) }
</script>

<template>
  <Ventana ancho="sm" sin-cabecera @cerrar="emit('cerrar')">
    <div class="guia" tabindex="-1" @keydown="tecla">
      <Transition name="paso" mode="out-in">
        <div :key="i" class="guia-paso">
          <span class="guia-ico"><Icono :n="PASOS[i].ic" /></span>
          <h2>{{ PASOS[i].t }}</h2>
          <p>{{ PASOS[i].d }}</p>
        </div>
      </Transition>
      <div class="puntos" aria-hidden="true"><i v-for="(p, k) in PASOS" :key="k" :class="{ activo: k === i }" /></div>
      <div class="dlg-acciones">
        <button v-if="i > 0" type="button" class="sec" @click="i--">Atrás</button>
        <button v-else type="button" class="ghost" @click="emit('cerrar')">Saltar</button>
        <button v-if="i < PASOS.length - 1" type="button" autofocus @click="i++">Siguiente<Icono n="arrow" sm /></button>
        <button v-else type="button" @click="terminar">{{ inv.productos.length ? '¡Listo!' : 'Agregar mi primer producto' }}</button>
      </div>
    </div>
  </Ventana>
</template>
