import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import '../index.css'
import WarehouseApp from './WarehouseApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <WarehouseApp />
    </HashRouter>
  </StrictMode>,
)
