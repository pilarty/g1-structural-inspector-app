// ---------------------------------------------------------------------
// Estado persistido en localStorage
// ---------------------------------------------------------------------

const STORAGE_KEY = "relevamiento_g1_config";

function cargarConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function guardarConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

let config = cargarConfig() || {
  planMode: null, // "photo" | "auto" | "none" | null (todavía sin elegir)
  planImageDataUrl: null,
  calibration: null, // { pixel: [{x,y},{x,y}], world: [{x,y},{x,y}] }  (solo modo "photo")
  roomDimensions: null, // { x_min, x_max, y_min, y_max, walls: [...] } (solo modo "auto")
  dataUrl: "http://localhost:8000",
  autoRefresh: true,
};

// ---------------------------------------------------------------------
// Referencias a elementos
// ---------------------------------------------------------------------

const uploadScreen = document.getElementById("uploadScreen");
const calibrationScreen = document.getElementById("calibrationScreen");
const mainScreen = document.getElementById("mainScreen");

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const btnPlanAuto = document.getElementById("btnPlanAuto");
const btnPlanNone = document.getElementById("btnPlanNone");

const calibImg = document.getElementById("calibImg");
const calibOverlay = document.getElementById("calibOverlay");
const btnCalibReset = document.getElementById("btnCalibReset");
const btnCalibDone = document.getElementById("btnCalibDone");

const noPlanBanner = document.getElementById("noPlanBanner");
const btnSetupPlanFromBanner = document.getElementById("btnSetupPlanFromBanner");
const planWrap = document.getElementById("planWrap");
const tableWrap = document.getElementById("tableWrap");
const detTableBody = document.getElementById("detTableBody");

const legendList = document.getElementById("legendList");
const countText = document.getElementById("countText");
const planLabel = document.getElementById("planLabel");

const connDot = document.getElementById("connDot");
const connText = document.getElementById("connText");

const btnConfig = document.getElementById("btnConfig");
const configModal = document.getElementById("configModal");
const configBackdrop = document.getElementById("configBackdrop");
const configClose = document.getElementById("configClose");
const dataUrlInput = document.getElementById("dataUrlInput");
const autoRefreshInput = document.getElementById("autoRefreshInput");
const btnSaveConfig = document.getElementById("btnSaveConfig");
const btnNewPlan = document.getElementById("btnNewPlan");

const detailModal = document.getElementById("detailModal");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalClose = document.getElementById("modalClose");
const modalImg = document.getElementById("modalImg");
const modalId = document.getElementById("modalId");
const modalMainLabel = document.getElementById("modalMainLabel");
const modalCoords = document.getElementById("modalCoords");
const modalDamageList = document.getElementById("modalDamageList");
const modalTimestamp = document.getElementById("modalTimestamp");

// Paleta de severidad para pines (según probabilidad máxima de daño)
const COLOR_SEVERO = "#B8451B";
const COLOR_MODERADO = "#B4860B";
const COLOR_LEVE = "#4C7A5A";
const COLOR_NEUTRO = "#33566E";

function colorPorDeteccion(det) {
  if (!det.damage_types || det.damage_types.length === 0) return COLOR_NEUTRO;
  const maxProb = Math.max(...det.damage_types.map((d) => d.prob));
  if (maxProb >= 0.75) return COLOR_SEVERO;
  if (maxProb >= 0.5) return COLOR_MODERADO;
  return COLOR_LEVE;
}

// ---------------------------------------------------------------------
// Pantalla inicial: elegir plano (foto / automático / omitir)
// ---------------------------------------------------------------------

dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("dragover", (e) => e.preventDefault());
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) manejarArchivoPlano(file);
});
fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) manejarArchivoPlano(fileInput.files[0]);
});

function manejarArchivoPlano(file) {
  const reader = new FileReader();
  reader.onload = () => {
    config.planMode = "photo";
    config.planImageDataUrl = reader.result;
    config.calibration = null;
    guardarConfig(config);
    irACalibracion();
  };
  reader.readAsDataURL(file);
}

btnPlanAuto.addEventListener("click", async () => {
  const ok = await intentarCargarDimensionesAutomaticas();
  if (ok) {
    config.planMode = "auto";
    guardarConfig(config);
    irAPantallaPrincipal();
  } else {
    alert(
      "No se pudo leer room_dimensions.json desde " + config.dataUrl +
      "\n\nCorré 'python extraer_dimensiones.py' y 'python serve_reporte.py' en el repo del simulador, " +
      "y revisá la URL de conexión (botón 'Conexión y plano')."
    );
  }
});

btnPlanNone.addEventListener("click", () => {
  config.planMode = "none";
  guardarConfig(config);
  irAPantallaPrincipal();
});

async function intentarCargarDimensionesAutomaticas() {
  try {
    const res = await fetch(`${config.dataUrl.replace(/\/$/, "")}/room_dimensions.json`, { cache: "no-store" });
    if (!res.ok) return false;
    config.roomDimensions = await res.json();
    guardarConfig(config);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------
// Calibración por 2 puntos (solo modo "photo")
// ---------------------------------------------------------------------

let puntosPixel = [null, null];
let puntoActivo = 0;

function irACalibracion() {
  uploadScreen.classList.add("hidden");
  mainScreen.classList.add("hidden");
  calibrationScreen.classList.remove("hidden");

  calibImg.src = config.planImageDataUrl;
  puntosPixel = [null, null];
  puntoActivo = 0;
  ["p0x", "p0y", "p1x", "p1y"].forEach((id) => (document.getElementById(id).value = ""));
  dibujarOverlayCalibracion();
  btnCalibDone.disabled = true;
}

calibImg.addEventListener("click", (e) => {
  const rect = calibImg.getBoundingClientRect();
  const escalaX = calibImg.naturalWidth / rect.width;
  const escalaY = calibImg.naturalHeight / rect.height;
  const x = (e.clientX - rect.left) * escalaX;
  const y = (e.clientY - rect.top) * escalaY;

  puntosPixel[puntoActivo] = { x, y };
  document.getElementById(`p${puntoActivo}hint`).textContent = "marcado ✓";

  if (puntoActivo === 0) puntoActivo = 1;

  dibujarOverlayCalibracion();
  actualizarBotonCalibDone();
});

function dibujarOverlayCalibracion() {
  const rect = calibImg.getBoundingClientRect();
  calibOverlay.setAttribute("viewBox", `0 0 ${calibImg.naturalWidth} ${calibImg.naturalHeight}`);
  calibOverlay.setAttribute("width", rect.width);
  calibOverlay.setAttribute("height", rect.height);

  let svg = "";
  puntosPixel.forEach((p, i) => {
    if (!p) return;
    const color = i === 0 ? "#33566E" : "#B8451B";
    svg += `
      <line x1="${p.x - 14}" y1="${p.y}" x2="${p.x + 14}" y2="${p.y}" stroke="${color}" stroke-width="3"/>
      <line x1="${p.x}" y1="${p.y - 14}" x2="${p.x}" y2="${p.y + 14}" stroke="${color}" stroke-width="3"/>
      <circle cx="${p.x}" cy="${p.y}" r="16" fill="none" stroke="${color}" stroke-width="2"/>
      <text x="${p.x + 20}" y="${p.y - 12}" font-family="IBM Plex Mono, monospace" font-size="20" fill="${color}">${i + 1}</text>
    `;
  });
  calibOverlay.innerHTML = svg;
}

function actualizarBotonCalibDone() {
  const p0x = document.getElementById("p0x").value;
  const p0y = document.getElementById("p0y").value;
  const p1x = document.getElementById("p1x").value;
  const p1y = document.getElementById("p1y").value;
  const listo =
    puntosPixel[0] && puntosPixel[1] &&
    p0x !== "" && p0y !== "" && p1x !== "" && p1y !== "";
  btnCalibDone.disabled = !listo;
}

["p0x", "p0y", "p1x", "p1y"].forEach((id) =>
  document.getElementById(id).addEventListener("input", actualizarBotonCalibDone)
);

btnCalibReset.addEventListener("click", () => {
  puntosPixel = [null, null];
  puntoActivo = 0;
  ["p0x", "p0y", "p1x", "p1y"].forEach((id) => (document.getElementById(id).value = ""));
  ["p0hint", "p1hint"].forEach((id) => (document.getElementById(id).textContent = "clic en el plano para marcar"));
  dibujarOverlayCalibracion();
  btnCalibDone.disabled = true;
});

btnCalibDone.addEventListener("click", () => {
  config.calibration = {
    pixel: puntosPixel,
    world: [
      { x: parseFloat(document.getElementById("p0x").value), y: parseFloat(document.getElementById("p0y").value) },
      { x: parseFloat(document.getElementById("p1x").value), y: parseFloat(document.getElementById("p1y").value) },
    ],
  };
  guardarConfig(config);
  irAPantallaPrincipal();
});

// Coordenada real (mundo MuJoCo) -> píxel sobre la foto subida,
// usando los 2 puntos de calibración (similaridad: rotación + escala + traslación).
function mundoAPixelFoto(worldPoint) {
  const { pixel, world } = config.calibration;
  const dxw = world[1].x - world[0].x;
  const dyw = world[1].y - world[0].y;
  const dxp = pixel[1].x - pixel[0].x;
  const dyp = pixel[1].y - pixel[0].y;

  const anguloMundo = Math.atan2(dyw, dxw);
  const anguloPixel = Math.atan2(dyp, dxp);
  const theta = anguloPixel - anguloMundo;

  const distMundo = Math.hypot(dxw, dyw) || 1e-9;
  const distPixel = Math.hypot(dxp, dyp);
  const escala = distPixel / distMundo;

  const relX = worldPoint.x - world[0].x;
  const relY = worldPoint.y - world[0].y;

  const rotX = relX * Math.cos(theta) - relY * Math.sin(theta);
  const rotY = relX * Math.sin(theta) + relY * Math.cos(theta);

  return {
    x: pixel[0].x + rotX * escala,
    y: pixel[0].y + rotY * escala,
  };
}

// ---------------------------------------------------------------------
// Pantalla principal
// ---------------------------------------------------------------------

let detecciones = [];
let intervaloActualizacion = null;

const SVG_ROOM_MAX = 720; // tamaño máximo (px) del lado más largo del plano generado
const SVG_ROOM_PADDING = 40;

function irAPantallaPrincipal() {
  uploadScreen.classList.add("hidden");
  calibrationScreen.classList.add("hidden");
  mainScreen.classList.remove("hidden");

  dataUrlInput.value = config.dataUrl;
  autoRefreshInput.checked = config.autoRefresh;

  renderizarModoDePlano();
  actualizarDetecciones();
  configurarAutoRefresh();
}

function renderizarModoDePlano() {
  noPlanBanner.classList.add("hidden");
  planWrap.classList.add("hidden");
  tableWrap.classList.add("hidden");
  planWrap.innerHTML = "";

  if (config.planMode === "photo" && config.planImageDataUrl && config.calibration) {
    planLabel.textContent = "plano: foto calibrada";
    planWrap.classList.remove("hidden");
    planWrap.innerHTML = `
      <img id="planImg" class="planWrap__img" alt="Plano del ambiente">
      <svg id="pinsLayer" class="planWrap__pins"></svg>
    `;
    const img = document.getElementById("planImg");
    img.src = config.planImageDataUrl;
    img.onload = () => dibujarPinesSobreFoto();
  } else if (config.planMode === "auto" && config.roomDimensions) {
    planLabel.textContent = "plano: generado automáticamente";
    planWrap.classList.remove("hidden");
    dibujarPlanoAutomatico();
  } else {
    // "none", o "auto"/"photo" sin datos todavía disponibles
    planLabel.textContent = "sin plano configurado";
    noPlanBanner.classList.remove("hidden");
    tableWrap.classList.remove("hidden");
    dibujarTabla();
  }
}

btnSetupPlanFromBanner.addEventListener("click", () => abrirPantallaDeEleccionDePlano());

function abrirPantallaDeEleccionDePlano() {
  mainScreen.classList.add("hidden");
  uploadScreen.classList.remove("hidden");
}

function configurarAutoRefresh() {
  if (intervaloActualizacion) clearInterval(intervaloActualizacion);
  if (config.autoRefresh) {
    intervaloActualizacion = setInterval(actualizarDetecciones, 5000);
  }
}

async function actualizarDetecciones() {
  try {
    const res = await fetch(`${config.dataUrl.replace(/\/$/, "")}/detections.json`, { cache: "no-store" });
    if (!res.ok) throw new Error("respuesta no OK");
    detecciones = await res.json();
    connDot.classList.add("is-live");
    connText.textContent = "conectado";
    redibujarSegunModo();
  } catch (err) {
    connDot.classList.remove("is-live");
    connText.textContent = "sin conectar";
  }
}

function redibujarSegunModo() {
  if (config.planMode === "photo" && config.calibration) {
    dibujarPinesSobreFoto();
  } else if (config.planMode === "auto" && config.roomDimensions) {
    dibujarPlanoAutomatico();
  } else {
    dibujarTabla();
  }
  actualizarLeyendaYConteo();
}

// ---- Modo "photo": pines sobre la imagen subida, con calibración manual ----

function dibujarPinesSobreFoto() {
  const planImg = document.getElementById("planImg");
  const pinsLayer = document.getElementById("pinsLayer");
  if (!planImg || !pinsLayer || !config.calibration) return;

  const rectImg = planImg.getBoundingClientRect();
  const rectWrap = planWrap.getBoundingClientRect();

  pinsLayer.setAttribute("width", rectImg.width);
  pinsLayer.setAttribute("height", rectImg.height);
  pinsLayer.style.position = "absolute";
  pinsLayer.style.top = `${rectImg.top - rectWrap.top}px`;
  pinsLayer.style.left = `${rectImg.left - rectWrap.left}px`;

  const escalaX = rectImg.width / planImg.naturalWidth;
  const escalaY = rectImg.height / planImg.naturalHeight;

  let svg = "";
  detecciones.forEach((det, i) => {
    const px = mundoAPixelFoto({ x: det.x, y: det.y });
    const x = px.x * escalaX;
    const y = px.y * escalaY;
    svg += pinSvg(x, y, colorPorDeteccion(det), i);
  });
  pinsLayer.innerHTML = svg;
  activarClicksDePines(pinsLayer);
}

// ---- Modo "auto": plano generado desde room_dimensions.json, a escala real ----

function dibujarPlanoAutomatico() {
  const room = config.roomDimensions;
  const width = room.x_max - room.x_min;
  const depth = room.y_max - room.y_min;
  const escala = (SVG_ROOM_MAX - SVG_ROOM_PADDING * 2) / Math.max(width, depth);

  const svgW = width * escala + SVG_ROOM_PADDING * 2;
  const svgH = depth * escala + SVG_ROOM_PADDING * 2;

  function worldASvg(x, y) {
    return {
      x: SVG_ROOM_PADDING + (x - room.x_min) * escala,
      y: SVG_ROOM_PADDING + (room.y_max - y) * escala, // se invierte y para que "arriba" sea +y
    };
  }

  let paredesSvg = "";
  const poligono = (room.floor_polygon || [])
    .map(([x, y]) => {
      const p = worldASvg(x, y);
      return `${p.x},${p.y}`;
    })
    .join(" ");
  const contornoSvg = poligono
    ? `<polygon class="roomFloor" points="${poligono}"/>`
    : `<rect class="roomFloor" x="${SVG_ROOM_PADDING}" y="${SVG_ROOM_PADDING}" width="${width * escala}" height="${depth * escala}"/>`;

  let pinesSvg = "";
  detecciones.forEach((det, i) => {
    const p = worldASvg(det.x, det.y);
    pinesSvg += pinSvg(p.x, p.y, colorPorDeteccion(det), i);
  });

  planWrap.innerHTML = `
    <svg class="planWrap__svgRoom" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
      ${contornoSvg}
      ${pinesSvg}
    </svg>
  `;

  activarClicksDePines(planWrap.querySelector("svg"));
}

// ---- Modo "none": tabla simple con las detecciones ----

function dibujarTabla() {
  detTableBody.innerHTML = detecciones
    .map(
      (det, i) => `
      <tr data-idx="${i}">
        <td><span class="detTable__dot" style="background:${colorPorDeteccion(det)}"></span></td>
        <td>${det.id ?? ""}</td>
        <td>${det.x.toFixed(2)}</td>
        <td>${det.y.toFixed(2)}</td>
        <td>${(det.damage_types || []).map((d) => d.class).join(", ") || "sin tipo específico"}</td>
      </tr>`
    )
    .join("");

  detTableBody.querySelectorAll("tr").forEach((tr) => {
    tr.addEventListener("click", () => abrirDetalle(detecciones[parseInt(tr.dataset.idx, 10)]));
  });
}

// ---- Utilidades compartidas de pines ----

function pinSvg(x, y, color, idx) {
  return `
    <g class="pin" data-idx="${idx}">
      <circle class="pin__halo" cx="${x}" cy="${y}" r="12" fill="${color}"/>
      <circle class="pin__core" cx="${x}" cy="${y}" r="6" fill="${color}" stroke="#F2F0E8" stroke-width="1.5"/>
    </g>
  `;
}

function activarClicksDePines(svgRoot) {
  if (!svgRoot) return;
  svgRoot.querySelectorAll(".pin").forEach((el) => {
    el.addEventListener("click", () => abrirDetalle(detecciones[parseInt(el.dataset.idx, 10)]));
  });
}

function actualizarLeyendaYConteo() {
  legendList.innerHTML = `
    <li><span class="legend__dot" style="background:${COLOR_SEVERO}"></span> Daño severo (≥75%)</li>
    <li><span class="legend__dot" style="background:${COLOR_MODERADO}"></span> Daño moderado (≥50%)</li>
    <li><span class="legend__dot" style="background:${COLOR_LEVE}"></span> Daño leve</li>
    <li><span class="legend__dot" style="background:${COLOR_NEUTRO}"></span> Sin tipo específico</li>
  `;
  countText.textContent = `${detecciones.length} detecciones`;
}

window.addEventListener("resize", () => {
  if (!mainScreen.classList.contains("hidden")) redibujarSegunModo();
});

// ---------------------------------------------------------------------
// Modal de detalle de una detección
// ---------------------------------------------------------------------

function abrirDetalle(det) {
  if (!det) return;
  modalImg.src = `${config.dataUrl.replace(/\/$/, "")}/${det.image}`;
  modalId.textContent = det.id;
  modalCoords.textContent = `x: ${det.x.toFixed(2)} m · y: ${det.y.toFixed(2)} m`;

  if (det.damage_types && det.damage_types.length > 0) {
    modalMainLabel.textContent = det.damage_types[0].class;
    modalDamageList.innerHTML = det.damage_types
      .map(
        (d) => `
        <li>
          <span>${d.class}</span>
          <span class="damageList__bar"><span style="width:${(d.prob * 100).toFixed(0)}%"></span></span>
          <span class="damageList__pct">${(d.prob * 100).toFixed(0)}%</span>
        </li>`
      )
      .join("");
  } else {
    modalMainLabel.textContent = "Daño detectado (tipo no específico)";
    modalDamageList.innerHTML = `<li><span>Sin clase por encima del umbral</span></li>`;
  }

  if (det.timestamp) {
    const fecha = new Date(det.timestamp * 1000);
    modalTimestamp.textContent = `Capturado: ${fecha.toLocaleString()}`;
  } else {
    modalTimestamp.textContent = "";
  }

  detailModal.classList.remove("hidden");
}

modalClose.addEventListener("click", () => detailModal.classList.add("hidden"));
modalBackdrop.addEventListener("click", () => detailModal.classList.add("hidden"));

// ---------------------------------------------------------------------
// Modal de configuración (conexión + cambiar plano)
// ---------------------------------------------------------------------

btnConfig.addEventListener("click", () => {
  dataUrlInput.value = config.dataUrl;
  autoRefreshInput.checked = config.autoRefresh;
  configModal.classList.remove("hidden");
});
configClose.addEventListener("click", () => configModal.classList.add("hidden"));
configBackdrop.addEventListener("click", () => configModal.classList.add("hidden"));

btnSaveConfig.addEventListener("click", () => {
  config.dataUrl = dataUrlInput.value.trim() || "http://localhost:8000";
  config.autoRefresh = autoRefreshInput.checked;
  guardarConfig(config);
  configModal.classList.add("hidden");
  configurarAutoRefresh();
  actualizarDetecciones();
});

btnNewPlan.addEventListener("click", () => {
  configModal.classList.add("hidden");
  abrirPantallaDeEleccionDePlano();
});

// ---------------------------------------------------------------------
// Arranque: restaurar estado guardado si existe
// ---------------------------------------------------------------------

(function iniciar() {
  if (config.planMode) {
    irAPantallaPrincipal();
  }
  // si no hay planMode elegido todavía, se queda en uploadScreen (default del HTML)
})();
