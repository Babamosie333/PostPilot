import { useEffect, useState } from "react";
import { Clock, FileText, CheckCircle2, AlertTriangle } from "lucide-react";
import { api } from "../lib/api";

export default function DashboardView({ counts, onNavigate }) {
  const [summary, setSummary] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.analyticsSummary(), api.listPosts("scheduled")])
      .then(([s, scheduled]) => {
        setSummary(s);
        setUpcoming(
          scheduled
            .slice()
            .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor))
            .slice(0, 5)
        );
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QueueStat icon={FileText} label="Drafts" value={counts?.draft ?? 0} onClick={() => onNavigate("draft")} />
        <QueueStat icon={CheckCircle2} label="Approved" value={counts?.approved ?? 0} onClick={() => onNavigate("approved")} />
        <QueueStat icon={Clock} label="Scheduled" value={counts?.scheduled ?? 0} onClick={() => onNavigate("scheduled")} />
        <QueueStat icon={AlertTriangle} label="Failed" value={counts?.failed ?? 0} onClick={() => onNavigate("failed")} />
      </div>

      {loading ? (
        <p className="font-mono text-[12px] text-paper-dim">loading…</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-3 gap-3">
            <StatBlock label="Posts published" value={summary?.totalPosted ?? 0} />
            <StatBlock label="Total likes" value={summary?.totalLikes ?? 0} />
            <StatBlock label="Total comments" value={summary?.totalComments ?? 0} />
          </div>

          <div className="mb-6 border border-line bg-panel p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-[10.5px] uppercase tracking-wide text-paper-dim">
                Coming up
              </p>
              <button
                onClick={() => onNavigate("scheduled")}
                className="focus-ring font-mono text-[10.5px] text-amber hover:underline"
              >
                view all
              </button>
            </div>
            {upcoming.length === 0 ? (
              <p className="font-mono text-[12px] text-paper-dim">
                Nothing scheduled. Approve a draft and give it a time.
              </p>
            ) : (
              <div className="grid gap-2">
                {upcoming.map((post) => (
                  <div
                    key={post._id}
                    className="flex items-center justify-between border border-line bg-panel-raised px-3 py-2"
                  >
                    <p className="truncate text-[12.5px] text-paper">
                      {post.generatedText?.split("\n")[0]?.slice(0, 60)}
                    </p>
                    <span className="ml-3 shrink-0 font-mono text-[10.5px] text-paper-dim">
                      {new Date(post.scheduledFor).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {summary?.bestPost && (
            <div className="border border-signal-green/40 bg-signal-green/5 p-4">
              <p className="font-mono text-[10.5px] uppercase tracking-wide text-signal-green">
                Best performing post
              </p>
              <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-paper">
                {summary.bestPost.generatedText}
              </p>
              <p className="mt-2 font-mono text-[11px] text-paper-dim">
                ♥ {summary.bestPost.likes} · 💬 {summary.bestPost.comments}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function QueueStat({ icon: Icon, label, value, onClick }) {
  return (
    <button
      onClick={onClick}
      className="focus-ring flex flex-col items-start gap-2 border border-line bg-panel p-3.5 text-left transition-colors hover:border-line-bright"
    >
      <Icon className="h-4 w-4 text-paper-dim" strokeWidth={1.75} />
      <span className="font-display text-[20px] font-700 text-paper">{value}</span>
      <span className="font-mono text-[10.5px] uppercase tracking-wide text-paper-dim">
        {label}
      </span>
    </button>
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