import { useEffect, useState } from "react";
import { api } from "../lib/api";

const MIN_POSTS_FOR_TIMING = 3;

function computeBestHour(postedWithStats) {
  if (postedWithStats.length < MIN_POSTS_FOR_TIMING) return null;
  const byHour = {};
  for (const p of postedWithStats) {
    const hour = new Date(p.postedAt).getHours();
    byHour[hour] = byHour[hour] || { totalLikes: 0, count: 0 };
    byHour[hour].totalLikes += p.likes || 0;
    byHour[hour].count += 1;
  }
  let best = null;
  for (const [hour, data] of Object.entries(byHour)) {
    const avg = data.totalLikes / data.count;
    if (!best || avg > best.avg) best = { hour: Number(hour), avg };
  }
  return best;
}

function formatHour(hour) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric" });
}

export default function AnalyticsView() {
  const [summary, setSummary] = useState(null);
  const [postedFull, setPostedFull] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.analyticsSummary(), api.listPosts("posted")])
      .then(([s, posted]) => {
        setSummary(s);
        setPostedFull(posted);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
        <p className="font-mono text-[12px] text-paper-dim">loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
        <p className="border border-signal-rust/40 bg-signal-rust/10 px-3 py-2 font-mono text-[12px] text-signal-rust">
          {error}
        </p>
      </div>
    );
  }

  if (!summary.totalPosted) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
        <p className="border border-dashed border-line px-4 py-6 text-center font-mono text-[12px] text-paper-dim">
          Nothing posted yet. Analytics fill in once you have posts live on LinkedIn.
        </p>
      </div>
    );
  }

  const postedWithStats = postedFull.filter((p) => typeof p.likes === "number");
  const bestHour = computeBestHour(postedWithStats);
  const totalEngagement = summary.totalLikes + summary.totalComments;
  const likesPct = totalEngagement > 0 ? Math.round((summary.totalLikes / totalEngagement) * 100) : 0;
  const commentsPct = 100 - likesPct;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
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
        <div className="mb-6 border border-line bg-panel p-4">
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

      {totalEngagement > 0 && (
        <div className="mb-6 border border-line bg-panel p-4">
          <p className="mb-3 font-mono text-[10.5px] uppercase tracking-wide text-paper-dim">
            Likes vs comments
          </p>
          <div className="flex h-3 w-full overflow-hidden border border-line">
            <div className="bg-amber" style={{ width: `${likesPct}%` }} />
            <div className="bg-signal-blue" style={{ width: `${commentsPct}%` }} />
          </div>
          <div className="mt-2 flex gap-4 font-mono text-[11px] text-paper-dim">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 bg-amber" /> Likes {likesPct}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 bg-signal-blue" /> Comments {commentsPct}%
            </span>
          </div>
        </div>
      )}

      <div className="border border-line bg-panel p-4">
        <p className="mb-2 font-mono text-[10.5px] uppercase tracking-wide text-paper-dim">
          Best time to post
        </p>
        {bestHour ? (
          <>
            <p className="font-display text-[18px] font-700 text-paper">
              Around {formatHour(bestHour.hour)}
            </p>
            <p className="mt-1 font-mono text-[11px] text-paper-dim">
              Based on {postedWithStats.length} of your own posts with recorded
              stats — the hour with your highest average likes so far.
            </p>
          </>
        ) : (
          <p className="font-mono text-[11.5px] leading-relaxed text-paper-dim">
            Not enough data yet — this needs at least {MIN_POSTS_FOR_TIMING} posted
            posts with recorded likes to compute a real pattern from your own
            history. Nothing here is guessed or generic advice.
          </p>
        )}
      </div>
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