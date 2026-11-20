"""
PASO 3 de 5 · PREPARAR IMÁGENES Y VIDEO (python3 preparar.py)
- Recorta las capturas de computadora al área útil y les redondea las esquinas (r-*.png).
- Enmarca la página de inicio como ventana de navegador (f-inicio.png) y las de celular como teléfono (f-m-*.png).
- Video publicitario: usa medios/anuncio.mp4; si no está, lo saca de la presentación actual
  (presentacion/EarlyStock_Presentacion.pptx), así no hace falta subir el video dos veces al repositorio.
- Portada del video: un cuadro del segundo 2 (ffmpeg).
- QR: copia medios/qr.jpg.
Requisitos: Python 3 con Pillow, y ffmpeg.
"""
import os, shutil, subprocess, zipfile
from PIL import Image, ImageDraw

AQUI = os.path.dirname(os.path.abspath(__file__))
CAP = os.path.join(AQUI, 'trabajo', 'capturas')
REC = os.path.join(AQUI, 'trabajo', 'recursos')
MEDIOS = os.path.join(AQUI, 'medios')
PPTX = os.path.join(AQUI, '..', 'EarlyStock_Presentacion.pptx')
os.makedirs(REC, exist_ok=True)


def redondear(im, r):
    """Esquinas redondeadas con transparencia."""
    im = im.convert('RGBA')
    m = Image.new('L', im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, im.width - 1, im.height - 1), r, fill=255)
    im.putalpha(m)
    return im


def achicar(im, ancho):
    """Reduce a un ancho máximo (la presentación pesa menos y se ve igual de nítida)."""
    if im.width > ancho:
        im = im.resize((ancho, round(im.height * ancho / im.width)), Image.LANCZOS)
    return im


# ---- 1) Recortes de computadora (coordenadas en la pantalla de 1600×900; las capturas están al doble) ----
RECORTES = {
    'hoy': (190, 0, 1410, 850), 'hoy-grafito': (190, 0, 1410, 850), 'inventario': (190, 0, 1410, 900),
    'compras': (400, 90, 1200, 540), 'ofertas': (400, 90, 1200, 330), 'reportes': (190, 0, 1410, 900),
    'mas': (190, 0, 1410, 560), 'seguridad': (500, 220, 1100, 680), 'oferta-ventana': (560, 70, 1040, 830),
    'comandos': (460, 90, 1140, 590)
}
for nombre, (a, b, c, d) in RECORTES.items():
    im = Image.open(os.path.join(CAP, nombre + '.png')).crop((a * 2, b * 2, c * 2, d * 2))
    achicar(redondear(im, 36), 1500).save(os.path.join(CAP, 'r-' + nombre + '.png'), optimize=True)


# ---- 2) Página de inicio como ventana de navegador ----
def navegador(src, out):
    im = Image.open(src).convert('RGB')
    W, H = im.size
    barra = 70
    c = Image.new('RGBA', (W, H + barra), (0, 0, 0, 0))
    d = ImageDraw.Draw(c)
    d.rounded_rectangle((0, 0, W - 1, H + barra - 1), 32, fill=(34, 24, 56))
    for i, col in enumerate([(255, 95, 87), (254, 188, 46), (40, 200, 64)]):  # botones de la ventana
        d.ellipse((30 + i * 44, 22, 56 + i * 44, 48), fill=col)
    d.rounded_rectangle((W * 0.3, 16, W * 0.7, 54), 19, fill=(52, 40, 80))  # barra de direcciones
    c.paste(im, (0, barra))
    m = Image.new('L', c.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, W - 1, H + barra - 1), 32, fill=255)
    c.putalpha(m)
    achicar(c, 1500).save(out, optimize=True)


navegador(os.path.join(CAP, 'inicio.png'), os.path.join(CAP, 'f-inicio.png'))


# ---- 3) Capturas de celular dentro de un teléfono ----
def telefono(src, out):
    im = Image.open(src).convert('RGB')
    W, H = im.size
    b = 26
    c = Image.new('RGBA', (W + 2 * b, H + 2 * b), (0, 0, 0, 0))
    d = ImageDraw.Draw(c)
    d.rounded_rectangle((0, 0, W + 2 * b - 1, H + 2 * b - 1), 110, fill=(14, 10, 24))
    d.rounded_rectangle((3, 3, W + 2 * b - 4, H + 2 * b - 4), 108, outline=(90, 70, 130), width=4)
    m = Image.new('L', im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, W - 1, H - 1), 86, fill=255)
    c.paste(im, (b, b), m)
    d.rounded_rectangle(((W + 2 * b) / 2 - 110, b + 14, (W + 2 * b) / 2 + 110, b + 60), 23, fill=(14, 10, 24))  # cámara
    achicar(c, 700).save(out, optimize=True)


for k in ['m-hoy', 'm-inicio', 'm-inventario', 'm-reportes']:
    telefono(os.path.join(CAP, k + '.png'), os.path.join(CAP, 'f-' + k + '.png'))

# ---- 4) Video, portada y QR ----
video = os.path.join(REC, 'anuncio.mp4')
if os.path.exists(os.path.join(MEDIOS, 'anuncio.mp4')):
    shutil.copy(os.path.join(MEDIOS, 'anuncio.mp4'), video)
elif os.path.exists(PPTX):
    with zipfile.ZipFile(PPTX) as z:
        mp4 = [n for n in z.namelist() if n.startswith('ppt/media/') and n.endswith('.mp4')]
        if not mp4:
            raise SystemExit('No hay video: pon medios/anuncio.mp4')
        with z.open(mp4[0]) as f, open(video, 'wb') as o:
            shutil.copyfileobj(f, o)
else:
    raise SystemExit('No hay video: pon medios/anuncio.mp4')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '2', '-i', video, '-frames:v', '1', os.path.join(REC, 'poster.jpg')], check=True)
shutil.copy(os.path.join(MEDIOS, 'qr.jpg'), os.path.join(REC, 'qr.jpg'))
print('Imágenes y video listos en', os.path.join(AQUI, 'trabajo'))
