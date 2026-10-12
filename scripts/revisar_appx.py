"""Revisa un paquete .appx/.msix antes de subirlo a la Microsoft Store.

Uso (desde la carpeta de la app):  python scripts/revisar_appx.py
Busca el paquete mas reciente en release/ y lo compara con lo que dice package.json.
"""
import json
import re
import sys
import urllib.parse
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

SUFIJO_PFN = "d383qy40395da"          # parte final del Package Family Name de tu producto
RAIZ_INSTALACION = "C:\\Program Files\\WindowsApps\\"
LIMITE_RUTA = 259                      # maximo real de Windows (260 con el caracter final)
AVISO_RUTA = 245                       # por encima de esto queda poco margen
OID_PRUEBA = "OID.2.25.311729368913984317654407730594956997722=1"  # marcador de paquete de prueba sin firmar

ARCHIVOS_CLAVE = [
    "app/resources/python/python.exe",
    "app/resources/python/python311._pth",
    "app/resources/backend/main.py",
    "app/resources/backend/config.py",
    "app/resources/backend/modelos_entrenados/modelo_detection.keras",
    "app/resources/backend/modelos_entrenados/modelo_classification.keras",
    "app/resources/backend/modelos_entrenados/thresholds.json",
]


def local(tag):
    return tag.rsplit("}", 1)[-1]


def norm(nombre):
    return urllib.parse.unquote(nombre).replace("\\", "/")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    prueba = "--prueba" in sys.argv
    if args:
        ruta = Path(args[0])
    else:
        cand = sorted(list(Path("release").glob("*.appx")) + list(Path("release").glob("*.msix")),
                      key=lambda p: p.stat().st_mtime, reverse=True)
        if not cand:
            raise SystemExit("No encuentro ningun .appx ni .msix en la carpeta release.")
        ruta = cand[0]
    cfg = json.loads(Path("package.json").read_text(encoding="utf-8"))["build"]["appx"]

    resultados = []

    def chequear(ok, texto, detalle=""):
        resultados.append(ok)
        print(("  OK    " if ok else "  FALLA ") + texto + ((" -> " + detalle) if detalle else ""))

    z = zipfile.ZipFile(ruta)
    infos = z.infolist()
    nombres = {norm(i.filename).lower(): i for i in infos}
    print("Paquete: %s | %.0f MB comprimido | %d archivos adentro" % (
        ruta.name, ruta.stat().st_size / 1048576, len(infos)))

    if "appxmanifest.xml" not in nombres:
        raise SystemExit("El paquete no tiene AppxManifest.xml: no es valido.")
    raiz = ET.fromstring(z.read(nombres["appxmanifest.xml"].filename))
    nodos = {local(e.tag): e for e in raiz.iter()}

    print("\nIdentidad (debe coincidir con Partner Center):")
    ident = nodos["Identity"].attrib
    chequear(ident.get("Name") == cfg["identityName"], "Identity/Name", ident.get("Name"))
    publisher = ident.get("Publisher", "")
    if prueba:
        chequear(publisher == cfg["publisher"] + ", " + OID_PRUEBA, "Identity/Publisher de PRUEBA (con el marcador de paquete sin firmar)", publisher)
    else:
        chequear(publisher == cfg["publisher"], "Identity/Publisher (sin marcador de prueba, como lo pide la Store)", publisher)
    editor = nodos["PublisherDisplayName"].text if "PublisherDisplayName" in nodos else None
    chequear(editor == cfg["publisherDisplayName"], "PublisherDisplayName", editor)
    version = ident.get("Version", "")
    chequear(bool(re.fullmatch(r"\d+\.\d+\.\d+\.0", version)), "Version con el ultimo numero en 0 (lo exige la Store)", version)
    chequear(ident.get("ProcessorArchitecture") == "x64", "Arquitectura x64", ident.get("ProcessorArchitecture"))
    nombre = nodos["DisplayName"].text if "DisplayName" in nodos else None
    print("        Nombre que se mostrara: %s" % nombre)

    print("\nLogos que pide el manifiesto:")
    faltan = []
    vistos = set()
    for e in raiz.iter():
        for v in e.attrib.values():
            if v.lower().endswith(".png") and v not in vistos:
                vistos.add(v)
        if local(e.tag) == "Logo" and e.text and e.text.lower().endswith(".png"):
            vistos.add(e.text)
    for v in sorted(vistos):
        base = norm(v).lower()
        stem = base[:-4]
        ok = base in nombres or any(re.fullmatch(re.escape(stem) + r"\.(scale|targetsize|altform)-.*\.png", n) for n in nombres)
        if not ok:
            faltan.append(v)
    chequear(not faltan, "Todos los logos del manifiesto existen en el paquete (%d)" % len(vistos), ", ".join(faltan))

    print("\nPrograma y motor de deteccion:")
    app = nodos.get("Application")
    exe = norm(app.attrib.get("Executable", "")) if app is not None else ""
    chequear(exe.lower() in nombres, "Ejecutable principal", exe)
    for clave in ARCHIVOS_CLAVE:
        chequear(clave.lower() in nombres, clave)

    print("\nCapacidades (permisos especiales):")
    caps = [n.attrib.get("Name") for n in raiz.iter() if local(n.tag) == "Capability"]
    print("        Declaradas:", ", ".join(caps) or "ninguna")
    chequear("runFullTrust" in caps, "runFullTrust (normal en apps de escritorio; la Store pedira justificarlo)")

    print("\nRutas largas (Windows falla con mas de 260 caracteres):")
    pfn = "%s_%s_x64__%s" % (ident.get("Name"), version, SUFIJO_PFN)
    base = len(RAIZ_INSTALACION) + len(pfn) + 1
    peor = max((len(norm(i.filename)) for i in infos), default=0)
    peor_ruta = max((norm(i.filename) for i in infos), key=len, default="")
    largo = base + peor
    chequear(largo <= LIMITE_RUTA, "Ruta mas larga una vez instalado: %d caracteres (maximo de Windows: 260)" % largo,
             "" if largo <= LIMITE_RUTA else peor_ruta[:120])
    if LIMITE_RUTA >= largo > AVISO_RUTA:
        print("        AVISO: entra, pero con solo %d caracteres de margen. Si crece, hay que acortar rutas." % (260 - largo))

    print("\nRESULTADO: %s" % ("TODO OK, listo para subir" if all(resultados) else "%d PROBLEMAS, no lo subas todavia" % resultados.count(False)))
    sys.exit(0 if all(resultados) else 1)


if __name__ == "__main__":
    main()
