export default function StatusBar({ status, onConnect, viewLabel }) {
  const connected = status?.connected;
  const loading = status === null;

  return (
    <header className="flex items-center justify-between border-b border-line bg-ink px-8 py-4">
      <div>
        <h1 className="font-display text-[19px] font-700 tracking-tight text-paper">
          {viewLabel}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {loading ? (
          <span className="font-mono text-[11px] text-paper-dim">
            checking link…
          </span>
        ) : connected ? (
          <div className="flex items-center gap-2 border border-line px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-signal-green" />
            <span className="font-mono text-[11px] text-paper-dim">
              linked · {status.memberId?.slice(0, 10)}…
            </span>
            <button
              onClick={onConnect}
              className="focus-ring font-mono text-[10.5px] text-paper-dim underline decoration-dotted hover:text-paper"
            >
              reconnect
            </button>
          </div>
        ) : (
          <button
            onClick={onConnect}
            className="focus-ring flex items-center gap-2 border border-amber-dim bg-panel px-3 py-1.5 text-[12px] font-600 text-amber transition-colors hover:bg-panel-raised"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-signal-rust" />
            Connect LinkedIn
          </button>
        )}
      </div>
    </header>
  );
}
