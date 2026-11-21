"""Casos R-01 a R-03: tiempos de respuesta y adaptación a distintas pantallas."""
import time

import pytest

import config
from paginas import Principal

# Busca textos que se salen de la ventana o quedan cortados por su contenedor
AUDITAR = """
const W=innerWidth, out=[];
for (const el of document.querySelectorAll('body *')) {
  if (el.childElementCount!==0 && !['BUTTON','INPUT','SELECT'].includes(el.tagName)) continue;
  const cs=getComputedStyle(el); if (cs.display==='none'||cs.visibility==='hidden') continue;
  const r=el.getBoundingClientRect(); if (r.width<2||r.height<2) continue;
  const t=(el.textContent||el.value||el.getAttribute('aria-label')||'').trim().slice(0,30); if(!t) continue;
  if (r.right>W+1) { out.push('Se sale: '+t); continue; }
  let a=el.parentElement;
  while (a && a!==document.body) {
    const c=getComputedStyle(a);
    if (/(auto|scroll)/.test(c.overflowX)) break;
    if (/(hidden|clip)/.test(c.overflowX)) { const q=a.getBoundingClientRect(); if (r.right>q.right+1||r.left<q.left-1) out.push('Cortado: '+t); break; }
    a=a.parentElement;
  }
}
for (const e of document.querySelectorAll('body *')) {
  const c=getComputedStyle(e);
  // (las plantas se deslizan a propósito: esa fila no tiene barra visible)
  if (/(auto|scroll)/.test(c.overflowX) && c.scrollbarWidth!=='none' && e.scrollWidth>e.clientWidth+2) out.push('Barra horizontal en '+((e.querySelector('h1,h2,h3')||e).textContent||'').trim().slice(0,30));
}
return [...new Set(out)];
"""

PANTALLAS = ["Inicio", "Inspecciones", "Iniciar inspección", "Añadir proyecto"]


@pytest.mark.ui
@pytest.mark.caso("R-01", "RNF3", "Tiempo desde el inicio de sesión hasta ver los proyectos")
def test_r01_tiempo_inicio_de_sesion(sin_sesion, driver):
    sin_sesion.escribir("Usuario o correo", config.USUARIO)
    sin_sesion.escribir("Contraseña", config.CLAVE)
    inicio = time.perf_counter()
    sin_sesion.clic("Iniciar sesión")
    Principal(driver).esperar_xpath("//aside//*[normalize-space(.)='Proyectos']")
    segundos = time.perf_counter() - inicio
    print(f"Inicio de sesión: {segundos:.2f} s")
    assert segundos < config.LIMITE_INICIO_SESION, f"Tardó {segundos:.2f} s"


@pytest.mark.ui
@pytest.mark.caso("R-02", "RF10, RNF3", "Tiempo en dibujar el plano con sus hallazgos")
def test_r02_tiempo_del_plano(app, escenario):
    app.ir_a("Inicio")
    boton = app.esperar_xpath(f"//aside//button[normalize-space(.)='{escenario['nombre_edificio']}']")
    inicio = time.perf_counter()
    boton.click()
    app.esperar_xpath("//*[name()='svg'][@viewBox='0 0 800 600']//*[name()='circle'][@r='9.5']")
    segundos = time.perf_counter() - inicio
    print(f"Plano con hallazgos: {segundos:.2f} s")
    assert segundos < config.LIMITE_PLANO, f"Tardó {segundos:.2f} s"


@pytest.mark.ui
@pytest.mark.caso("R-03", "RNF8", "Recorrer las pantallas en 1024×600, 1366×768 y 1920×1080")
def test_r03_responsive(app, driver, escenario):
    """Electron no deja cambiar el tamaño de la ventana desde Selenium, así que esta prueba abre la misma
    interfaz en Chrome (con la misma sesión del backend) y la recorre en cada tamaño."""
    navegador = driver
    if config.MODO == "electron":
        from selenium import webdriver
        navegador = webdriver.Chrome()
        navegador.get(config.URL_APP)
        time.sleep(3)
    p = Principal(navegador)
    problemas = []
    try:
        for ancho, alto in ((1024, 600), (1366, 768), (1920, 1080)):
            navegador.set_window_size(ancho, alto)
            time.sleep(0.8)
            for pantalla in PANTALLAS:
                p.ir_a(pantalla)
                time.sleep(1.5)
                problemas += [f"{ancho}×{alto} · {pantalla} · {x}" for x in navegador.execute_script(AUDITAR)]
            p.abrir_edificacion(escenario["nombre_edificio"])
            time.sleep(1.5)
            problemas += [f"{ancho}×{alto} · Relevamiento · {x}" for x in navegador.execute_script(AUDITAR)]
    finally:
        if navegador is not driver:
            navegador.quit()
        else:
            navegador.set_window_size(config.ANCHO, config.ALTO)
    assert not problemas, "\n".join(problemas[:20])
