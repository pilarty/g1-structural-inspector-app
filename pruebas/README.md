# Pruebas automáticas — G1 Structural Inspector

31 casos del plan de pruebas: 19 funcionales con Selenium sobre la app de escritorio, 6 del backend,
3 de rendimiento y responsive y 3 de seguridad. Cada caso indica qué requerimientos (RF, RNF) y casos de uso (CU)
verifica.

| Archivo | Casos |
| --- | --- |
| `test_funcionales.py` | F-01 a F-19 |
| `test_backend.py` | B-01 a B-06 |
| `test_rendimiento.py` | R-01 a R-03 |
| `test_seguridad.py` | S-01 a S-03 |

## Preparar (una sola vez)

1. Instalar lo que usan las pruebas (desde esta carpeta):

   ```
   python -m pip install -r requirements.txt
   ```

2. Instalar el ChromeDriver de Electron (desde la carpeta de la app, la de `package.json`).
   Tiene que ser de la misma versión que Electron (43):

   ```
   pnpm add -D electron-chromedriver@43
   ```

3. Crear la **cuenta de prueba** con «Registrate» en la app (un correo aparte del real).

## Correr

1. Abrir el backend: `python main.py` en `g1-inspection-backend`.
2. Abrir la interfaz: `pnpm dev` en la carpeta de la app (deja Vite en http://localhost:8443).
   No hace falta abrir la app de escritorio: las pruebas la abren solas.
3. En PowerShell, desde esta carpeta:

   ```
   $env:G1_USUARIO = "correo-de-la-cuenta-de-prueba"
   $env:G1_CLAVE = "contraseña-de-la-cuenta-de-prueba"
   python -m pytest
   ```

En vez de las variables, se puede crear el archivo `pruebas/.cuenta` con el correo en la primera línea y la
contraseña en la segunda. Ese archivo no se sube a git.

Para correr un solo grupo: `python -m pytest test_backend.py`. Un solo caso: `python -m pytest -k f13`.

Si todavía no está el ChromeDriver de Electron, se puede probar la misma interfaz en Chrome:
`$env:G1_MODO = "chrome"` antes de `python -m pytest`.

## Qué tener en cuenta

- El backend tiene una sola sesión: mientras corren las pruebas, la app queda con la cuenta de prueba.
  Al terminar, volvé a entrar con tu cuenta.
- No se mueve ningún robot real. La inspección se simula mandando al backend el plano, el recorrido y
  una foto con daño (`datos/pared_con_grieta.png`), igual que el script de MuJoCo.
- Todo lo que crean las pruebas empieza con «PRUEBA» y se borra al terminar.
- Con la variable `G1_PRUEBAS_DIR` (la pone la prueba sola) la app guarda el PDF y el archivo para compartir
  en `resultados/archivos` sin abrir el diálogo de Windows. Sin esa variable la app funciona como siempre.

## Resultados (para el informe)

Cada corrida deja en `resultados/`:

| Archivo | Qué es |
| --- | --- |
| `reporte.html` | Reporte completo: cada caso con su resultado, duración y captura |
| `resultados.csv` | Tabla ID · grupo · caso · cubre · resultado · duración · detalle (se abre en Excel) |
| `resumen.txt` | Cuántos casos aprobaron, en total y por grupo |
| `grafico_resultados.png` | Gráfico de casos aprobados, fallados y omitidos por grupo |
| `capturas/` | Una captura de la app por caso (F-01.png, F-13.png…) |
| `archivos/` | PDF del informe y archivo .g1insp que generó la app |
