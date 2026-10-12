// Puente minimo entre la pantalla de "iniciando" y el proceso principal.
// contextIsolation sigue activado y nodeIntegration desactivado: la interfaz no tiene acceso a Node.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('g1motor', {
  reintentar: () => ipcRenderer.send('backend:reintentar'),
  verRegistro: () => ipcRenderer.send('backend:ver-log'),
})
