/* =====================================================================
 * PRESENTACIÓN EARLYSTOCK (Hackathon ITD 2026) · paso 4 de 5 (ver presentacion/README.md)
 * Genera trabajo/sin-animar.pptx con pptxgenjs (postproceso.py le pone tema, animaciones y transiciones):
 *   - Diseño con los colores de la app (degradado morado → magenta → naranja, punto amarillo del logo).
 *   - Capturas reales de la app, fragmentos de código resaltados, video publicitario y QR al final.
 *   - Notas del orador en cada diapositiva.
 * ===================================================================== */
const pptxgen = require('pptxgenjs')
const fs = require('fs')
const path = require('path')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const sharp = require('sharp')
const LU = require('react-icons/lu')

// Carpetas de trabajo (se generan con recursos.cjs, capturas.cjs y preparar.py; no se suben al repositorio).
const TRABAJO = path.join(__dirname, 'trabajo')
const A = f => path.join(TRABAJO, 'recursos', f)
const CAP = f => path.join(TRABAJO, 'capturas', f)
const SALIDA = process.argv[2] || path.join(TRABAJO, 'sin-animar.pptx')

// Tamaño de un PNG (ancho y alto vienen en los bytes 16–24 del archivo): para respetar la proporción.
function tamPNG (archivo) {
  const b = fs.readFileSync(archivo)
  return [b.readUInt32BE(16), b.readUInt32BE(20)]
}
// Texto alternativo de cada imagen (lo leen los lectores de pantalla y aparece en PowerPoint).
const ALT = {
  'f-m-hoy.png': 'Captura en celular: pestaña Hoy con el resumen y las sugerencias',
  'f-m-inventario.png': 'Captura en celular: inventario con presentaciones y sabores',
  'f-m-reportes.png': 'Captura en celular: ventas de 7 días y stock por categoría',
  'f-inicio.png': 'Captura de la página de inicio de EarlyStock',
  'r-hoy.png': 'Captura de la pestaña Hoy: resumen, sugerencias para hoy y requiere atención',
  'r-inventario.png': 'Captura del inventario: una tarjeta por producto con sus presentaciones, lotes y caducidad',
  'r-oferta-ventana.png': 'Captura de la ventana Poner en oferta con el descuento sugerido y el texto para el letrero',
  'r-compras.png': 'Captura de la lista de compras con los paquetes a pedir',
  'r-ofertas.png': 'Captura de las ofertas activas',
  'r-reportes.png': 'Captura de reportes: ventas de 7 días y stock por categoría',
  'r-comandos.png': 'Captura de la paleta de comandos Ctrl + K',
  'r-hoy-grafito.png': 'Captura de la pestaña Hoy con el tema Grafito',
  'r-seguridad.png': 'Captura de la ventana Seguridad con la revisión automática de la cuenta'
}

/* ---- Paleta (la misma de src/styles/temas.css) ---- */
const K = {
  noche: '0F0A1A', sup: '1C1430', sup2: '271C42', lineaO: '3A2D5C', txtO: 'EFE9FB', mutO: 'B9B0D2',
  fondo: 'F6F4FB', blanco: 'FFFFFF', txt: '1D1530', mut: '655D7C', linea: 'E6E0F0', suave: 'EFE8FB',
  morado: '7C3AED', violeta: '6D28D9', magenta: 'A21CAF', rosa: 'DB2777', naranja: 'FB923C', amarillo: 'FDE68A', lila: 'C4B5FD',
  ok: '0B8A5F', low: 'B45D04', crit: 'D61545', okO: '34D399', lowO: 'FBBF24', critO: 'FB7185',
  codigo: '17102A'
}
const THEME = {
  name: 'EarlyStock', headFontFace: 'Calibri', bodyFontFace: 'Calibri',
  colors: { dk1: K.txt, lt1: K.blanco, dk2: K.noche, lt2: K.fondo, accent1: K.morado, accent2: K.magenta, accent3: K.rosa, accent4: K.naranja, accent5: K.ok, accent6: K.crit, hlink: K.morado, folHlink: K.magenta }
}
const MONO = 'Consolas'

/* ---- Íconos (Lucide, los mismos trazos que usa la app) a PNG ---- */
const cacheIco = new Map()
async function ico (nombres, color, px = 256) {
  const clave = nombres + color
  if (cacheIco.has(clave)) return cacheIco.get(clave)
  const n = [].concat(nombres).find(x => LU[x])
  if (!n) throw new Error('Ícono no existe: ' + nombres)
  const svg = renderToStaticMarkup(React.createElement(LU[n], { color: '#' + color, size: px, strokeWidth: 2 }))
  const png = await sharp(Buffer.from(svg)).png().toBuffer()
  const d = 'image/png;base64,' + png.toString('base64')
  cacheIco.set(clave, d)
  return d
}
const I = {
  alerta: ['LuTriangleAlert', 'LuAlertTriangle'], chispa: 'LuSparkles', monitor: 'LuMonitor', codigo: ['LuCodeXml', 'LuCode2', 'LuCode'],
  sube: 'LuTrendingUp', caja: 'LuPackage', reloj: ['LuCalendarClock', 'LuClock'], cuaderno: ['LuNotebookPen', 'LuNotebook', 'LuBookOpen'],
  semaforo: ['LuTrafficCone', 'LuCircleDot'], foco: 'LuLightbulb', regalo: 'LuGift', carrito: 'LuShoppingCart', huella: 'LuFingerprint',
  escudo: ['LuShieldCheck', 'LuShield'], candado: 'LuLock', base: 'LuDatabase', correo: 'LuMailCheck', lista: ['LuScrollText', 'LuList'],
  bicho: 'LuBug', celular: 'LuSmartphone', descarga: 'LuDownload', mano: ['LuHand', 'LuPointer'], paleta: 'LuPalette', tienda: 'LuStore',
  tarjeta: 'LuCreditCard', camara: ['LuScanBarcode', 'LuScanLine', 'LuCamera'], usuarios: 'LuUsers', cohete: 'LuRocket', check: ['LuCircleCheck', 'LuCheckCircle'],
  equis: ['LuCircleX', 'LuXCircle'], medio: ['LuCircleMinus', 'LuMinusCircle'], play: ['LuCirclePlay', 'LuPlayCircle'], teclado: 'LuKeyboard',
  grafica: ['LuChartColumn', 'LuBarChart3', 'LuBarChart'], github: ['LuGithub', 'LuGitBranch'], nube: 'LuCloud', excel: ['LuFileSpreadsheet', 'LuSheet'],
  corona: 'LuCrown', capas: 'LuLayers', ojo: 'LuEye', rayo: 'LuZap'
}

/* ---- Presentación y diseños (layouts) ---- */
const pres = new pptxgen()
pres.layout = 'LAYOUT_16x9' // 10 × 5.625 in
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace }
pres.title = 'EarlyStock — Hackathon ITD 2026'
pres.subject = 'Control de inventario inteligente para el comercio local'
pres.author = 'Equipo EarlyStock'
pres.company = 'Hackathon ITD 2026'

const pie = (color) => [
  { image: { path: A('logo.png'), x: 0.5, y: 5.2, w: 0.2, h: 0.2, altText: 'Logo de EarlyStock' } },
  { text: { text: 'EarlyStock · Hackathon ITD 2026', options: { x: 0.76, y: 5.17, w: 4, h: 0.26, fontSize: 9, color, margin: 0, valign: 'middle' } } }
]
const titulo = (color) => ({ placeholder: { options: { name: 'title', type: 'title', x: 0.5, y: 0.52, w: 9, h: 0.72, fontSize: 28, bold: true, color, align: 'left', valign: 'top', margin: 0 }, text: '' } })
pres.defineSlideMaster({ title: 'PORTADA', background: { path: A('bg-hero.png') }, objects: [] })
pres.defineSlideMaster({ title: 'OSCURO', background: { path: A('bg-dark.png') }, objects: [...pie(K.mutO), titulo(K.txtO)], slideNumber: { x: 9.0, y: 5.17, w: 0.5, h: 0.26, fontSize: 9, color: K.mutO, align: 'right' } })
pres.defineSlideMaster({ title: 'CLARO', background: { path: A('bg-light.png') }, objects: [...pie(K.mut), titulo(K.txt)], slideNumber: { x: 9.0, y: 5.17, w: 0.5, h: 0.26, fontSize: 9, color: K.mut, align: 'right' } })
pres.defineSlideMaster({ title: 'SECCION', background: { path: A('bg-hero.png') }, objects: [titulo(K.blanco)] })

/* ---- Ayudantes de dibujo ---- */
const sombra = () => ({ type: 'outer', color: '2D145A', blur: 12, offset: 3, angle: 90, opacity: 0.16 })
const sombraO = () => ({ type: 'outer', color: '000000', blur: 14, offset: 4, angle: 90, opacity: 0.4 })
let SECCION = ''
function diapo (layout, notas) {
  const s = pres.addSlide({ masterName: layout, sectionTitle: SECCION })
  if (notas) s.addNotes(notas)
  return s
}
// Etiqueta pequeña en mayúsculas sobre el título (como "INVENTARIO INTELIGENTE" en la página de inicio).
function kicker (s, texto, oscuro) {
  s.addText(texto.toUpperCase(), { x: 0.5, y: 0.28, w: 7, h: 0.22, fontSize: 9.5, bold: true, charSpacing: 2, color: oscuro ? K.amarillo : K.magenta, margin: 0, isTextBox: true })
}
function tituloDe (s, texto) { s.addText(texto, { placeholder: 'title' }) }
// Chip de palabra clave.
function chip (s, texto, x, y, { oscuro = false, w = null, relleno = null, color = null, size = 10 } = {}) {
  const ancho = w || (0.3 + texto.length * 0.06 * (size / 10))
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: ancho, h: 0.3, rectRadius: 0.15, fill: { color: relleno || (oscuro ? K.sup2 : K.suave) }, line: { color: oscuro ? K.lineaO : 'DCCFF5', width: 0.75 } })
  s.addText(texto, { x, y, w: ancho, h: 0.3, fontSize: size, bold: true, color: color || (oscuro ? K.lila : K.violeta), align: 'center', valign: 'middle', margin: 0, isTextBox: true })
  return ancho
}
function chips (s, lista, x, y, op = {}) { let cx = x; for (const t of lista) cx += chip(s, t, cx, y, op) + 0.12 }
// Ícono dentro de un círculo de color.
async function circuloIco (s, nombre, x, y, d, fondo, color = K.blanco, transp = 0) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fondo, transparency: transp }, line: { type: 'none' } })
  const p = d * 0.25
  s.addImage({ data: await ico(I[nombre], color), x: x + p, y: y + p, w: d - 2 * p, h: d - 2 * p })
}
// Tarjeta (rectángulo redondeado con sombra suave).
function tarjeta (s, x, y, w, h, { oscuro = false, relleno = null, borde = null } = {}) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.14, fill: { color: relleno || (oscuro ? K.sup : K.blanco) }, line: { color: borde || (oscuro ? K.lineaO : K.linea), width: 0.75 }, shadow: oscuro ? sombraO() : sombra() })
}
// Imagen con su proporción real dentro de un ancho o alto dado.
function imagen (s, archivo, x, y, { w, h, sombraOn = true, oscuro = false }) {
  const m = tamPNG(archivo)
  const r = m[0] / m[1]
  if (w && !h) h = w / r
  else if (h && !w) w = h * r
  s.addImage({ path: archivo, x, y, w, h, altText: ALT[path.basename(archivo)] || '', shadow: sombraOn ? (oscuro ? sombraO() : sombra()) : undefined })
  return { w, h }
}
// Punto numerado + título + texto (callouts de las capturas).
function punto (s, n, titulo, texto, x, y, w, oscuro = false) {
  s.addShape(pres.shapes.OVAL, { x, y: y + 0.02, w: 0.32, h: 0.32, fill: { color: oscuro ? K.amarillo : K.morado }, line: { type: 'none' } })
  s.addText(String(n), { x, y: y + 0.02, w: 0.32, h: 0.32, fontSize: 11, bold: true, color: oscuro ? K.noche : K.blanco, align: 'center', valign: 'middle', margin: 0, isTextBox: true })
  s.addText([
    { text: titulo, options: { bold: true, fontSize: 13, color: oscuro ? K.txtO : K.txt, breakLine: true } },
    { text: texto, options: { fontSize: 11, color: oscuro ? K.mutO : K.mut } }
  ], { x: x + 0.44, y, w: w - 0.44, h: 0.78, valign: 'top', margin: 0, paraSpaceAfter: 2, isTextBox: true })
}

/* ---- Resaltado de código (JS y SQL) ---- */
const KW_JS = new Set('export function const let return for of if else break async await new try catch import from map filter'.split(' '))
const KW_SQL = new Set('create policy on for all to using with check or replace function returns trigger language security definer set as declare begin loop select into from where if then end raise exception using errcode null record integer text after insert referencing new table each statement execute in distinct and is not count'.split(' '))
const COL = { def: 'E6E1F5', kw: 'C792EA', str: 'C3E88D', com: '8C84A8', num: 'F78C6C', fn: '82AAFF', pun: '89DDFF' }
function resaltar (codigo, sql = false) {
  const runs = []
  const lineas = codigo.split('\n')
  lineas.forEach((ln, i) => {
    const re = sql ? /(--.*$)|('(?:[^']|'')*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][\w.]*)(?=\s*\()|([A-Za-z_]\w*)|(\s+)|(.)/g : /(\/\/.*$)|('[^']*'|"[^"]*"|`[^`]*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)(?=\s*\()|([A-Za-z_$][\w$]*)|(\s+)|(.)/g
    let m
    const partes = []
    while ((m = re.exec(ln))) {
      let color = COL.def; let italic = false
      if (m[1]) { color = COL.com; italic = true } else if (m[2]) color = COL.str
      else if (m[3]) color = COL.num
      else if (m[4]) color = (sql ? KW_SQL : KW_JS).has(m[4].toLowerCase()) ? COL.kw : COL.fn
      else if (m[5]) color = (sql ? KW_SQL.has(m[5].toLowerCase()) : KW_JS.has(m[5])) ? COL.kw : COL.def
      else if (m[7]) color = /[=<>!?:+\-*/]/.test(m[7]) ? COL.pun : COL.def
      partes.push({ text: m[0], options: { color, italic, fontFace: MONO } })
    }
    if (!partes.length) partes.push({ text: ' ', options: { fontFace: MONO } })
    if (i < lineas.length - 1) partes[partes.length - 1].options.breakLine = true
    runs.push(...partes)
  })
  return runs
}
// Tarjeta oscura tipo editor con nombre de archivo y el código.
function bloqueCodigo (s, archivo, codigo, { x = 0.5, y = 1.35, w = 5.95, h = 3.7, sql = false, size = 10 } = {}) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.14, fill: { color: K.codigo }, line: { color: '2E2350', width: 0.75 }, shadow: sombraO() })
  ;['FF5F57', 'FEBC2E', '28C840'].forEach((c, i) => s.addShape(pres.shapes.OVAL, { x: x + 0.2 + i * 0.18, y: y + 0.16, w: 0.11, h: 0.11, fill: { color: c }, line: { type: 'none' } }))
  s.addText(archivo, { x: x + 0.8, y: y + 0.08, w: w - 1, h: 0.26, fontSize: 9, color: COL.com, fontFace: MONO, margin: 0, valign: 'middle', isTextBox: true })
  s.addText(resaltar(codigo, sql), { x: x + 0.22, y: y + 0.45, w: w - 0.4, h: h - 0.6, fontSize: size, valign: 'top', margin: 0, lineSpacingMultiple: 1.05, isTextBox: true })
}
// Columna derecha de las diapositivas de código: qué hace + palabras clave.
async function explicacion (s, icono, titulo, texto, claves, extra) {
  await circuloIco(s, icono, 6.75, 1.38, 0.5, K.morado)
  s.addText(titulo, { x: 7.35, y: 1.38, w: 2.2, h: 0.5, fontSize: 14, bold: true, color: K.txt, valign: 'middle', margin: 0, isTextBox: true })
  s.addText(texto, { x: 6.75, y: 2.0, w: 2.75, h: 1.75, fontSize: 11.5, color: K.mut, valign: 'top', margin: 0, paraSpaceAfter: 4, isTextBox: true })
  let y = 3.82
  for (const fila of claves) { chips(s, fila, 6.75, y, { size: 9.5 }); y += 0.38 }
  if (extra) s.addText(extra, { x: 6.75, y: 4.62, w: 2.75, h: 0.4, fontSize: 9.5, italic: true, color: K.magenta, margin: 0, valign: 'top', isTextBox: true })
}

/* =====================================================================
 * DIAPOSITIVAS
 * ===================================================================== */
async function construir () {
  /* ---------- 1. PORTADA ---------- */
  SECCION = 'Inicio'
  pres.addSection({ title: SECCION })
  let s = diapo('PORTADA', 'Bienvenida. Somos el equipo de EarlyStock. En los próximos minutos les mostramos el problema que resolvemos, la app funcionando, cómo está construida por dentro y por qué es un buen negocio. Frase de arranque: "Que nunca se te acabe lo que más vendes".')
  s.addImage({ path: A('logo.png'), x: 0.6, y: 0.55, w: 0.62, h: 0.62, altText: 'Logo de EarlyStock' })
  s.addText([{ text: 'Early', options: { color: K.blanco } }, { text: 'Stock', options: { color: K.amarillo } }], { x: 1.34, y: 0.55, w: 3, h: 0.62, fontSize: 24, bold: true, valign: 'middle', margin: 0, isTextBox: true })
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 1.55, w: 3.75, h: 0.32, rectRadius: 0.16, fill: { color: K.blanco, transparency: 85 }, line: { color: K.blanco, transparency: 60, width: 0.75 } })
  s.addText('INVENTARIO INTELIGENTE PARA TIENDAS Y NEGOCIOS', { x: 0.6, y: 1.55, w: 3.75, h: 0.32, fontSize: 9, bold: true, charSpacing: 1, color: K.blanco, align: 'center', valign: 'middle', margin: 0, isTextBox: true })
  s.addText([
    { text: 'Que nunca se te acabe', options: { color: K.blanco, breakLine: true } },
    { text: 'lo que más vendes.', options: { color: K.amarillo } }
  ], { x: 0.6, y: 2.05, w: 5.6, h: 1.45, fontSize: 36, bold: true, valign: 'top', margin: 0, isTextBox: true })
  s.addText('Control de inventario que avisa antes de que un producto se agote o caduque, sugiere ofertas y arma tu lista de compras.', { x: 0.6, y: 3.55, w: 5.1, h: 0.75, fontSize: 14, color: 'F3E8FF', valign: 'top', margin: 0, isTextBox: true })
  s.addText('Hackathon ITD 2026  ·  Comercio y emprendimiento local', { x: 0.6, y: 4.8, w: 5.2, h: 0.3, fontSize: 11, bold: true, color: K.blanco, margin: 0, isTextBox: true })
  imagen(s, CAP('f-m-inventario.png'), 7.55, 0.75, { h: 4.3, oscuro: true })
  imagen(s, CAP('f-m-hoy.png'), 6.2, 0.4, { h: 4.85, oscuro: true })

  /* ---------- 2. AGENDA ---------- */
  s = diapo('CLARO', 'Este es el recorrido: primero el problema real del pequeño comercio, luego la solución y la demo en vivo, después el código (porque el jurado evalúa cómo está hecho) y al final el modelo de negocio.')
  kicker(s, 'Agenda')
  tituloDe(s, 'Lo que vamos a ver')
  const agenda = [
    ['alerta', 'El problema', 'Lo que le pasa a la tiendita todos los días', K.crit],
    ['chispa', 'La solución', 'Qué es EarlyStock y qué resuelve', K.morado],
    ['monitor', 'La app en acción', 'Recorrido por las pantallas reales', K.magenta],
    ['codigo', 'El código', 'Arquitectura, lógica y seguridad', K.rosa],
    ['sube', 'El negocio', 'Planes, precios y por qué elegirla', K.naranja]
  ]
  for (let i = 0; i < agenda.length; i++) {
    const [ic, t, d, c] = agenda[i]
    const x = 0.5 + i * 1.84
    tarjeta(s, x, 1.55, 1.68, 3.0)
    s.addText('0' + (i + 1), { x: x + 0.2, y: 1.72, w: 1.3, h: 0.5, fontSize: 26, bold: true, color: 'D9CCF3', margin: 0, isTextBox: true })
    await circuloIco(s, ic, x + 0.2, 2.35, 0.55, c)
    s.addText(t, { x: x + 0.2, y: 3.05, w: 1.35, h: 0.35, fontSize: 14, bold: true, color: K.txt, margin: 0, isTextBox: true })
    s.addText(d, { x: x + 0.2, y: 3.42, w: 1.35, h: 0.95, fontSize: 10.5, color: K.mut, valign: 'top', margin: 0, isTextBox: true })
  }

  /* ---------- 3. PROBLEMA ---------- */
  SECCION = 'Problema y solución'
  pres.addSection({ title: SECCION })
  s = diapo('OSCURO', 'Preguntar al público: ¿a quién no le ha pasado ir a la tienda y que no haya lo que buscaba? Para el dueño eso es una venta perdida. Y lo contrario: productos que caducan en el anaquel, dinero tirado. Hoy la mayoría lleva el control en libreta o en Excel, y ninguno de los dos avisa a tiempo.')
  kicker(s, 'El problema', true)
  tituloDe(s, '¿Se te acabó el refresco justo cuando más se vende?')
  const probs = [
    ['caja', 'Desabasto', 'Lo que más se vende se acaba sin aviso. El cliente no espera: se va a la competencia.', K.critO],
    ['reloj', 'Merma', 'Productos que caducan en el anaquel. Es dinero que se tira a la basura.', K.lowO],
    ['cuaderno', 'Control a mano', 'Libreta o Excel: horas de captura, cuentas a mano y nadie te avisa a tiempo.', K.lila]
  ]
  for (let i = 0; i < 3; i++) {
    const [ic, t, d, c] = probs[i]
    const x = 0.5 + i * 3.05
    tarjeta(s, x, 1.55, 2.85, 2.65, { oscuro: true })
    await circuloIco(s, ic, x + 0.25, 1.8, 0.62, c, K.noche)
    s.addText(t, { x: x + 0.25, y: 2.6, w: 2.4, h: 0.4, fontSize: 18, bold: true, color: K.txtO, margin: 0, isTextBox: true })
    s.addText(d, { x: x + 0.25, y: 3.05, w: 2.4, h: 1.0, fontSize: 12, color: K.mutO, valign: 'top', margin: 0, isTextBox: true })
  }
  s.addText('Palabras clave:', { x: 0.5, y: 4.48, w: 1.3, h: 0.3, fontSize: 10.5, color: K.mutO, margin: 0, valign: 'middle', isTextBox: true })
  chips(s, ['#Desabasto', '#Merma', '#VentasPerdidas', '#TiempoPerdido'], 1.75, 4.48, { oscuro: true })

  /* ---------- 4. SOLUCIÓN ---------- */
  s = diapo('CLARO', 'EarlyStock es una app web: no se instala nada, abre en la computadora o en el celular. Vigila el inventario y en lugar de solo mostrar números, dice qué hacer hoy: qué pedir, qué poner en oferta y qué retirar. Las cuatro ideas clave: semáforo, sugerencias, caducidad por lote y ofertas.')
  kicker(s, 'La solución')
  tituloDe(s, 'EarlyStock avisa antes de que pase')
  s.addText('Una app web que vigila tu inventario y te dice qué hacer hoy: qué pedir, qué ofertar y qué retirar.', { x: 0.5, y: 1.35, w: 4.3, h: 0.75, fontSize: 14, color: K.txt, margin: 0, valign: 'top', isTextBox: true })
  const sol = [
    ['semaforo', 'Semáforo', 'Rojo, ámbar y verde por producto', K.crit],
    ['foco', 'Sugerencias', 'Acciones concretas, con números', K.morado],
    ['reloj', 'Caducidad por lote', 'Sale primero lo que caduca antes', K.low],
    ['regalo', 'Ofertas', 'Descuento calculado y letrero listo', K.rosa]
  ]
  for (let i = 0; i < 4; i++) {
    const [ic, t, d, c] = sol[i]
    const x = 0.5 + (i % 2) * 2.2; const y = 2.25 + Math.floor(i / 2) * 1.3
    tarjeta(s, x, y, 2.05, 1.15)
    await circuloIco(s, ic, x + 0.15, y + 0.15, 0.42, c)
    s.addText(t, { x: x + 0.66, y: y + 0.15, w: 1.35, h: 0.42, fontSize: 12.5, bold: true, color: K.txt, valign: 'middle', margin: 0, isTextBox: true })
    s.addText(d, { x: x + 0.15, y: y + 0.62, w: 1.82, h: 0.48, fontSize: 10, color: K.mut, valign: 'top', margin: 0, isTextBox: true })
  }
  imagen(s, CAP('f-inicio.png'), 5.0, 1.38, { w: 4.5 })
  chips(s, ['Gratis para empezar', 'En tu celular', 'Entra con tu huella'], 5.0, 4.25, { size: 9.5 })

  /* ---------- 5. VIDEO ---------- */
  s = diapo('OSCURO', 'Hacer clic sobre el video para reproducirlo (dura 43 segundos). Es el anuncio para redes sociales: formato cuadrado, mensaje directo para el dueño de la tiendita.')
  kicker(s, 'Anuncio publicitario', true)
  tituloDe(s, 'Así la presentamos')
  s.addText('43 segundos · formato cuadrado para Instagram, Facebook y WhatsApp.', { x: 0.5, y: 1.35, w: 4.4, h: 0.6, fontSize: 13, color: K.mutO, margin: 0, valign: 'top', isTextBox: true })
  const frases = [['play', '¿Se te acabó lo que más vendes?'], ['chispa', 'Con EarlyStock eso se acabó'], ['mano', 'Tocas «Vendí» y la app lleva el control'], ['tienda', 'Hecha para tu tiendita, tus abarrotes y tu minisúper']]
  for (let i = 0; i < frases.length; i++) {
    await circuloIco(s, frases[i][0], 0.5, 2.1 + i * 0.68, 0.46, K.sup2, K.amarillo)
    s.addText(frases[i][1], { x: 1.1, y: 2.1 + i * 0.68, w: 3.9, h: 0.46, fontSize: 13, bold: true, color: K.txtO, valign: 'middle', margin: 0, isTextBox: true })
  }
  const poster = fs.readFileSync(A('poster.jpg')).toString('base64')
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 5.67, y: 1.02, w: 3.86, h: 3.86, rectRadius: 0.12, fill: { color: K.sup }, line: { color: K.lineaO, width: 1 }, shadow: sombraO() })
  s.addMedia({ type: 'video', path: A('anuncio.mp4'), x: 5.75, y: 1.1, w: 3.7, h: 3.7, cover: 'data:image/jpeg;base64,' + poster, altText: 'Video publicitario de EarlyStock (43 segundos)' })
  s.addText('▶  Clic para reproducir', { x: 5.67, y: 4.9, w: 3.86, h: 0.24, fontSize: 10, color: K.mutO, align: 'center', margin: 0, isTextBox: true })

  /* ---------- 6. SECCIÓN DEMO ---------- */
  SECCION = 'La app en acción'
  pres.addSection({ title: SECCION })
  s = diapo('PORTADA', 'Pasamos a la app. Si hay internet, hacer la demo en vivo con "Probar demo sin registrarse" en la página; si no, estas capturas son de la app real con la tienda de ejemplo.')
  await seccion(s, '01', 'La app en acción', 'Capturas reales de EarlyStock con la tienda de ejemplo "Abarrotes Don Pepe".', 'monitor')

  /* ---------- 7. HOY ---------- */
  s = diapo('CLARO', 'La pestaña Hoy es lo primero que ve el dueño: cuántos productos están en riesgo (el anillo), los números clave y las sugerencias del día. Todo cabe en una sola pantalla. A la derecha, "Requiere atención" agrupa lo que se acaba, lo que hay que comprar y lo que caduca.')
  kicker(s, 'Pestaña Hoy')
  tituloDe(s, 'Todo lo urgente en una sola pantalla')
  imagen(s, CAP('r-hoy.png'), 0.5, 1.35, { h: 3.7 })
  punto(s, 1, 'Resumen y % en riesgo', 'Anillo y números: urgentes, atención, por caducar y por comprar.', 6.0, 1.4, 3.5)
  punto(s, 2, 'Sugerencias para hoy', 'Retirar, ofertar o pedir, con cantidades y dinero en juego.', 6.0, 2.3, 3.5)
  punto(s, 3, 'Requiere atención', 'Grupos plegables; un toque te lleva al producto.', 6.0, 3.2, 3.5)
  chips(s, ['6 pestañas', 'Atajos 1–6', 'Ctrl + K'], 6.0, 4.4, { size: 9.5 })

  /* ---------- 8. INVENTARIO ---------- */
  s = diapo('CLARO', 'Cada producto es una sola tarjeta con todas sus presentaciones y sabores, cada una con su stock. Si se registra un producto que ya existe, se suma en lugar de duplicarse. Vender o recibir mercancía son dos toques y siempre se puede deshacer.')
  kicker(s, 'Pestaña Inventario')
  tituloDe(s, 'Un producto, todas sus presentaciones')
  imagen(s, CAP('r-inventario.png'), 0.5, 1.35, { h: 3.7 })
  punto(s, 1, 'Presentaciones y sabores', '600 ml · Cola, 1 L · Fresa… cada una con su stock.', 5.75, 1.4, 3.75)
  punto(s, 2, 'Lotes y caducidad', 'Cada entrada guarda su fecha; avisa lo caducado.', 5.75, 2.2, 3.75)
  punto(s, 3, '«Vendí» y «Llegó»', 'Dos toques para registrar y siempre se puede deshacer.', 5.75, 3.0, 3.75)
  punto(s, 4, 'Sin duplicados', 'Si el producto ya existe, se suma al stock.', 5.75, 3.8, 3.75)
  chips(s, ['Buscador', 'Filtros', 'Tabla o tarjetas', 'Excel'], 5.75, 4.65, { size: 9.5 })

  /* ---------- 9. OFERTAS Y COMPRAS ---------- */
  s = diapo('CLARO', 'Cuando un lote no alcanzará a venderse antes de caducar, la app sugiere una oferta y calcula el descuento: entre menos días, más fuerte. Genera el texto para el letrero. La lista de compras se arma sola con los paquetes que hay que pedir y se puede copiar o imprimir.')
  kicker(s, 'Ofertas y compras')
  tituloDe(s, 'De la alerta a la acción en un clic')
  imagen(s, CAP('r-oferta-ventana.png'), 0.5, 1.35, { h: 3.7 })
  imagen(s, CAP('r-compras.png'), 3.05, 1.35, { w: 3.3 })
  imagen(s, CAP('r-ofertas.png'), 3.05, 3.4, { w: 3.3 })
  punto(s, 1, 'Oferta sugerida', 'Descuento calculado según los días que faltan para caducar.', 6.65, 1.4, 2.9)
  punto(s, 2, 'Letrero listo', 'Texto para copiar e imprimir.', 6.65, 2.35, 2.9)
  punto(s, 3, 'Lista de compras', 'Paquetes a pedir, para copiar o imprimir.', 6.65, 3.15, 2.9)
  chips(s, ['Menos merma', 'Más ventas'], 6.65, 4.4, { size: 9.5 })

  /* ---------- 10. REPORTES ---------- */
  s = diapo('CLARO', 'Reportes: ventas de los últimos 7 días, el más vendido y el stock por categoría. Para usuarios avanzados, Ctrl + K abre una paleta de comandos para buscar productos o ejecutar cualquier acción con el teclado.')
  kicker(s, 'Reportes y productividad')
  tituloDe(s, 'Números claros y atajos para ir rápido')
  imagen(s, CAP('r-reportes.png'), 0.5, 1.35, { h: 3.7 })
  imagen(s, CAP('r-comandos.png'), 5.75, 1.35, { w: 3.75 })
  punto(s, 1, 'Ventas y categorías', 'Últimos 7 días, más vendido y stock por categoría.', 5.75, 4.2, 1.95)
  punto(s, 2, 'Ctrl + K', 'Busca o ejecuta lo que sea.', 7.75, 4.2, 1.8)

  /* ---------- 11. CELULAR ---------- */
  s = diapo('OSCURO', 'El dueño de una tienda vive en el celular. EarlyStock se instala como app desde el navegador (PWA), sin tienda de aplicaciones. Las pestañas pasan a una barra abajo, al alcance del pulgar, y se puede entrar con huella o rostro.')
  kicker(s, 'Móvil primero', true)
  tituloDe(s, 'En el celular, como una app')
  imagen(s, CAP('f-m-hoy.png'), 0.55, 1.3, { h: 3.75, oscuro: true })
  imagen(s, CAP('f-m-inventario.png'), 2.5, 1.3, { h: 3.75, oscuro: true })
  imagen(s, CAP('f-m-reportes.png'), 4.45, 1.3, { h: 3.75, oscuro: true })
  const movil = [['descarga', 'Se instala sin tienda de apps', 'PWA: un toque en «Instalar».'], ['celular', 'Barra de pestañas abajo', 'Todo al alcance del pulgar.'], ['huella', 'Entra con tu huella', 'Llaves de acceso: sin contraseñas.']]
  for (let i = 0; i < 3; i++) {
    await circuloIco(s, movil[i][0], 6.6, 1.45 + i * 1.12, 0.5, K.sup2, K.amarillo)
    s.addText([{ text: movil[i][1], options: { bold: true, fontSize: 13, color: K.txtO, breakLine: true } }, { text: movil[i][2], options: { fontSize: 11, color: K.mutO } }], { x: 7.22, y: 1.42, w: 2.35, h: 0.9, valign: 'top', margin: 0, isTextBox: true, ...{ y: 1.42 + i * 1.12 } })
  }

  /* ---------- 12. DISEÑO ---------- */
  s = diapo('CLARO', 'Cada negocio la personaliza: temas Claro, Niebla, Grafito, Oscuro o automático, y seis colores de acento. También hay modo compacto y respeta "reducir animaciones" del sistema. La captura es el tema Grafito.')
  kicker(s, 'Diseño')
  tituloDe(s, 'Un diseño que se adapta a cada negocio')
  imagen(s, CAP('r-hoy-grafito.png'), 0.5, 1.35, { h: 3.7 })
  s.addText('Temas', { x: 6.0, y: 1.4, w: 3.5, h: 0.3, fontSize: 13, bold: true, color: K.txt, margin: 0, isTextBox: true })
  const temas = [['Claro', 'FFFFFF'], ['Niebla', 'E4E6EB'], ['Grafito', '33363D'], ['Oscuro', '0F0A1A']]
  temas.forEach(([t, c], i) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.0 + i * 0.88, y: 1.8, w: 0.75, h: 0.5, rectRadius: 0.08, fill: { color: c }, line: { color: 'CFC6E3', width: 0.75 } })
    s.addText(t, { x: 5.9 + i * 0.88, y: 2.35, w: 0.95, h: 0.25, fontSize: 9.5, color: K.mut, align: 'center', margin: 0, isTextBox: true })
  })
  s.addText('Colores de acento', { x: 6.0, y: 2.8, w: 3.5, h: 0.3, fontSize: 13, bold: true, color: K.txt, margin: 0, isTextBox: true })
  const acentos = [['Vice', 'A21CAF'], ['Neón', '4F46E5'], ['Ocaso', 'E11D48'], ['Lila', '9333EA'], ['Océano', '0284C7'], ['Bosque', '15803D']]
  acentos.forEach(([t, c], i) => {
    s.addShape(pres.shapes.OVAL, { x: 6.07 + i * 0.58, y: 3.2, w: 0.42, h: 0.42, fill: { color: c }, line: { color: K.blanco, width: 2 } })
    s.addText(t, { x: 5.93 + i * 0.58, y: 3.66, w: 0.7, h: 0.25, fontSize: 8.5, color: K.mut, align: 'center', margin: 0, isTextBox: true })
  })
  chips(s, ['Modo compacto', 'Animaciones suaves'], 6.0, 4.3, { size: 9.5 })

  /* ---------- 13. SECCIÓN CÓDIGO ---------- */
  SECCION = 'El código'
  pres.addSection({ title: SECCION })
  s = diapo('PORTADA', 'Ahora la parte técnica. Todo el código está comentado en español, por bloques, para que cualquier persona del equipo lo entienda.')
  await seccion(s, '02', 'Cómo está hecha', 'Arquitectura, lógica del inventario y seguridad. Todo el código está comentado en español.', 'codigo')

  /* ---------- 14. ARQUITECTURA ---------- */
  s = diapo('CLARO', 'Arquitectura: la app es una SPA en Vue 3 con Vite y Pinia; se publica gratis en GitHub Pages. Los datos viven en Supabase (Postgres) y cada fila está protegida con Row Level Security: aunque alguien modifique la página, la base solo le entrega sus propios datos. GitHub Actions corre pruebas y revisiones de seguridad en cada cambio antes de publicar.')
  kicker(s, 'Arquitectura')
  tituloDe(s, 'Una app ligera con la seguridad en la base de datos')
  // Caja del navegador
  tarjeta(s, 0.5, 1.35, 3.6, 2.8)
  await circuloIco(s, 'monitor', 0.7, 1.52, 0.45, K.morado)
  s.addText([{ text: 'Navegador · PWA', options: { bold: true, fontSize: 14, color: K.txt, breakLine: true } }, { text: 'Computadora y celular', options: { fontSize: 10, color: K.mut } }], { x: 1.25, y: 1.48, w: 2.7, h: 0.55, margin: 0, valign: 'middle', isTextBox: true })
  const nav = [['Vue 3.5', 'Interfaz'], ['Vite 8', 'Compilación'], ['Pinia', 'Estado'], ['Vue Router', 'Páginas'], ['Web Worker', 'Excel'], ['Service Worker', 'Instalable']]
  nav.forEach(([t, d], i) => {
    const x = 0.7 + (i % 2) * 1.65; const y = 2.25 + Math.floor(i / 2) * 0.6
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 1.5, h: 0.48, rectRadius: 0.08, fill: { color: K.suave }, line: { type: 'none' } })
    s.addText([{ text: t, options: { bold: true, fontSize: 10.5, color: K.violeta, breakLine: true } }, { text: d, options: { fontSize: 8.5, color: K.mut } }], { x: x + 0.1, y, w: 1.35, h: 0.48, margin: 0, valign: 'middle', isTextBox: true })
  })
  // Flecha
  s.addShape(pres.shapes.LINE, { x: 4.2, y: 2.75, w: 1.35, h: 0, line: { color: K.magenta, width: 2.25, beginArrowType: 'triangle', endArrowType: 'triangle' } })
  s.addText('HTTPS + JWT', { x: 4.1, y: 2.4, w: 1.55, h: 0.28, fontSize: 9.5, bold: true, color: K.magenta, align: 'center', margin: 0, isTextBox: true })
  s.addText('supabase-js', { x: 4.1, y: 2.83, w: 1.55, h: 0.28, fontSize: 9, color: K.mut, align: 'center', margin: 0, isTextBox: true })
  // Caja de Supabase
  tarjeta(s, 5.65, 1.35, 3.85, 2.8)
  await circuloIco(s, 'base', 5.85, 1.52, 0.45, K.ok)
  s.addText([{ text: 'Supabase', options: { bold: true, fontSize: 14, color: K.txt, breakLine: true } }, { text: 'Cuentas, base de datos y archivos', options: { fontSize: 10, color: K.mut } }], { x: 6.4, y: 1.48, w: 3, h: 0.55, margin: 0, valign: 'middle', isTextBox: true })
  const sb = [['Auth', 'Contraseña + llaves de acceso'], ['Postgres + RLS', 'Cada quien ve solo lo suyo'], ['Triggers', 'Bitácora y límites de plan'], ['Storage', 'Fotos de perfil']]
  sb.forEach(([t, d], i) => {
    const y = 2.22 + i * 0.47
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 5.85, y, w: 3.45, h: 0.4, rectRadius: 0.08, fill: { color: 'E3F4EC' }, line: { type: 'none' } })
    s.addText([{ text: t + '  ', options: { bold: true, fontSize: 10.5, color: K.ok } }, { text: d, options: { fontSize: 9.5, color: K.mut } }], { x: 5.97, y, w: 3.3, h: 0.4, margin: 0, valign: 'middle', isTextBox: true })
  })
  // Franja inferior
  const abajo = [['github', 'GitHub Actions → GitHub Pages', 'Pruebas, CodeQL y publicación en cada cambio'], ['nube', 'Cloudflare DNS cifrado', 'Comprueba que el dominio del correo exista']]
  for (let i = 0; i < 2; i++) {
    const x = 0.5 + i * 4.6
    tarjeta(s, x, 4.32, 4.4, 0.72, { relleno: K.suave, borde: 'DCCFF5' })
    await circuloIco(s, abajo[i][0], x + 0.15, 4.45, 0.45, K.violeta)
    s.addText([{ text: abajo[i][1], options: { bold: true, fontSize: 11.5, color: K.txt, breakLine: true } }, { text: abajo[i][2], options: { fontSize: 9.5, color: K.mut } }], { x: x + 0.7, y: 4.36, w: 3.6, h: 0.64, margin: 0, valign: 'middle', isTextBox: true })
  }

  /* ---------- 15. CÓDIGO: SEMÁFORO ---------- */
  s = diapo('CLARO', 'El corazón de la app es crearAnalisis. Calcula la venta diaria con el historial de los últimos 7 días y de ahí cuántos días alcanza el stock. El estado es rojo si llegó al mínimo, ámbar si está cerca o alcanza 2 días o menos, y verde en otro caso. Los resultados se memorizan (WeakMap) para que la app sea rápida aunque haya miles de productos.')
  kicker(s, 'Código · Lógica')
  tituloDe(s, 'El semáforo: ¿cuántos días me alcanza?')
  bloqueCodigo(s, 'src/logica/inventario.js', `// Venta diaria = vendido en los últimos 7 días ÷ días
const consumoDiario = p => ventasDe(p.id).suma / diasHistorial(p)

// "Alcanza N días" = piezas que tienes ÷ venta diaria
function diasRestantes (p) {
  const c = consumoDiario(p)
  return c > 0 ? totalPiezas(p) / c : null
}

// Rojo: en el mínimo · Ámbar: cerca o ≤ 2 días · Verde
function estado (p) {
  const tot = totalPiezas(p)
  const min = p.minimo * p.porPaquete
  const d = diasRestantes(p)
  return tot <= min ? 'crit'
    : (tot <= min * 1.5 || (d !== null && d <= 2)) ? 'low'
    : 'ok'
}`, { size: 10 })
  await explicacion(s, 'semaforo', 'Qué hace', 'Convierte las ventas reales en un aviso: no solo «cuánto tengo», sino «para cuántos días me alcanza».', [['Semáforo', 'Venta diaria'], ['Memorizado', 'Funciones puras']], 'Probado con Vitest y en navegador real')

  /* ---------- 16. CÓDIGO: FEFO + DESCUENTO ---------- */
  s = diapo('CLARO', 'Cada entrada de mercancía es un lote con su fecha de caducidad. Al vender se descuenta primero del lote que caduca antes: FEFO, "primero en caducar, primero en salir", la práctica de los supermercados. Y cuando conviene una oferta, el descuento depende de los días que faltan: 30 por ciento o 2x1 si faltan dos días o menos.')
  kicker(s, 'Código · Caducidad')
  tituloDe(s, 'FEFO: primero sale lo que caduca antes')
  bloqueCodigo(s, 'src/logica/inventario.js · sugerencias.js', `// Al vender se gasta primero el lote que caduca antes
export function consumirLotes (p, n) {
  for (const l of lotesDe(p)) {   // ordenados por fecha
    if (n <= 0) break
    const t = Math.min(l.piezas, n)
    l.piezas -= t
    n -= t
  }
  p.lotes = lotesDe(p)
}

// Entre menos días falten, más fuerte la oferta
export function descuentoPara (dias) {
  if (dias <= 2) return { pct: 30, texto: '2×1 o 30 %' }
  if (dias <= 5) return { pct: 20, texto: '20 %' }
  return { pct: 10, texto: '10 %' }
}`, { size: 10 })
  await explicacion(s, 'reloj', 'Qué hace', 'Lleva la caducidad por lote, como un supermercado, y propone el descuento justo para vender antes de que caduque.', [['FEFO', 'Lotes'], ['Ofertas', 'Menos merma']])

  /* ---------- 17. CÓDIGO: SUGERENCIAS ---------- */
  s = diapo('CLARO', 'El motor de sugerencias simula la venta de cada lote: con la venta diaria calcula cuántas piezas se venderán antes de su fecha. Lo que no alcance es el sobrante, y eso es lo que conviene ofertar. Ejemplo real de la demo: el huevo vende 1.3 piezas al día y un lote de 26 caduca en 5 días; se venden unas 6 y sobran 20.')
  kicker(s, 'Código · Motor de sugerencias')
  tituloDe(s, 'Sugerencias con números, no solo alertas')
  bloqueCodigo(s, 'src/logica/sugerencias.js', `// ¿Cuántas piezas de cada lote NO se venderán a tiempo?
export function sobrantesPorLote (p, consumoDiario, ahora) {
  let usadoPorAnteriores = 0
  return lotesDe(p).map(l => {
    const d = diasA(l.cad, ahora)          // días para caducar
    const diasVenta = Math.max(1, d)
    const vendibles = Math.max(0,
      Math.floor(consumoDiario * diasVenta) - usadoPorAnteriores)
    const seVenden = Math.min(l.piezas, vendibles)
    usadoPorAnteriores += seVenden
    return { lote: l, d, sobrante: l.piezas - seVenden }
  })
}
// Huevo: 1.3 pzas/día, lote de 26 que caduca en 5 días
//   -> se venden ~6, sobran ~20 -> sugerir oferta`, { size: 10 })
  await explicacion(s, 'foco', 'Qué hace', 'Seis tipos de sugerencia: retirar, ofertar, pedir, promocionar, exhibir y producto estrella. Cada una dice qué hacer y cuánto dinero está en juego.', [['Prioridad', 'Dinero en juego'], ['Acción en 1 clic']])

  /* ---------- 17b. CÓDIGO: COLA DE GUARDADO ---------- */
  s = diapo('CLARO', 'En una tienda se vende rápido: dos ventas seguidas no pueden pisarse. Todas las acciones que guardan pasan por una cola: la segunda espera a que termine la primera y trabaja con los datos ya actualizados. Si algo falla, se avisa en español y se vuelven a leer los datos, para no dejar nada a medias. Y cada venta se puede deshacer.')
  kicker(s, 'Código · Confiabilidad')
  tituloDe(s, 'Ninguna venta se pierde, aunque vendas rápido')
  bloqueCodigo(s, 'src/stores/inventario.js', `// Cada acción espera a que termine la anterior (cola)
let cola = Promise.resolve()
function guardar (fn, okMsg, opciones = {}) {
  pendientes.value++
  const turno = cola.then(() => ejecutar(fn, okMsg, opciones))
  cola = turno.catch(() => {})
  return turno.finally(() => { pendientes.value-- })
}

async function ejecutar (fn, okMsg, { reg = null } = {}) {
  try { await fn(); await cargarTodo() } catch (e) {
    avisos.avisar('No se pudo guardar: ' + msgError(e))
    try { await cargarTodo() } catch (_) {}  // nada a medias
  }
  // "Listo" con botón Deshacer si aplica
}`, { size: 10 })
  await explicacion(s, 'check', 'Qué hace', 'Ordena las ventas, llegadas e importaciones para que ninguna se pierda. Los errores de red se explican en español y todo se puede deshacer.', [['Cola', 'Deshacer'], ['Mensajes claros']])

  /* ---------- 18. CÓDIGO: BASE DE DATOS ---------- */
  s = diapo('CLARO', 'La seguridad no depende de la página: está en la base de datos. Row Level Security hace que cada consulta solo vea las filas del usuario dueño. Y los límites de cada plan se revisan con un trigger en Postgres: aunque alguien modifique el JavaScript, no puede pasar de su límite.')
  kicker(s, 'Código · Base de datos')
  tituloDe(s, 'La base de datos es la que manda')
  bloqueCodigo(s, 'supabase/schema.sql', `-- Cada quien solo ve y cambia SUS productos
create policy "productos: solo el dueño" on public.productos
  for all to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Límite del plan, revisado en el servidor
create trigger productos_limite_plan after insert
  on public.productos referencing new table as nuevas
  for each statement
  execute function public.revisar_limite_productos();

-- El plan vence con la fecha de México, no la del servidor
select (now() at time zone 'America/Mexico_City')::date;`, { sql: true, size: 9.5 })
  await explicacion(s, 'base', 'Qué hace', 'Row Level Security aísla los datos de cada negocio. Los triggers aplican los límites del plan (si se pasa, se cancela toda la operación) y anotan la bitácora de seguridad.', [['RLS', 'Triggers'], ['security definer']])

  /* ---------- 19. CÓDIGO: CSP ---------- */
  s = diapo('CLARO', 'Política de seguridad de contenido: al compilar se inyecta una CSP estricta. Solo se ejecutan scripts propios: nada en línea, nada de CDNs, nada de eval. Así un ataque XSS no puede cargar código de otro sitio. Las fuentes y las librerías se empaquetan con la app.')
  kicker(s, 'Código · Seguridad web')
  tituloDe(s, 'Solo se ejecuta nuestro propio código')
  bloqueCodigo(s, 'vite.config.js', `// Política de seguridad (CSP): se agrega al compilar
const CSP = [
  "default-src 'self'",
  "script-src 'self'",   // nada en línea, nada de CDNs
  "style-src 'self'",
  \`connect-src 'self' https://\${SUPABASE_HOST}\`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests'
].join('; ')

const politicaSeguridad = {
  name: 'politica-seguridad',
  apply: 'build',
  // Cambia <!-- %CSP% --> por la etiqueta <meta> de la CSP
  transformIndexHtml: html => html.replace(MARCA, metaCSP)
}`, { size: 9.5 })
  await explicacion(s, 'escudo', 'Qué hace', 'Bloquea scripts de otros sitios y código en línea. Las fuentes y las librerías van empaquetadas: 0 CDNs.', [['CSP', 'Anti-XSS'], ['Anti-iframe', '0 CDNs']])

  /* ---------- 20. CÓDIGO: CORREOS REALES ---------- */
  s = diapo('CLARO', 'Para que solo se registren correos reales, antes de crear la cuenta se consulta el DNS cifrado de Cloudflare: si el dominio no tiene servidor de correo, se rechaza. Solo se envía el dominio, nunca el correo completo. Además se bloquean correos temporales y se sugiere corregir errores como gmial.com.')
  kicker(s, 'Código · Registro')
  tituloDe(s, 'Solo correos reales, sin espiar al usuario')
  bloqueCodigo(s, 'src/lib/correo.js', `// ¿El dominio del correo tiene servidor de correo (MX)?
const DOH = 'https://cloudflare-dns.com/dns-query'

export async function dominioRecibeCorreo (dominio) {
  const mx = await consultar(dominio, 'MX')   // solo el DOMINIO
  if (mx.Status === 3) return 'no'             // no existe
  if (tiene(mx, 15)) return 'si'               // tiene MX
  const a = await consultar(dominio, 'A')      // MX implícito
  return tiene(a, 1) ? 'si' : 'no'
}

// ana@gmial.com  -> "¿Quisiste decir ana@gmail.com?"
// x@yopmail.com  -> "No se permiten correos temporales"`, { size: 10 })
  await explicacion(s, 'correo', 'Qué hace', 'Revisa en vivo que el correo pueda recibir mensajes. La cuenta se activa hasta confirmar el enlace del correo.', [['DNS cifrado', 'RFC 5321'], ['Privacidad']])

  /* ---------- 21. SEGURIDAD ---------- */
  s = diapo('OSCURO', 'Resumen de seguridad: llaves de acceso (huella o rostro, sin contraseña), contraseñas de 8+ con letras y números, cierre por inactividad, RLS en la base, CSP estricta, bitácora automática que se limpia a los 90 días, y en cada cambio GitHub corre CodeQL y npm audit. La ventana de Seguridad le muestra al usuario su revisión automática.')
  kicker(s, 'Seguridad', true)
  tituloDe(s, 'Seguridad seria, explicada fácil')
  const seg = [
    ['huella', 'Llaves de acceso', 'Huella o rostro, sin contraseñas'],
    ['candado', 'RLS', 'Cada negocio ve solo lo suyo'],
    ['escudo', 'CSP estricta', 'Sin scripts de terceros'],
    ['lista', 'Bitácora', 'Actividad y revisión automática'],
    ['correo', 'Correos reales', 'Dominio comprobado y confirmación'],
    ['bicho', 'CodeQL + audit', 'Revisión en cada cambio']
  ]
  for (let i = 0; i < seg.length; i++) {
    const x = 0.5 + (i % 3) * 1.98; const y = 1.4 + Math.floor(i / 3) * 1.8
    tarjeta(s, x, y, 1.85, 1.62, { oscuro: true })
    await circuloIco(s, seg[i][0], x + 0.18, y + 0.18, 0.5, K.sup2, K.amarillo)
    s.addText(seg[i][1], { x: x + 0.18, y: y + 0.78, w: 1.6, h: 0.32, fontSize: 13, bold: true, color: K.txtO, margin: 0, isTextBox: true })
    s.addText(seg[i][2], { x: x + 0.18, y: y + 1.1, w: 1.6, h: 0.45, fontSize: 10, color: K.mutO, valign: 'top', margin: 0, isTextBox: true })
  }
  imagen(s, CAP('r-seguridad.png'), 6.5, 1.55, { w: 3.0, oscuro: true })
  s.addText('La app se revisa sola y le explica al usuario cómo va.', { x: 6.5, y: 4.0, w: 3.0, h: 0.5, fontSize: 10.5, italic: true, color: K.mutO, margin: 0, isTextBox: true })

  /* ---------- 22. CALIDAD ---------- */
  s = diapo('CLARO', 'Calidad: 48 pruebas automáticas con Vitest sobre la lógica y 6 recorridos completos en un navegador real con Playwright (registro, inventario, ofertas, planes, administración, pestañas y celular) contra un Supabase simulado, sin tocar datos reales. En cada cambio, GitHub corre las pruebas, los recorridos, la búsqueda de claves secretas, npm audit y CodeQL; solo si todo pasa se publica en GitHub Pages.')
  kicker(s, 'Calidad')
  tituloDe(s, 'Probada antes de cada publicación')
  const stats = [['48', 'pruebas de la lógica', '(Vitest)'], ['6', 'recorridos completos', '(navegador real, Playwright)'], ['0', 'scripts de otros sitios', '(CSP + sin CDNs)'], ['100 %', 'código comentado', 'en español']]
  stats.forEach(([n, t, d], i) => {
    const x = 0.5 + i * 2.28
    tarjeta(s, x, 1.4, 2.1, 1.55)
    s.addText(n, { x: x + 0.15, y: 1.5, w: 1.8, h: 0.75, fontSize: 40, bold: true, color: [K.morado, K.magenta, K.rosa, K.naranja][i], margin: 0, valign: 'middle', isTextBox: true })
    s.addText([{ text: t, options: { bold: true, fontSize: 11.5, color: K.txt, breakLine: true } }, { text: d, options: { fontSize: 9.5, color: K.mut } }], { x: x + 0.15, y: 2.28, w: 1.85, h: 0.6, margin: 0, valign: 'top', isTextBox: true })
  })
  s.addText('Cada cambio pasa por este camino:', { x: 0.5, y: 3.3, w: 6, h: 0.3, fontSize: 12, bold: true, color: K.txt, margin: 0, isTextBox: true })
  const pasos = ['Pull request', 'Pruebas', 'Navegador', 'Secretos y audit', 'CodeQL', 'GitHub Pages']
  pasos.forEach((t, i) => {
    const x = 0.5 + i * 1.5
    s.addShape(i === 0 ? pres.shapes.PENTAGON : pres.shapes.CHEVRON, { x, y: 3.75, w: 1.55, h: 0.6, fill: { color: [K.violeta, K.morado, '8B3BD9', K.magenta, K.rosa, 'F0627A'][i] }, line: { type: 'none' } })
    s.addText(t, { x: x + (i === 0 ? 0.05 : 0.25), y: 3.75, w: 1.15, h: 0.6, fontSize: 10, bold: true, color: K.blanco, align: 'center', valign: 'middle', margin: 0, isTextBox: true })
  })
  chips(s, ['Supabase simulado', 'Acciones fijadas', 'Dependabot'], 0.5, 4.6, { size: 9.5 })

  /* ---------- 23. SECCIÓN NEGOCIO ---------- */
  SECCION = 'El negocio'
  pres.addSection({ title: SECCION })
  s = diapo('PORTADA', 'Pasamos al modelo de negocio.')
  await seccion(s, '03', 'Un negocio sostenible', 'Planes pensados para el bolsillo del comercio local.', 'sube')

  /* ---------- 24. PLANES ---------- */
  s = diapo('CLARO', 'Tres planes. Gratis para empezar sin riesgo, con hasta mil productos. Pro, el recomendado, en 149 pesos al mes. Max para minisúper, con productos ilimitados. El servicio cuesta unos 835 pesos al mes (Supabase, correos y dominio): con 6 clientes Pro ya se cubre. Los sistemas de inventario en la nube suelen costar entre 300 y 1,000 pesos al mes; nos quedamos abajo a propósito.')
  kicker(s, 'Planes')
  tituloDe(s, 'Empieza gratis, crece cuando lo necesites')
  const planes = [
    { n: 'Gratis', l: 'Para empezar y probar', p: '$0', a: 'Siempre gratis', b: ['1,000 productos', '3 ofertas activas', 'Alertas y sugerencias', 'Excel y seguridad completa'], ins: null },
    { n: 'Pro', l: 'Para la tienda que vende diario', p: '$149', a: 'o $1,490 al año (2 meses gratis)', b: ['10,000 productos', 'Ofertas ilimitadas', 'Soporte por WhatsApp', 'Ayuda con tu primer Excel'], ins: 'C0C7D4', dest: true },
    { n: 'Max', l: 'Para minisúper y mucho surtido', p: '$349', a: 'o $3,490 al año', b: ['Productos ilimitados', 'Ofertas ilimitadas', 'Soporte prioritario', 'Te damos de alta todo'], ins: 'F5C542' }
  ]
  for (let i = 0; i < 3; i++) {
    const pl = planes[i]; const x = 0.5 + i * 3.05; const d = pl.dest
    tarjeta(s, x, 1.35, 2.85, 3.5, d ? { relleno: K.violeta, borde: K.violeta } : {})
    const cT = d ? K.blanco : K.txt; const cM = d ? 'E9DDFF' : K.mut
    s.addText(pl.n, { x: x + 0.25, y: 1.5, w: 1.3, h: 0.4, fontSize: 18, bold: true, color: cT, margin: 0, valign: 'middle', isTextBox: true })
    if (pl.ins) {
      s.addShape(pres.shapes.OVAL, { x: x + 1.12, y: 1.55, w: 0.3, h: 0.3, fill: { color: pl.ins }, line: { color: K.blanco, width: 1 } })
      s.addImage({ data: await ico(I[i === 2 ? 'corona' : 'rayo'], '3B2A00'), x: x + 1.17, y: 1.6, w: 0.2, h: 0.2 })
    }
    if (d) {
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 1.6, y: 1.55, w: 1.05, h: 0.28, rectRadius: 0.14, fill: { color: K.amarillo }, line: { type: 'none' } })
      s.addText('Recomendado', { x: x + 1.6, y: 1.55, w: 1.05, h: 0.28, fontSize: 9, bold: true, color: '5B3A00', align: 'center', valign: 'middle', margin: 0, isTextBox: true })
    }
    s.addText(pl.l, { x: x + 0.25, y: 1.92, w: 2.4, h: 0.28, fontSize: 10.5, color: cM, margin: 0, isTextBox: true })
    s.addText([{ text: pl.p, options: { fontSize: 32, bold: true, color: cT } }, { text: pl.p === '$0' ? '' : ' /mes', options: { fontSize: 12, color: cM } }], { x: x + 0.25, y: 2.25, w: 2.4, h: 0.6, margin: 0, valign: 'middle', isTextBox: true })
    s.addText(pl.a, { x: x + 0.25, y: 2.85, w: 2.45, h: 0.28, fontSize: 9.5, color: cM, margin: 0, isTextBox: true })
    for (let j = 0; j < pl.b.length; j++) {
      s.addImage({ data: await ico(I.check, d ? K.amarillo : K.ok), x: x + 0.25, y: 3.3 + j * 0.36, w: 0.22, h: 0.22 })
      s.addText(pl.b[j], { x: x + 0.55, y: 3.27 + j * 0.36, w: 2.2, h: 0.28, fontSize: 11, color: cT, margin: 0, valign: 'middle', isTextBox: true })
    }
  }
  s.addText([{ text: 'Costo del servicio ≈ $835 MXN/mes  →  ', options: { color: K.mut } }, { text: '6 clientes Pro lo cubren.', options: { bold: true, color: K.magenta } }, { text: '  Precios en MXN, IVA incluido.', options: { color: K.mut } }], { x: 0.5, y: 4.9, w: 9, h: 0.26, fontSize: 10.5, margin: 0, isTextBox: true })

  /* ---------- 25. COMPARACIÓN ---------- */
  s = diapo('OSCURO', 'La libreta y el Excel registran, pero no avisan. EarlyStock avisa antes de que se acabe, cuida la caducidad por lote, sugiere ofertas y pedidos, y funciona en el celular. Y empieza gratis.')
  kicker(s, 'Por qué EarlyStock', true)
  tituloDe(s, 'La libreta registra. EarlyStock te avisa')
  const S = { si: ['check', K.okO], no: ['equis', K.critO], medio: ['medio', K.lowO] }
  const filas = [
    ['Avisa antes de que se acabe', 'no', 'no', 'si'],
    ['Caducidad por lote', 'no', 'medio', 'si'],
    ['Sugiere ofertas y pedidos', 'no', 'no', 'si'],
    ['Lista de compras automática', 'no', 'medio', 'si'],
    ['En el celular, con huella', 'no', 'medio', 'si'],
    ['Precio para empezar', '$0', 'Licencia', '$0']
  ]
  const cols = [['', 4.0], ['Libreta', 1.6], ['Excel', 1.6], ['EarlyStock', 1.8]]
  let cx = 0.5
  cols.forEach(([t, w], i) => {
    if (i === 3) s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx, y: 1.3, w, h: 3.75, rectRadius: 0.14, fill: { color: K.magenta, transparency: 70 }, line: { color: K.magenta, width: 1 } })
    if (t) s.addText(t, { x: cx, y: 1.35, w, h: 0.4, fontSize: 13, bold: true, color: i === 3 ? K.amarillo : K.txtO, align: 'center', valign: 'middle', margin: 0, isTextBox: true })
    cx += w
  })
  for (let r = 0; r < filas.length; r++) {
    const y = 1.85 + r * 0.53
    s.addShape(pres.shapes.LINE, { x: 0.5, y: y - 0.04, w: 9, h: 0, line: { color: K.lineaO, width: 0.75 } })
    s.addText(filas[r][0], { x: 0.65, y, w: 3.8, h: 0.45, fontSize: 13, color: K.txtO, valign: 'middle', margin: 0, isTextBox: true })
    let x = 4.5
    for (let c = 1; c <= 3; c++) {
      const w = cols[c][1]; const v = filas[r][c]
      if (S[v]) s.addImage({ data: await ico(I[S[v][0]], S[v][1]), x: x + w / 2 - 0.15, y: y + 0.07, w: 0.3, h: 0.3 })
      else s.addText(v, { x, y, w, h: 0.45, fontSize: 12, bold: true, color: c === 3 ? K.amarillo : K.mutO, align: 'center', valign: 'middle', margin: 0, isTextBox: true })
      x += w
    }
  }

  /* ---------- 26. PARA QUIÉN + PRÓXIMOS PASOS ---------- */
  s = diapo('CLARO', 'EarlyStock está pensado para el comercio local: abarrotes, misceláneas, minisúper, papelerías, farmacias pequeñas y cualquier negocio que maneje caducidad. Próximos pasos propuestos: cobro en línea de los planes, lector de código de barras con la cámara del celular, varias sucursales con empleados y reportes mensuales para tomar decisiones.')
  kicker(s, 'Mercado y siguientes pasos')
  tituloDe(s, 'Hecha para el comercio local, lista para crecer')
  s.addText('¿Para quién es?', { x: 0.5, y: 1.4, w: 4, h: 0.3, fontSize: 14, bold: true, color: K.txt, margin: 0, isTextBox: true })
  const negocios = ['Abarrotes', 'Misceláneas', 'Minisúper', 'Papelerías', 'Farmacias pequeñas', 'Panaderías', 'Cremerías', 'Tiendas de barrio']
  let fy = 1.85; let fx = 0.5
  for (const t of negocios) { const w = 0.3 + t.length * 0.068; if (fx + w > 4.65) { fx = 0.5; fy += 0.45 } ; chip(s, t, fx, fy, { w, size: 10.5 }); fx += w + 0.12 }
  tarjeta(s, 0.5, 3.45, 4.1, 1.55, { relleno: K.suave, borde: 'DCCFF5' })
  await circuloIco(s, 'tienda', 0.7, 3.65, 0.5, K.morado)
  s.addText('Lo que deja de perder en mermas y faltantes paga el plan.', { x: 1.35, y: 3.6, w: 3.1, h: 0.62, fontSize: 13, bold: true, color: K.txt, margin: 0, valign: 'middle', isTextBox: true })
  s.addText('Sin instalar nada, sin capacitación: si sabe usar WhatsApp, sabe usar EarlyStock.', { x: 0.7, y: 4.3, w: 3.75, h: 0.6, fontSize: 11, color: K.mut, margin: 0, valign: 'top', isTextBox: true })
  s.addText('Próximos pasos (propuestas)', { x: 5.2, y: 1.4, w: 4.3, h: 0.3, fontSize: 14, bold: true, color: K.txt, margin: 0, isTextBox: true })
  const ruta = [['cohete', 'Hoy', 'Versión 2.5 lista: revisada y probada'], ['tarjeta', 'Siguiente', 'Cobro de planes en línea'], ['camara', 'Después', 'Lector de código de barras con la cámara'], ['usuarios', 'Futuro', 'Varias sucursales y empleados']]
  s.addShape(pres.shapes.LINE, { x: 5.45, y: 2.05, w: 0, h: 2.75, line: { color: 'D9CCF3', width: 2 } })
  for (let i = 0; i < ruta.length; i++) {
    const y = 1.85 + i * 0.8
    await circuloIco(s, ruta[i][0], 5.2, y, 0.5, i === 0 ? K.magenta : K.morado)
    s.addText([{ text: ruta[i][1], options: { bold: true, fontSize: 12, color: i === 0 ? K.magenta : K.violeta, breakLine: true } }, { text: ruta[i][2], options: { fontSize: 11.5, color: K.txt } }], { x: 5.85, y: y - 0.04, w: 3.65, h: 0.6, margin: 0, valign: 'middle', isTextBox: true })
  }

  /* ---------- 27. CIERRE CON QR ---------- */
  SECCION = 'Cierre'
  pres.addSection({ title: SECCION })
  s = diapo('PORTADA', 'Cierre: invitar al público a escanear el QR y probar la demo en ese momento, sin registrarse. Agradecer al jurado y abrir preguntas.')
  s.addImage({ path: A('logo.png'), x: 0.6, y: 0.6, w: 0.62, h: 0.62, altText: 'Logo de EarlyStock' })
  s.addText([{ text: 'Early', options: { color: K.blanco } }, { text: 'Stock', options: { color: K.amarillo } }], { x: 1.34, y: 0.6, w: 3, h: 0.62, fontSize: 24, bold: true, valign: 'middle', margin: 0, isTextBox: true })
  s.addText([{ text: 'Pruébala ', options: { color: K.blanco } }, { text: 'hoy.', options: { color: K.amarillo } }], { x: 0.6, y: 1.55, w: 5, h: 0.9, fontSize: 44, bold: true, margin: 0, valign: 'middle', isTextBox: true })
  s.addText('Escanea el código y entra a la demo con una tienda de ejemplo: sin registrarte y gratis.', { x: 0.6, y: 2.5, w: 4.6, h: 0.75, fontSize: 15, color: 'F3E8FF', margin: 0, valign: 'top', isTextBox: true })
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 3.4, w: 4.1, h: 0.42, rectRadius: 0.21, fill: { color: K.blanco, transparency: 85 }, line: { color: K.blanco, transparency: 55, width: 0.75 } })
  s.addText('roamyflux.github.io/ITDHackaton2026', { x: 0.6, y: 3.4, w: 4.1, h: 0.42, fontSize: 13, bold: true, color: K.blanco, align: 'center', valign: 'middle', margin: 0, hyperlink: { url: 'https://roamyflux.github.io/ITDHackaton2026/' }, isTextBox: true })
  s.addText('¡Gracias!  ·  ¿Preguntas?', { x: 0.6, y: 4.3, w: 4.6, h: 0.5, fontSize: 20, bold: true, color: K.blanco, margin: 0, valign: 'middle', isTextBox: true })
  s.addText('Hackathon ITD 2026 · Comercio y emprendimiento local', { x: 0.6, y: 4.85, w: 4.6, h: 0.3, fontSize: 10.5, color: 'F3E8FF', margin: 0, isTextBox: true })
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 5.65, y: 0.55, w: 3.85, h: 4.5, rectRadius: 0.2, fill: { color: K.blanco }, line: { type: 'none' }, shadow: sombraO() })
  s.addImage({ path: A('qr.jpg'), x: 5.9, y: 0.75, w: 3.35, h: 3.35, altText: 'Código QR a roamyflux.github.io/ITDHackaton2026' })
  s.addText('Escanéame', { x: 5.65, y: 4.25, w: 3.85, h: 0.45, fontSize: 16, bold: true, color: K.violeta, align: 'center', valign: 'middle', margin: 0, isTextBox: true })
  s.addText('Abre la cámara de tu celular', { x: 5.65, y: 4.65, w: 3.85, h: 0.28, fontSize: 10.5, color: K.mut, align: 'center', margin: 0, isTextBox: true })

  fs.mkdirSync(path.dirname(SALIDA), { recursive: true })
  await pres.writeFile({ fileName: SALIDA })
  // Colores y nombre del tema: los aplica postproceso.py (lee este archivo).
  fs.writeFileSync(path.join(TRABAJO, 'tema.json'), JSON.stringify(THEME, null, 2))
  console.log('Listo:', SALIDA)
}

// Portada de sección: número grande, título y descripción sobre el degradado de marca.
async function seccion (s, num, titulo, texto, icono) {
  s.addText(num, { x: 0.6, y: 1.1, w: 3, h: 1.1, fontSize: 72, bold: true, color: K.amarillo, margin: 0, valign: 'middle', isTextBox: true })
  s.addText(titulo, { x: 0.6, y: 2.25, w: 6.5, h: 0.9, fontSize: 40, bold: true, color: K.blanco, margin: 0, valign: 'middle', isTextBox: true })
  s.addText(texto, { x: 0.6, y: 3.2, w: 5.8, h: 0.8, fontSize: 15, color: 'F3E8FF', margin: 0, valign: 'top', isTextBox: true })
  await circuloIco(s, icono, 7.3, 1.55, 2.0, K.blanco, K.blanco, 82)
  s.addImage({ path: A('logo.png'), x: 0.6, y: 4.75, w: 0.36, h: 0.36, altText: 'Logo de EarlyStock' })
  s.addText('EarlyStock', { x: 1.04, y: 4.75, w: 2, h: 0.36, fontSize: 12, bold: true, color: K.blanco, margin: 0, valign: 'middle', isTextBox: true })
}

construir().catch(e => { console.error(e); process.exit(1) })
