"""Acceso directo al backend local: preparar datos, simular el robot y limpiar al terminar."""
import base64
import time
from datetime import date

import requests

import config


class Backend:
    def __init__(self, url: str = config.BACKEND):
        self.url = url.rstrip("/")
        self.s = requests.Session()

    # ── básicos ──
    def get(self, ruta, **kw):
        return self.s.get(self.url + ruta, timeout=30, **kw)

    def post(self, ruta, json=None, **kw):
        return self.s.post(self.url + ruta, json=json, timeout=60, **kw)

    def put(self, ruta, json=None, **kw):
        return self.s.put(self.url + ruta, json=json, timeout=30, **kw)

    def delete(self, ruta, **kw):
        return self.s.delete(self.url + ruta, timeout=60, **kw)

    def disponible(self) -> bool:
        try:
            return self.get("/health").ok
        except requests.RequestException:
            return False

    # ── sesión (el backend tiene UNA sesión, compartida con la app) ──
    def entrar(self, usuario=config.USUARIO, clave=config.CLAVE):
        r = self.post("/nube/login", {"usuario": usuario, "clave": clave})
        r.raise_for_status()
        return r.json()

    def salir(self):
        self.post("/nube/logout")

    def con_sesion(self) -> bool:
        return bool(self.get("/nube/estado").json().get("sesion"))

    # ── datos de prueba en la nube ──
    def crear_proyecto(self, nombre: str) -> int:
        r = self.post("/nube/api/proyectos", {
            "nombre": nombre, "finalidad": "tecnica_periodica", "responsable": "Pruebas automáticas",
            "estado": "activo", "fecha_inicio": date.today().isoformat(),
        })
        r.raise_for_status()
        return int(r.json()["id"])

    def crear_edificacion(self, proyecto_id: int, nombre: str, pisos: int = 0) -> int:
        r = self.post("/nube/api/edificaciones", {
            "proyecto_id": proyecto_id, "nombre": nombre, "tipo_propiedad": "edificio", "destino": "vivienda",
            "direccion": "Av. de Prueba 123, Córdoba, Córdoba, Argentina", "calle_numero": "Av. de Prueba 123",
            "localidad": "Córdoba", "provincia": "Córdoba", "pais": "Argentina", "anio_precision": "desconocido",
            "pisos_sobre_pb": pisos, "cantidad_plantas": pisos + 1, "subsuelos": 0,
        })
        r.raise_for_status()
        return int(r.json()["id"])

    def robot_simulador(self) -> int:
        """Id de un robot simulador de prueba (lo crea si no existe)."""
        nombre = f"{config.PREFIJO} simulador"
        for r in self.get("/nube/api/robots").json():
            if r.get("codigo") == nombre:
                return int(r["id"])
        r = self.post("/nube/api/robots", {
            "codigo": nombre, "unidad": "Simulador MuJoCo", "conexion": None, "credenciales": {},
            "ultima_prueba_fecha": None, "ultima_prueba": None, "estado": "activo",
        })
        r.raise_for_status()
        return int(r.json()["id"])

    def limpiar(self):
        """Borra todo lo que crearon las pruebas (proyectos y robots con el prefijo)."""
        if not self.con_sesion():
            return
        if self.get("/nube/estado").json().get("relevamiento_id"):
            self.post("/nube/relevamientos/detener")
        for p in self.get("/nube/api/proyectos").json():
            if str(p.get("nombre", "")).startswith(config.PREFIJO):
                self.delete(f"/nube/api/proyectos/{p['id']}?forzar=true")
        for r in self.get("/nube/api/robots").json():
            if str(r.get("codigo", "")).startswith(config.PREFIJO):
                self.delete(f"/nube/api/robots/{r['id']}")

    # ── robot simulado (hace lo mismo que el script de MuJoCo, sin abrir el simulador) ──
    def mandar_plano(self):
        """Una habitación de 4 x 3 m con paredes de 5 cm."""
        celdas = [[i, 0] for i in range(80)] + [[i, 59] for i in range(80)] \
            + [[0, j] for j in range(60)] + [[79, j] for j in range(60)]
        self.post("/room", {
            "x_min": 0, "x_max": 4, "y_min": 0, "y_max": 3, "width": 4, "depth": 3,
            "floor_polygon": [[0, 0], [4, 0], [4, 3], [0, 3]],
            "paredes": {"resolucion": 0.05, "celdas": celdas},
        }).raise_for_status()

    def recorrer(self, puntos=((0.5, 0.5), (1.5, 0.5), (2.5, 1.0), (3.0, 2.0), (2.0, 2.5)), espera=0.6):
        for x, y in puntos:
            self.post("/pose", {"x": x, "y": y, "yaw": 0.0, "timestamp": time.time()}).raise_for_status()
            time.sleep(espera)

    def mandar_foto(self, x=2.5, y=1.0, frame=900) -> dict:
        imagen = base64.b64encode(config.IMAGEN_PRUEBA.read_bytes()).decode()
        r = self.post("/detections", {"frame": frame, "timestamp": time.time(), "x": x, "y": y,
                                       "imagen_base64": imagen})
        r.raise_for_status()
        return r.json()

    def esperar(self, condicion, limite=60, cada=2):
        fin = time.time() + limite
        while time.time() < fin:
            valor = condicion()
            if valor:
                return valor
            time.sleep(cada)
        return None
