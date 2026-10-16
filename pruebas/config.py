"""Configuración de las pruebas. Todo se puede cambiar con variables de entorno (ver README.md)."""
import os
from pathlib import Path

CARPETA = Path(__file__).resolve().parent
APP = CARPETA.parent  # carpeta del proyecto de la app (g1-structural-inspector-app)

# Backend local (FastAPI) y la interfaz servida por Vite
BACKEND = os.environ.get("G1_BACKEND_URL", "http://localhost:8000")
URL_APP = os.environ.get("G1_APP_URL", "http://localhost:8443")

# electron: la app de escritorio real (Electron + ChromeDriver de Electron)
# chrome:   la misma interfaz abierta en Chrome (sirve si todavía no está el ChromeDriver de Electron)
MODO = os.environ.get("G1_MODO", "electron").lower()
ELECTRON = Path(os.environ.get("G1_ELECTRON", APP / "node_modules" / "electron" / "dist" / "electron.exe"))
CHROMEDRIVER = os.environ.get(
    "G1_CHROMEDRIVER", str(APP / "node_modules" / "electron-chromedriver" / "bin" / "chromedriver.exe"))

# Cuenta de prueba (separada de la cuenta real). No se escribe acá: se lee del entorno.
USUARIO = os.environ.get("G1_USUARIO", "")
CLAVE = os.environ.get("G1_CLAVE", "")
# O en el archivo pruebas/.cuenta (no se sube a git): primera línea el correo, segunda la contraseña
if not (USUARIO and CLAVE) and (CARPETA / ".cuenta").exists():
    _lineas = (CARPETA / ".cuenta").read_text(encoding="utf-8").splitlines()
    USUARIO, CLAVE = (_lineas + ["", ""])[0].strip(), (_lineas + ["", ""])[1].strip()

# Imagen que se usa como «foto del robot» en las pruebas de inspección
IMAGEN_PRUEBA = Path(os.environ.get("G1_IMAGEN_PRUEBA", CARPETA / "datos" / "pared_con_grieta.png"))

# Tamaño de la ventana durante las pruebas funcionales
ANCHO, ALTO = 1366, 768

# Todo lo que crean las pruebas lleva este prefijo, para encontrarlo y borrarlo al terminar
PREFIJO = "PRUEBA"

# Resultados de cada corrida
RESULTADOS = CARPETA / "resultados"
CAPTURAS = RESULTADOS / "capturas"
ARCHIVOS = RESULTADOS / "archivos"  # PDF y .g1insp que guarda la app

# Límites de las pruebas de rendimiento (segundos)
LIMITE_INICIO_SESION = 3.0
LIMITE_PLANO = 2.0

# Tiempo máximo de espera de cada paso en pantalla (segundos)
ESPERA = 25
