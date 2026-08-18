# -*- coding: utf-8 -*-
"""
build_prescripcion.py — Convierte los diccionarios XML de prescripción de la AEMPS
(fuente: C:\\Users\\Usuario\\Desktop\\medi\\prescripcion.zip) a JSON compactos para
el módulo "Prescripción AEMPS" de farma-web (crmfarma.novasolum.cloud).

Genera en public/data/:
  · prescripcion.json      → 30k+ medicamentos con campos clave (búsqueda client-side)
  · prescripcion-dic.json  → diccionarios de apoyo (laboratorios, formas farm.,
                             vías administración, situación registro, ATC completo)

Uso:
  python tools/build_prescripcion.py [carpeta_con_los_xml]
  (por defecto usa la carpeta extraída en Temp\\opencode\\medi\\prescripcion)
"""
import json
import os
import sys
import xml.etree.ElementTree as ET

# ── Utilidades ────────────────────────────────────────────────────────────────

def quitar_namespaces(tree):
    """ElementTree no matchea find() con tags con namespace; los eliminamos."""
    for elem in tree.iter():
        elem.tag = elem.tag.split('}')[-1]


def parse_xml(ruta, raiz_hijos):
    """Itera los hijos <raiz_hijos> del XML devolviendo dicts {tag: texto}."""
    tree = ET.parse(ruta)
    quitar_namespaces(tree)
    root = tree.getroot()
    for hijo in root:
        if hijo.tag == raiz_hijos:
            yield {c.tag: (c.text or '').strip() for c in hijo}


def txt(nodo, tag):
    el = nodo.find(tag)
    return (el.text or '').strip() if el is not None else ''


# ── Diccionarios de apoyo ─────────────────────────────────────────────────────

def cargar_diccionarios(carpeta):
    dic = {}

    # Laboratorios: código → {n, d, l}
    labs = {}
    for e in parse_xml(os.path.join(carpeta, 'DICCIONARIO_LABORATORIOS.xml'), 'laboratorios'):
        labs[e['codigolaboratorio']] = {
            'n': e.get('laboratorio', ''),
            'd': e.get('direccion', ''),
            'l': e.get('localidad', ''),
        }
    dic['labs'] = labs

    # Formas farmacéuticas: código → nombre
    dic['ff'] = {
        e['codigoformafarmaceutica']: e['formafarmaceutica']
        for e in parse_xml(os.path.join(carpeta, 'DICCIONARIO_FORMA_FARMACEUTICA.xml'), 'formasfarmaceuticas')
    }

    # Vías de administración: código → nombre
    dic['vias'] = {
        e['codigoviaadministracion']: e['viaadministracion']
        for e in parse_xml(os.path.join(carpeta, 'DICCIONARIO_VIAS_ADMINISTRACION.xml'), 'viasadministracion')
    }

    # Situación de registro: código → nombre
    dic['sr'] = {
        e['codigosituacionregistro']: e['situacionregistro']
        for e in parse_xml(os.path.join(carpeta, 'DICCIONARIO_SITUACION_REGISTRO.xml'), 'situacionesregistro')
    }

    # Principios activos: nro → nombre
    dic['pa'] = {
        e['nroprincipioactivo']: e['principioactivo']
        for e in parse_xml(os.path.join(carpeta, 'DICCIONARIO_PRINCIPIOS_ACTIVOS.xml'), 'principiosactivos')
    }

    # ATC completo: código → descripción (sin el prefijo "XXXX - ")
    atc = {}
    for e in parse_xml(os.path.join(carpeta, 'DICCIONARIO_ATC.xml'), 'atc'):
        desc = e.get('descatc', '')
        codigo = e.get('codigoatc', '')
        # La descripción repite el código: "A01AA01 - Fluoruro de sodio"
        if desc.startswith(codigo + ' - '):
            desc = desc[len(codigo) + 3:]
        atc[codigo] = desc
    dic['atc'] = atc

    return dic


# ── Medicamentos (Prescripcion.xml) ───────────────────────────────────────────

def flag(sw):
    return sw == '1'


def parsear_prescripciones(ruta, dic_pa):
    """Convierte cada <prescription> en un registro compacto."""
    medicamentos = []
    tree = ET.parse(ruta)
    quitar_namespaces(tree)
    root = tree.getroot()

    for pres in root:
        if pres.tag != 'prescription':
            continue

        # Principios activos: "NOMBRE 500 mg + NOMBRE2 50 mg"
        partes_pa = []
        vias = []
        for ff in pres.findall('formasfarmaceuticas'):
            for comp in ff.findall('composicion_pa'):
                nombre = dic_pa.get(txt(comp, 'cod_principio_activo'), '')
                dosis = txt(comp, 'dosis_pa')
                unidad = txt(comp, 'unidad_dosis_pa')
                if nombre:
                    partes_pa.append(f"{nombre} {dosis} {unidad}".strip())
            for va in ff.findall('viasadministracion'):
                v = txt(va, 'cod_via_admin')
                if v:
                    vias.append(v)

        # Flags compactos (string de letras)
        f = ''
        if flag(txt(pres, 'sw_receta')): f += 'R'
        if flag(txt(pres, 'sw_generico')): f += 'G'
        if flag(txt(pres, 'sw_sustituible')): f += 'S'
        if flag(txt(pres, 'sw_uso_hospitalario')): f += 'H'
        if flag(txt(pres, 'sw_psicotropo')): f += 'P'
        if flag(txt(pres, 'sw_estupefaciente')): f += 'E'
        if flag(txt(pres, 'biosimilar')): f += 'B'
        if flag(txt(pres, 'sw_comercializado')): f += 'C'
        if flag(txt(pres, 'sw_triangulo_negro')): f += 'T'
        if flag(txt(pres, 'sw_huerfano')): f += 'O'
        if flag(txt(pres, 'sw_afecta_conduccion')): f += 'D'
        if flag(txt(pres, 'sw_especial_control_medico')): f += 'M'
        if flag(txt(pres, 'importacion_paralela')): f += 'I'

        # ATC (puede haber varios; nos quedamos el primero)
        atc = ''
        for a in pres.findall('atc'):
            atc = txt(a, 'cod_atc')
            if atc:
                break

        # Problemas de suministro (observaciones)
        ps = ''
        for p in pres.findall('problemassuministro'):
            ps = txt(p, 'observaciones')
            if ps:
                break

        med = {
            'n': txt(pres, 'cod_nacion'),
            'nd': txt(pres, 'nro_definitivo'),
            'nom': txt(pres, 'des_nomco'),
            'con': txt(pres, 'nro_conte'),
            'lt': txt(pres, 'laboratorio_titular'),
            'lc': txt(pres, 'laboratorio_comercializador'),
            'ff': '',
            'pa': ' + '.join(partes_pa),
            'vias': ','.join(vias),
            'atc': atc,
            'f': f,
            'sr': txt(pres, 'cod_sitreg'),
            'fa': txt(pres, 'fecha_autorizacion'),
        }

        # Forma farmacéutica real (código del primer formasfarmaceuticas)
        for ff in pres.findall('formasfarmaceuticas'):
            med['ff'] = txt(ff, 'cod_forfar')
            break

        if ps:
            med['ps'] = ps

        medicamentos.append(med)

    return medicamentos


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    carpeta = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.environ.get('TEMP', ''), 'opencode', 'medi', 'prescripcion')
    destino = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public', 'data')
    os.makedirs(destino, exist_ok=True)

    print(f"Fuente: {carpeta}")
    dic = cargar_diccionarios(carpeta)
    print(f"Diccionarios: {len(dic['labs'])} laboratorios · {len(dic['ff'])} formas farm. · "
          f"{len(dic['vias'])} vías · {len(dic['sr'])} situaciones · {len(dic['pa'])} principios activos · {len(dic['atc'])} códigos ATC")

    meds = parsear_prescripciones(os.path.join(carpeta, 'Prescripcion.xml'), dic['pa'])
    print(f"Medicamentos: {len(meds)}")

    # prescripcion.json
    ruta_meds = os.path.join(destino, 'prescripcion.json')
    with open(ruta_meds, 'w', encoding='utf-8') as fh:
        json.dump(meds, fh, ensure_ascii=False, separators=(',', ':'))
    print(f"OK {ruta_meds} ({os.path.getsize(ruta_meds) / 1e6:.1f} MB)")

    # prescripcion-dic.json (sin el diccionario de PA, que solo sirve al parsear)
    del dic['pa']
    ruta_dic = os.path.join(destino, 'prescripcion-dic.json')
    with open(ruta_dic, 'w', encoding='utf-8') as fh:
        json.dump(dic, fh, ensure_ascii=False, separators=(',', ':'))
    print(f"OK {ruta_dic} ({os.path.getsize(ruta_dic) / 1e6:.1f} MB)")


if __name__ == '__main__':
    main()
