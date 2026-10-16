"""Preparación común: abre la app con Selenium, entra con la cuenta de prueba, saca capturas
y al final escribe los resultados (CSV, resumen y gráfico) para el informe."""
import csv
import os
import time
from datetime import datetime

import pytest

import config as cfg
from api import Backend

_resultados: list[dict] = []


# ── antes de empezar ──
def pytest_configure(config):
    cfg.RESULTADOS.mkdir(exist_ok=True)
    cfg.CAPTURAS.mkdir(exist_ok=True)
    cfg.ARCHIVOS.mkdir(exist_ok=True)
    for viejo in cfg.ARCHIVOS.iterdir():  # que no queden archivos de una corrida anterior
        if viejo.is_file():
            viejo.unlink()
    # La app guarda los PDF y archivos de las pruebas acá, sin abrir el diálogo de Windows
    os.environ["G1_PRUEBAS_DIR"] = str(cfg.ARCHIVOS)
    os.environ["G1_PRUEBAS_ARCHIVO"] = str(cfg.ARCHIVOS / "importar.g1insp")  # el que se «elige» al importar


@pytest.fixture(scope="session")
def backend():
    b = Backend()
    if not b.disponible():
        pytest.exit(f"El backend no responde en {cfg.BACKEND}. Abrilo con «python main.py» y volvé a correr.", 2)
    if not (cfg.USUARIO and cfg.CLAVE):
        pytest.exit("Faltan G1_USUARIO y G1_CLAVE (la cuenta de prueba). Ver README.md.", 2)
    b.entrar()
    b.limpiar()  # restos de una corrida anterior
    yield b
    try:
        b.entrar()
        b.limpiar()
    except Exception as e:  # que una falla al limpiar no tape los resultados
        print("No se pudieron borrar los datos de prueba:", e)


@pytest.fixture(scope="session")
def driver(backend):
    from selenium import webdriver
    from selenium.webdriver.chrome.service import Service

    opciones = webdriver.ChromeOptions()
    if cfg.MODO == "electron":
        if not cfg.ELECTRON.exists():
            pytest.exit(f"No está Electron en {cfg.ELECTRON}. Corré «pnpm install» en la carpeta de la app.", 2)
        if not os.path.exists(cfg.CHROMEDRIVER):
            pytest.exit("No está el ChromeDriver de Electron. Ver README.md (electron-chromedriver).", 2)
        opciones.binary_location = str(cfg.ELECTRON)
        opciones.add_argument(f"--app={cfg.APP}")
        d = webdriver.Chrome(service=Service(cfg.CHROMEDRIVER), options=opciones)
    else:
        # Las descargas (archivo para compartir) van a la carpeta de resultados, sin preguntar
        opciones.add_experimental_option("prefs", {
            "download.default_directory": str(cfg.ARCHIVOS), "download.prompt_for_download": False})
        d = webdriver.Chrome(options=opciones)  # Selenium Manager baja el driver de Chrome solo
        d.get(cfg.URL_APP)
    try:
        d.set_window_size(cfg.ANCHO, cfg.ALTO)
    except Exception:
        pass  # Electron no deja cambiar el tamaño desde Selenium: usa el de la ventana de la app
    yield d
    d.quit()


def _esperar_app(d, limite=60):
    """La app de escritorio primero muestra «Iniciando…» hasta que responde el backend."""
    fin = time.time() + limite
    while time.time() < fin:
        try:
            if d.execute_script("return location.href.startsWith('http') && !!document.querySelector('button')"):
                return
        except Exception:
            pass
        time.sleep(0.5)


@pytest.fixture
def sin_sesion(driver, backend):
    """La app en la pantalla de inicio de sesión."""
    from paginas import Login
    backend.salir()
    driver.refresh()
    _esperar_app(driver)
    login = Login(driver)
    assert login.esta_visible(), "No apareció la pantalla de inicio de sesión"
    yield login
    backend.entrar()  # las demás pruebas necesitan la sesión


@pytest.fixture
def app(driver, backend):
    """La app abierta y con la sesión de la cuenta de prueba."""
    from paginas import Login, Principal
    _esperar_app(driver)
    if not backend.con_sesion():
        backend.entrar()
    login = Login(driver)
    if login.esta_visible(limite=2):
        driver.refresh()
        _esperar_app(driver)
    p = Principal(driver)
    p.recargar()  # cada prueba arranca con la app recién cargada (y con los datos creados por la API)
    p.ir_a("Inicio")
    return p


# ── capturas y resultados ──
@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    salida = yield
    reporte = salida.get_result()
    marca = item.get_closest_marker("caso")
    if reporte.when == "call" or (reporte.when == "setup" and reporte.outcome != "passed"):
        caso_id, cubre, descripcion = (marca.args if marca else (item.name, "", item.name))
        captura = ""
        d = item.funcargs.get("driver")
        if d is not None:
            captura = str(cfg.CAPTURAS / f"{caso_id}.png")
            try:
                d.save_screenshot(captura)
                extras = getattr(reporte, "extras", [])
                try:
                    from pytest_html import extras as ex
                    import base64
                    extras.append(ex.png(base64.b64encode(open(captura, "rb").read()).decode()))
                    reporte.extras = extras
                except ImportError:
                    pass
            except Exception:
                captura = ""
        estado = {"passed": "Aprobó", "failed": "Falló", "skipped": "Omitido"}[reporte.outcome]
        _resultados.append({
            "ID": caso_id, "Grupo": _grupo(caso_id), "Caso": descripcion, "Cubre": cubre, "Resultado": estado,
            "Duración (s)": f"{reporte.duration:.2f}".replace(".", ","),
            "Detalle": "" if reporte.passed else str(reporte.longreprtext).strip().splitlines()[-1][:200],
            "Captura": os.path.basename(captura),
        })


def _grupo(caso_id: str) -> str:
    return {"F": "Funcionales", "B": "Backend", "R": "Rendimiento y responsive", "S": "Seguridad"}.get(caso_id[:1], "Otros")


def pytest_sessionfinish(session, exitstatus):
    if not _resultados:
        return
    filas = sorted(_resultados, key=lambda r: (r["ID"][0], int(r["ID"].split("-")[1]) if "-" in r["ID"] else 0))
    # Tabla para el informe (se abre en Excel: separada por punto y coma)
    with open(cfg.RESULTADOS / "resultados.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=list(filas[0].keys()), delimiter=";")
        w.writeheader()
        w.writerows(filas)
    # Resumen por grupo
    grupos: dict[str, dict[str, int]] = {}
    for r in filas:
        g = grupos.setdefault(r["Grupo"], {"Aprobó": 0, "Falló": 0, "Omitido": 0})
        g[r["Resultado"]] += 1
    total = len(filas)
    aprobados = sum(g["Aprobó"] for g in grupos.values())
    lineas = [f"Corrida del {datetime.now():%d/%m/%Y %H:%M} · modo {cfg.MODO}",
              f"Aprobaron {aprobados} de {total} casos ({aprobados * 100 // total} %)", ""]
    lineas += [f"{g}: {v['Aprobó']} aprobaron, {v['Falló']} fallaron, {v['Omitido']} omitidos" for g, v in grupos.items()]
    (cfg.RESULTADOS / "resumen.txt").write_text("\n".join(lineas) + "\n", encoding="utf-8")
    _grafico(grupos)


def _grafico(grupos):
    """Barras de casos aprobados, fallados y omitidos por grupo (para el informe)."""
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        return
    nombres = list(grupos)
    fig, ax = plt.subplots(figsize=(7, 3.2), dpi=150)
    base = [0] * len(nombres)
    for estado, color in (("Aprobó", "#2E7D5B"), ("Falló", "#C0392B"), ("Omitido", "#A0A2A4")):
        valores = [grupos[g][estado] for g in nombres]
        ax.barh(nombres, valores, left=base, color=color, label=estado)
        base = [a + b for a, b in zip(base, valores)]
    ax.set_xlabel("Casos de prueba")
    ax.invert_yaxis()
    ax.spines[["top", "right"]].set_visible(False)
    ax.legend(loc="lower right", frameon=False)
    fig.tight_layout()
    fig.savefig(cfg.RESULTADOS / "grafico_resultados.png")
    plt.close(fig)


# ── datos de prueba compartidos ──
@pytest.fixture(scope="session")
def escenario(backend):
    """Proyecto, edificación (PB + 2 pisos), robot simulador y una inspección terminada con hallazgos.
    Se arma por la API, igual que lo haría el simulador, y se borra al final de la corrida."""
    pid = backend.crear_proyecto(f"{cfg.PREFIJO} Proyecto base")
    eid = backend.crear_edificacion(pid, f"{cfg.PREFIJO} Edificio base", pisos=2)
    rid = backend.robot_simulador()
    r = backend.post("/nube/relevamientos/iniciar", {
        "edificacion_id": eid, "robot_id": rid, "planta": "Planta baja", "motivo": "rutina",
        "observaciones": "Corrida de pruebas automáticas"})
    r.raise_for_status()
    relevamiento = int(r.json()["id"])
    backend.mandar_plano()
    backend.recorrer()
    backend.mandar_foto(x=2.5, y=1.0, frame=900)
    backend.mandar_foto(x=3.0, y=2.0, frame=1200)
    hallazgos = backend.esperar(
        lambda: [h for h in backend.get(f"/nube/api/relevamientos/{relevamiento}/hallazgos").json()] or None, limite=90)
    backend.post("/nube/relevamientos/detener").raise_for_status()
    return {"proyecto": pid, "edificacion": eid, "robot": rid, "relevamiento": relevamiento,
            "hallazgos": hallazgos or [], "nombre_edificio": f"{cfg.PREFIJO} Edificio base",
            "nombre_proyecto": f"{cfg.PREFIJO} Proyecto base"}
