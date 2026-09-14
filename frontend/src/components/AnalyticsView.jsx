import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function AnalyticsView() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .analyticsSummary()
      .then(setSummary)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-8">
        <p className="font-mono text-[12px] text-paper-dim">loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-8">
        <p className="border border-signal-rust/40 bg-signal-rust/10 px-3 py-2 font-mono text-[12px] text-signal-rust">
          {error}
        </p>
      </div>
    );
  }

  if (!summary.totalPosted) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-8">
        <p className="border border-dashed border-line px-4 py-6 text-center font-mono text-[12px] text-paper-dim">
          Nothing posted yet. Analytics fill in once you have posts live on LinkedIn.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatBlock label="Posts published" value={summary.totalPosted} />
        <StatBlock label="Total likes" value={summary.totalLikes} />
        <StatBlock label="Total comments" value={summary.totalComments} />
      </div>

      {summary.postsWithStats === 0 && (
        <p className="mb-6 border border-dashed border-line px-4 py-4 font-mono text-[11.5px] leading-relaxed text-paper-dim">
          No engagement stats recorded yet — open a post in Posted and use
          "fetch from LinkedIn" or "enter manually" to start tracking.
        </p>
      )}

      {summary.bestPost && (
        <div className="mb-6 border border-signal-green/40 bg-signal-green/5 p-4">
          <p className="font-mono text-[10.5px] uppercase tracking-wide text-signal-green">
            Best performing post
          </p>
          <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-paper">
            {summary.bestPost.generatedText.slice(0, 220)}
            {summary.bestPost.generatedText.length > 220 ? "…" : ""}
          </p>
          <p className="mt-2 font-mono text-[11px] text-paper-dim">
            ♥ {summary.bestPost.likes} · 💬 {summary.bestPost.comments}
          </p>
        </div>
      )}

      {summary.posts.length > 1 && (
        <div className="border border-line bg-panel p-4">
          <p className="mb-3 font-mono text-[10.5px] uppercase tracking-wide text-paper-dim">
            Likes per post, in order posted
          </p>
          <div className="flex items-end gap-1.5" style={{ height: "120px" }}>
            {summary.posts.map((p) => {
              const max = Math.max(...summary.posts.map((x) => x.likes), 1);
              const heightPct = Math.max((p.likes / max) * 100, 4);
              return (
                <div
                  key={p.id}
                  className="flex-1 bg-amber/70"
                  style={{ height: `${heightPct}%` }}
                  title={`${p.likes} likes`}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBlock({ label, value }) {
  return (
    <div className="border border-line bg-panel p-4">
      <p className="font-mono text-[10px] uppercase tracking-wide text-paper-dim">{label}</p>
      <p className="mt-1 font-display text-[22px] font-700 text-paper">{value}</p>
    </div>
  );
}
