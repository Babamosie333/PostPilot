import { Inbox } from "lucide-react";
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
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-8">
      {loading && (
        <div className="grid gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-skeleton border border-line bg-panel p-4">
              <div className="mb-3 h-3 w-24 bg-panel-raised" />
              <div className="mb-2 h-3 w-full bg-panel-raised" />
              <div className="h-3 w-2/3 bg-panel-raised" />
            </div>
          ))}
        </div>
      )}
      {error && (
        <p className="border border-signal-rust/40 bg-signal-rust/10 px-3 py-2 font-mono text-[12px] text-signal-rust">
          {error}
        </p>
      )}
      {!loading && !error && posts.length === 0 && (
        <div className="flex flex-col items-center gap-3 border border-dashed border-line px-4 py-10 text-center">
          <Inbox className="h-6 w-6 text-paper-dim" strokeWidth={1.5} />
          <p className="font-mono text-[12px] text-paper-dim">
            {EMPTY_COPY[status] || "Nothing here yet."}
          </p>
        </div>
      )}
      <div className="grid gap-4">
        {posts.map((post) => (
          <PostCard key={post._id} post={post} onChange={onChange} />
        ))}
      </div>
    </div>
  );
}