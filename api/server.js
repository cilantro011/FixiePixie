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
  const sizeKB = req.file ? Math.round(req.file.size / 1024) : 0

  // Load contacts map
  const contacts = require('./dfw_contacts.json')

  // Try to reverse geocode to get city name
  let city = ''
  try {
    const UA = process.env.GEOCODER_USER_AGENT || 'FixiePixie/0.1'
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1`
    const r = await fetch(url, { headers: { 'User-Agent': UA } })
    const j = await r.json()
    city = j.address?.city || j.address?.town || j.address?.county || ''
  } catch (e) {
    console.warn('reverse lookup during report failed:', e)
  }

  // Pick the matching contact (fallback: Default)
  const entry = contacts[city] || contacts.Default

  return res.json({
    message: `DRY-RUN: would email ${entry.emails.join(', ')}`,
    city,
    lat, lon, category, note,
    contact: entry,
    photo: req.file ? { present: true, sizeKB } : { present: false }
  })
})

const PORT = process.env.PORT || 3000

const { createUser, findUserByEmail, issueToken } = require('./auth')
const bcrypt = require('bcryptjs')

// POST /auth/signup { name, email, password }
app.post('/auth/signup', (req, res) => {
  const { name, email, password } = req.body || {}
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, password required' })
  }
  try {
    const exists = findUserByEmail(email)
    if (exists) return res.status(409).json({ error: 'email already registered' })
    const user = createUser({ name, email, password })
    const token = issueToken(user)
    res.json({ token, user })
  } catch (e) {
    console.error('signup error:', e)
    res.status(500).json({ error: 'signup failed' })
  }
})

// POST /auth/login { email, password }
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'email, password required' })
  const row = findUserByEmail(email)
  if (!row) return res.status(401).json({ error: 'invalid credentials' })
  const ok = bcrypt.compareSync(password, row.password_hash)
  if (!ok) return res.status(401).json({ error: 'invalid credentials' })

  const user = { id: row.id, name: row.name, email: row.email }
  const token = issueToken(user)
  res.json({ token, user })
})

app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`))
