import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function AdminView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [reasonFor, setReasonFor] = useState(null);
  const [reason, setReason] = useState("");

  function load() {
    setLoading(true);
    api
      .adminListUsers()
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function confirmBan(id) {
    setBusyId(id);
    try {
      await api.adminBanUser(id, reason);
      setReasonFor(null);
      setReason("");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function unban(id) {
    setBusyId(id);
    try {
      await api.adminUnbanUser(id);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      {loading && <p className="font-mono text-[12px] text-paper-dim">loading…</p>}
      {error && (
        <p className="mb-4 border border-signal-rust/40 bg-signal-rust/10 px-3 py-2 font-mono text-[12px] text-signal-rust">
          {error}
        </p>
      )}

      <div className="grid gap-3">
        {users.map((u) => (
          <div key={u.id} className="border border-line bg-panel p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13.5px] font-600 text-paper">
                  {u.name || u.email}
                  {u.role === "admin" && (
                    <span className="ml-2 font-mono text-[10px] uppercase tracking-wide text-amber">
                      admin
                    </span>
                  )}
                </p>
                <p className="font-mono text-[11px] text-paper-dim">
                  {u.email} · {u.postCount} post{u.postCount === 1 ? "" : "s"} ·{" "}
                  {u.linkedinConnected ? "LinkedIn linked" : "not linked"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {u.isBanned ? (
                  <span className="font-mono text-[10.5px] uppercase tracking-wide text-signal-rust">
                    banned
                  </span>
                ) : null}
                {u.role !== "admin" &&
                  (u.isBanned ? (
                    <button
                      onClick={() => unban(u.id)}
                      disabled={busyId === u.id}
                      className="focus-ring border border-line px-3 py-1.5 text-[11.5px] font-600 text-signal-green hover:border-signal-green/50 disabled:opacity-40"
                    >
                      Unban
                    </button>
                  ) : (
                    <button
                      onClick={() => setReasonFor(u.id)}
                      disabled={busyId === u.id}
                      className="focus-ring border border-line px-3 py-1.5 text-[11.5px] font-600 text-signal-rust hover:border-signal-rust/50 disabled:opacity-40"
                    >
                      Ban
                    </button>
                  ))}
              </div>
            </div>

            {reasonFor === u.id && (
              <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason (optional)"
                  className="focus-ring flex-1 border border-line-bright bg-panel-raised px-3 py-1.5 text-[12px] text-paper"
                />
                <button
                  onClick={() => confirmBan(u.id)}
                  className="focus-ring bg-signal-rust px-3 py-1.5 text-[12px] font-700 text-ink"
                >
                  Confirm ban
                </button>
                <button
                  onClick={() => {
                    setReasonFor(null);
                    setReason("");
                  }}
                  className="focus-ring font-mono text-[11px] text-paper-dim hover:text-paper"
                >
                  cancel
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
