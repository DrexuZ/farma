import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { instalarFetchAuth } from './lib/fetchAuth'
import App from './App.jsx'

// Instala el wrapper global de fetch (Bearer JWT + manejo de 401) ANTES de renderizar.
instalarFetchAuth();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
