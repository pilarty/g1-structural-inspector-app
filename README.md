# Relevamiento de daños — Interfaz web

Interfaz para que arquitectos/ingenieros civiles vean, sobre el plano del
ambiente, dónde el robot G1 detectó daño estructural y qué tipo de daño es.

No necesita build ni instalar nada: es HTML/CSS/JS plano.

## Cómo correrla

Abrí `index.html` con doble clic, o serví la carpeta con cualquier servidor
estático, por ejemplo:

```bash
python -m http.server 5500
```

y entrá a `http://localhost:5500`.

## Cómo se conecta con el repo del simulador

El simulador (otro repo) corre los modelos y va guardando, cada vez que
detecta daño, un registro en `simulaciones/g1_saca_fotos/reporte/detections.json`
más la foto correspondiente en `reporte/images/`.

Para que esta interfaz pueda leer esos datos, en el repo del simulador hay
que correr:

```bash
python serve_reporte.py
```

Eso expone esa carpeta en `http://localhost:8000` (con CORS habilitado para
que el navegador no lo bloquee). Mientras ese servidor esté corriendo, acá
en "Conexión y plano" (arriba a la derecha) pegás esa URL y listo — se
actualiza sola cada 5 segundos.

Si el simulador corre en otra máquina (no en `localhost`), usá la IP de esa
máquina en vez de `localhost`, por ejemplo `http://192.168.0.15:8000`, y
asegurate de que el puerto 8000 esté accesible desde donde abrís la interfaz.

## Uso

El plano es **opcional**. Al entrar por primera vez se elige entre 3 caminos
(se puede cambiar en cualquier momento desde "Conexión y plano" →
"Cambiar / configurar plano"):

1. **Subir foto real** del plano (cuando el arquitecto la tenga). Después se
   marcan 2 puntos sobre la imagen y se indica su coordenada real (x, y) —
   la misma que usa MuJoCo (`data.qpos[0]`, `data.qpos[1]`). Con esos 2
   puntos alcanza para ubicar automáticamente el resto de las detecciones
   (rotación + escala se calculan solas).

2. **Generar plano automático**: usa `room_dimensions.json`, generado con
   `extraer_dimensiones.py` en el repo del simulador a partir de las
   paredes del `escenario.xml`. No requiere subir nada ni calibrar a mano —
   las coordenadas ya están a escala real.

3. **Omitir por ahora**: no se muestra ningún plano gráfico, solo una lista
   con las detecciones y sus coordenadas. Se puede activar un plano más
   adelante sin perder nada.

En cualquiera de los 3 casos, cada detección tiene un color según severidad
(probabilidad de la clase de daño más fuerte), y al hacer clic se abre la
foto con el detalle del tipo de daño.

Toda la configuración (modo de plano, foto, calibración, dimensiones,
URL de conexión) queda guardada en el navegador, así que no hay que
repetir el proceso cada vez que se abre la página.

## Generar el plano automático (`extraer_dimensiones.py`)

En el repo del simulador:

```bash
python extraer_dimensiones.py
```

Este script sirve tanto si tu escenario está armado con paredes
individuales como si es un solo mesh (`.obj`) importado, como en
`habitacion_daniada`: lee `escenario.xml`, encuentra el mesh y su
escala/posición, lee los vértices del `.obj`, los transforma a coordenadas
del mundo (las mismas que usa el robot) y calcula el contorno real de la
habitación. Guarda el resultado en
`simulaciones/g1_saca_fotos/reporte/room_dimensions.json`, que
`serve_reporte.py` sirve junto con `detections.json`.

Si tu escenario tiene una estructura distinta (varios meshes, rotaciones
raras, etc.) y el contorno no da bien, pasame el `escenario.xml` y lo
ajusto.

## Formato esperado de `detections.json`

```json
[
  {
    "id": "frame_00300",
    "frame": 300,
    "timestamp": 1737000000.0,
    "x": 1.23,
    "y": 4.56,
    "image": "images/frame_00300.png",
    "detection_prob": 0.87,
    "damage_types": [
      { "class": "Diagonal crack", "prob": 0.91 },
      { "class": "Debris", "prob": 0.63 }
    ]
  }
]
```

`image` es relativo a la misma URL base (`dataUrl`) que sirve
`serve_reporte.py`.

## Nota sobre la calibración

Por ahora la ubicación se calcula con 2 puntos de referencia marcados a
mano. Cuando esté listo el modelo de ubicación entrenado, el siguiente
paso natural es reemplazar esta calibración manual por las coordenadas
que devuelva ese modelo directamente — la lógica de dibujar los puntos
sobre el plano (`mundoAPixel` en `app.js`) queda igual, solo cambiaría
de dónde salen los `x, y`.
