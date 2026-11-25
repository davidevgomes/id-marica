import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const workerUrl = new URL(`${import.meta.env.BASE_URL}sw.js`, document.baseURI)
  navigator.serviceWorker.register(workerUrl).catch((error) => {
    console.warn('Não foi possível preparar o ID Maricá para uso offline.', error)
  })
}
