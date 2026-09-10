import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App'
import { initializePersistentStorage } from './lib/persistentStorage'
import './styles.css'

initializePersistentStorage().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
