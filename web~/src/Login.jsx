import { useEffect, useRef, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const gbtnRef = useRef(null);   // container for Google button
  const initedRef = useRef(false);

  // Render the official Google button once
  useEffect(() => {
    if (initedRef.current) return;
    if (!window.google) return; // script not loaded yet
    if (!GOOGLE_CLIENT_ID) {
      console.error("VITE_GOOGLE_CLIENT_ID is missing");
      return;
    }

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async ({ credential }) => {
        try {
          // Send the ID token to your backend to create/login the user
          const r = await fetch(`${API}/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: credential })
          });
          const j = await r.json();
          if (!r.ok) throw new Error(j.error || "Google login failed");

          localStorage.setItem("token", j.token);
          localStorage.setItem("currentUser", JSON.stringify(j.user));
          localStorage.setItem("isLoggedIn", "true");
          window.location.replace("/report");
        } catch (err) {
          console.error(err);
          alert(err.message || "Google sign-in failed");
        }
      }
    });

    // Render the Google-branded button
    window.google.accounts.id.renderButton(gbtnRef.current, {
      theme: "filled_blue",
      size: "large",
      text: "continue_with",
      shape: "pill",
      width: 320
    });

    initedRef.current = true;
  }, []);

  async function loginWithPassword(e) {
    e.preventDefault();
    try {
      const r = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Login failed");
      localStorage.setItem("token", j.token);
      localStorage.setItem("currentUser", JSON.stringify(j.user));
      localStorage.setItem("isLoggedIn", "true");
      window.location.replace("/report");
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <h1 className="title">FixiePixie</h1>

      <div className="panel" style={{ padding: 20 }}>
        <form onSubmit={loginWithPassword}>
          <label className="meta">Email</label>
          <input
            className="select"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />

          <label className="meta mt12">Password</label>
          <input
            className="select"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="btn btn-primary mt12" type="submit">Log In</button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--divider, rgba(255,255,255,.12))" }} />
          <span className="meta">or</span>
          <div style={{ flex: 1, height: 1, background: "var(--divider, rgba(255,255,255,.12))" }} />
        </div>

        {/* Google button mounts here */}
        <div ref={gbtnRef} style={{ display: "flex", justifyContent: "center" }} />

        <p className="meta mt12">
          New user? <a href="/signup">Create an account</a>
        </p>
      </div>
    </div>
  );
}
