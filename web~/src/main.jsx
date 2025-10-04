// web/src/main.jsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'   // ⟵ add this line

createRoot(document.getElementById('root')).render(<App />)
