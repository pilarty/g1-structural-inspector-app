"""Casos F-01 a F-19: pruebas funcionales de punta a punta sobre la app, con Selenium."""
import shutil
import time
from pathlib import Path

import pytest
from selenium.webdriver.common.by import By

import config
from paginas import Formulario, IniciarInspeccion, Inspecciones, Login, Principal
from paginas.base import _xp

pytestmark = pytest.mark.ui
P = config.PREFIJO


# ── Cuenta y sesión ──
@pytest.mark.caso("F-01", "RF1, CU1", "Entrar con la cuenta de prueba")
def test_f01_iniciar_sesion(sin_sesion, driver):
    sin_sesion.entrar(config.USUARIO, config.CLAVE)
    assert Principal(driver).lista_cargada(), "No se vio la pantalla de inicio con los proyectos"


@pytest.mark.caso("F-02", "RF1, CU1", "Entrar con una contraseña incorrecta")
def test_f02_contrasena_incorrecta(sin_sesion):
    sin_sesion.entrar(config.USUARIO, "ContraseniaIncorrecta123")
    assert "incorrectos" in sin_sesion.error()
    assert sin_sesion.esta_visible(), "No debería haber entrado"


@pytest.mark.caso("F-03", "RF1, CU1", "Abrir «¿Olvidaste tu contraseña?» y «Registrate»")
def test_f03_registro_y_olvide(sin_sesion):
    sin_sesion.abrir_registro()
    for etiqueta in ("Nombre", "Apellido", "Correo", "Confirmar contraseña"):
        assert sin_sesion.campo(etiqueta).is_displayed(), f"Falta el campo {etiqueta}"
    assert sin_sesion.hay_texto("Crear cuenta")
    sin_sesion.volver()
    sin_sesion.abrir_olvide()
    assert sin_sesion.hay_texto("Enviar código")
    sin_sesion.volver()
    assert sin_sesion.esta_visible()


@pytest.mark.caso("F-04", "RF1", "Abrir la ventana de perfil y cerrar sesión")
def test_f04_perfil_y_cerrar_sesion(app, driver):
    app.boton("Perfil").click()
    ventana = app.esperar_xpath("//*[@aria-label='Perfil y configuración']")
    ventana.find_element(By.XPATH, ".//nav//button[normalize-space(.)='Cuenta']").click()
    ventana.find_element(By.XPATH, ".//button[normalize-space(.)='Cerrar sesión']").click()
    assert Login(driver).esta_visible(), "No volvió a la pantalla de inicio de sesión"


# ── Proyectos y edificaciones ──
@pytest.mark.caso("F-05", "RF2, CU2", "Crear un proyecto")
def test_f05_crear_proyecto(app, backend, driver):
    nombre = f"{P} Proyecto UI"
    app.ir_a("Añadir proyecto")
    f = Formulario(driver)
    f.escribir("Nombre del proyecto", nombre)
    f.elegir("Finalidad de la inspección", "tecnica_periodica")
    f.escribir("Responsable del proyecto", "Pruebas automáticas")
    f.clic("Crear proyecto")
    creado = backend.esperar(lambda: any(p["nombre"] == nombre for p in backend.get("/nube/api/proyectos").json()), limite=20)
    assert creado, "El proyecto no se guardó en la nube"
    app.ir_a("Inicio")
    assert app.hay_en_barra(nombre), "El proyecto no aparece en la barra de proyectos"


@pytest.mark.caso("F-06", "RF2, CU2", "Crear un proyecto sin nombre")
def test_f06_proyecto_sin_nombre(app, driver):
    app.ir_a("Añadir proyecto")
    f = Formulario(driver)
    f.escribir("Responsable del proyecto", "Pruebas automáticas")
    f.clic("Crear proyecto")
    time.sleep(0.5)
    assert "Falta el nombre del proyecto." in f.errores()
    assert f.titulo() == "Nuevo proyecto", "No debería haber salido del formulario"


@pytest.mark.caso("F-07", "RF2, CU2", "Crear una edificación con PB + 2 pisos")
def test_f07_crear_edificacion(app, backend, driver, escenario):
    nombre = f"{P} Edificio UI"
    app.ir_a("Inicio")
    app.clic(f"Agregar una edificación a {escenario['nombre_proyecto']}")
    f = Formulario(driver)
    f.escribir("Nombre de referencia", nombre)
    f.opcion("Edificio")
    f.opcion("Vivienda")
    f.escribir("Calle y número", "Av. Colón 1234")
    f.escribir("Localidad", "Córdoba")
    f.elegir("Provincia", "Córdoba")
    f.opcion("Desconocido")
    f.escribir("Pisos sobre planta baja", "2")
    f.clic("Guardar edificio")
    edif = backend.esperar(lambda: next((e for e in backend.get("/nube/api/edificaciones").json() if e["nombre"] == nombre), None),
                           limite=20)
    assert edif, f"La edificación no se guardó: {f.errores()}"
    assert edif["pisos_sobre_pb"] == 2 and int(edif["proyecto_id"]) == escenario["proyecto"]
    app.ir_a("Inicio")
    assert app.hay_en_barra(nombre)


@pytest.mark.caso("F-08", "RF2", "Editar la dirección en la ficha y guardar")
def test_f08_editar_ficha(app, backend, driver, escenario):
    nueva = "Bv. San Juan 500"
    app.abrir_edificacion(escenario["nombre_edificio"])
    app.clic("Ficha del inmueble")
    app.clic("Editar")
    f = Formulario(driver)
    f.escribir("Calle y número", nueva)
    f.clic("Guardar cambios")
    ok = backend.esperar(
        lambda: backend.get(f"/nube/api/edificaciones/{escenario['edificacion']}").json().get("calle_numero") == nueva, limite=20)
    assert ok, f"No se guardó la dirección nueva: {f.errores()}"
    assert app.hay_texto(nueva), "La ficha no muestra la dirección nueva"


# ── Iniciar inspección ──
def _elegir_lugar(pagina, escenario, planta="Planta baja"):
    pagina.elegir("Proyecto", escenario["nombre_proyecto"])
    pagina.elegir("Edificación", escenario["nombre_edificio"])
    pagina.elegir("Planta", planta)


@pytest.mark.caso("F-09", "RF4, CU4", "Iniciar inspección sin robot elegido")
def test_f09_sin_robot(app, driver, escenario):
    p = IniciarInspeccion(driver)
    p.abrir()
    _elegir_lugar(p, escenario)
    if p.campo("Robot").get_attribute("value"):
        pytest.skip("La cuenta tiene un solo robot y la app lo elige sola")
    assert not p.habilitado(), "Deja iniciar sin robot"
    assert "Sin elegir" in p.paso("Robot")


@pytest.mark.caso("F-10", "RF4, CU4", "Motivo «Otro» sin escribir el texto")
def test_f10_motivo_otro_vacio(app, driver, escenario):
    p = IniciarInspeccion(driver)
    p.abrir()
    _elegir_lugar(p, escenario)
    p.elegir("Robot", f"{P} simulador · Simulador MuJoCo")
    p.opcion("Otro")
    assert not p.habilitado(), "Deja iniciar con «Otro» vacío"
    assert "Falta escribirlo" in p.paso("Motivo")
    p.esperar_xpath("//input[@placeholder='Escribí el motivo']").send_keys("Pedido del consorcio")
    assert p.habilitado(), "Con el motivo escrito debería dejar iniciar"


@pytest.mark.caso("F-11", "RF4, RNF7, CU4", "Robot real sin conectar")
def test_f11_robot_real_sin_conectar(app, backend, driver, escenario):
    nombre = f"{P} G1 real"
    if not any(r["codigo"] == nombre for r in backend.get("/nube/api/robots").json()):
        backend.post("/nube/api/robots", {"codigo": nombre, "unidad": "Unitree G1", "conexion": None, "credenciales": {},
                                          "ultima_prueba_fecha": None, "ultima_prueba": None, "estado": "activo"}).raise_for_status()
    p = IniciarInspeccion(driver)
    p.recargar()  # para que la lista de robots incluya el nuevo
    p.abrir()
    _elegir_lugar(p, escenario)
    p.elegir("Robot", f"{nombre} · Unitree G1")
    assert not p.habilitado(), "Deja iniciar con un robot real sin conectar"
    assert "Sin conectar" in p.paso("Conexión")


@pytest.mark.caso("F-12", "RF5–RF9, CU5–CU7", "Iniciar con el simulador, recorrer y detener")
def test_f12_inspeccion_completa(app, backend, driver, escenario):
    p = IniciarInspeccion(driver)
    p.abrir()
    _elegir_lugar(p, escenario, planta="Piso 1")
    p.opcion("Seguimiento de daños")
    p.campo("Observaciones").send_keys("Prueba automática F-13")
    p.elegir("Robot", f"{P} simulador · Simulador MuJoCo")
    assert p.habilitado()
    p.boton_iniciar().click()
    p.esperar_xpath("//*[contains(normalize-space(.), 'Inspección en curso')]")
    rid = backend.esperar(lambda: backend.get("/nube/estado").json().get("relevamiento_id"), limite=15)
    assert rid, "No quedó ninguna inspección en curso"
    # El robot simulado recorre la planta y manda una foto con daño
    backend.mandar_plano()
    backend.recorrer()
    backend.mandar_foto(x=2.5, y=1.0)
    Principal(driver).esperar_xpath("//*[name()='svg'][@viewBox='0 0 800 600']//*[name()='circle'][@r='9.5']", limite=90)
    p.clic("Detener inspección")
    fin = backend.esperar(lambda: backend.get(f"/nube/api/relevamientos/{rid}").json().get("estado") == "finalizado", limite=20)
    assert fin, "La inspección no quedó finalizada"
    assert backend.get(f"/nube/api/relevamientos/{rid}/hallazgos").json(), "No se guardó el hallazgo"
    assert len(backend.get(f"/nube/api/relevamientos/{rid}/trayectoria").json()) >= 3, "No se guardó el recorrido"


# ── Relevamiento, hallazgos e informe ──
@pytest.mark.caso("F-13", "RF10, CU8", "Filtrar por tipo de daño en el panel de hallazgos")
def test_f13_filtrar_por_tipo(app, escenario):
    app.abrir_edificacion(escenario["nombre_edificio"])
    app.esperar_xpath("//*[name()='svg'][@viewBox='0 0 800 600']//*[name()='circle'][@r='9.5']")
    antes = app.puntos_en_plano()
    tipos = app.tipos_en_panel()
    assert antes > 0 and tipos, "No hay hallazgos en el plano"
    app.ocultar_tipo(tipos[0])
    assert app.puntos_en_plano() < antes, "Los puntos de ese tipo siguen en el plano"
    app.ocultar_tipo(tipos[0])  # vuelve a mostrarlo
    assert app.puntos_en_plano() == antes


@pytest.mark.caso("F-14", "RF11, RF12, CU9", "Confirmar un hallazgo con intervención y plazo")
def test_f14_revisar_hallazgo(app, backend, escenario):
    app.abrir_edificacion(escenario["nombre_edificio"])
    detalle = app.abrir_hallazgo(1)
    assert detalle.find_elements(By.XPATH, ".//img | .//*[contains(.,'Sin foto') or contains(.,'Cargando foto')]")
    detalle.find_element(By.XPATH, ".//button[normalize-space(.)='Confirmado']").click()
    detalle.find_element(By.XPATH, ".//input[starts-with(@placeholder,'Ej. sellado')]").send_keys("Sellado de fisura")
    from selenium.webdriver.support.select import Select
    Select(detalle.find_element(By.XPATH, ".//select")).select_by_visible_text("Dentro de 30 días")
    detalle.find_element(By.XPATH, ".//button[normalize-space(.)='Guardar revisión']").click()
    assert app.hay_texto("Revisión guardada."), "No se guardó la revisión"
    # La pantalla muestra la última inspección de la edificación: se buscan las revisiones de todas
    inspecciones = [r["id"] for r in backend.get("/nube/api/relevamientos").json()
                    if r.get("edificacion_id") == escenario["edificacion"]]
    revisiones = [x for rid in inspecciones for x in backend.get(f"/nube/api/relevamientos/{rid}/revisiones").json()]
    assert any(r["estado"] == "confirmado" and r["plazo"] == "Dentro de 30 días" for r in revisiones)
    detalle.find_element(By.XPATH, ".//button[@aria-label='Cerrar']").click()


@pytest.mark.caso("F-15", "RF14, RNF6, CU10", "Descargar el informe PDF")
def test_f15_informe_pdf(app, driver, escenario):
    app.abrir_edificacion(escenario["nombre_edificio"])
    app.esperar_plano()
    desde = time.time()
    if config.MODO != "electron":  # en Chrome la app abre el diálogo de impresión: se reemplaza para leer el informe
        driver.execute_script("window.print=()=>{window.__informe=(document.getElementById('informe-impresion')||{}).innerText||''}")
    app.menu_inspeccion("Descargar informe")
    if config.MODO == "electron":
        nuevo = None
        fin = time.time() + 60
        while time.time() < fin and not nuevo:
            nuevo = next((f for f in config.ARCHIVOS.glob("*.pdf") if f.stat().st_mtime >= desde), None)
            time.sleep(1)
        assert nuevo and nuevo.stat().st_size > 10_000, "No se generó el PDF"
    else:
        texto = app.espera.until(lambda d: d.execute_script("return window.__informe"))
        for parte in ("Datos generales", "Resumen", "Hallazgos", escenario["nombre_edificio"]):
            assert parte in texto, f"El informe no incluye «{parte}»"


# ── Inspecciones ──
@pytest.mark.caso("F-16", "RF13, CU11", "Buscar, filtrar y ordenar por hallazgos")
def test_f16_buscar_y_ordenar(app, driver, escenario):
    lista = Inspecciones(driver)
    lista.abrir()
    lista.buscar(escenario["nombre_edificio"])
    filas = lista.filas()
    assert filas and all(escenario["nombre_edificio"] in f for f in filas), "La búsqueda muestra otras edificaciones"
    lista.buscar("")
    lista.ordenar_por("Hallazgos")
    valores = [int(v) if v.isdigit() else 0 for v in lista.columna_hallazgos()]
    assert valores == sorted(valores, reverse=True), f"No quedó ordenado por hallazgos: {valores}"


@pytest.mark.caso("F-17", "RF13, CU11", "Eliminar una inspección de prueba")
def test_f17_eliminar_inspeccion(app, backend, driver, escenario):
    r = backend.post("/nube/relevamientos/iniciar", {"edificacion_id": escenario["edificacion"], "robot_id": escenario["robot"],
                                                      "planta": "Piso 2"})
    r.raise_for_status()
    rid = int(r.json()["id"])
    backend.post("/nube/relevamientos/detener").raise_for_status()
    codigo = f"INS-{rid:04d}"
    lista = Inspecciones(driver)
    lista.recargar()
    lista.abrir()
    lista.buscar(codigo)
    lista.boton(f"Más opciones de {codigo}").click()
    lista.esperar_xpath("//button[contains(normalize-space(.), 'Eliminar inspección')]").click()
    lista.esperar_xpath("//*[contains(normalize-space(.), '¿Eliminar esta inspección?')]")
    lista.clic("Eliminar")
    borrada = backend.esperar(lambda: backend.get(f"/nube/api/relevamientos/{rid}").status_code == 404, limite=20)
    assert borrada, "La inspección sigue en la nube"
    assert not any(codigo in f for f in lista.filas())


# ── Compartir ──
@pytest.mark.caso("F-18", "RF15, CU12", "Exportar una edificación e importarla")
def test_f18_compartir(app, backend, driver, escenario):
    nombre = escenario["nombre_edificio"]
    app.ir_a("Inicio")
    fila = app.esperar_xpath(f"//aside//button[normalize-space(.)={_xp(nombre)}]")
    driver.execute_script("arguments[0].scrollIntoView({block:'center'})", fila)
    from selenium.webdriver import ActionChains
    ActionChains(driver).move_to_element(fila).perform()
    app.boton(f"Más opciones de {nombre}").click()
    desde = time.time()
    app.esperar_xpath("//button[contains(normalize-space(.), 'Compartir edificación')]").click()
    exportado = None
    fin = time.time() + 60
    while time.time() < fin and not exportado:
        exportado = next((f for f in config.ARCHIVOS.glob("*.g1insp")
                          if f.name != "importar.g1insp" and f.stat().st_mtime >= desde), None)
        time.sleep(1)
    assert exportado, "No se generó el archivo para compartir"
    shutil.copy(exportado, config.ARCHIVOS / "importar.g1insp")
    if config.MODO != "electron":  # en Chrome se elige el archivo con un <input type=file>
        driver.execute_script(
            "const nombre=arguments[0],texto=arguments[1];HTMLInputElement.prototype.click=function(){"
            "if(this.type!=='file')return;const dt=new DataTransfer();dt.items.add(new File([texto],nombre));"
            "this.files=dt.files;this.dispatchEvent(new Event('change'));}",
            "importar.g1insp", Path(config.ARCHIVOS / "importar.g1insp").read_text(encoding="utf-8"))
    app.boton("Importar edificación (.g1insp)").click()
    app.esperar_xpath("//button[contains(normalize-space(.), 'Elegir archivo')]").click()
    app.esperar_xpath("//select[ancestor::*[contains(normalize-space(.), 'Guardar en el proyecto')]]")
    app.elegir("Guardar en el proyecto", escenario["nombre_proyecto"])
    app.clic("Importar")
    app.esperar_xpath("//button[normalize-space(.)='Ver la edificación']", limite=90)
    copias = [e for e in backend.get("/nube/api/edificaciones").json()
              if e["nombre"].startswith(nombre) and "importada" in e["nombre"]]
    assert copias, "No apareció la copia importada"
