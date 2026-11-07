import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installStableViewport } from './lib/stableViewport'

installStableViewport() // antes da primeira renderização: as alturas da landing usam --sh

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
