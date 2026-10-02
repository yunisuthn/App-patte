import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import Verrou from './components/Verrou'

// Demande au navigateur de ne pas effacer les données quand le téléphone manque de place.
navigator.storage?.persist?.()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Verrou>
      <App />
    </Verrou>
  </StrictMode>,
)
