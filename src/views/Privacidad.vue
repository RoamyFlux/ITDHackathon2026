<!--
  AVISO DE PRIVACIDAD
  Basado en la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (México).
  Completar: [Nombre del responsable], [domicilio], [correo de contacto].
-->
<script setup>
import PaginaLegal from '../components/PaginaLegal.vue'
const SECCIONES = [
  { id: 'responsable', t: '1. Quién es responsable' },
  { id: 'datos', t: '2. Qué datos recabamos' },
  { id: 'finalidades', t: '3. Para qué los usamos' },
  { id: 'encargados', t: '4. Con quién se comparten' },
  { id: 'seguridad', t: '5. Cómo los protegemos' },
  { id: 'conservacion', t: '6. Cuánto tiempo se guardan' },
  { id: 'arco', t: '7. Tus derechos ARCO' },
  { id: 'local', t: '8. Almacenamiento en tu dispositivo' },
  { id: 'cambios', t: '9. Cambios a este aviso' }
]
</script>

<template>
  <PaginaLegal titulo="Aviso de Privacidad" actualizado="noviembre de 2026" :secciones="SECCIONES">
    <section id="responsable">
      <h2>1. Quién es responsable de tus datos</h2>
      <p><b>[Nombre del responsable]</b>, con domicilio en <b>[domicilio]</b>, es responsable del tratamiento de tus datos personales en EarlyStock, conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP). Para cualquier asunto de privacidad escríbenos a <b>[correo de contacto]</b>.</p>
    </section>
    <section id="datos">
      <h2>2. Qué datos recabamos</h2>
      <ul>
        <li><b>Datos de cuenta:</b> correo electrónico y contraseña (la contraseña se guarda cifrada; nadie puede leerla, ni nosotros).</li>
        <li><b>Datos de perfil (opcionales):</b> nombre de tu negocio y foto de perfil.</li>
        <li><b>Datos de tu inventario:</b> productos, cantidades, caducidades, costos y precios, ventas y llegadas que registres.</li>
        <li><b>Datos de seguridad:</b> fecha y hora de inicios de sesión, tipo de navegador y sistema (por ejemplo, "Chrome en Android"), cambios de contraseña y llaves de acceso, y acciones delicadas como borrar productos.</li>
        <li><b>Llaves de acceso:</b> si las usas, solo se guarda una llave <i>pública</i>. Tu huella o rostro <b>nunca</b> salen de tu dispositivo ni los recibimos.</li>
      </ul>
      <p>No recabamos datos personales sensibles ni datos financieros (tarjetas o cuentas bancarias).</p>
    </section>
    <section id="finalidades">
      <h2>3. Para qué los usamos</h2>
      <p><b>Finalidades necesarias:</b> crear y proteger tu cuenta; guardar y mostrar tu inventario; calcular alertas, días que alcanza cada producto, sugerencias y tu lista de compras; enviarte correos de confirmación y recuperación de contraseña; detectar accesos no autorizados.</p>
      <p><b>No</b> vendemos ni rentamos tus datos, <b>no</b> los usamos para publicidad y <b>no</b> usamos herramientas de rastreo o analítica de terceros.</p>
    </section>
    <section id="encargados">
      <h2>4. Con quién se comparten</h2>
      <p>Solo con proveedores que nos ayudan a operar el servicio (encargados), bajo obligaciones de confidencialidad:</p>
      <ul>
        <li><b>Supabase</b>: base de datos, cuentas y almacenamiento de fotos (los servidores pueden estar fuera de México).</li>
        <li><b>GitHub Pages</b>: publica los archivos de la página web.</li>
        <li><b>[Proveedor de correo]</b>: envía los correos de confirmación y recuperación.</li>
      </ul>
      <p>Al aceptar este aviso consientes estas transferencias necesarias para prestar el servicio. Solo compartiremos datos con autoridades cuando una ley lo exija.</p>
    </section>
    <section id="seguridad">
      <h2>5. Cómo los protegemos</h2>
      <ul>
        <li>Conexión cifrada (https) en todo momento.</li>
        <li>Cada cuenta solo puede ver y modificar su propia información (reglas de seguridad a nivel de base de datos).</li>
        <li>Contraseñas de al menos 8 caracteres con letras y números, guardadas cifradas, y opción de llaves de acceso.</li>
        <li>Bloqueo temporal tras varios intentos fallidos, cierre de sesión por inactividad y bitácora de actividad que puedes consultar.</li>
        <li>Política de seguridad de contenido en la página para impedir la ejecución de código no autorizado.</li>
      </ul>
    </section>
    <section id="conservacion">
      <h2>6. Cuánto tiempo se guardan</h2>
      <p>Tus datos se conservan mientras tengas cuenta. La bitácora de seguridad se borra sola a los 90 días. Si eliminas tu cuenta, se borran de inmediato tu cuenta, tu foto y toda tu información; las copias de respaldo del proveedor se eliminan en sus ciclos normales.</p>
    </section>
    <section id="arco">
      <h2>7. Tus derechos ARCO</h2>
      <p>Tienes derecho a <b>Acceder</b> a tus datos, <b>Rectificarlos</b>, <b>Cancelarlos</b> y <b>Oponerte</b> a su uso, así como a revocar tu consentimiento:</p>
      <ul>
        <li><b>Acceso y rectificación:</b> desde la app (perfil e inventario) o exportando tu inventario a Excel.</li>
        <li><b>Cancelación:</b> en <i>Perfil → Seguridad → Eliminar cuenta</i>, que borra todo al instante.</li>
        <li><b>Por correo:</b> escribe a <b>[correo de contacto]</b> indicando tu nombre, el correo de tu cuenta y lo que solicitas. Responderemos en un máximo de 20 días hábiles.</li>
      </ul>
    </section>
    <section id="local">
      <h2>8. Almacenamiento en tu dispositivo</h2>
      <p>La app guarda en tu navegador (almacenamiento local) tu sesión, tus preferencias de apariencia y avisos ya vistos. No usamos cookies de publicidad ni de rastreo. Puedes borrarlo cerrando sesión o desde la configuración de tu navegador.</p>
    </section>
    <section id="cambios">
      <h2>9. Cambios a este aviso</h2>
      <p>Si este aviso cambia, lo publicaremos en esta página y te pediremos aceptarlo de nuevo al entrar a la app.</p>
    </section>
  </PaginaLegal>
</template>
