"""Arma la carpeta build/runtime que viaja dentro del instalador:

    build/runtime/backend   codigo del backend + modelos
    build/runtime/python    Python propio (embebible) con TensorFlow y las demas librerias

Solo se corre en Windows y necesita internet (descarga Python y las librerias).
Uso:  python scripts/preparar_backend.py --backend ..\\g1-inspection-backend
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.request
import zipfile
from pathlib import Path

PY_VERSION = "3.11.9"
PY_TAG = "python311"  # nombre del archivo ._pth que trae la distribucion embebible
PY_URL = "https://www.python.org/ftp/python/%s/python-%s-embed-amd64.zip" % (PY_VERSION, PY_VERSION)
GETPIP_URL = "https://bootstrap.pypa.io/get-pip.py"

# Lo unico del backend que se copia al instalador (lista cerrada: no viajan fotos, pruebas ni secretos)
CARPETAS_BACKEND = ["api", "application", "domain", "infrastructure", "models", "modelos_entrenados"]
ARCHIVOS_BACKEND = ["main.py", "config.py", "requirements.txt"]
ARCHIVOS_NECESARIOS = [
    "main.py", "config.py", "requirements.txt",
    "modelos_entrenados/modelo_detection.keras",
    "modelos_entrenados/modelo_classification.keras",
    "modelos_entrenados/thresholds.json",
]
IGNORAR_AL_COPIAR = shutil.ignore_patterns("__pycache__", "*.pyc", ".git", ".env*", "*.pem")
LIMITE_RUTA_RELATIVA = 150  # el instalador se ubica en una carpeta que ya ocupa ~100 caracteres


def log(msg):
    print(msg, flush=True)


def validar_backend(backend):
    faltan = [a for a in ARCHIVOS_NECESARIOS if not (backend / a).is_file()]
    if faltan:
        raise SystemExit("En %s faltan archivos necesarios: %s" % (backend, ", ".join(faltan)))


def copiar_backend(backend, destino):
    if destino.exists():
        shutil.rmtree(destino)
    destino.mkdir(parents=True)
    for nombre in CARPETAS_BACKEND:
        if (backend / nombre).is_dir():
            shutil.copytree(backend / nombre, destino / nombre, ignore=IGNORAR_AL_COPIAR)
    for nombre in ARCHIVOS_BACKEND:
        shutil.copy2(backend / nombre, destino / nombre)
    conocidos = set(CARPETAS_BACKEND + ARCHIVOS_BACKEND)
    omitidos = sorted(p.name for p in backend.iterdir() if p.name not in conocidos and not p.name.startswith("."))
    return omitidos


def configurar_pth(python_dir):
    """Activa site-packages y agrega la carpeta del backend al path del Python embebible."""
    pth = python_dir / (PY_TAG + "._pth")
    if not pth.is_file():
        raise SystemExit("No encuentro %s en el Python descargado" % pth.name)
    (python_dir / "Lib" / "site-packages").mkdir(parents=True, exist_ok=True)
    pth.write_text(PY_TAG + ".zip\n.\nLib\\site-packages\n..\\backend\nimport site\n", encoding="ascii")


def medir_rutas(*carpetas):
    """Devuelve (largo, ruta relativa) de la ruta mas larga dentro de cada carpeta."""
    peor = (0, "")
    for carpeta in carpetas:
        base = carpeta.parent
        for raiz, _, archivos in os.walk(carpeta):
            for a in archivos:
                rel = str((Path(raiz) / a).relative_to(base))
                if len(rel) > peor[0]:
                    peor = (len(rel), rel)
    return peor


def tamano_mb(carpeta):
    total = 0
    for raiz, _, archivos in os.walk(carpeta):
        for a in archivos:
            try:
                total += (Path(raiz) / a).stat().st_size
            except OSError:
                pass
    return total / (1024 * 1024)


# Cosas que no se usan al ejecutar y solo ocupan lugar o generan rutas muy largas:
# las cabeceras C++ de TensorFlow sirven para compilar extensiones, no para correr modelos.
BORRAR_DEL_RUNTIME = ["Lib/site-packages/tensorflow/include"]


def limpiar_runtime(python_dir):
    liberado = 0
    for rel in BORRAR_DEL_RUNTIME:
        carpeta = python_dir / rel
        if carpeta.is_dir():
            liberado += tamano_mb(carpeta)
            shutil.rmtree(carpeta)
    return liberado


def descargar(url, destino):
    if destino.is_file() and destino.stat().st_size > 0:
        log("  (ya descargado: %s)" % destino.name)
        return
    destino.parent.mkdir(parents=True, exist_ok=True)
    log("  descargando %s ..." % url)
    urllib.request.urlretrieve(url, str(destino))


def ejecutar(cmd, cwd=None):
    log("  > " + " ".join(str(c) for c in cmd))
    r = subprocess.run([str(c) for c in cmd], cwd=cwd)
    if r.returncode != 0:
        raise SystemExit("El comando fallo (codigo %d). Revisa el mensaje de arriba." % r.returncode)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--backend", default=r"..\g1-inspection-backend", help="carpeta del backend")
    ap.add_argument("--salida", default=r"build\runtime", help="carpeta de salida (por defecto build\\runtime)")
    args = ap.parse_args()
    if sys.platform != "win32":
        raise SystemExit("Este script arma el instalador de Windows: ejecutalo en Windows.")

    backend = Path(args.backend).resolve()
    salida = Path(args.salida).resolve()
    cache = salida.parent / "cache"
    inicio = time.time()

    log("1/6 Revisando el backend en %s" % backend)
    validar_backend(backend)

    log("2/6 Copiando el backend")
    omitidos = copiar_backend(backend, salida / "backend")
    if omitidos:
        log("  Se omiten (no viajan en el instalador): " + ", ".join(omitidos))

    log("3/6 Preparando Python %s propio" % PY_VERSION)
    python_dir = salida / "python"
    if python_dir.exists():
        shutil.rmtree(python_dir)
    zip_py = cache / ("python-%s-embed-amd64.zip" % PY_VERSION)
    descargar(PY_URL, zip_py)
    with zipfile.ZipFile(zip_py) as z:
        z.extractall(python_dir)
    configurar_pth(python_dir)
    exe = python_dir / "python.exe"
    getpip = cache / "get-pip.py"
    descargar(GETPIP_URL, getpip)
    ejecutar([exe, getpip, "--no-warn-script-location", "--disable-pip-version-check"])

    log("4/6 Instalando las librerias (TensorFlow pesa mucho: esto tarda varios minutos)")
    ejecutar([exe, "-m", "pip", "install", "-r", salida / "backend" / "requirements.txt",
              "--no-warn-script-location", "--disable-pip-version-check"])

    liberado = limpiar_runtime(python_dir)
    log("  Se quitaron %d MB que no se usan al ejecutar" % round(liberado))

    log("5/6 Verificando que todo se importa")
    ejecutar([exe, "-c",
              "import fastapi, uvicorn, tensorflow as tf, keras, numpy, PIL, h5py, pycognito, requests;"
              "print('  fastapi', fastapi.__version__, '| tensorflow', tf.__version__, '| keras', keras.__version__,"
              " '| numpy', numpy.__version__)"])
    with open(salida / "requirements.lock.txt", "w", encoding="utf-8") as f:
        subprocess.run([str(exe), "-m", "pip", "freeze"], stdout=f, check=True)

    log("6/6 Precompilando y midiendo")
    subprocess.run([str(exe), "-m", "compileall", "-q", str(python_dir / "Lib" / "site-packages"),
                    str(salida / "backend")], check=False)
    largo, ruta = medir_rutas(python_dir, salida / "backend")
    info = {
        "python": PY_VERSION,
        "creado": time.strftime("%Y-%m-%d %H:%M:%S"),
        "python_mb": round(tamano_mb(python_dir)),
        "backend_mb": round(tamano_mb(salida / "backend")),
        "ruta_mas_larga": largo,
    }
    (salida / "build-info.json").write_text(json.dumps(info, indent=2), encoding="utf-8")
    log("")
    log("LISTO en %.0f minutos." % ((time.time() - inicio) / 60))
    log("  Python con librerias: %d MB | backend con modelos: %d MB" % (info["python_mb"], info["backend_mb"]))
    log("  Ruta relativa mas larga: %d caracteres (limite que me pongo: %d)" % (largo, LIMITE_RUTA_RELATIVA))
    if largo > LIMITE_RUTA_RELATIVA:
        log("  AVISO: hay rutas largas; en algunas PCs el instalador podria fallar. Mira: " + ruta)
    log("  Carpeta lista: %s" % salida)


if __name__ == "__main__":
    main()
