import { useEffect, useRef, useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function App() {
  // --- new state for this milestone ---
  const [status, setStatus]   = useState('Checking API…')
  const [coords, setCoords]   = useState(null)     // { lat, lon }
  const [preview, setPreview] = useState('')       // blob URL for captured image
  const videoRef  = useRef(null)                   // <video> handle
  const canvasRef = useRef(null)                   // <canvas> handle

  // keep this health check exactly like before
  useEffect(() => {
    fetch(`${API}/health`).then(r=>r.json()).then(j=>{
      setStatus(j.ok ? `✅ API OK: ${j.name}` : '❌ API not responding')
    }).catch(()=> setStatus('❌ API not responding'))
  }, [])

   useEffect(() => {
  // Geolocation
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => console.warn('Geolocation error:', err),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  } else {
    console.warn('Geolocation not supported')
  }

  // Camera
  if (navigator.mediaDevices?.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        console.log('Camera stream acquired')
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch((err) => {
        console.error('getUserMedia error:', err.name, err.message)
        // Show a friendly hint in the UI:
        setStatus('❌ Camera blocked — click the padlock icon → allow Camera, then reload.')
      })
  } else {
    console.warn('mediaDevices/getUserMedia not available')
    setStatus('❌ Camera API not available in this browser')
  }
}, [])

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif', maxWidth: 640, margin: '0 auto' }}>
      <h1>FixiePixie</h1>
      <p>{status}</p>

      <p>GPS: {coords ? `${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}` : '—'}</p>

      {/* camera area */}
      <video ref={videoRef} autoPlay playsInline style={{ width:'100%', background:'#000', borderRadius:8 }} />
      <div style={{ marginTop: 8 }}>
        <button onClick={() => {/* we'll wire this next */}}>Take Photo</button>
        <input type="file" accept="image/*" capture="environment"
               onChange={(e)=>{/* fallback handler next */}}
               style={{ marginLeft: 8 }}/>
      </div>

      {preview && <img src={preview} alt="preview" style={{ width:'100%', marginTop:8, borderRadius:8 }} />}

      <canvas ref={canvasRef} style={{ display:'none' }} />
    </div>
  )
}
