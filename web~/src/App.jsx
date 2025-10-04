import { useEffect, useRef, useState } from 'react'
import { useTheme } from "./main";


const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const LABELS = ['Pothole', 'Streetlight out', 'Graffiti', 'Trash overflow']

export default function App() {
  const [status, setStatus]   = useState('Checking API…')
  const [coords, setCoords]   = useState(null)
  const [addr, setAddr]       = useState(null)
  const [preview, setPreview] = useState('')
  const [photo, setPhoto]     = useState(null)
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)

  const { theme, setTheme } = useTheme();
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");


  const videoRef  = useRef(null)
  const canvasRef = useRef(null)

  // Health
  useEffect(() => {
    fetch(`${API}/health`)
      .then(r => r.json())
      .then(j => setStatus(j.ok ? `✅ API OK: ${j.name}` : '❌ API not responding'))
      .catch(() => setStatus('❌ API not responding'))
  }, [])

  // GPS + Camera
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { lat: pos.coords.latitude, lon: pos.coords.longitude }
          setCoords(c)
          reverseLookup(c)
        },
        (err) => console.warn('Geolocation error:', err),
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => { if (videoRef.current) videoRef.current.srcObject = stream })
        .catch(() => setStatus('❌ Camera blocked — allow it in the padlock and reload.'))
    }
  }, [])

  async function reverseLookup(c) {
    try {
      const r = await fetch(`${API}/reverse?lat=${c.lat}&lon=${c.lon}`)
      const j = await r.json()
      setAddr(j)
    } catch { /* ignore */ }
  }

  function takePhoto() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width  = video.videoWidth  || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob) return
      setPhoto(blob)
      setPreview(URL.createObjectURL(blob))
    }, 'image/jpeg', 0.9)
  }

  function retakePhoto() {
  setPreview('')
  setPhoto(null)

  // Restart the camera feed if stopped
  if (navigator.mediaDevices?.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch((err) => console.error('Camera restart failed:', err))
  }
}


  function onFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setPhoto(f)
    setPreview(URL.createObjectURL(f))
  }

  async function submitReport() {
    if (!category) { alert('Please choose an issue type.'); return }
    if (!coords) { alert('Location not ready yet.'); return }
    setSending(true); setStatus('Sending…')
    try {
      const fd = new FormData()
      if (photo) fd.append('photo', photo, 'report.jpg')
      fd.append('lat', coords.lat)
      fd.append('lon', coords.lon)
      fd.append('category', category)
      if (note) fd.append('note', note)

      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}')
      fd.append('reporterName', currentUser.name || 'Anonymous')
      fd.append('reporterEmail', currentUser.email || '')
      const r = await fetch(`${API}/api/report`, { method:'POST', body: fd })
      const j = await r.json()
      setStatus(j.message || 'Submitted!')
      alert(j.message || 'Submitted!')
    } catch {
      setStatus('Submission failed. Check backend.')
      alert('Submission failed.')
    } finally {
      setSending(false)
    }
  }

  const statusClass = /✅/.test(status) ? 'status ok' : /❌/.test(status) ? 'status err' : 'status'

  return (
    <div className="container">
      <header className="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 className="title">FixiePixie</h1>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="badge">DFW</span>
          <button
            className="btn"
            onClick={() => {
              localStorage.removeItem("isLoggedIn");
              localStorage.removeItem("token");
              localStorage.removeItem("currentUser");
              window.location.href = "/";
            }}
            style={{ background: "var(--panel-2)", color: "var(--text)", fontSize: "0.9rem", padding: "8px 12px" }}
          >
            Logout
          </button>
        </div>
      </header>


      <button className="btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
        {theme === "dark" ? "🌞 Light" : "🌙 Dark"}
      </button>


      <p className={statusClass}>{status}</p>

      <section className="panel grid grid-2">
        {/* Media column */}
        <div>
          <div className="media">
              {!preview && <video ref={videoRef} autoPlay playsInline />}
              {preview && <img src={preview} alt="Captured" />}
            </div>

            <div className="controls">
              {!preview && (
                <>
                  <button className="btn btn-primary" onClick={takePhoto}>Take Photo</button>
                  <label className="btn">
                    Upload
                    <input className="hidden" type="file" accept="image/*" capture="environment" onChange={onFile}/>
                  </label>
                </>
              )}
              {preview && (
                <button className="btn" onClick={retakePhoto}>Retake Photo</button>
              )}
            </div>

        </div>

        {/* Details column */}
        <div>
          <div className="row row-2">
            <div className="panel">
              <div className="meta">GPS</div>
              <div className="kv">
                <b>{coords ? coords.lat.toFixed(5) : '—'}</b>
                <b>{coords ? coords.lon.toFixed(5) : ''}</b>
              </div>
            </div>
            <div className="panel">
              <div className="meta">Address</div>
              <div className="kv">
                <span>ZIP: <b>{addr?.zip || '—'}</b></span>
                <span>{(addr?.city || addr?.state) ? `${addr?.city || ''} ${addr?.state || ''}` : ''}</span>
              </div>
            </div>
          </div>

          <div className="mt12">
            <label className="sr-only" htmlFor="issue">Issue type</label>
            <select id="issue" className="select" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">Select issue…</option>
              {LABELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div className="mt12">
            <label className="sr-only" htmlFor="note">Note (optional)</label>
            <textarea id="note" className="textarea" placeholder="Short description to help city crews…" value={note} onChange={e => setNote(e.target.value)} />
          </div>

          <div className="controls mt12">
            <button className="btn btn-primary" onClick={submitReport} disabled={sending || !category}>
              {sending ? 'Sending…' : 'Send report'}
            </button>
          </div>

          <p className="disclaimer">Non-emergency only. If dangerous or urgent, call 911.</p>
        </div>
      </section>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
