// api/server.js
require('dotenv').config()         // 1) load .env into process.env

const express = require('express') // 2) import express
const cors = require('cors')       // 3) import CORS middleware

const app = express()              // 4) create the express app

app.use(cors())                    // 5) allow cross-origin requests (frontend → API)
app.use(express.json())            // 6) parse JSON request bodies

// 7) simple health check endpoint for smoke testing
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    name: 'FixiePixie API',
    env: process.env.NODE_ENV || 'development'
  })
})

// 8) start listening on a port (from env or default 3000)
const PORT = process.env.PORT || 3000

// GET /reverse?lat=...&lon=...
app.get('/reverse', async (req, res) => {
  const { lat, lon } = req.query
  if (!lat || !lon) return res.status(400).json({ error: 'lat/lon required' })

  try {
    const UA = process.env.GEOCODER_USER_AGENT || 'FixiePixie/0.1'
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1`
    const r = await fetch(url, { headers: { 'User-Agent': UA } })
    const j = await r.json()
    const a = j.address || {}
    // normalize a few likely fields
    const payload = {
      zip: a.postcode || '',
      city: a.city || a.town || a.village || a.county || '',
      state: a.state || '',
      display: j.display_name || ''
    }
    res.json(payload)
  } catch (e) {
    console.error('reverse error:', e)
    res.status(500).json({ error: 'reverse geocode failed' })
  }
})

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})
