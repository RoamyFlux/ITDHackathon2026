<!--
  ADMINISTRACIÓN (solo la cuenta administradora)
  1) Planes de clientes: cuando un cliente paga, se le asigna Pro o Max por su correo y hasta qué fecha
     (función admin_asignar_plan de schema.sql §16). Al vencer, la cuenta vuelve sola a Gratis.
  2) Contactos de soporte: agregar varios de distintas redes, editar, ocultar/mostrar, ordenar y borrar, con
  vista previa con los logos originales. Si alguien sin permiso entra a esta dirección, ve un aviso; y aunque
  lo intentara a mano, la base de datos rechaza sus cambios (RLS + es_admin()).
-->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSesion } from '../stores/sesion.js'
import { usePlan } from '../stores/plan.js'
import InsigniaPlan from '../components/InsigniaPlan.vue'
import { useSoporte } from '../stores/soporte.js'
import { useAvisos } from '../stores/avisos.js'
import { REDES, validarContacto, enlaceContacto } from '../logica/soporte.js'
import { PLANES, planPorId, precioTxt } from '../logica/planes.js'
import { sb } from '../lib/supabase.js'
import { fechaISO, DIA } from '../logica/inventario.js'
import { fechaCorta } from '../logica/formato.js'
import Encabezado from '../components/Encabezado.vue'
import Pie from '../components/Pie.vue'
import Icono from '../components/Icono.vue'
import IconoRed from '../components/IconoRed.vue'

const soporte = useSoporte()
const sesion = useSesion()
const planStore = usePlan()
const avisos = useAvisos()
const revisando = ref(true)
const vacio = () => ({ id: null, red: 'whatsapp', etiqueta: '', valor: '', activo: true })
const form = ref(vacio())
const guardando = ref(false)
onMounted(async () => { await soporte.revisarAdmin(); if (soporte.esAdmin) { await soporte.cargar(); await cargarSuscripciones() } revisando.value = false })

/* ---- Planes de clientes ---- */
// Todas las cuentas de la app (admin_usuarios), con buscador por correo o nombre del negocio.
const usuarios = ref([])
const errorSusc = ref('')
const buscar = ref('')
const formPlan = ref({ email: '', plan: 'pro', vence: fechaISO(Date.now() + 30 * DIA), nota: '' })
let tBuscar = null
async function cargarSuscripciones () {
  errorSusc.value = ''
  const r = await sb.rpc('admin_usuarios', { p_buscar: buscar.value.trim().slice(0, 100) })
  if (r.error) errorSusc.value = /function|schema cache/i.test(r.error.message) ? 'Falta actualizar la base de datos (ejecutar supabase/schema.sql).' : r.error.message
  else usuarios.value = r.data || []
}
const alBuscar = () => { clearTimeout(tBuscar); tBuscar = setTimeout(cargarSuscripciones, 350) }
const resumen = computed(() => ({ total: usuarios.value.length, pro: usuarios.value.filter(u => u.plan_vigente === 'pro').length, max: usuarios.value.filter(u => u.plan_vigente === 'max').length }))
const asignarPlan = () => hacer(async () => {
  const f = formPlan.value
  const r = await sb.rpc('admin_asignar_plan', { p_email: f.email.trim().toLowerCase(), p_plan: f.plan, p_vence: f.plan === 'gratis' || f.sinVence ? null : (f.vence || null), p_nota: f.nota })
  if (r.error) throw new Error(r.error.message)
  // Si el administrador se asignó un plan a sí mismo, se actualiza su insignia.
  if (f.email.trim().toLowerCase() === sesion.perfil.email.toLowerCase()) await planStore.cargar()
  await cargarSuscripciones()
  formPlan.value = { email: '', plan: 'pro', vence: fechaISO(Date.now() + 30 * DIA), nota: '' }
}, `Plan asignado a ${formPlan.value.email}`)
// Llenar el formulario con una cuenta de la lista (para asignar o renovar su plan).
const elegirUsuario = u => {
  const base = u.vence && u.plan_vigente !== 'gratis' ? new Date(u.vence + 'T12:00:00').getTime() : Date.now()
  formPlan.value = { email: u.email, plan: u.plan_vigente === 'gratis' ? 'pro' : u.plan_vigente, vence: fechaISO(Math.max(Date.now(), base) + 30 * DIA), nota: '', sinVence: false }
  document.getElementById('form-plan').scrollIntoView({ behavior: 'smooth', block: 'center' })
}
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
      <h2 class="admin-sub"><Icono n="star" />Usuarios y planes</h2>
      <div class="admin-rejilla">
        <form id="form-plan" class="card admin-form" @submit.prevent="asignarPlan">
          <h2>Asignar plan</h2>
          <p class="hint">Elige una cuenta de la lista (o escribe su correo), el plan y hasta qué día está pagado. Al pasar esa fecha vuelve sola a Gratis. Puedes dar planes de cortesía sin vencimiento.</p>
          <label>Correo de la cuenta del cliente<input v-model="formPlan.email" type="email" required maxlength="254" placeholder="cliente@correo.com"></label>
          <div class="campo"><span>Plan</span>
            <div class="seg">
              <button v-for="p in PLANES" :key="p.id" type="button" :aria-pressed="formPlan.plan === p.id" @click="formPlan.plan = p.id">{{ p.nombre }} · {{ precioTxt(p.precio) }}</button>
            </div>
          </div>
          <label v-if="formPlan.plan !== 'gratis' && !formPlan.sinVence">Pagado hasta<input v-model="formPlan.vence" type="date" required></label>
          <label v-if="formPlan.plan !== 'gratis'" class="check"><input v-model="formPlan.sinVence" type="checkbox"> <span>Sin fecha de vencimiento (cortesía, pruebas o cuenta propia)</span></label>
          <label>Nota <small>(opcional: forma de pago, folio…)</small><input v-model="formPlan.nota" maxlength="200" placeholder="Ej. Transferencia folio 1234"></label>
          <div class="dlg-acciones"><button type="submit" :disabled="guardando || !formPlan.email"><Icono n="check" sm />Guardar plan</button></div>
        </form>
        <section class="card admin-lista usuarios">
          <div class="sec-tit"><h2><Icono n="user" />Usuarios de la app</h2><span class="contador">{{ resumen.total }}</span></div>
          <p class="hint">{{ resumen.pro }} con Pro · {{ resumen.max }} con Max · el resto Gratis. Toca "Asignar plan" para cambiar el de cualquier cuenta (también la tuya).</p>
          <div class="buscar"><Icono n="search" /><input v-model="buscar" type="search" maxlength="100" placeholder="Buscar por correo o negocio" aria-label="Buscar usuario" @input="alBuscar"></div>
          <p v-if="errorSusc" class="nota low">{{ errorSusc }}</p>
          <ul v-else-if="usuarios.length" class="contactos lista-usuarios">
            <li v-for="u in usuarios" :key="u.email" :class="{ oculto: !u.confirmado }">
              <div class="contacto">
                <span class="avatar-mini" :class="'aro-' + u.plan_vigente">{{ (u.negocio || u.email).slice(0, 2).toUpperCase() }}</span>
                <span>
                  <b>{{ u.negocio || u.email }} <InsigniaPlan :plan="u.plan_vigente" :admin="u.es_admin" /></b>
                  <small>{{ u.negocio ? u.email + ' · ' : '' }}{{ planPorId(u.plan_vigente).nombre }}{{ u.vence && u.plan_vigente !== 'gratis' ? ' hasta el ' + fechaCorta(u.vence) : '' }}{{ u.plan !== u.plan_vigente ? ' (su ' + planPorId(u.plan).nombre + ' venció)' : '' }} · {{ u.productos }} productos{{ u.confirmado ? '' : ' · sin confirmar correo' }}{{ u.ultimo_acceso ? ' · último acceso ' + fechaCorta(String(u.ultimo_acceso).slice(0, 10)) : '' }}</small>
                </span>
                <span class="admin-acc"><button type="button" class="sec sm" @click="elegirUsuario(u)"><Icono n="star" sm />Asignar plan</button></span>
              </div>
            </li>
          </ul>
          <p v-else class="hint">{{ buscar ? 'Ninguna cuenta coincide con la búsqueda.' : 'Aún no hay cuentas.' }}</p>
        </section>
      </div>

      <h2 class="admin-sub"><Icono n="chat" />Contactos de soporte</h2>
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
