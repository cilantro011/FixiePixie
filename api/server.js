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
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})
