// api/auth.js
const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const DB_PATH = process.env.AUTH_DB_PATH || './auth.db'
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

const db = new Database(DB_PATH)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`)

function createUser({ name, email, password }) {
  const hash = bcrypt.hashSync(password, 10)
  const stmt = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
  const info = stmt.run(name, email.toLowerCase(), hash)
  return { id: info.lastInsertRowid, name, email: email.toLowerCase() }
}

function findUserByEmail(email) {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?')
  return stmt.get(email.toLowerCase())
}

function issueToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' })
}

module.exports = { createUser, findUserByEmail, issueToken }
