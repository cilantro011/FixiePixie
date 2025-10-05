// api/server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');

const { sendReportEmail } = require('./mailer');
const { createUser, findUserByEmail, issueToken } = require('./auth');

const app = express();

const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use(cors());

// Allow big JSON bodies (front-end never sends huge JSON, but safe defaults)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ONE multer instance, memory storage so we can email the buffer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB cap
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpe?g|png|webp|heic|heif)$/i.test(file.mimetype);
    if (!ok) return cb(new Error('Only image uploads are allowed'));
    cb(null, true);
  }
});

// --- health check ---
app.get('/health', (req, res) => {
  res.json({ ok: true, name: 'FixiePixie API', env: process.env.NODE_ENV || 'development' });
});

// Small helper for reverse geocoding
async function reverseGeocode(lat, lon) {
  const UA = process.env.GEOCODER_USER_AGENT || 'FixiePixie/1.0';
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1`;
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`Reverse geocode failed: ${r.status}`);
  const j = await r.json();
  const a = j.address || {};
  return {
    zip: a.postcode || '',
    city: a.city || a.town || a.village || a.county || '',
    state: a.state || '',
    display: j.display_name || ''
  };
}

// --- reverse geocoding: /reverse?lat=...&lon=... ---
app.get('/reverse', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat/lon required' });
  try {
    const data = await reverseGeocode(lat, lon);
    res.json(data);
  } catch (e) {
    console.error('reverse error:', e);
    res.status(500).json({ error: 'reverse geocode failed' });
  }
});

//console.log('Geo match:', geo.city, geo.state, geo.zip);


// --- report submit (REAL EMAIL) ---
app.post('/api/report', upload.single('photo'), async (req, res) => {
  try {
    const { lat, lon, category, note, reporterName, reporterEmail } = req.body || {};
    if (!lat || !lon) return res.status(400).json({ error: 'lat and lon are required' });
    if (!category) return res.status(400).json({ error: 'category is required' });

    // Look up contact based on city
    const contacts = require('./dfw_contacts.json');

    // Reverse geocode to get city/state/zip for routing + email body
    let geo = { city: '', state: '', zip: '', display: '' };
    try { geo = await reverseGeocode(lat, lon); } catch (e) { console.warn('reverse during report:', e); }

    const cityKey = geo.city || ''; // direct city match if present
    const contact = contacts[cityKey] || contacts.Default;
    const recipients = (contact.emails || []).filter(Boolean);
    if (!recipients.length) return res.status(500).json({ error: 'No recipient email configured' });

    // Build message content
    const googleMaps = `https://maps.google.com/?q=${encodeURIComponent(lat)},${encodeURIComponent(lon)}`;
    const osm = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(lon)}#map=18/${encodeURIComponent(lat)}/${encodeURIComponent(lon)}`;

    const subject = `[FixiePixie] ${category} — ${geo.city || 'Unknown city'} ${geo.zip ? `(${geo.zip})` : ''}`;
    const plain = [
      `New issue reported via FixiePixie`,
      ``,
      `Category: ${category}`,
      `Description: ${note || '(none)'}`,
      ``,
      `Location: ${geo.display || 'Unknown address'}`,
      `City/State/ZIP: ${geo.city || '-'}, ${geo.state || '-'} ${geo.zip || ''}`,
      `GPS: ${lat}, ${lon}`,
      `Google Maps: ${googleMaps}`,
      `OpenStreetMap: ${osm}`,
      ``,
      `Reporter: ${reporterName || 'Anonymous'} ${reporterEmail ? `<${reporterEmail}>` : ''}`,
    ].join('\n');

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:14px;color:#111">
        <h2 style="margin:0 0 6px">New issue reported via FixiePixie</h2>
        <p style="margin:0 0 12px;color:#444">Please see details below.</p>

        <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb">
          <tr><td style="background:#f8fafc;font-weight:700;border-bottom:1px solid #e5e7eb">Category</td><td style="border-bottom:1px solid #e5e7eb">${escapeHtml(category)}</td></tr>
          <tr><td style="background:#f8fafc;font-weight:700;border-bottom:1px solid #e5e7eb">Description</td><td style="border-bottom:1px solid #e5e7eb">${escapeHtml(note || '(none)')}</td></tr>
          <tr><td style="background:#f8fafc;font-weight:700;border-bottom:1px solid #e5e7eb">Address</td><td style="border-bottom:1px solid #e5e7eb">${escapeHtml(geo.display || 'Unknown')}</td></tr>
          <tr><td style="background:#f8fafc;font-weight:700;border-bottom:1px solid #e5e7eb">City/State/ZIP</td><td style="border-bottom:1px solid #e5e7eb">${escapeHtml(`${geo.city || '-'}, ${geo.state || '-'} ${geo.zip || ''}`)}</td></tr>
          <tr><td style="background:#f8fafc;font-weight:700;border-bottom:1px solid #e5e7eb">GPS</td><td style="border-bottom:1px solid #e5e7eb">${lat}, ${lon}</td></tr>
          <tr><td style="background:#f8fafc;font-weight:700">Links</td>
              <td>
                <a href="${googleMaps}">Google Maps</a> &nbsp;·&nbsp;
                <a href="${osm}">OpenStreetMap</a>
              </td>
          </tr>
          <tr><td style="background:#f8fafc;font-weight:700">Reporter</td><td>${escapeHtml(reporterName || 'Anonymous')}${reporterEmail ? ` &lt;${escapeHtml(reporterEmail)}&gt;` : ''}</td></tr>
        </table>

        <p style="color:#6b7280;font-size:12px;margin-top:12px">Sent automatically by FixiePixie.</p>
      </div>
    `;

    // Attachment (if provided)
    const photoBuffer = req.file?.buffer || null;
    const photoMime   = req.file?.mimetype || 'image/jpeg';
    const filename    = req.file?.originalname || 'report.jpg';

    // Send it 🚀
    const info = await sendReportEmail({
      to: recipients,
      subject,
      text: plain,
      html,
      photoBuffer,
      photoMime,
      filename,
    });

    return res.json({
      status: 'sent',
      messageId: info.messageId,
      sent_to: recipients,
      city: geo.city || '',
      zip: geo.zip || '',
    });
  } catch (err) {
    console.error('report email error:', err);
    const msg = err?.message || 'Unknown email error';
    return res.status(500).json({ error: msg });
  }
});

// ------- Auth (unchanged) -------
app.post('/auth/signup', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, password required' });
  }
  try {
    const exists = findUserByEmail(email);
    if (exists) return res.status(409).json({ error: 'email already registered' });
    const user = createUser({ name, email, password });
    const token = issueToken(user);
    res.json({ token, user });
  } catch (e) {
    console.error('signup error:', e);
    res.status(500).json({ error: 'signup failed' });
  }
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email, password required' });
  const row = findUserByEmail(email);
  if (!row) return res.status(401).json({ error: 'invalid credentials' });
  const ok = bcrypt.compareSync(password, row.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });

  const user = { id: row.id, name: row.name, email: row.email };
  const token = issueToken(user);
  res.json({ token, user });
});

// POST /auth/google  { idToken }
app.post('/auth/google', async (req, res) => {
  const { idToken } = req.body || {};
  if (!idToken) return res.status(400).json({ error: 'idToken required' });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload(); // { email, name, picture, sub, ... }
    const email = payload.email;
    const name = payload.name || email;
    const picture = payload.picture;

    let row = findUserByEmail(email);
    let user;

    if (!row) {
      // create a local account w/ random password (we won't use it)
      const tmp = crypto.randomBytes(16).toString('hex');
      user = createUser({ name, email, password: tmp });
    } else {
      user = { id: row.id, name: row.name, email: row.email };
    }

    const token = issueToken(user);
    res.json({ token, user: { ...user, picture } });
  } catch (e) {
    console.error('google auth error:', e);
    res.status(401).json({ error: 'invalid google token' });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));

// -------- helpers --------
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])
  );
}
