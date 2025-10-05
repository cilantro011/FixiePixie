import { useEffect, useRef, useState } from 'react'
import { useTheme } from './main'
import { useGoogleAuth } from './googleAuth'

// --- Gmail helpers ---
// Ask the user for a Gmail access token with gmail.send scope
function getGmailAccessToken(clientId) {
  return new Promise((resolve, reject) => {
    if (!window.google) return reject(new Error("Google client not loaded"));
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: [
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile"
      ].join(" "),
      prompt: "", // shows consent first time only
      callback: (resp) => {
        if (resp?.access_token) resolve(resp.access_token);
        else reject(new Error("No access token"));
      }
    });
    tokenClient.requestAccessToken();
  });
}

// Send a MIME message via Gmail API
async function gmailSend({ accessToken, to, subject, html, attachment }) {
  const boundary = "fixiepixie-" + Math.random().toString(36).slice(2);
  const toLine = Array.isArray(to) ? to.join(", ") : to;
  let mime = "";

  mime += `To: ${toLine}\r\n`;
  mime += `Subject: ${subject}\r\n`;
  mime += `MIME-Version: 1.0\r\n`;
  mime += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;

  // HTML body
  mime += `--${boundary}\r\n`;
  mime += `Content-Type: text/html; charset="UTF-8"\r\n\r\n`;
  mime += `${html}\r\n\r\n`;

  // Attachment (optional)
  if (attachment?.blob) {
    const arr = new Uint8Array(await attachment.blob.arrayBuffer());
    const b64 = btoa(String.fromCharCode(...arr));
    const name = attachment.filename || "report.jpg";
    const type = attachment.mime || attachment.blob.type || "image/jpeg";
    mime += `--${boundary}\r\n`;
    mime += `Content-Type: ${type}; name="${name}"\r\n`;
    mime += `Content-Transfer-Encoding: base64\r\n`;
    mime += `Content-Disposition: attachment; filename="${name}"\r\n\r\n`;
    mime += b64.replace(/.{1,76}/g, "$&\r\n") + `\r\n\r\n`;
  }

  mime += `--${boundary}--`;

  // base64url encode
  const encoded = btoa(unescape(encodeURIComponent(mime)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const resp = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: encoded })
  });
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const LABELS = ['Pothole', 'Streetlight out', 'Graffiti', 'Trash overflow']


export default function App() {
  const { theme, setTheme } = useTheme()

  // Google auth (login to *your* backend via Google)
  const { profile, jwt, signIn } = useGoogleAuth(GOOGLE_CLIENT_ID, API)

  // UI state
  const [status, setStatus]     = useState('Checking API…')
  const [coords, setCoords]     = useState(null)
  const [addr, setAddr]         = useState(null)
  const [preview, setPreview]   = useState('')
  const [photo, setPhoto]       = useState(null)
  const [category, setCategory] = useState('')
  const [note, setNote]         = useState('')
  const [sending, setSending]   = useState(false)

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
    } catch {}
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
    if (preview) URL.revokeObjectURL(preview)
    setPreview('')
    setPhoto(null)
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => { if (videoRef.current) videoRef.current.srcObject = stream })
        .catch((err) => console.error('Camera restart failed:', err))
    }
  }

  function onFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setPhoto(f)
    setPreview(URL.createObjectURL(f))
  }
  const { signOut } = useGoogleAuth(GOOGLE_CLIENT_ID, import.meta.env.VITE_API_URL);

  function handleLogout() {
    try { signOut(); } catch { }
    localStorage.removeItem("token");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("isLoggedIn");
    // hard redirect so all state is cleared
    window.location.replace("/login");
  }

  async function submitReport() {
  if (!category) { alert('Please choose an issue type.'); return }
  if (!coords)   { alert('Location not ready yet.');     return }

  // Ensure they’re logged into your app (your existing Google sign-in)
  if (!profile || !jwt) {
    try { await signIn(); } catch { alert('Sign in with Google is required.'); return; }
  }

  setSending(true); setStatus('Sending…');

  try {
    // A) Ask for Gmail permission to send from THEIR account
    const accessToken = await getGmailAccessToken(GOOGLE_CLIENT_ID);

    // B) Who should receive? (your new /who endpoint)
    const who = await fetch(`${API}/who?lat=${coords.lat}&lon=${coords.lon}`).then(r => r.json());
    const recipients = (who.emails && who.emails.length) ? who.emails
                     : [JSON.parse(localStorage.getItem('currentUser') || '{}').email].filter(Boolean); // fallback: send to self

    if (!recipients.length) { throw new Error('No recipient configured.'); }

    // C) Build the email body
    const maps = `https://maps.google.com/?q=${coords.lat},${coords.lon}`;
    const esc = (s='').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    const html = `
      <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif">
        <h3>New issue reported via FixiePixie</h3>
        <p><b>Category:</b> ${esc(category)}<br/>
           <b>Description:</b> ${esc(note || '(none)')}</p>
        <p><b>Address:</b> ${esc(addr?.city || who.city || 'Unknown')} ${esc(addr?.zip || '')}<br/>
           <b>GPS:</b> ${coords.lat}, ${coords.lon} — <a href="${maps}">Google Maps</a></p>
      </div>`;

    const attachment = photo ? { blob: photo, filename: 'report.jpg', mime: photo.type || 'image/jpeg' } : null;
    const subject = `[FixiePixie] ${category} — ${who.city || addr?.city || 'Unknown'}${addr?.zip ? ` (${addr.zip})` : ''}`;

    // D) Send FROM the user's Gmail
    await gmailSend({ accessToken, to: recipients, subject, html, attachment });

    setStatus('Submitted!');
    alert(`Submitted!\nSent from your Gmail to: ${recipients.join(', ')}`);
  } catch (e) {
    console.error('Gmail send failed, falling back to server SMTP:', e);

    // E) Fallback to your existing server /api/report
    try {
      const fd = new FormData();
      if (photo) fd.append('photo', photo, 'report.jpg');
      fd.append('lat', coords.lat);
      fd.append('lon', coords.lon);
      fd.append('category', category);
      if (note) fd.append('note', note);

      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      fd.append('reporterName', currentUser.name || 'Anonymous');
      fd.append('reporterEmail', currentUser.email || '');

      const r = await fetch(`${API}/api/report`, {
        method: 'POST',
        headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
        body: fd
      });
      const j = await r.json();
      setStatus(j.message || j.status || 'Submitted!');
      alert(`Submitted via server.\n${j.message || ''}`);
    } catch (e2) {
      console.error(e2);
      setStatus('Submission failed. Check backend.');
      alert('Submission failed.');
    }
  } finally {
    setSending(false);
  }
}


  const statusClass = /✅/.test(status) ? 'status ok' : /❌/.test(status) ? 'status err' : 'status'

  return (
    <div className="container">
      <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="title">FixiePixie</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="badge">DFW</span>

          <button className="btn" onClick={handleLogout}
            style={{ background: "var(--panel-2)", color: "var(--text)", fontSize: "0.9rem", padding: "8px 12px" }}>
            Logout
          </button>

        </div>
      </header>

      <p className={statusClass}>{status}</p>

      <section className="panel grid grid-2">
        {/* Media column */}
        <div>
          <div className="media">
            {!preview && <video ref={videoRef} autoPlay playsInline muted />}
            {preview && <img src={preview} alt="Captured" />}
          </div>

          <div className="controls">
            {!preview ? (
              <>
                <button className="btn btn-primary" onClick={takePhoto}>Take Photo</button>
                <label className="btn">
                  Upload
                  <input className="hidden" type="file" accept="image/*" capture="environment" onChange={onFile} />
                </label>
              </>
            ) : (
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
