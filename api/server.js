// api/server.js
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const multer = require('multer')

const app = express()
app.use(cors())
app.use(express.json())

// simple file upload handler (max 8 MB)
const upload = multer({ limits: { fileSize: 8 * 1024 * 1024 } })

// --- health check ---
app.get('/health', (req, res) => {
  res.json({ ok: true, name: 'FixiePixie API', env: process.env.NODE_ENV || 'development' })
})

// --- reverse geocoding: /reverse?lat=...&lon=... ---
app.get('/reverse', async (req, res) => {
  const { lat, lon } = req.query
  if (!lat || !lon) return res.status(400).json({ error: 'lat/lon required' })
  try {
    const UA = process.env.GEOCODER_USER_AGENT || 'FixiePixie/0.1'
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1`
    const r = await fetch(url, { headers: { 'User-Agent': UA } })
    const j = await r.json()
    const a = j.address || {}
    res.json({
      zip: a.postcode || '',
      city: a.city || a.town || a.village || a.county || '',
      state: a.state || '',
      display: j.display_name || ''
    })
  } catch (e) {
    console.error('reverse error:', e)
    res.status(500).json({ error: 'reverse geocode failed' })
  }
})

// --- report submit (DRY-RUN) ---
app.post('/api/report', upload.single('photo'), async (req, res) => {
  const { lat, lon, category, note } = req.body || {}

  // (optional) we could re-reverse here; keeping it simple for now
  const sizeKB = req.file ? Math.round(req.file.size / 1024) : 0

  return res.json({
    message: `DRY-RUN: received report for "${category || '(no category)'}"`,
    lat, lon, category, note,
    photo: req.file ? { present: true, sizeKB } : { present: false }
  })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`))
