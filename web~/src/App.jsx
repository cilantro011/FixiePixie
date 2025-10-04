import { useEffect, useState } from 'react'

// backend URL from env (VITE_API_URL)
const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function App() {
  const [status, setStatus] = useState('Checking API…')

  useEffect(() => {
    // call backend /health once on load
    fetch(`${API}/health`)
      .then(r => r.json())
      .then(j => {
        if (j.ok) setStatus(`✅ API OK: ${j.name}`)
        else setStatus('❌ API not responding')
      })
      .catch(() => setStatus('❌ API not responding'))
  }, [])

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h1>FixiePixie</h1>
      <p>{status}</p>
    </div>
  )
}
