import { useState } from "react";
import { useAuth } from "../lib/AuthContext";

export default function AuthScreen() {
  const { banInfo, authError, loginWithLinkedIn, devLogin } = useAuth();
  const [showDev, setShowDev] = useState(false);
  const [email, setEmail] = useState("");
  const [secret, setSecret] = useState("");
  const [devError, setDevError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleDevLogin(e) {
    e.preventDefault();
    setBusy(true);
    setDevError(null);
    try {
      await devLogin(email, secret);
    } catch (err) {
      setDevError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="h-2 w-2 rounded-full bg-amber shadow-[0_0_8px_2px_rgba(242,169,59,0.55)]" />
          <span className="font-display text-[17px] font-700 tracking-tight text-paper">
            PostPilot
          </span>
        </div>

        <div className="border border-line bg-panel p-6">
          <p className="mb-5 text-[13px] leading-relaxed text-paper-dim">
            Sign in with the LinkedIn account you want PostPilot to manage.
            There's no separate password — LinkedIn is your login.
          </p>

          {banInfo && (
            <p className="mb-4 border border-signal-rust/40 bg-signal-rust/10 px-3 py-2 font-mono text-[11.5px] leading-relaxed text-signal-rust">
              This account has been banned.
              {banInfo.reason ? ` Reason: ${banInfo.reason}` : ""}
            </p>
          )}
          {authError && (
            <p className="mb-4 border border-signal-rust/40 bg-signal-rust/10 px-3 py-2 font-mono text-[11.5px] leading-relaxed text-signal-rust">
              {authError}
            </p>
          )}

          <button
            onClick={loginWithLinkedIn}
            className="focus-ring flex w-full items-center justify-center gap-2 border border-amber bg-amber px-4 py-2.5 text-[13px] font-700 text-ink transition-opacity hover:opacity-90"
          >
            Continue with LinkedIn
          </button>
        </div>

        <button
          onClick={() => setShowDev((v) => !v)}
          className="focus-ring mt-4 font-mono text-[10.5px] text-paper-dim hover:text-paper"
        >
          {showDev ? "hide" : "having trouble? temporary dev login"}
        </button>

        {showDev && (
          <form onSubmit={handleDevLogin} className="mt-3 border border-line bg-panel p-4 text-left">
            <p className="mb-3 font-mono text-[10px] leading-relaxed text-paper-dim">
              Only works if DEV_LOGIN_SECRET is set in the backend's .env.
              Gets you into the app without LinkedIn — you won't be able to
              post to LinkedIn until you connect for real later.
            </p>
            <div className="grid gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="focus-ring border border-line-bright bg-panel-raised px-3 py-2 text-[12.5px] text-paper"
              />
              <input
                type="password"
                required
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="DEV_LOGIN_SECRET"
                className="focus-ring border border-line-bright bg-panel-raised px-3 py-2 text-[12.5px] text-paper"
              />
              {devError && (
                <p className="font-mono text-[11px] text-signal-rust">{devError}</p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="focus-ring border border-line px-3 py-2 text-[12px] font-600 text-paper-dim hover:text-paper disabled:opacity-50"
              >
                {busy ? "…" : "Dev sign in"}
              </button>
            </div>
          </form>
        )}

        <p className="mt-4 font-mono text-[10.5px] text-paper-dim">
          Each account is its own LinkedIn — nothing is shared between users.
        </p>
      </div>
    </div>
  );
}
