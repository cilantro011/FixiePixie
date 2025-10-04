import { useEffect, useRef, useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function App() {
  // state
  const [status, setStatus]   = useState('Checking API…')
  const [coords, setCoords]   = useState(null)                  // { lat, lon }
  const [addr, setAddr]       = useState(null)                  // { zip, city, state, display }
  const [preview, setPreview] = useState('')                    // blob URL for captured/selected image

  // refs
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)

  // 1) API health check
  useEffect(() => {
    fetch(`${API}/health`)
      .then(r => r.json())
      .then(j => setStatus(j.ok ? `✅ API OK: ${j.name}` : '❌ API not responding'))
      .catch(() => setStatus('❌ API not responding'))
  }, [])

  // 2) Geolocation + camera stream (runs once)
  useEffect(() => {
    // Geolocation
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { lat: pos.coords.latitude, lon: pos.coords.longitude }
          setCoords(c)
          reverseLookup(c) // ← look up ZIP/City/State once we have coords
        },
        (err) => console.warn('Geolocation error:', err),
        { enableHighAccuracy: true, timeout: 10000 }
      )
    } else {
      console.warn('Geolocation not supported')
    }

    // Camera
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
          if (videoRef.current) videoRef.current.srcObject = stream
        })
        .catch((err) => {
          console.error('getUserMedia error:', err.name, err.message)
          setStatus('❌ Camera blocked — click the padlock icon → allow Camera, then reload.')
        })
    } else {
      setStatus('❌ Camera API not available in this browser')
    }
  }, [])

  // helper: reverse geocode via backend
  async function reverseLookup(c) {
    try {
      const r = await fetch(`${API}/reverse?lat=${c.lat}&lon=${c.lon}`)
      const j = await r.json()
      setAddr(j)
    } catch (e) {
      console.warn('reverse lookup failed', e)
    }
  }

  // capture a still frame from the video
  function takePhoto() {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width  = video.videoWidth  || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob) return
      setPreview(URL.createObjectURL(blob))
    }, 'image/jpeg', 0.9)
  }

  // fallback: handle file upload
  function onFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setPreview(URL.createObjectURL(f))
  }

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif', maxWidth: 640, margin: '0 auto' }}>
      <h1>FixiePixie</h1>
      <p>{status}</p>

      <p>
        GPS: {coords ? `${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}` : '—'}
        <br />
        ZIP: <b>{addr?.zip || '—'}</b>
        { (addr?.city || addr?.state) ? <> &nbsp;| {addr?.city} {addr?.state}</> : null }
      </p>

      {/* camera area */}
      <video ref={videoRef} autoPlay playsInline style={{ width:'100%', background:'#000', borderRadius:8 }} />
      <div style={{ marginTop: 8, display:'flex', gap:8, flexWrap:'wrap' }}>
        <button onClick={takePhoto}>Take Photo</button>
        <label>
          <span style={{ marginRight: 6 }}>Browse…</span>
          <input type="file" accept="image/*" capture="environment" onChange={onFile} />
        </label>
      </div>

      {preview && <img src={preview} alt="preview" style={{ width:'100%', marginTop:8, borderRadius:8 }} />}

      <canvas ref={canvasRef} style={{ display:'none' }} />
    </div>
  )
}
