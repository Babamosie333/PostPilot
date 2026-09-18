import { useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

export default function SettingsView() {
  const { user, refresh } = useAuth();
  const [username, setUsername] = useState(user?.github?.username || "");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [recapResult, setRecapResult] = useState(null);

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await api.saveGithub(username, token);
      await refresh();
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function testRecap() {
    setBusy(true);
    setError(null);
    setRecapResult(null);
    try {
      const res = await api.triggerRecap();
      setRecapResult(
        res.created
          ? "Draft created — check the Drafts tab."
          : res.message || "Nothing new to summarize."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="border border-line bg-panel p-5">
        <p className="font-mono text-[10.5px] uppercase tracking-wide text-paper-dim">
          Weekly GitHub recap
        </p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-paper-dim">
          Connect your GitHub username and PostPilot will draft a "weekly
          progress" post every Sunday from your recent public commit
          activity. It always lands in Drafts for review — nothing
          auto-publishes.
        </p>

        <div className="mt-4 grid gap-4">
          <label className="grid gap-1.5">
            <span className="font-mono text-[10.5px] text-paper-dim">GitHub username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="octocat"
              className="focus-ring border border-line-bright bg-panel-raised px-3 py-2 text-[13px] text-paper"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="font-mono text-[10.5px] text-paper-dim">
              Personal access token (optional — raises GitHub's rate limit, needed for private repo activity)
            </span>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_…"
              className="focus-ring border border-line-bright bg-panel-raised px-3 py-2 text-[13px] text-paper"
            />
          </label>
        </div>

        {error && (
          <p className="mt-3 border border-signal-rust/40 bg-signal-rust/10 px-3 py-2 font-mono text-[11.5px] text-signal-rust">
            {error}
          </p>
        )}
        {saved && (
          <p className="mt-3 font-mono text-[11.5px] text-signal-green">Saved.</p>
        )}
        {recapResult && (
          <p className="mt-3 font-mono text-[11.5px] text-signal-blue">{recapResult}</p>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={save}
            disabled={busy || !username}
            className="focus-ring border border-amber bg-amber px-4 py-2 text-[12.5px] font-700 text-white disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={testRecap}
            disabled={busy || !user?.github?.connected}
            className="focus-ring border border-line px-4 py-2 text-[12.5px] font-600 text-paper-dim hover:text-paper disabled:opacity-40"
          >
            Generate recap now (test)
          </button>
        </div>
      </div>
    </div>
  );
}