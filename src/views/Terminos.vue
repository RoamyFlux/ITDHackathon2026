<!--
  TÉRMINOS DE USO
  Reglas para usar EarlyStock: cuenta, uso permitido, contenido del usuario, disponibilidad y responsabilidad.
  Completar: [Nombre del responsable], [correo de contacto], [ciudad y estado].
-->
<script setup>
import PaginaLegal from '../components/PaginaLegal.vue'
const SECCIONES = [
  { id: 'aceptacion', t: '1. Aceptación' },
  { id: 'cuenta', t: '2. Tu cuenta' },
  { id: 'uso', t: '3. Uso permitido' },
  { id: 'datos', t: '4. Tu información' },
  { id: 'planes', t: '5. Planes y pagos' },
  { id: 'calculos', t: '6. Alertas y sugerencias' },
  { id: 'servicio', t: '7. Disponibilidad' },
  { id: 'responsabilidad', t: '8. Responsabilidad' },
  { id: 'baja', t: '9. Cancelación' },
  { id: 'ley', t: '10. Ley aplicable y contacto' }
]
</script>

<template>
  <PaginaLegal titulo="Términos de Uso" actualizado="noviembre de 2026" :secciones="SECCIONES">
    <section id="aceptacion">
      <h2>1. Aceptación</h2>
      <p>EarlyStock es un servicio de <b>[Nombre del responsable]</b> para controlar el inventario de pequeños negocios. Al crear una cuenta o usar la app aceptas estos Términos y el <router-link to="/privacidad">Aviso de Privacidad</router-link>. Si no estás de acuerdo, no uses el servicio.</p>
    </section>
    <section id="cuenta">
      <h2>2. Tu cuenta</h2>
      <ul>
        <li>Debes registrarte con un correo real que te pertenezca y confirmarlo.</li>
        <li>Tu contraseña debe tener al menos 8 caracteres con letras y números. Eres responsable de mantenerla en secreto y de las llaves de acceso que agregues.</li>
        <li>Avísanos de inmediato a <b>[correo de contacto]</b> si crees que alguien entró a tu cuenta.</li>
        <li>Debes ser mayor de edad o contar con autorización de quien ejerza la patria potestad.</li>
      </ul>
    </section>
    <section id="uso">
      <h2>3. Uso permitido</h2>
      <p>Puedes usar EarlyStock para administrar tu negocio. No está permitido:</p>
      <ul>
        <li>Intentar acceder a cuentas o datos de otras personas, o a partes del sistema que no te correspondan.</li>
        <li>Probar, escanear o vulnerar la seguridad del servicio sin autorización por escrito.</li>
        <li>Subir archivos con código malicioso o usar el servicio para actividades ilegales.</li>
        <li>Crear cuentas de forma automatizada o con correos temporales.</li>
      </ul>
      <p>Si encuentras una falla de seguridad, repórtala de forma responsable a <b>[correo de contacto]</b>.</p>
    </section>
    <section id="datos">
      <h2>4. Tu información</h2>
      <p>Lo que registras (productos, ventas, fotos) es tuyo. Nos das permiso solo para guardarlo y procesarlo con el fin de prestarte el servicio. Puedes exportarlo a Excel o borrarlo cuando quieras.</p>
    </section>
    <section id="planes">
      <h2>5. Planes y pagos</h2>
      <ul>
        <li><b>Gratis</b> ($0): hasta 1,000 productos y 3 ofertas activas. <b>Pro</b> ($149 MXN al mes o $1,490 al año): hasta 10,000 productos y ofertas ilimitadas. <b>Max</b> ($349 MXN al mes o $3,490 al año): productos y ofertas ilimitados. Precios con IVA incluido; cada presentación o sabor cuenta como un producto.</li>
        <li>Los planes de pago se contratan escribiendo a soporte. El pago (transferencia, depósito en OXXO o tarjeta) se hace por adelantado y cubre el periodo indicado; el plan se activa a más tardar el siguiente día hábil después de recibirlo.</li>
        <li>No hay plazos forzosos ni renovación automática: si no se renueva, al terminar el periodo la cuenta vuelve al plan Gratis. Tus datos se conservan; si tienes más productos de los que permite Gratis puedes verlos, venderlos y exportarlos, pero no agregar nuevos.</li>
        <li>Podemos cambiar los precios avisando con al menos 30 días de anticipación; el periodo ya pagado se respeta.</li>
        <li>Reembolsos: si cancelas en los primeros 7 días de tu primer pago, te devolvemos el total. Después, el periodo pagado sigue activo hasta su fin.</li>
      </ul>
    </section>
    <section id="calculos">
      <h2>6. Alertas y sugerencias</h2>
      <p>Los días que alcanza un producto, las alertas y las sugerencias de ofertas son <b>estimaciones</b> basadas en los datos que registras. Te ayudan a decidir, pero la decisión final (qué comprar, qué precio poner, qué retirar) es tuya. Revisa siempre físicamente la caducidad de los productos antes de venderlos.</p>
    </section>
    <section id="servicio">
      <h2>7. Disponibilidad</h2>
      <p>Hacemos lo posible para que EarlyStock funcione siempre, pero puede haber interrupciones por mantenimiento, fallas de internet o de nuestros proveedores. Podemos mejorar o cambiar funciones; si un cambio afecta tus derechos te avisaremos.</p>
    </section>
    <section id="responsabilidad">
      <h2>8. Responsabilidad</h2>
      <p>En la medida que lo permita la ley, no somos responsables por pérdidas indirectas (por ejemplo, ventas no realizadas) derivadas del uso del servicio o de estimaciones inexactas por datos incompletos. Te recomendamos exportar tu inventario periódicamente.</p>
    </section>
    <section id="baja">
      <h2>9. Cancelación</h2>
      <p>Puedes eliminar tu cuenta en cualquier momento desde <i>Perfil → Seguridad</i>. Podemos suspender cuentas que incumplan estos Términos, avisándote cuando sea posible.</p>
    </section>
    <section id="ley">
      <h2>10. Ley aplicable y contacto</h2>
      <p>Estos Términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier controversia se resolverá ante los tribunales de <b>[ciudad y estado]</b>. Dudas: <b>[correo de contacto]</b>. Si los Términos cambian, te pediremos aceptarlos de nuevo.</p>
    </section>
  </PaginaLegal>
</template>
