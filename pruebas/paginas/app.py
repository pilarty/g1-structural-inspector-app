"""Pantallas de la app una vez adentro."""
import time

from selenium.webdriver.common.by import By

from .base import Pagina, _xp


class Principal(Pagina):
    """Inicio: barra de proyectos a la izquierda y pantalla de relevamiento."""

    def lista_cargada(self, limite=None) -> bool:
        return self.hay_texto("Proyectos", limite=limite)

    def hay_en_barra(self, nombre: str, limite=None) -> bool:
        try:
            self.esperar_xpath(f"//aside//button[normalize-space(.)={_xp(nombre)}] | //aside//*[normalize-space(.)={_xp(nombre)}]",
                               limite=limite)
            return True
        except Exception:
            return False

    def abrir_edificacion(self, nombre: str):
        self.ir_a("Inicio")
        self.esperar_xpath(f"//aside//button[normalize-space(.)={_xp(nombre)}]").click()
        time.sleep(1.5)

    # ── panel de hallazgos ──
    def puntos_en_plano(self) -> int:
        return len(self.d.find_elements(By.CSS_SELECTOR, "svg[viewBox='0 0 800 600'] circle[r='9.5']"))

    def esperar_plano(self, limite=None):
        return self.esperar_xpath("//*[name()='svg'][@viewBox='0 0 800 600']", limite=limite)

    def ocultar_tipo(self, tipo: str):
        """Destilda un tipo de daño en el panel de hallazgos."""
        self.esperar_xpath(f"//aside//label[.//span[normalize-space(.)={_xp(tipo)}]]").click()
        time.sleep(0.4)

    def tipos_en_panel(self) -> list[str]:
        return [e.text.strip() for e in self.d.find_elements(By.XPATH, "//aside//label//span[contains(@class,'truncate')]")]

    def abrir_hallazgo(self, numero: int = 1):
        self.esperar_xpath("//aside//button[@aria-label='Desplegar']").click()
        self.esperar_xpath(f"//aside//button[.//span[normalize-space(.)='Hallazgo {numero}']]").click()
        return self.esperar_xpath("//*[@role='dialog']")

    def menu_inspeccion(self, opcion: str):
        self.boton("Más opciones de la inspección").click()
        self.esperar_xpath(f"//button[contains(normalize-space(.), {_xp(opcion)})]").click()


class Formulario(Pagina):
    """Nuevo proyecto, nuevo edificio y ficha."""

    def errores(self) -> list[str]:
        return [e.text.strip() for e in self.d.find_elements(By.XPATH, "//p[contains(@class,'991B1B')]") if e.text.strip()]


class IniciarInspeccion(Pagina):
    def abrir(self):
        self.ir_a("Iniciar inspección")
        self.esperar_xpath("//h1[normalize-space(.)='Iniciar inspección']")

    def boton_iniciar(self):
        return self.esperar_xpath("//button[normalize-space(.)='Iniciar inspección' and not(contains(@class,'h-14'))]")

    def habilitado(self) -> bool:
        return self.boton_iniciar().is_enabled()

    def paso(self, titulo: str) -> str:
        """Texto de una fila de «Antes de empezar» (por ejemplo «Motivo»)."""
        return self.esperar_xpath(f"//li[.//span[normalize-space(.)={_xp(titulo)}]]").text


class Inspecciones(Pagina):
    def abrir(self):
        self.ir_a("Inspecciones")
        self.esperar_xpath("//h1[normalize-space(.)='Inspecciones']")
        time.sleep(1)

    def filas(self) -> list[str]:
        return [f.text for f in self.d.find_elements(By.XPATH, "//tbody/tr")]

    def buscar(self, texto: str):
        c = self.esperar_xpath("//input[starts-with(@placeholder,'Buscar')]")
        c.clear()
        c.send_keys(texto)
        time.sleep(0.5)

    def ordenar_por(self, columna: str):
        self.esperar_xpath(f"//thead//button[normalize-space(.)={_xp(columna)}]").click()
        time.sleep(0.3)

    def columna_hallazgos(self) -> list[str]:
        idx = len(self.d.find_elements(By.XPATH, "//thead//th[.//*[normalize-space(.)='Hallazgos'] or normalize-space(.)='Hallazgos']/preceding-sibling::th")) + 1
        return [c.text.strip() for c in self.d.find_elements(By.XPATH, f"//tbody/tr/td[{idx}]")]
