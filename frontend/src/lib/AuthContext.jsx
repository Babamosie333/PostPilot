import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "./api";

const AuthContext = createContext(null);

// Pulls ?token=, ?banned=/?reason=, or ?authError= off the URL after
// LinkedIn's OAuth redirect lands back on the app, then cleans the URL.
function consumeAuthRedirectParams() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const banned = params.get("banned");
  const reason = params.get("reason");
  const authError = params.get("authError");

  if (token || banned || authError) {
    window.history.replaceState({}, "", window.location.pathname);
  }

  return { token, banned: banned === "1", reason, authError };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [banInfo, setBanInfo] = useState(null);
  const [authError, setAuthError] = useState(null);

  const loadMe = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { user } = await api.me();
      setUser(user);
    } catch (err) {
      if (err.banned) {
        setBanInfo({ reason: err.banReason });
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const redirect = consumeAuthRedirectParams();
    if (redirect.token) {
      setToken(redirect.token);
    } else if (redirect.banned) {
      setBanInfo({ reason: redirect.reason || "" });
      setLoading(false);
      return;
    } else if (redirect.authError) {
      setAuthError(redirect.authError);
      setLoading(false);
      return;
    }
    loadMe();
  }, [loadMe]);

  // If LinkedIn login completes in a separate tab (see loginWithLinkedIn
  // below), that tab writes the token to localStorage — this picks that up
  // here too, so the original tab logs in automatically instead of being
  // stuck on the sign-in screen.
  useEffect(() => {
    function handleStorage(e) {
      if (e.key === "postpilot_token" && e.newValue) {
        loadMe();
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [loadMe]);

  function loginWithLinkedIn() {
    setAuthError(null);
    const url = `${api.base}/api/auth/linkedin/login`;
    // A same-tab redirect (window.location.href) is what triggers OS-level
    // Universal Link handoff to an installed native LinkedIn app on some
    // devices, hijacking the flow into a broken in-app webview instead of
    // the real browser. Opening a genuine new tab avoids that in most
    // cases. The new tab becomes the logged-in session once LinkedIn
    // redirects it back with a token — the original tab can just be closed.
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      // Popup blocked — fall back to a same-tab redirect rather than doing nothing.
      window.location.href = url;
    }
  }

  async function devLogin(email, secret) {
    setAuthError(null);
    const res = await api.devLogin(email, secret);
    setToken(res.token);
    await loadMe();
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, banInfo, authError, loginWithLinkedIn, devLogin, logout, refresh: loadMe }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
