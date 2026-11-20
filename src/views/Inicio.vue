<!--
  PÁGINA DE INICIO (presentación para clientes nuevos)
  1) Barra con logo y botones.  2) Portada: qué resuelve + vista previa animada.  3) Cómo funciona en 3 pasos.
  4) Beneficios.  5) Sugerencias inteligentes.  6) Seguridad.  7) Formulario para entrar / crear cuenta.
  8) Pie con Aviso de Privacidad y Términos.
  Sin testimonios ni cifras inventadas: todo lo que se dice aquí lo hace la app.
-->
<script setup>
import { ref, nextTick } from 'vue'
import { useSesion } from '../stores/sesion.js'
import { useUI } from '../stores/ui.js'
import Icono from '../components/Icono.vue'
import VistaPrevia from '../components/VistaPrevia.vue'
import FormAcceso from '../components/FormAcceso.vue'
import Pie from '../components/Pie.vue'
import PlanesTabla from '../components/PlanesTabla.vue'

const sesion = useSesion()
const ui = useUI()
const pestana = ref('entrar')
// Botones "Crear cuenta" / "Entrar": eligen la pestaña y bajan hasta el formulario.
async function irAcceso (p) {
  pestana.value = p
  await nextTick()
  document.getElementById('acceso').scrollIntoView({ behavior: 'smooth', block: 'center' })
}

const irA = id => document.getElementById(id).scrollIntoView({ behavior: 'smooth', block: 'start' })

const PASOS = [
  { i: 'box', t: 'Registra tus productos', d: 'Cuéntalos por paquetes (cajas × piezas + sueltas) o súbelos desde tu Excel en un minuto.' },
  { i: 'minus', t: 'Anota lo que vendes y lo que llega', d: 'Un toque en "Vendí" o "Llegó". La app abre paquetes sola y lleva la caducidad por lote.' },
  { i: 'bell', t: 'EarlyStock te avisa a tiempo', d: 'Antes de que algo se acabe o caduque, con sugerencias claras de qué hacer.' }
]
const BENEFICIOS = [
  { i: 'clock', t: '"Alcanza ~3 días"', d: 'Calcula cuántos días te dura cada producto según lo que vendes de verdad.' },
  { i: 'gift', t: 'Ofertas antes de perder', d: 'Detecta lo que caducará sin venderse y te propone 2×1 o descuento, con el texto listo.' },
  { i: 'cart', t: 'Lista de compras sola', d: 'Sabe cuántos paquetes pedir de cada presentación; cópiala o imprímela.' },
  { i: 'layers', t: 'Presentaciones y sabores', d: 'Cada producto con sus tamaños y sabores y el stock de cada uno, sin duplicados.' },
  { i: 'upload', t: 'Trae tu Excel', d: 'Reconoce tus columnas aunque se llamen distinto y te muestra todo antes de guardar.' },
  { i: 'phone', t: 'En tu celular', d: 'Se instala como app en Android, iPhone o computadora. Con tema claro, gris u oscuro.' }
]
const SEGURIDAD = [
  { i: 'finger', t: 'Llaves de acceso', d: 'Entra con tu huella, rostro o PIN. Sin contraseñas que se puedan robar.' },
  { i: 'lock', t: 'Tus datos son solo tuyos', d: 'Cada cuenta ve únicamente su información, protegida desde la base de datos.' },
  { i: 'activity', t: 'Actividad y alertas', d: 'Ve cuándo y desde dónde entraron, y cierra sesión en otros dispositivos.' },
  { i: 'shield', t: 'Correo verificado', d: 'Cuentas con correos reales y contraseñas de 8+ caracteres con letras y números.' }
]
</script>

<template>
  <div class="inicio">
    <header class="nav-inicio">
      <a class="marca" href="#/" aria-label="EarlyStock, inicio"><svg aria-hidden="true"><use href="#logo" /></svg><span class="nombre">Early<span>Stock</span></span></a>
      <nav class="nav-links" aria-label="Secciones">
        <a href="#como" @click.prevent="irA('como')">Cómo funciona</a>
        <a href="#beneficios" @click.prevent="irA('beneficios')">Beneficios</a>
        <a href="#seguridad" @click.prevent="irA('seguridad')">Seguridad</a>
        <a href="#planes" @click.prevent="irA('planes')">Precios</a>
        <a href="#" @click.prevent="ui.abrir('soporte')">Soporte</a>
      </nav>
      <div class="nav-der">
        <button v-if="sesion.dentro" type="button" @click="$router.push('/app')">Ir a mi inventario<Icono n="arrow" sm /></button>
        <template v-else>
          <button type="button" class="ghost claro" @click="irAcceso('entrar')">Entrar</button>
          <button type="button" @click="irAcceso('crear')">Crear cuenta</button>
        </template>
      </div>
    </header>

    <!-- PORTADA -->
    <section class="portada">
      <div class="portada-txt">
        <span class="etiqueta"><Icono n="spark" sm />Inventario inteligente para tiendas y negocios</span>
        <h1>Que nunca se te acabe<br><span class="grad">lo que más vendes.</span></h1>
        <p>EarlyStock te avisa <b>antes</b> de que un producto se agote o caduque, te sugiere ofertas para no perder dinero y arma tu lista de compras. Sin hojas de cálculo complicadas.</p>
        <div class="cta">
          <button type="button" class="grande" @click="irAcceso('crear')">Crear cuenta<Icono n="arrow" sm /></button>
          <button type="button" class="grande sec-oscuro" @click="sesion.entrarDemo()"><Icono n="spark" sm />Probar demo sin registrarse</button>
        </div>
        <ul class="mini-beneficios">
          <li><Icono n="check" sm />Listo en minutos</li>
          <li><Icono n="check" sm />Funciona en tu celular</li>
          <li><Icono n="check" sm />Entra con tu huella</li>
        </ul>
      </div>
      <VistaPrevia />
    </section>

    <main class="inicio-main">
      <!-- CÓMO FUNCIONA -->
      <section id="como" class="bloque">
        <h2 class="tit-bloque">Así de fácil, en <span class="grad-t">3 pasos</span></h2>
        <ol class="tres-pasos">
          <li v-for="(p, i) in PASOS" :key="p.t" class="card"><span class="num">{{ i + 1 }}</span><span class="ico-b"><Icono :n="p.i" /></span><h3>{{ p.t }}</h3><p>{{ p.d }}</p></li>
        </ol>
      </section>

      <!-- BENEFICIOS -->
      <section id="beneficios" class="bloque">
        <h2 class="tit-bloque">Todo lo que tu tienda necesita <span class="grad-t">saber hoy</span></h2>
        <div class="rejilla-beneficios">
          <article v-for="b in BENEFICIOS" :key="b.t" class="card beneficio"><span class="ico-b"><Icono :n="b.i" /></span><h3>{{ b.t }}</h3><p>{{ b.d }}</p></article>
        </div>
      </section>

      <!-- SUGERENCIAS -->
      <section class="bloque destacado">
        <div>
          <span class="etiqueta"><Icono n="bulb" sm />Sugerencias inteligentes</span>
          <h2 class="tit-bloque izq">Te dice <span class="grad-t">qué hacer</span>, no solo qué pasa</h2>
          <p>Compara lo que vendes cada día con las fechas de caducidad. Si un lote no se venderá a tiempo, te propone una oferta con el descuento adecuado. Tú la activas y la quitas cuando quieras.</p>
        </div>
        <div class="ejemplos-sug">
          <div class="card sug-ej crit"><Icono n="gift" /><div><b>Haz una oferta de Yogur bebible</b><small>Caduca en 2 días y sobrarán 20 piezas: 2×1 o 30 % de descuento.</small></div></div>
          <div class="card sug-ej low"><Icono n="truck" /><div><b>Pide pronto: 3 paquetes de Refresco</b><small>Quedan 15 piezas y alcanzan ~1 día.</small></div></div>
          <div class="card sug-ej"><Icono n="star" /><div><b>Tu más vendido: Refresco 600 ml</b><small>Asegura que nunca falte: considera subir su mínimo.</small></div></div>
        </div>
      </section>

      <!-- SEGURIDAD -->
      <section id="seguridad" class="bloque">
        <h2 class="tit-bloque">Seguridad <span class="grad-t">seria</span>, fácil de usar</h2>
        <div class="rejilla-beneficios cuatro">
          <article v-for="b in SEGURIDAD" :key="b.t" class="card beneficio"><span class="ico-b"><Icono :n="b.i" /></span><h3>{{ b.t }}</h3><p>{{ b.d }}</p></article>
        </div>
      </section>

      <!-- PLANES Y PRECIOS -->
      <section id="planes" class="bloque">
        <h2 class="tit-bloque">Planes para cada <span class="grad-t">tamaño de negocio</span></h2>
        <p class="sub-bloque">Empieza gratis. Cambia de plan cuando tu tienda crezca. Precios en pesos, IVA incluido.</p>
        <PlanesTabla :texto-boton="p => (p.precio ? `Empezar con ${p.nombre}` : 'Crear cuenta gratis')" @elegir="irAcceso('crear')" />
        <p class="nota-planes">Los planes de pago se activan después de crear tu cuenta, desde <b>Mi plan</b>. Pagas por transferencia, OXXO o tarjeta; sin plazos forzosos.</p>
      </section>

      <!-- ACCESO -->
      <section id="acceso" class="bloque acceso-bloque">
        <div class="acceso-txt">
          <h2 class="tit-bloque izq">Empieza <span class="grad-t">hoy</span></h2>
          <p>Crea tu cuenta con tu correo, o prueba la demostración con una tienda de ejemplo: no se guarda nada y no necesitas registrarte.</p>
          <button type="button" class="sec" @click="sesion.entrarDemo()"><Icono n="spark" sm />Probar demo</button>
        </div>
        <FormAcceso v-model:pestana="pestana" />
      </section>
    </main>
    <Pie />
  </div>
</template>
