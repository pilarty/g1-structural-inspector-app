import React from 'react'
import ReactDOM from 'react-dom/client'
import { LucideProvider } from 'lucide-react'
import App from './App'
import DialogoSalir from './components/DialogoSalir'
import { SesionProvider } from './sesion'
import { ProyectosProvider } from './proyectos'
import './index.css'

// Todos los íconos con trazo fino
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LucideProvider strokeWidth={1.5}>
      <SesionProvider>
        <ProyectosProvider>
          <App />
          <DialogoSalir />
        </ProyectosProvider>
      </SesionProvider>
    </LucideProvider>
  </React.StrictMode>,
)
