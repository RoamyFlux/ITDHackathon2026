<!--
  PLANES Y PRECIOS (dentro de la app)
  Muestra el plan actual y su uso, las tres opciones y CÓMO CONTRATAR:
    1) Elegir Pro o Max.  2) Escribir a soporte (WhatsApp o correo con el mensaje ya escrito, que incluye el
    correo de la cuenta).  3) Soporte envía los datos de pago (transferencia, depósito en OXXO o tarjeta) y el
    administrador activa el plan desde Admin. Bajar de plan o cancelar: igual, por soporte; los datos se conservan.
-->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePlan } from '../../stores/plan.js'
import { useInventario } from '../../stores/inventario.js'
import { useSoporte } from '../../stores/soporte.js'
import { useSesion } from '../../stores/sesion.js'
import { useUI } from '../../stores/ui.js'
import { planPorId, precioTxt, limiteTxt, usoPct } from '../../logica/planes.js'
import { REDES, enlaceConMensaje } from '../../logica/soporte.js'
import { fechaCorta } from '../../logica/formato.js'
import Ventana from '../Ventana.vue'
import Icono from '../Icono.vue'
import IconoRed from '../IconoRed.vue'
import PlanesTabla from '../PlanesTabla.vue'

const emit = defineEmits(['cerrar'])
const plan = usePlan()
const inv = useInventario()
const soporte = useSoporte()
const sesion = useSesion()
const ui = useUI()
const elegido = ref(null)
onMounted(() => { plan.cargar(); soporte.cargar() })

const usados = computed(() => inv.productos.length)
const pct = computed(() => usoPct(plan.planId, usados.value))
const mensaje = computed(() => {
  const p = planPorId(elegido.value)
  return `Hola, quiero contratar el plan ${p.nombre} de EarlyStock (${precioTxt(p.precio)} MXN al mes). El correo de mi cuenta es ${sesion.perfil.email}.`
})
const contactos = computed(() => soporte.contactos.filter(c => c.activo)
  .map(c => ({ ...c, url: enlaceConMensaje(c.red, c.valor, mensaje.value, `Contratar plan ${planPorId(elegido.value).nombre}`), nombre: REDES[c.red] ? REDES[c.red].t : c.red }))
  .filter(c => c.url))
function elegir (id) {
  if (id === 'gratis') { elegido.value = 'gratis'; return }
  elegido.value = id
  setTimeout(() => document.getElementById('como-contratar')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
}
const texto = p => (p.id === 'gratis' ? 'Cambiar a Gratis' : `Contratar ${p.nombre}`)
</script>

<template>
  <Ventana titulo="Planes" subtitulo="Elige el plan que va con el tamaño de tu negocio" icono="star" ancho="xl" @cerrar="emit('cerrar')">
    <div class="mi-plan card-in">
      <div>
        <small>Tu plan</small>
        <b>{{ plan.plan.nombre }}<template v-if="sesion.esDemo"> (demostración)</template></b>
        <small v-if="plan.vence && !plan.vencido">Pagado hasta el {{ fechaCorta(plan.vence) }}</small>
        <small v-if="plan.vencido" class="mal">Tu plan {{ planPorId(plan.contratado).nombre }} venció: volviste a Gratis. Tus datos siguen guardados.</small>
      </div>
      <div class="uso">
        <span>{{ usados.toLocaleString('es-MX') }} de {{ limiteTxt(plan.plan.limites.productos) }} productos</span>
        <span v-if="pct !== null" class="barra-uso" :class="{ low: pct >= 80, crit: pct >= 100 }"><i :style="{ width: pct + '%' }" /></span>
      </div>
    </div>

    <PlanesTabla :actual="plan.planId" :texto-boton="texto" @elegir="elegir" />

    <section v-if="elegido && elegido !== 'gratis'" id="como-contratar" class="contratar card-in">
      <h3><Icono n="star" sm />Contratar {{ planPorId(elegido).nombre }} · {{ precioTxt(planPorId(elegido).precio) }} MXN al mes</h3>
      <ol class="pasos">
        <li>Escríbenos con un toque (el mensaje ya incluye el plan y el correo de tu cuenta).</li>
        <li>Te enviamos los datos de pago: transferencia, depósito en OXXO o tarjeta.</li>
        <li>Activamos tu plan a más tardar el siguiente día hábil después de recibir tu pago. Lo verás aquí en "Tu plan".</li>
      </ol>
      <p v-if="sesion.esDemo" class="nota">Primero crea tu cuenta gratis; después contrata desde "Planes".</p>
      <ul v-else-if="contactos.length" class="contactos">
        <li v-for="c in contactos" :key="c.id">
          <a class="contacto" :href="c.url" target="_blank" rel="noopener noreferrer"><IconoRed :red="c.red" grande /><span><b>{{ c.etiqueta || c.nombre }}</b><small>{{ c.nombre }} · {{ c.valor }}</small></span><Icono n="arrow" sm /></a>
        </li>
      </ul>
      <p v-else class="nota">Aún no hay contactos de soporte. <button type="button" class="enlace en-linea" @click="ui.abrir('soporte')">Ver Ayuda y soporte</button></p>
    </section>
    <p v-else-if="elegido === 'gratis'" class="nota">Para bajar a Gratis o cancelar, escríbenos desde <button type="button" class="enlace en-linea" @click="ui.abrir('soporte')">Ayuda y soporte</button>. Tus datos se conservan; si tienes más de {{ limiteTxt(planPorId('gratis').limites.productos) }} productos podrás verlos y venderlos, pero no agregar nuevos.</p>
  </Ventana>
</template>
