import React from 'react'
import ReactDOM from 'react-dom/client'
import { LucideProvider } from 'lucide-react'
import App from './App'
import DialogoSalir from './components/DialogoSalir'
import { SesionProvider } from './sesion'
import { ProyectosProvider } from './proyectos'
import './index.css'

// Single source of truth for icon styling app-wide: thin, technical line
// weight (Linear/Vercel/Datadog-style), no per-icon overrides needed.
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
