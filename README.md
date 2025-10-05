FixiePixie

Snap a photo, auto-grab GPS, pick an issue, and email it to the right city inbox.
# FixiePixie

Snap a photo, auto-grab GPS, pick an issue, and email it to the right city inbox.

Features

- 📷 Take or upload a photo (attached to the report)
- 📍 Auto-detect GPS and reverse-geocode city / ZIP using Nominatim (OpenStreetMap)
- 📨 Send the report by email with a Google Maps link (Gmail client + SMTP fallback)
- 🔐 Optional Google sign-in (JWT issued by the API)

Quick start

Requirements

- Node.js 18+ and npm

1) Start the API

```powershell
cd api
cp .env.example .env   # or create .env from the snippet below
npm install
npm run dev  
```

2) Start the Web app

```powershell
cd web~
cp .env.example .env   # or create .env from the snippet below
npm install
npm run dev   
```

Environment examples

api/.env (minimal)

```ini
PORT=3000
GEOCODER_USER_AGENT=FixiePixie/1.0 (contact@example.com)

# SMTP fallback (uses a Gmail App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.app@gmail.com
SMTP_PASS=16-char-app-password
SENDER_EMAIL=your.app@gmail.com
SENDER_NAME=FixiePixie

# Optional helpers
# BCC_EMAIL=you@gmail.com
# RECIPIENT_OVERRIDE=you+test@gmail.com
```

web~/.env (minimal)

```ini
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

Tech stack

- Web: Vite + React
- API: Node.js + Express
- Auth: Google Identity Services (frontend) + simple JWT backend
- Mail: Gmail API (client) + Nodemailer SMTP (server fallback)
- Geo: Nominatim (OpenStreetMap) reverse geocoding

Development tips

- Keep secrets out of source control. Use `.env` locally and add `.env` to `.gitignore`.

License

This project is provided as-is for demonstration and local use.