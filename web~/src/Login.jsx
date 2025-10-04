import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) return setError("Please enter both email and password.");
    try {
      const r = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await r.json();
      if (!r.ok) return setError(j.error || "Login failed");
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("token", j.token);
      localStorage.setItem("currentUser", JSON.stringify(j.user));
      navigate("/report");
    } catch {
      setError("Network error. Try again.");
    }
  };

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <header className="header">
        <h1 className="title">FixiePixie</h1>
        <span className="badge">Login</span>
      </header>

      <form onSubmit={handleLogin} className="panel">
        {error && <div style={{ background:"rgba(255,0,0,0.12)", color:"#ffb4b4", padding:8, borderRadius:8, marginBottom:10 }}>{error}</div>}
        <label className="meta">Email</label>
        <input className="input select" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
        <label className="meta" style={{marginTop:8}}>Password</label>
        <input className="input select" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••" />
        <div className="controls" style={{marginTop:12}}>
          <button className="btn btn-primary" type="submit">Log In</button>
        </div>
        <p className="meta" style={{ marginTop: 8, textAlign: "center" }}>
          New user? <a href="/signup" style={{ color: "var(--brand)" }}>Create an account</a>
        </p>
      </form>
    </div>
  );
}
