/* =====================================================================
 * PASO 1 de 5 · RECURSOS GRÁFICOS DE LA PRESENTACIÓN (node recursos.cjs)
 * Dibuja con sharp (desde SVG) el logo de EarlyStock y los tres fondos 16:9 con los colores de la app:
 *   bg-hero (degradado de marca: portada, secciones y cierre), bg-dark (Grafito) y bg-light (Niebla).
 * Salida: trabajo/recursos/
 * ===================================================================== */
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')
const DIR = path.join(__dirname, 'trabajo', 'recursos')
fs.mkdirSync(DIR, { recursive: true })
const R = f => path.join(DIR, f)
const svg=(s)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${s}" height="${s}"><defs><linearGradient id="f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4c1d95"/><stop offset=".55" stop-color="#a21caf"/><stop offset="1" stop-color="#ec4899"/></linearGradient><radialGradient id="s" cx=".9" cy=".95" r=".65"><stop offset="0" stop-color="#fb923c" stop-opacity=".85"/><stop offset="1" stop-color="#fb923c" stop-opacity="0"/></radialGradient></defs><rect width="64" height="64" rx="16" fill="url(#f)"/><rect width="64" height="64" rx="16" fill="url(#s)"/><rect x="15" y="16" width="7" height="32" rx="3.5" fill="#fff"/><rect x="15" y="16" width="34" height="7" rx="3.5" fill="#fff"/><rect x="15" y="28.5" width="25" height="7" rx="3.5" fill="#fff" fill-opacity=".9"/><rect x="15" y="41" width="15" height="7" rx="3.5" fill="#fff" fill-opacity=".8"/><circle cx="40" cy="44.5" r="5" fill="#fde68a"/></svg>`
sharp(Buffer.from(svg(512))).png().toFile(R('logo.png'))

// Fondos con degradado (la marca) 16:9
const bg=(id,stops,extra='')=>sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient><radialGradient id="r" cx=".88" cy=".95" r=".7"><stop offset="0" stop-color="#fb923c" stop-opacity=".55"/><stop offset="1" stop-color="#fb923c" stop-opacity="0"/></radialGradient></defs><rect width="1920" height="1080" fill="url(#g)"/>${extra}</svg>`)).png().toFile(R(id + '.png'))
bg('bg-hero','<stop offset="0" stop-color="#140a26"/><stop offset=".38" stop-color="#4c1d95"/><stop offset=".68" stop-color="#a21caf"/><stop offset=".88" stop-color="#ec4899"/><stop offset="1" stop-color="#fb923c"/>','<rect width="1920" height="1080" fill="url(#r)"/>')
bg('bg-dark','<stop offset="0" stop-color="#0f0a1a"/><stop offset=".7" stop-color="#1c1233"/><stop offset="1" stop-color="#3b1660"/>','<circle cx="1820" cy="980" r="420" fill="#a21caf" fill-opacity=".18"/><circle cx="120" cy="60" r="300" fill="#4c1d95" fill-opacity=".25"/>')
bg('bg-light','<stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#f6f4fb"/><stop offset="1" stop-color="#f1e8fb"/>','<circle cx="1880" cy="1040" r="380" fill="#ec4899" fill-opacity=".07"/>')

console.log('Recursos listos en', DIR)
