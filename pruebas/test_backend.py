"""Casos B-01 a B-06: rutas del backend local que usa la app."""
import pytest

import config


@pytest.mark.caso("B-01", "RNF7", "Pedir datos sin sesión")
def test_b01_sin_sesion_responde_401(backend):
    backend.salir()
    try:
        r = backend.get("/nube/api/proyectos")
        assert r.status_code == 401
    finally:
        backend.entrar()


@pytest.mark.caso("B-02", "RNF7", "Pedir un recurso que no está permitido")
def test_b02_recurso_no_permitido_responde_404(backend):
    r = backend.get("/nube/api/tablas_internas")
    assert r.status_code == 404


@pytest.mark.caso("B-03", "RF4, RF5, RNF5", "Iniciar y detener una inspección por la API")
def test_b03_iniciar_y_detener(backend, escenario):
    rid = escenario["relevamiento"]
    insp = backend.get(f"/nube/api/relevamientos/{rid}").json()
    assert insp["estado"] == "finalizado", "La inspección no quedó finalizada"
    assert insp.get("fecha_fin"), "Falta la fecha de fin"
    camino = backend.get(f"/nube/api/relevamientos/{rid}/trayectoria").json()
    assert len(camino) >= 3, "No se guardó el recorrido del robot"
    plano = backend.get(f"/nube/api/relevamientos/{rid}/plano").json()
    assert plano.get("paredes", {}).get("celdas"), "No se guardó el plano de paredes"
    assert len(escenario["hallazgos"]) >= 1, "No llegó ningún hallazgo a la nube"
    planta = [p for p in backend.get("/nube/api/plantas").json() if p["relevamiento_id"] == rid]
    assert planta and planta[0]["planta"] == "Planta baja" and planta[0]["motivo"] == "rutina"


@pytest.mark.caso("B-04", "RF13, CU11", "Eliminar una inspección en curso")
def test_b04_no_borra_inspeccion_en_curso(backend, escenario):
    r = backend.post("/nube/relevamientos/iniciar", {
        "edificacion_id": escenario["edificacion"], "robot_id": escenario["robot"], "planta": "Piso 1"})
    r.raise_for_status()
    rid = int(r.json()["id"])
    try:
        borrado = backend.delete(f"/nube/api/relevamientos/{rid}")
        assert borrado.status_code == 409
        assert backend.get(f"/nube/api/relevamientos/{rid}").ok, "La inspección se borró igual"
    finally:
        backend.post("/nube/relevamientos/detener")
        backend.delete(f"/nube/api/relevamientos/{rid}")


@pytest.mark.caso("B-05", "RF15, CU12", "Exportar e importar el archivo .g1insp")
def test_b05_exportar_e_importar(backend, escenario):
    r = backend.get(f"/archivo-inspeccion/edificacion/{escenario['edificacion']}")
    assert r.ok, f"No se pudo exportar ({r.status_code})"
    archivo = r.json()
    assert archivo["version"] == 2
    assert len(archivo.get("inspecciones", [])) >= 1, "El archivo no trae las inspecciones"
    r = backend.post(f"/archivo-inspeccion/importar?proyecto_id={escenario['proyecto']}", archivo)
    assert r.ok, f"No se pudo importar ({r.status_code}): {r.text[:200]}"
    nombres = [e["nombre"] for e in backend.get("/nube/api/edificaciones").json()
               if e.get("proyecto_id") == escenario["proyecto"]]
    assert any(n.startswith(escenario["nombre_edificio"]) and "importada" in n for n in nombres)


@pytest.mark.caso("B-06", "RF12, RNF4", "Revisión de un hallazgo")
def test_b06_revision_de_hallazgo(backend, escenario):
    assert escenario["hallazgos"], "No hay hallazgos para revisar"
    hid = escenario["hallazgos"][0]["id"]
    revision = {"estado": "confirmado", "nota": f"{config.PREFIJO} nota", "intervencion": "Sellado de fisura",
                "plazo": "Inmediato"}
    assert backend.put(f"/nube/api/hallazgos/{hid}/revision", revision).ok
    guardadas = backend.get(f"/nube/api/relevamientos/{escenario['relevamiento']}/revisiones").json()
    r = next(x for x in guardadas if x["hallazgo_id"] == hid)
    assert (r["estado"], r["nota"], r["intervencion"], r["plazo"]) == (
        "confirmado", revision["nota"], revision["intervencion"], revision["plazo"])
    # vuelve a «sin revisar» para no condicionar las otras pruebas
    backend.put(f"/nube/api/hallazgos/{hid}/revision", {"estado": "pendiente", "nota": None,
                                                        "intervencion": None, "plazo": None})
