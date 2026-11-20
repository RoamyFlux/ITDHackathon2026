"""
PASO 5 de 5 · POSTPROCESO (python3 postproceso.py [entrada.pptx] [salida.pptx])
Toma trabajo/sin-animar.pptx (de generar.cjs) y escribe ../EarlyStock_Presentacion.pptx con:
- TEMA: colores y tipografías de EarlyStock en el tema de PowerPoint (trabajo/tema.json), para que los colores
  del tema y los del diseño coincidan si alguien edita la presentación.
- TEXTO ALTERNATIVO: los íconos decorativos quedan sin descripción (el lector de pantalla los salta) y ninguna
  imagen lleva rutas de archivos de la computadora donde se generó.
- ANIMACIONES Y TRANSICIONES:
- Transición en cada diapositiva: "Desvanecer" suave (contenido) o "Empujar hacia arriba" (portadas y secciones).
- Animaciones de entrada automáticas (sin clic), en orden de lectura:
    * Los objetos se agrupan solos: lo que está DENTRO de una tarjeta entra con la tarjeta; un círculo con ícono entra
      con el texto que tiene a su lado; la etiqueta pequeña entra con el título.
    * Efecto general "Flotar hacia dentro" (aparece y sube un poco). Números grandes y QR: "Zoom" suave.
      Flechas del camino de CI/CD: "Barrido" de izquierda a derecha.
- No se anima: el número de diapositiva ni el video (para que su botón de reproducir funcione igual).
Requisitos: Python 3 con lxml.
"""
import sys, os, re, shutil, zipfile, tempfile, subprocess
from lxml import etree

NS = {'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
      'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'}
P = '{%s}' % NS['p']
EMU = 914400

# ---- Ajustes de ritmo ----
DUR = 500          # duración de cada efecto (ms)
PASO_MAX = 160     # separación máxima entre grupos (ms)
TOTAL_MAX = 1500   # el último grupo empieza a más tardar aquí (ms)


def caja(el):
    """Posición (x, y, w, h) en pulgadas, o None si la forma hereda su posición (marcador del título)."""
    off = el.find('.//a:xfrm/a:off', NS)
    ext = el.find('.//a:xfrm/a:ext', NS)
    if off is None or ext is None:
        return None
    return tuple(int(v) / EMU for v in (off.get('x'), off.get('y'), ext.get('cx'), ext.get('cy')))


def es_texto(el):
    """Cuadro de texto sin relleno (no una tarjeta ni una figura de color)."""
    if el.tag != P + 'sp' or el.find('.//a:t', NS) is None:
        return False
    sppr = el.find('p:spPr', NS)
    geo = el.find('.//a:prstGeom', NS)
    return (geo is None or geo.get('prst') == 'rect') and (sppr is None or sppr.find('a:solidFill', NS) is None)


def translucido(el):
    """Figura con relleno semitransparente (resaltados de columna): no contiene a otras formas."""
    return el.find('p:spPr/a:solidFill//a:alpha', NS) is not None


def tipo_efecto(el):
    """Qué efecto le toca a cada forma."""
    geo = el.find('.//a:prstGeom', NS)
    if geo is not None and geo.get('prst') in ('chevron', 'homePlate'):
        return 'barrido'
    if el.tag == P + 'pic':
        descr = el.find('.//p:cNvPr', NS).get('descr') or ''
        if 'QR' in descr:
            return 'zoom'
    texto = ''.join(t.text or '' for t in el.iterfind('.//a:t', NS)).strip()
    tamanos = [int(r.get('sz')) for r in el.iterfind('.//a:rPr', NS) if r.get('sz')]
    if texto and len(texto) <= 6 and tamanos and max(tamanos) >= 3200:
        return 'zoom'
    return 'flotar'


def agrupar(formas):
    """Agrupa las formas en 'momentos' de entrada, respetando el orden en que se dibujaron."""
    grupos = []          # cada grupo: {'formas': [...], 'ancla': caja}
    contenedores = []    # (caja, índice de grupo) de tarjetas e imágenes que pueden contener otras formas
    for el in formas:
        c = caja(el)
        g = None
        if c is None:  # marcador del título: entra con la etiqueta (si existe) o abre el primer grupo
            g = 0 if grupos and grupos[0]['ancla'] and grupos[0]['ancla'][1] < 0.45 else None
            c = (0.5, 0.52, 9, 0.72)
        else:
            x, y, w, h = c
            # 0) Texto encima de la figura anterior, del mismo tamaño (píldoras y chips translúcidos) -> con ella.
            if grupos:
                cu = caja(grupos[-1]['formas'][-1]) or (0, 0, 0, 0)
                if all(abs(cu[k] - c[k]) <= 0.02 for k in range(4)):
                    g = len(grupos) - 1
            # 1) Dentro de una tarjeta/imagen anterior -> con ella.
            for (cc, gi) in reversed(contenedores):
                if x >= cc[0] - 0.02 and y >= cc[1] - 0.02 and x + w <= cc[0] + cc[2] + 0.02 and y + h <= cc[1] + cc[3] + 0.02:
                    if g is None:
                        g = gi
                    break
            # 2) Texto junto a un círculo pequeño (ícono o número) -> con el círculo.
            if g is None and grupos:
                ult = grupos[-1]
                a = ult['ancla']
                if a and a[2] <= 0.65 and a[3] <= 0.65 and es_texto(el) and abs(y - a[1]) <= 0.12 and 0 <= x - (a[0] + a[2]) <= 0.35:
                    g = len(grupos) - 1
                # 3) Texto apilado justo debajo de otro texto con la misma x (etiqueta + título, título + descripción).
                elif a and es_texto(el) and ult.get('texto') and abs(x - a[0]) <= 0.05 and 0 <= y - (a[1] + a[3]) <= 0.12:
                    g = len(grupos) - 1
                    ult['ancla'] = (a[0], a[1], max(a[2], w), y + h - a[1])
                # 4) Nombre debajo de una muestra pequeña (temas y colores de acento) -> con la muestra.
                elif a and es_texto(el) and not ult.get('texto') and a[2] <= 1.0 and 0 <= y - (a[1] + a[3]) <= 0.12 and x < a[0] + a[2] and x + w > a[0]:
                    g = len(grupos) - 1
                # 5) Fila de una tabla: todo lo que queda bajo una línea horizontal entra con ella.
                elif a and ult.get('linea') and 0 <= y - a[1] <= 0.5:
                    g = len(grupos) - 1
        if g is None:
            geo0 = el.find('.//a:prstGeom', NS)
            grupos.append({'formas': [], 'ancla': c, 'texto': es_texto(el), 'linea': geo0 is not None and geo0.get('prst') == 'line' and c[3] < 0.01})
            g = len(grupos) - 1
        grupos[g]['formas'].append(el)
        # Las tarjetas (rectángulos redondeados) y las imágenes grandes pueden contener otras formas.
        geo = el.find('.//a:prstGeom', NS)
        if c and not translucido(el) and not es_texto(el) and ((geo is not None and geo.get('prst') in ('roundRect', 'rect', 'ellipse', 'chevron', 'homePlate')) or el.tag == P + 'pic') and c[2] * c[3] > 0.08:
            contenedores.append((c, g))
    return grupos


class Ids:
    def __init__(self):
        self.n = 2
    def __call__(self):
        self.n += 1
        return self.n


def tgt(spid):
    return f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl>'


def efecto(spid, tipo, retraso, primero, ids):
    """XML de un efecto de entrada para una forma."""
    visible = (f'<p:set><p:cBhvr><p:cTn id="{ids()}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>'
               f'{tgt(spid)}<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr>'
               f'<p:to><p:strVal val="visible"/></p:to></p:set>')

    def anim(attr, desde, hasta, dur=DUR):
        return (f'<p:anim calcmode="lin" valueType="num"><p:cBhvr><p:cTn id="{ids()}" dur="{dur}" decel="100000" fill="hold"/>'
                f'{tgt(spid)}<p:attrNameLst><p:attrName>{attr}</p:attrName></p:attrNameLst></p:cBhvr>'
                f'<p:tavLst><p:tav tm="0"><p:val><p:strVal val="{desde}"/></p:val></p:tav>'
                f'<p:tav tm="100000"><p:val><p:strVal val="{hasta}"/></p:val></p:tav></p:tavLst></p:anim>')

    def filtro(f, dur=DUR):
        return f'<p:animEffect transition="in" filter="{f}"><p:cBhvr><p:cTn id="{ids()}" dur="{dur}"/>{tgt(spid)}</p:cBhvr></p:animEffect>'

    if tipo == 'zoom':
        preset, sub = 53, 16
        cuerpo = visible + anim('ppt_w', '#ppt_w*0.7', '#ppt_w', 600) + anim('ppt_h', '#ppt_h*0.7', '#ppt_h', 600) + filtro('fade', 600)
    elif tipo == 'barrido':
        preset, sub = 22, 8
        cuerpo = visible + filtro('wipe(left)', 400)
    else:  # flotar hacia dentro
        preset, sub = 42, 0
        cuerpo = visible + filtro('fade') + anim('ppt_x', '#ppt_x', '#ppt_x') + anim('ppt_y', '#ppt_y+0.04', '#ppt_y')
    nodo = 'afterEffect' if primero else 'withEffect'
    return (f'<p:par><p:cTn id="{ids()}" presetID="{preset}" presetClass="entr" presetSubtype="{sub}" fill="hold" grpId="0" nodeType="{nodo}">'
            f'<p:stCondLst><p:cond delay="{retraso}"/></p:stCondLst><p:childTnLst>{cuerpo}</p:childTnLst></p:cTn></p:par>')


def transicion(portada):
    if portada:
        efecto_t, dur = '<p:push dir="u"/>', 900
    else:
        efecto_t, dur = '<p:fade/>', 700
    return ('<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">'
            '<mc:Choice xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" Requires="p14">'
            f'<p:transition xmlns:p="{NS["p"]}" spd="slow" p14:dur="{dur}">{efecto_t}</p:transition></mc:Choice>'
            f'<mc:Fallback><p:transition xmlns:p="{NS["p"]}" spd="slow">{efecto_t}</p:transition></mc:Fallback></mc:AlternateContent>')


def procesar(ruta):
    arbol = etree.parse(ruta)
    raiz = arbol.getroot()
    sptree = raiz.find('.//p:cSld/p:spTree', NS)
    # Marco del video: se queda quieto junto con el video.
    videos = [caja(v) for v in sptree if v.find('.//a:videoFile', NS) is not None]
    def es_marco(c):
        return c and any(v and c[0] <= v[0] and c[1] <= v[1] and c[0] + c[2] >= v[0] + v[2] and c[1] + c[3] >= v[1] + v[3] for v in videos)
    formas = []
    for el in sptree:
        if el.tag not in (P + 'sp', P + 'pic', P + 'cxnSp'):
            continue
        if el.find('.//a:fld[@type="slidenum"]', NS) is not None:
            continue  # número de diapositiva
        if el.find('.//a:videoFile', NS) is not None or es_marco(caja(el)):
            continue  # video y su marco: se dejan tal cual
        formas.append(el)
    # Portadas y secciones: no tienen pie de página (número de diapositiva).
    portada = sptree.find('.//a:fld[@type="slidenum"]', NS) is None
    grupos = agrupar(formas)

    ids = Ids()
    efectos = []
    paso = min(PASO_MAX, TOTAL_MAX // max(1, len(grupos) - 1)) if len(grupos) > 1 else 0
    primero = True
    construidas = []
    for i, g in enumerate(grupos):
        for el in g['formas']:
            spid = el.find('.//p:cNvPr', NS).get('id')
            efectos.append(efecto(spid, tipo_efecto(el), i * paso, primero, ids))
            primero = False
            if el.tag == P + 'sp' and el.find('.//p:txBody', NS) is not None:
                construidas.append(spid)

    # Quitar transición o timing anteriores (por si se corre dos veces).
    for viejo in raiz.findall('p:transition', NS) + raiz.findall('p:timing', NS) + raiz.findall('{http://schemas.openxmlformats.org/markup-compatibility/2006}AlternateContent'):
        raiz.remove(viejo)

    clr = raiz.find('p:clrMapOvr', NS)
    pos = list(raiz).index(clr) + 1 if clr is not None else len(raiz)
    raiz.insert(pos, etree.fromstring(transicion(portada)))

    if efectos:
        bld = ''.join(f'<p:bldP spid="{s}" grpId="0" animBg="1"/>' for s in construidas)
        timing = (f'<p:timing xmlns:p="{NS["p"]}"><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
                  '<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>'
                  f'<p:par><p:cTn id="{ids()}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst>'
                  f'<p:par><p:cTn id="{ids()}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>'
                  + ''.join(efectos) +
                  '</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>'
                  '</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>'
                  '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>'
                  '</p:childTnLst></p:cTn></p:par></p:tnLst>'
                  + (f'<p:bldLst>{bld}</p:bldLst>' if bld else '') + '</p:timing>')
        raiz.insert(pos + 1, etree.fromstring(timing))
    arbol.write(ruta, xml_declaration=True, encoding='UTF-8', standalone=True)
    return len(grupos), sum(len(g['formas']) for g in grupos), portada


A_NS = NS['a']


def aplicar_tema(tmp, tema):
    """Pone los colores (dk1, lt1, accent1…) y las fuentes de EarlyStock en el tema del archivo."""
    for nombre in os.listdir(os.path.join(tmp, 'ppt', 'theme')):
        ruta = os.path.join(tmp, 'ppt', 'theme', nombre)
        arbol = etree.parse(ruta)
        raiz = arbol.getroot()
        raiz.set('name', tema['name'])
        esquema = raiz.find('.//a:clrScheme', NS)
        if esquema is not None:
            esquema.set('name', tema['name'])
            for clave, color in tema['colors'].items():
                nodo = esquema.find('a:' + clave, NS)
                if nodo is None:
                    continue
                for hijo in list(nodo):
                    nodo.remove(hijo)
                etree.SubElement(nodo, '{%s}srgbClr' % A_NS).set('val', color.upper())
        for tipo, fuente in (('majorFont', tema['headFontFace']), ('minorFont', tema['bodyFontFace'])):
            latin = raiz.find('.//a:fontScheme/a:%s/a:latin' % tipo, NS)
            if latin is not None:
                latin.set('typeface', fuente)
        arbol.write(ruta, xml_declaration=True, encoding='UTF-8', standalone=True)


def limpiar_alt(ruta):
    """Quita descripciones que son rutas o nombres internos (íconos decorativos)."""
    arbol = etree.parse(ruta)
    cambio = False
    for c in arbol.getroot().iterfind('.//p:pic/p:nvPicPr/p:cNvPr', NS):
        d = c.get('descr') or ''
        if '/' in d or '\\' in d or d.endswith('.png') or d.endswith('.jpg'):
            c.set('descr', '')
            cambio = True
    if cambio:
        arbol.write(ruta, xml_declaration=True, encoding='UTF-8', standalone=True)


def main(entrada, salida):
    tmp = tempfile.mkdtemp()
    with zipfile.ZipFile(entrada) as z:
        z.extractall(tmp)
    tema = os.path.join(os.path.dirname(os.path.abspath(entrada)), 'tema.json')
    if os.path.exists(tema):
        import json
        aplicar_tema(tmp, json.load(open(tema, encoding='utf-8')))
    carpeta = os.path.join(tmp, 'ppt', 'slides')
    for f in os.listdir(carpeta):
        if f.endswith('.xml'):
            limpiar_alt(os.path.join(carpeta, f))
    nums = sorted(int(m.group(1)) for f in os.listdir(carpeta) if (m := re.match(r'slide(\d+)\.xml$', f)))
    for n in nums:
        g, f, portada = procesar(os.path.join(carpeta, f'slide{n}.xml'))
        print(f'Diapositiva {n:2d}: {g:2d} momentos, {f:3d} objetos animados, transición {"empujar" if portada else "desvanecer"}')
    salida = os.path.abspath(salida)
    if os.path.exists(salida):
        os.remove(salida)
    # Reempaquetar con [Content_Types].xml primero (como lo hace PowerPoint).
    archivos = []
    for base, _, fs in os.walk(tmp):
        for f in fs:
            archivos.append(os.path.relpath(os.path.join(base, f), tmp).replace(os.sep, '/'))
    archivos.sort(key=lambda a: (a != '[Content_Types].xml', a))
    with zipfile.ZipFile(salida, 'w', zipfile.ZIP_DEFLATED) as z:
        for a in archivos:
            z.write(os.path.join(tmp, a), a, compress_type=zipfile.ZIP_STORED if a.endswith('.mp4') else zipfile.ZIP_DEFLATED)
    shutil.rmtree(tmp)


if __name__ == '__main__':
    AQUI = os.path.dirname(os.path.abspath(__file__))
    entrada = sys.argv[1] if len(sys.argv) > 1 else os.path.join(AQUI, 'trabajo', 'sin-animar.pptx')
    salida = sys.argv[2] if len(sys.argv) > 2 else os.path.join(AQUI, '..', 'EarlyStock_Presentacion.pptx')
    main(entrada, salida)
    print('Presentación lista:', os.path.abspath(salida))
