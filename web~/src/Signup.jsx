import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    if (!name || !email || !password) return setError("Please fill all fields.");
    try {
      const r = await fetch(`${API}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const j = await r.json();
      if (!r.ok) return setError(j.error || "Signup failed");
      // auto-login after signup:
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
        <span className="badge">Sign Up</span>
      </header>

      <form onSubmit={handleSignup} className="panel">
        {error && <div style={{ background:"rgba(255,0,0,0.12)", color:"#ffb4b4", padding:8, borderRadius:8, marginBottom:10 }}>{error}</div>}
        <label className="meta">Full Name</label>
        <input className="input select" value={name} onChange={e=>setName(e.target.value)} placeholder="Jane Doe" />
        <label className="meta" style={{marginTop:8}}>Email</label>
        <input className="input select" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
        <label className="meta" style={{marginTop:8}}>Password</label>
        <input className="input select" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••" />
        <div className="controls" style={{marginTop:12}}>
          <button className="btn btn-primary" type="submit">Create Account</button>
        </div>
        <p className="meta" style={{ marginTop: 8, textAlign: "center" }}>
          Already have an account? <a href="/" style={{ color: "var(--brand)" }}>Log in</a>
        </p>
      </form>
    </div>
  );
}
