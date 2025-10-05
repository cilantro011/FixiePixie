import { useEffect, useRef, useState } from "react";

const SCOPES = ""; // not needed for backend login; we use ID token only

export function useGoogleAuth(clientId, apiBase = import.meta.env.VITE_API_URL) {
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem("currentUser") || "null"); } catch { return null; }
  });
  const jwtRef = useRef(localStorage.getItem("token") || null);

  useEffect(() => {
    // prepare the Google Identity client (ID token flow)
    if (!window.google || !clientId) return;
    google.accounts.id.initialize({
      client_id: clientId,
      ux_mode: "popup",
      // we won't render a button here; we call prompt() when needed
      callback: (resp) => {
        // this callback is set dynamically in signIn() so ignore here
      }
    });
  }, [clientId]);

  // Opens Google popup, gets ID token, sends to backend, stores JWT/user
  function signIn() {
    return new Promise((resolve, reject) => {
      if (!window.google || !clientId) return reject(new Error("Google client not loaded"));

      const onCredential = async ({ credential }) => {
        try {
          const r = await fetch(`${apiBase}/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: credential })
          });
          if (!r.ok) throw new Error(await r.text());
          const j = await r.json();
          jwtRef.current = j.token;
          localStorage.setItem("token", j.token);
          localStorage.setItem("currentUser", JSON.stringify(j.user));
          setProfile(j.user);
          resolve(j.user);
        } catch (e) {
          console.error(e);
          reject(e);
        } finally {
          // restore default callback to no-op
          google.accounts.id.initialize({ client_id: clientId, callback: ()=>{} });
        }
      };

      // temporarily set our callback then prompt the popup
      google.accounts.id.initialize({ client_id: clientId, ux_mode: "popup", callback: onCredential });
      google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          reject(new Error("Google sign-in was dismissed"));
        }
      });
    });
  }

  function signOut() {
    try { google.accounts.id.disableAutoSelect(); } catch {}
    jwtRef.current = null;
    localStorage.removeItem("token");
    localStorage.removeItem("currentUser");
    setProfile(null);
  }

  // For convenience in your components
  const jwt = jwtRef.current;

  return { profile, jwt, signIn, signOut };
}
