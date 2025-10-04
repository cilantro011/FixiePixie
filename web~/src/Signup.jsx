import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSignup = (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError("Please fill all fields.");
      return;
    }

    const users = JSON.parse(localStorage.getItem("users") || "[]");
    if (users.find((u) => u.email === email)) {
      setError("Email already registered. Please log in.");
      return;
    }

    const newUser = { name, email, password };
    users.push(newUser);
    localStorage.setItem("users", JSON.stringify(users));

    alert("Account created! You can now log in.");
    navigate("/");
  };

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <header className="header">
        <h1 className="title">FixiePixie</h1>
        <span className="badge">Sign Up</span>
      </header>

      <form onSubmit={handleSignup} className="panel">
        {error && (
          <div style={{ background: "rgba(255,0,0,0.12)", color: "#ffb4b4", padding: 8, borderRadius: 8, marginBottom: 10 }}>
            {error}
          </div>
        )}

        <label className="meta">Full Name</label>
        <input className="input select" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />

        <label className="meta" style={{ marginTop: 8 }}>Email</label>
        <input className="input select" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />

        <label className="meta" style={{ marginTop: 8 }}>Password</label>
        <input className="input select" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />

        <div className="controls" style={{ marginTop: 12 }}>
          <button className="btn btn-primary" type="submit">Create Account</button>
        </div>

        <p className="meta" style={{ marginTop: 8, textAlign: "center" }}>
          Already have an account? <a href="/" style={{ color: "var(--brand)" }}>Log in</a>
        </p>
      </form>
    </div>
  );
}
