const { app, BrowserWindow, dialog, ipcMain, screen, shell } = require('electron')
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')

const isDev = !app.isPackaged
const PUERTO = Number(process.env.G1_PORT || 8000)
const SALUD_URL = `http://127.0.0.1:${PUERTO}/health`
// TensorFlow tarda en arrancar; en una PC lenta o la primera vez puede pasar de un minuto.
const ESPERA_MAX_MS = Number(process.env.G1_ESPERA_MS || 180000)

// Carpeta con el Python propio y el backend. Instalada: la carpeta "resources" de la app.
// En desarrollo no se usa (el backend se abre a mano) salvo que se pida con G1_RUNTIME_DIR.
const runtimeDir = app.isPackaged ? process.resourcesPath : process.env.G1_RUNTIME_DIR || null

let ventana = null
let backend = null // proceso que arrancamos nosotros (null si usamos uno que ya estaba corriendo)
let cerrando = false

function ping(url, timeout = 1500) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout }, (res) => {
      res.resume()
      resolve(res.statusCode === 200)
    })
    req.on('error', () => resolve(false))
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
  })
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))
const rutaLog = () => path.join(app.getPath('userData'), 'backend.log')
const terminado = (p) => p.exitCode !== null || p.signalCode !== null

function iniciarBackend() {
  const python = path.join(runtimeDir, 'python', 'python.exe')
  const main = path.join(runtimeDir, 'backend', 'main.py')
  if (!fs.existsSync(python) || !fs.existsSync(main)) {
    throw new Error('Faltan archivos del motor de detección en ' + runtimeDir)
  }
  fs.mkdirSync(app.getPath('userData'), { recursive: true })
  const log = fs.openSync(rutaLog(), 'w') // se conserva solo el registro de la última ejecución
  const proc = spawn(python, [main], {
    cwd: path.join(runtimeDir, 'backend'),
    env: {
      ...process.env,
      G1_DATA_DIR: app.getPath('userData'), // fotos y datos del usuario
      G1_HOST: '127.0.0.1', // solo esta PC puede hablar con el backend
      G1_PORT: String(PUERTO),
      PYTHONUNBUFFERED: '1',
      PYTHONIOENCODING: 'utf-8',
    },
    stdio: ['ignore', log, log],
    windowsHide: true,
  })
  fs.closeSync(log)
  proc.on('error', () => {})
  return proc
}

async function esperarBackend(proc) {
  const limite = Date.now() + ESPERA_MAX_MS
  while (Date.now() < limite) {
    if (proc && terminado(proc)) throw new Error('El motor de detección se cerró al iniciar.')
    if (await ping(SALUD_URL)) return
    await dormir(700)
  }
  throw new Error('El motor de detección tardó demasiado en iniciar.')
}

function detenerBackend() {
  if (backend && !terminado(backend)) {
    try {
      backend.kill()
    } catch {}
  }
  backend = null
}

function cargarApp() {
  if (isDev) {
    ventana.loadURL(process.env.ELECTRON_START_URL || `http://localhost:${process.env.PORT || '8443'}`)
    ventana.webContents.openDevTools()
  } else {
    ventana.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

function mostrarCargando(estado, detalle) {
  ventana.loadFile(path.join(__dirname, 'cargando.html'), { query: { estado, detalle: detalle || '' } })
}

let intento = 0
async function arrancar() {
  const miIntento = ++intento
  if (!runtimeDir) {
    cargarApp() // desarrollo normal: el backend se abre a mano
    return
  }
  mostrarCargando('iniciando')
  try {
    if (!(await ping(SALUD_URL))) {
      detenerBackend()
      backend = iniciarBackend()
      await esperarBackend(backend)
    }
    if (miIntento === intento && !cerrando) cargarApp()
  } catch (e) {
    if (miIntento === intento && !cerrando) mostrarCargando('error', e.message)
  }
}

function crearVentana() {
  // Tamaño según la pantalla: ocupa casi todo el espacio libre (sin la barra de tareas de Windows)
  const { width: anchoLibre, height: altoLibre } = screen.getPrimaryDisplay().workAreaSize
  const ancho = Math.min(1600, Math.round(anchoLibre * 0.92))
  const alto = Math.min(1000, Math.round(altoLibre * 0.92))
  ventana = new BrowserWindow({
    width: ancho,
    height: alto,
    center: true,
    // Más chica que esto las pantallas ya no entran bien
    minWidth: Math.min(1024, anchoLibre),
    minHeight: Math.min(600, altoLibre),
    show: false,
    // Instalada, Windows toma el icono del .exe; en desarrollo el .exe es el de Electron
    ...(isDev && { icon: path.join(__dirname, '../build/icon.ico') }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  // Sin la barra de menú de Electron (File, Edit, View, Window)
  ventana.removeMenu()
  // En pantallas chicas (notebooks) arranca maximizada
  if (anchoLibre < 1440 || altoLibre < 820) ventana.maximize()
  ventana.once('ready-to-show', () => ventana.show())
  // La app no abre ventanas nuevas ni navega fuera de sus propias pantallas
  ventana.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  ventana.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://') && !url.startsWith('http://localhost:')) e.preventDefault()
  })
}

ipcMain.on('backend:reintentar', () => {
  if (ventana) arrancar()
})
ipcMain.on('backend:ver-log', () => {
  shell.openPath(rutaLog())
})

// Pruebas automáticas (carpeta pruebas/): con G1_PRUEBAS_DIR los archivos se guardan ahí sin
// abrir el diálogo de Windows, que Selenium no puede manejar. Sin esa variable, todo funciona igual.
const DIR_PRUEBAS = process.env.G1_PRUEBAS_DIR || null
const enPruebas = (nombre, extension) => {
  fs.mkdirSync(DIR_PRUEBAS, { recursive: true })
  return path.join(DIR_PRUEBAS, String(nombre || 'archivo').replace(/[\\/:*?"<>|]/g, '-') + extension)
}

// Archivo de inspección (.g1insp): guardar lo que arma la app y abrir uno para importarlo.
ipcMain.handle('archivo:guardar', async (_e, nombre, contenido) => {
  if (!ventana) return null
  if (DIR_PRUEBAS) {
    const destino = enPruebas(nombre, '.g1insp')
    fs.writeFileSync(destino, String(contenido), 'utf8')
    return destino
  }
  const { canceled, filePath } = await dialog.showSaveDialog(ventana, {
    title: 'Guardar inspección para compartir',
    defaultPath: path.join(app.getPath('documents'), String(nombre || 'inspeccion') + '.g1insp'),
    filters: [{ name: 'Inspección G1', extensions: ['g1insp'] }],
  })
  if (canceled || !filePath) return null
  fs.writeFileSync(filePath, String(contenido), 'utf8')
  shell.showItemInFolder(filePath)
  return filePath
})
ipcMain.handle('archivo:abrir', async () => {
  if (!ventana) return null
  if (DIR_PRUEBAS && process.env.G1_PRUEBAS_ARCHIVO) {
    const origen = process.env.G1_PRUEBAS_ARCHIVO
    return { nombre: path.basename(origen), contenido: fs.readFileSync(origen, 'utf8') }
  }
  const { canceled, filePaths } = await dialog.showOpenDialog(ventana, {
    title: 'Importar inspección',
    filters: [{ name: 'Inspección G1', extensions: ['g1insp'] }],
    properties: ['openFile'],
  })
  if (canceled || !filePaths[0]) return null
  return { nombre: path.basename(filePaths[0]), contenido: fs.readFileSync(filePaths[0], 'utf8') }
})

// Informe de inspección: la pantalla ya dejó armado el informe para imprimir;
// se convierte a PDF, se pregunta dónde guardarlo y se abre.
ipcMain.handle('informe:pdf', async (_e, nombre) => {
  if (!ventana) return null
  if (DIR_PRUEBAS) {
    const destino = enPruebas(nombre, '.pdf')
    fs.writeFileSync(destino, await ventana.webContents.printToPDF({ pageSize: 'A4', printBackground: true, margins: { marginType: 'default' } }))
    return destino
  }
  const { canceled, filePath } = await dialog.showSaveDialog(ventana, {
    title: 'Guardar informe',
    defaultPath: path.join(app.getPath('documents'), String(nombre || 'informe') + '.pdf'),
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })
  if (canceled || !filePath) return null
  const pdf = await ventana.webContents.printToPDF({ pageSize: 'A4', printBackground: true, margins: { marginType: 'default' } })
  fs.writeFileSync(filePath, pdf)
  shell.openPath(filePath)
  return filePath
})

const unica = app.isPackaged ? app.requestSingleInstanceLock() : true
if (!unica) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!ventana) return
    if (ventana.isMinimized()) ventana.restore()
    ventana.focus()
  })
  app.whenReady().then(() => {
    crearVentana()
    arrancar()
  })
  app.on('before-quit', () => {
    cerrando = true
    detenerBackend()
  })
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      crearVentana()
      arrancar()
    }
  })
}
