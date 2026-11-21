// Puente minimo entre la pantalla de "iniciando" y el proceso principal.
// contextIsolation sigue activado y nodeIntegration desactivado: la interfaz no tiene acceso a Node.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('g1motor', {
  reintentar: () => ipcRenderer.send('backend:reintentar'),
  verRegistro: () => ipcRenderer.send('backend:ver-log'),
  // Guarda como PDF lo que está armado para imprimir (el informe). Devuelve la ruta o null si se canceló.
  guardarPdf: (nombre, subida) => ipcRenderer.invoke('informe:pdf', nombre, subida),
  // Archivo de inspección (.g1insp) para compartir
  guardarArchivo: (nombre, contenido) => ipcRenderer.invoke('archivo:guardar', nombre, contenido),
  abrirArchivo: () => ipcRenderer.invoke('archivo:abrir'),
  // Página de pago de Mercado Pago (se abre en el navegador del sistema)
  abrirPago: (url) => ipcRenderer.invoke('pago:abrir', url),
})
