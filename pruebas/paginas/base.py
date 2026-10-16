"""Acciones comunes sobre la app. Las pantallas se buscan por los textos que ve el usuario."""
import time

from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

import config


def _xp(texto: str) -> str:
    """Texto como literal de XPath (admite comillas simples)."""
    if "'" not in texto:
        return f"'{texto}'"
    return "concat('" + "', \"'\", '".join(texto.split("'")) + "')"


class Pagina:
    def __init__(self, driver: WebDriver):
        self.d = driver
        self.espera = WebDriverWait(driver, config.ESPERA)

    # ── buscar ──
    def esperar_xpath(self, xpath: str, visible=True, limite=None):
        espera = WebDriverWait(self.d, limite) if limite else self.espera
        cond = EC.visibility_of_element_located if visible else EC.presence_of_element_located
        return espera.until(cond((By.XPATH, xpath)))

    def boton(self, texto: str, limite=None):
        """Botón cuyo texto, aria-label o title coincide (sin contar espacios)."""
        t = _xp(texto)
        return self.esperar_xpath(
            f"//button[normalize-space(.)={t} or @aria-label={t} or @title={t}][not(@disabled)]", limite=limite)

    def hay_texto(self, texto: str, limite=None) -> bool:
        try:
            self.esperar_xpath(f"//*[contains(normalize-space(.), {_xp(texto)})][not(*[contains(normalize-space(.), {_xp(texto)})])]",
                               limite=limite)
            return True
        except TimeoutException:
            return False

    def campo(self, etiqueta: str):
        """Control (input, select o textarea) del campo cuya etiqueta empieza con ese texto."""
        t = _xp(etiqueta)
        # La etiqueta va arriba del control: se toma el primer control que viene después de ella
        return self.esperar_xpath(
            f"(//*[self::p or self::span][starts-with(normalize-space(.), {t})][not(ancestor::button)]"
            f"/following::*[self::input or self::select or self::textarea])[1]")

    # ── actuar ──
    def clic(self, texto: str, limite=None):
        b = self.boton(texto, limite)
        self.d.execute_script("arguments[0].scrollIntoView({block:'center'})", b)
        b.click()

    def escribir(self, etiqueta: str, valor: str):
        from selenium.webdriver.common.keys import Keys
        c = self.campo(etiqueta)
        self.d.execute_script("arguments[0].scrollIntoView({block:'center'})", c)
        # clear() no siempre vacía los campos que maneja React: se selecciona todo y se borra
        c.send_keys(Keys.CONTROL, "a")
        c.send_keys(Keys.DELETE)
        c.send_keys(valor)

    def elegir(self, etiqueta: str, valor: str):
        """Elige una opción de un desplegable por su texto visible o su valor."""
        from selenium.webdriver.support.select import Select
        control = self.campo(etiqueta)
        # Las opciones pueden llegar un poco después (robots, proyectos): se espera a que esté la elegida
        self.espera.until(lambda d: any(o.text.strip() == valor or o.get_attribute("value") == valor
                                        for o in control.find_elements("tag name", "option")))
        s = Select(control)
        try:
            s.select_by_visible_text(valor)
        except Exception:
            s.select_by_value(valor)

    def poner_valor(self, elemento, valor: str):
        """Para campos que React controla (fechas): pone el valor y avisa el cambio."""
        self.d.execute_script(
            "const e=arguments[0],v=arguments[1];"
            "const p=Object.getPrototypeOf(e);Object.getOwnPropertyDescriptor(p,'value').set.call(e,v);"
            "e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));",
            elemento, valor)

    def opcion(self, texto: str):
        """Botón de opción (role=radio), como «Edificio» o «Es un simulador»."""
        b = self.esperar_xpath(f"//*[@role='radio' or @aria-pressed][normalize-space(.)={_xp(texto)}]")
        self.d.execute_script("arguments[0].scrollIntoView({block:'center'})", b)
        b.click()

    def ir_a(self, seccion: str):
        """Botón de la barra izquierda: Inicio, Inspecciones, Mapa, Iniciar inspección, Añadir proyecto, Robot, Perfil."""
        ok = self.d.execute_script(
            "const t=arguments[0];const b=[...document.querySelectorAll('button')].find(b=>b.className.includes('h-14')"
            "&&((b.innerText||'').trim()||b.getAttribute('aria-label')||'').startsWith(t));if(b){b.click();return true}return false;",
            seccion)
        assert ok, f"No está el botón «{seccion}» en la barra izquierda"
        time.sleep(0.8)
        # Si quedó un formulario a medio llenar, la app pregunta «¿Salir sin guardar?»
        self.d.execute_script(
            "const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Salir sin guardar');"
            "if(b)b.click();")
        time.sleep(0.4)

    def recargar(self):
        """Vuelve a cargar la app (para que muestre lo que se creó por la API) y espera a que esté lista."""
        self.d.refresh()
        fin = time.time() + 30
        while time.time() < fin:
            try:
                if self.d.execute_script(
                        "return [...document.querySelectorAll('button')].some(b=>b.className.includes('h-14'))"):
                    break
            except Exception:
                pass
            time.sleep(0.5)
        time.sleep(1.5)  # que terminen de llegar los proyectos de la nube

    def titulo(self) -> str:
        return self.esperar_xpath("//h1").text.strip()
