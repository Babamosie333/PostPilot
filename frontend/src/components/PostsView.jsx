import PostCard from "./PostCard";

const EMPTY_COPY = {
  draft: "No drafts waiting. Generate a post from Compose to start one.",
  approved: "Nothing approved yet. Approve a draft to move it here.",
  scheduled: "Nothing queued. Approve a draft and give it a time.",
  posted: "Nothing has gone out yet.",
  failed: "No failures — the queue is clean.",
};

export default function PostsView({ status, posts, loading, error, onChange }) {
  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      {loading && (
        <p className="font-mono text-[12px] text-paper-dim">loading…</p>
      )}
      {error && (
        <p className="border border-signal-rust/40 bg-signal-rust/10 px-3 py-2 font-mono text-[12px] text-signal-rust">
          {error}
        </p>
      )}
      {!loading && !error && posts.length === 0 && (
        <p className="border border-dashed border-line px-4 py-6 text-center font-mono text-[12px] text-paper-dim">
          {EMPTY_COPY[status] || "Nothing here yet."}
        </p>
      )}
      <div className="grid gap-4">
        {posts.map((post) => (
          <PostCard key={post._id} post={post} onChange={onChange} />
        ))}
      </div>
    </div>
  );
}
