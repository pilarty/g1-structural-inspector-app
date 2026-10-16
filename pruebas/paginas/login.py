"""Pantalla de inicio de sesión, registro y recuperación de contraseña."""
from .base import Pagina, _xp


class Login(Pagina):
    def esta_visible(self, limite=None) -> bool:
        return self.hay_texto("¿No tenés una cuenta?", limite=limite)

    def entrar(self, usuario: str, clave: str):
        self.escribir("Usuario o correo", usuario)
        self.escribir("Contraseña", clave)
        self.clic("Iniciar sesión")

    def error(self) -> str:
        return self.esperar_xpath("//p[contains(@class,'991B1B')]").text.strip()

    def abrir_registro(self):
        self.d.find_element("xpath", f"//button[normalize-space(.)={_xp('Registrate')}]").click()

    def abrir_olvide(self):
        self.d.find_element("xpath", f"//button[normalize-space(.)={_xp('¿Olvidaste tu contraseña?')}]").click()

    def volver(self):
        self.d.find_element(
            "xpath", "//button[normalize-space(.)='Iniciá sesión' or normalize-space(.)='Volver a iniciar sesión']").click()
