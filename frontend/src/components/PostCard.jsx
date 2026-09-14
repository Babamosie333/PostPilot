import { useState } from "react";
import { api } from "../lib/api";
import { TONE_OPTIONS } from "../lib/tones";

const STATUS_STYLE = {
  draft: { dot: "bg-paper-dim", label: "draft" },
  approved: { dot: "bg-signal-blue", label: "approved" },
  scheduled: { dot: "bg-amber", label: "scheduled" },
  posted: { dot: "bg-signal-green", label: "posted" },
  failed: { dot: "bg-signal-rust", label: "failed" },
};

function formatWhen(date) {
  if (!date) return null;
  return new Date(date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PostCard({ post, onChange }) {
  const [text, setText] = useState(post.generatedText);
  const [editing, setEditing] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [regenTone, setRegenTone] = useState(null); // null = picker closed
  const [statsEdit, setStatsEdit] = useState(false);
  const [likesInput, setLikesInput] = useState(post.likes ?? "");
  const [commentsInput, setCommentsInput] = useState(post.comments ?? "");
  const [statsNotice, setStatsNotice] = useState(null);

  const style = STATUS_STYLE[post.status] || STATUS_STYLE.draft;
  const imageUrls = (post.images || []).map((p) => api.imageUrl(p));
  const videoUrl = post.video ? api.imageUrl(post.video) : null;

  async function run(action) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function saveEdit() {
    run(async () => {
      const updated = await api.updatePost(post._id, { generatedText: text });
      onChange(updated);
      setEditing(false);
    });
  }

  function approve() {
    run(async () => {
      const updated = await api.updatePost(post._id, { status: "approved" });
      onChange(updated);
    });
  }

  function confirmSchedule() {
    if (!when) return;
    run(async () => {
      const updated = await api.schedulePost(
        post._id,
        new Date(when).toISOString()
      );
      onChange(updated);
      setScheduling(false);
    });
  }

  function postNow() {
    run(async () => {
      const updated = await api.postNow(post._id);
      onChange(updated);
    });
  }

  function remove() {
    run(async () => {
      await api.deletePost(post._id);
      onChange(null, post._id);
    });
  }

  function regenerate(tone) {
    run(async () => {
      const updated = await api.regeneratePost(post._id, tone);
      setText(updated.generatedText);
      onChange(updated);
      setRegenTone(null);
    });
  }

  async function refreshStats() {
    setBusy(true);
    setError(null);
    setStatsNotice(null);
    try {
      const updated = await api.refreshStats(post._id);
      onChange(updated);
      setLikesInput(updated.likes ?? "");
      setCommentsInput(updated.comments ?? "");
    } catch (err) {
      if (err.accessDenied) {
        setStatsNotice(err.message);
        setStatsEdit(true);
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  function saveStats() {
    run(async () => {
      const updated = await api.updatePost(post._id, {
        likes: likesInput === "" ? 0 : Number(likesInput),
        comments: commentsInput === "" ? 0 : Number(commentsInput),
      });
      onChange(updated);
      setStatsEdit(false);
      setStatsNotice(null);
    });
  }

  const canSchedule = post.status === "draft" || post.status === "approved";
  const canApprove = post.status === "draft";
  const canPostNow =
    post.status === "draft" ||
    post.status === "approved" ||
    post.status === "scheduled" ||
    post.status === "failed";
  const canRegenerate = post.status !== "posted";
  const hasStats = typeof post.likes === "number";

  return (
    <div className="border border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
          <span className="font-mono text-[10.5px] uppercase tracking-wide text-paper-dim">
            {style.label}
          </span>
          {post.topic && (
            <span className="font-mono text-[10.5px] text-paper-dim">
              · {post.topic}
            </span>
          )}
          {post.source === "github-recap" && (
            <span className="font-mono text-[10px] uppercase tracking-wide text-signal-blue">
              · gh recap
            </span>
          )}
        </div>
        <span className="font-mono text-[10.5px] text-paper-dim">
          {post.status === "scheduled" && post.scheduledFor
            ? `fires ${formatWhen(post.scheduledFor)}`
            : post.status === "posted"
            ? `sent ${formatWhen(post.postedAt)}`
            : formatWhen(post.createdAt)}
        </span>
      </div>

      <div className="flex gap-4 p-4">
        {videoUrl ? (
          <video
            src={videoUrl}
            controls
            className="h-24 w-32 shrink-0 border border-line bg-ink object-cover"
          />
        ) : (
          imageUrls.length > 0 && (
            <div className="flex shrink-0 flex-col gap-1.5">
              <div className="flex flex-wrap gap-1.5" style={{ maxWidth: "104px" }}>
                {imageUrls.slice(0, 4).map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    className="h-12 w-12 border border-line object-cover"
                  />
                ))}
              </div>
              {imageUrls.length > 4 && (
                <span className="font-mono text-[10px] text-paper-dim">
                  +{imageUrls.length - 4} more
                </span>
              )}
            </div>
          )
        )}
        <div className="min-w-0 flex-1">
          {post.linkUrl && (
            <a
              href={post.linkUrl}
              target="_blank"
              rel="noreferrer"
              className="mb-2 block truncate border border-signal-blue/30 bg-signal-blue/5 px-2.5 py-1.5 font-mono text-[11px] text-signal-blue hover:underline"
            >
              🔗 {post.linkTitle || post.linkUrl}
            </a>
          )}
          {editing ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              className="focus-ring w-full resize-none border border-line-bright bg-panel-raised px-3 py-2 text-[13px] leading-relaxed text-paper"
            />
          ) : (
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-paper-dim">
              {post.generatedText}
            </p>
          )}
        </div>
      </div>

      {post.status === "posted" && (
        <div className="border-t border-line px-4 py-2.5">
          {statsEdit ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min="0"
                value={likesInput}
                onChange={(e) => setLikesInput(e.target.value)}
                placeholder="Likes"
                className="focus-ring w-20 border border-line-bright bg-panel-raised px-2 py-1 font-mono text-[12px] text-paper"
              />
              <input
                type="number"
                min="0"
                value={commentsInput}
                onChange={(e) => setCommentsInput(e.target.value)}
                placeholder="Comments"
                className="focus-ring w-24 border border-line-bright bg-panel-raised px-2 py-1 font-mono text-[12px] text-paper"
              />
              <button
                onClick={saveStats}
                disabled={busy}
                className="focus-ring bg-amber px-3 py-1 text-[11.5px] font-700 text-ink disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => setStatsEdit(false)}
                className="focus-ring font-mono text-[11px] text-paper-dim hover:text-paper"
              >
                cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11.5px] text-paper-dim">
                {hasStats ? (
                  <>
                    ♥ {post.likes} · 💬 {post.comments}
                    {post.statsSource === "manual" && (
                      <span className="ml-1 text-[10px] text-paper-dim/70">(manual)</span>
                    )}
                  </>
                ) : (
                  "No engagement stats yet"
                )}
              </span>
              <button
                onClick={refreshStats}
                disabled={busy}
                className="focus-ring font-mono text-[11px] text-signal-blue hover:underline disabled:opacity-40"
              >
                {hasStats ? "refresh" : "fetch from LinkedIn"}
              </button>
              <button
                onClick={() => setStatsEdit(true)}
                className="focus-ring font-mono text-[11px] text-paper-dim hover:text-paper"
              >
                enter manually
              </button>
            </div>
          )}
          {statsNotice && (
            <p className="mt-2 font-mono text-[10.5px] leading-relaxed text-amber">
              {statsNotice}
            </p>
          )}
        </div>
      )}

      {post.status === "failed" && post.errorMessage && (
        <p className="border-t border-signal-rust/30 bg-signal-rust/5 px-4 py-2 font-mono text-[11px] text-signal-rust">
          {post.errorMessage}
        </p>
      )}

      {error && (
        <p className="border-t border-signal-rust/30 bg-signal-rust/5 px-4 py-2 font-mono text-[11px] text-signal-rust">
          {error}
        </p>
      )}

      {scheduling && (
        <div className="flex items-center gap-2 border-t border-line px-4 py-3">
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="focus-ring border border-line-bright bg-panel-raised px-2 py-1.5 font-mono text-[12px] text-paper"
          />
          <button
            onClick={confirmSchedule}
            disabled={!when || busy}
            className="focus-ring bg-amber px-3 py-1.5 text-[12px] font-700 text-ink disabled:opacity-50"
          >
            Confirm
          </button>
          <button
            onClick={() => setScheduling(false)}
            className="focus-ring font-mono text-[11px] text-paper-dim hover:text-paper"
          >
            cancel
          </button>
        </div>
      )}

      {regenTone !== null && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-4 py-3">
          {TONE_OPTIONS.map((t) => (
            <button
              key={t.value}
              onClick={() => regenerate(t.value)}
              disabled={busy}
              className="focus-ring border border-line px-2.5 py-1 text-[11px] font-600 text-paper-dim hover:border-amber-dim hover:text-amber disabled:opacity-40"
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={() => setRegenTone(null)}
            className="focus-ring font-mono text-[11px] text-paper-dim hover:text-paper"
          >
            cancel
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-2.5">
        {editing ? (
          <>
            <ActionButton primary onClick={saveEdit} disabled={busy}>
              Save
            </ActionButton>
            <ActionButton
              onClick={() => {
                setText(post.generatedText);
                setEditing(false);
              }}
            >
              Cancel
            </ActionButton>
          </>
        ) : (
          <>
            {post.status !== "posted" && (
              <ActionButton onClick={() => setEditing(true)} disabled={busy}>
                Edit
              </ActionButton>
            )}
            {canRegenerate && (
              <ActionButton
                onClick={() => setRegenTone(regenTone === null ? post.tone || "authentic" : null)}
                disabled={busy}
              >
                Regenerate
              </ActionButton>
            )}
            {canApprove && (
              <ActionButton onClick={approve} disabled={busy}>
                Approve
              </ActionButton>
            )}
            {canSchedule && (
              <ActionButton onClick={() => setScheduling(true)} disabled={busy}>
                Schedule
              </ActionButton>
            )}
            {canPostNow && (
              <ActionButton primary onClick={postNow} disabled={busy}>
                Post now
              </ActionButton>
            )}
            {post.status !== "posted" && (
              <ActionButton danger onClick={remove} disabled={busy}>
                Delete
              </ActionButton>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ActionButton({ children, onClick, disabled, primary, danger }) {
  const base =
    "focus-ring px-3 py-1.5 text-[11.5px] font-600 transition-colors disabled:opacity-40";
  const style = primary
    ? "bg-amber text-ink hover:opacity-90"
    : danger
    ? "border border-line text-signal-rust hover:border-signal-rust/50"
    : "border border-line text-paper-dim hover:text-paper hover:border-line-bright";
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${style}`}>
      {children}
    </button>
  );
}
