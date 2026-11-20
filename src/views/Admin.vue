<!--
  ADMINISTRACIÓN (solo la cuenta administradora)
  Contactos de soporte: agregar varios de distintas redes, editar, ocultar/mostrar, ordenar y borrar, con
  vista previa con los logos originales. Si alguien sin permiso entra a esta dirección, ve un aviso; y aunque
  lo intentara a mano, la base de datos rechaza sus cambios (RLS + es_admin()).
-->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSoporte } from '../stores/soporte.js'
import { useAvisos } from '../stores/avisos.js'
import { REDES, validarContacto, enlaceContacto } from '../logica/soporte.js'
import Encabezado from '../components/Encabezado.vue'
import Pie from '../components/Pie.vue'
import Icono from '../components/Icono.vue'
import IconoRed from '../components/IconoRed.vue'

const soporte = useSoporte()
const avisos = useAvisos()
const revisando = ref(true)
const vacio = () => ({ id: null, red: 'whatsapp', etiqueta: '', valor: '', activo: true })
const form = ref(vacio())
const guardando = ref(false)
onMounted(async () => { await soporte.revisarAdmin(); if (soporte.esAdmin) await soporte.cargar(); revisando.value = false })
const errorForm = computed(() => (form.value.valor ? validarContacto(form.value.red, form.value.valor) : ''))

async function hacer (fn, ok) {
  guardando.value = true
  try { await fn(); if (ok) avisos.avisar(ok, 'ok') } catch (e) { avisos.avisar(e.message) }
  guardando.value = false
}
const guardar = () => hacer(async () => { await soporte.guardar(form.value); form.value = vacio() }, form.value.id ? 'Contacto actualizado' : 'Contacto agregado')
const editar = c => { form.value = { ...c }; document.getElementById('form-contacto').scrollIntoView({ behavior: 'smooth', block: 'center' }) }
async function borrar (c) {
  if (await avisos.confirmar({ titulo: '¿Borrar este contacto?', mensaje: `${REDES[c.red].t}: ${c.valor}`, boton: 'Borrar' })) hacer(() => soporte.borrar(c), 'Contacto borrado')
}
</script>

<template>
  <Encabezado />
  <main class="admin">
    <div v-if="revisando" class="esqueleto alto" />
    <div v-else-if="!soporte.esAdmin" class="card estado-vacio"><span class="ico-grande rojo"><Icono n="lock" /></span><div><b>Solo para administradores</b><br><small>Esta cuenta no tiene permiso de administración.</small> <router-link to="/app">Volver a mi inventario</router-link></div></div>
    <template v-else>
      <div class="admin-cab">
        <h1><Icono n="shield" />Administración</h1>
        <p>Los contactos que agregues aquí aparecen en "Ayuda y soporte" para todos los usuarios (y en la página de inicio).</p>
      </div>
      <div class="admin-rejilla">
        <form id="form-contacto" class="card admin-form" @submit.prevent="guardar">
          <h2>{{ form.id ? 'Editar contacto' : 'Agregar contacto' }}</h2>
          <div class="campo"><span>Red</span>
            <div class="redes-elegir">
              <button v-for="(r, k) in REDES" :key="k" type="button" class="red-op" :aria-pressed="form.red === k" :title="r.t" @click="form.red = k"><IconoRed :red="k" /><span>{{ r.t }}</span></button>
            </div>
          </div>
          <label>{{ REDES[form.red].tipo === 'telefono' ? 'Número' : REDES[form.red].tipo === 'correo' ? 'Correo' : 'Usuario o enlace' }}
            <input v-model="form.valor" maxlength="200" required :placeholder="REDES[form.red].ayuda" :aria-invalid="!!errorForm">
          </label>
          <p v-if="errorForm" class="pista mal">{{ errorForm }}</p>
          <p v-else-if="form.valor" class="pista ok-txt"><Icono n="check" sm /> Enlace: {{ enlaceContacto(form.red, form.valor) }}</p>
          <label>Nombre visible <small>(opcional)</small><input v-model="form.etiqueta" maxlength="60" placeholder="Ej. Soporte técnico, Ventas"></label>
          <label class="check"><input v-model="form.activo" type="checkbox"> <span>Visible para los usuarios</span></label>
          <div class="dlg-acciones">
            <button v-if="form.id" type="button" class="sec" @click="form = vacio()">Cancelar</button>
            <button type="submit" :disabled="guardando || !form.valor || !!errorForm"><Icono :n="form.id ? 'check' : 'plus'" sm />{{ form.id ? 'Guardar cambios' : 'Agregar contacto' }}</button>
          </div>
        </form>
        <section class="card admin-lista">
          <div class="sec-tit"><h2><Icono n="chat" />Contactos de soporte</h2><span class="contador">{{ soporte.contactos.length }}</span></div>
          <p v-if="soporte.error" class="nota low">{{ soporte.error }}</p>
          <ul v-if="soporte.contactos.length" class="contactos">
            <li v-for="(c, i) in soporte.contactos" :key="c.id" :class="{ oculto: !c.activo }">
              <div class="contacto">
                <IconoRed :red="c.red" grande />
                <span><b>{{ c.etiqueta || REDES[c.red].t }}</b><small>{{ REDES[c.red].t }} · {{ c.valor }}{{ c.activo ? '' : ' · oculto' }}</small></span>
                <span class="admin-acc">
                  <button type="button" class="ghost icono sm" :disabled="i === 0" aria-label="Subir" title="Subir" @click="hacer(() => soporte.mover(c, -1))"><Icono n="up" sm /></button>
                  <button type="button" class="ghost icono sm" :disabled="i === soporte.contactos.length - 1" aria-label="Bajar" title="Bajar" @click="hacer(() => soporte.mover(c, 1))"><Icono n="dn" sm /></button>
                  <button type="button" class="ghost icono sm" :aria-label="c.activo ? 'Ocultar' : 'Mostrar'" :title="c.activo ? 'Ocultar' : 'Mostrar'" @click="hacer(() => soporte.alternar(c))"><Icono :n="c.activo ? 'eye' : 'eyeoff'" sm /></button>
                  <button type="button" class="ghost icono sm" aria-label="Editar" title="Editar" @click="editar(c)"><Icono n="edit" sm /></button>
                  <button type="button" class="ghost icono sm" aria-label="Borrar" title="Borrar" @click="borrar(c)"><Icono n="trash" sm /></button>
                </span>
              </div>
            </li>
          </ul>
          <p v-else class="hint">Aún no hay contactos. Agrega el primero con el formulario.</p>
        </section>
      </div>
    </template>
  </main>
  <Pie />
</template>
