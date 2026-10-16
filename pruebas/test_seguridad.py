"""Casos S-01 a S-03: seguridad."""
import pytest


@pytest.mark.caso("S-01", "RNF7", "Pedir las credenciales de un robot")
def test_s01_credenciales_del_robot_bloqueadas(backend, escenario):
    r = backend.get(f"/nube/api/robots/{escenario['robot']}/credenciales")
    assert r.status_code == 403


@pytest.mark.caso("S-02", "RF1, RNF7", "Eliminar la cuenta con una contraseña incorrecta")
def test_s02_no_elimina_cuenta_con_clave_incorrecta(backend):
    r = backend.post("/nube/perfil/eliminar", {"clave": "ClaveIncorrecta123"})
    assert r.status_code == 400
    assert "no es correcta" in r.json().get("detail", "")
    assert backend.con_sesion(), "La sesión se cerró: la cuenta podría haberse eliminado"


@pytest.mark.caso("S-03", "RNF7, CU4", "Robot real sin las tres confirmaciones")
def test_s03_movimiento_sin_confirmaciones(backend):
    r = backend.post("/robot/movimiento/autorizar",
                     {"espacio_despejado": True, "soporte_seguridad": False, "operador_con_control": True})
    assert r.status_code in (409, 422), f"Se autorizó el movimiento ({r.status_code})"
    activo = backend.get("/robot/activo").json()
    assert not activo.get("movimiento_autorizado"), "El movimiento quedó autorizado"
