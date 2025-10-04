import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Create demo user if none exist
  useEffect(() => {
    const existing = localStorage.getItem("users");
    if (!existing) {
      const demoUsers = [{ name: "Demo User", email: "demo@fixiepixie.app", password: "demo123" }];
      localStorage.setItem("users", JSON.stringify(demoUsers));
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const match = users.find((u) => u.email === email && u.password === password);

    if (!match) {
      setError("Invalid email or password.");
      return;
    }

    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("currentUser", JSON.stringify(match));
    navigate("/report");
  };

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <header className="header">
        <h1 className="title">FixiePixie</h1>
        <span className="badge">Login</span>
      </header>

      <form onSubmit={handleLogin} className="panel">
        {error && (
          <div
            style={{
              background: "rgba(255,0,0,0.12)",
              color: "#ffb4b4",
              padding: 8,
              borderRadius: 8,
              marginBottom: 10,
            }}
          >
            {error}
          </div>
        )}

        <label className="meta">Email</label>
        <input
          className="input select"
          type="email"
          placeholder="demo@fixiepixie.app"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="meta" style={{ marginTop: 8 }}>
          Password
        </label>
        <input
          className="input select"
          type="password"
          placeholder="demo123"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="controls" style={{ marginTop: 12 }}>
          <button className="btn btn-primary" type="submit">
            Log In
          </button>
        </div>

        <p className="meta" style={{ marginTop: 8, textAlign: "center" }}>
          New user?{" "}
          <a href="/signup" style={{ color: "var(--brand)" }}>
            Create an account
          </a>
        </p>
      </form>
    </div>
  );
}
