export default function StatusBar({ status, onConnect, viewLabel, onMenuClick }) {
  const connected = status?.connected;
  const loading = status === null;

  return (
    <header className="flex items-center justify-between gap-3 border-b border-line bg-ink px-4 py-4 sm:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="focus-ring flex h-8 w-8 shrink-0 flex-col items-center justify-center gap-1 border border-line md:hidden"
        >
          <span className="h-[1.5px] w-4 bg-paper-dim" />
          <span className="h-[1.5px] w-4 bg-paper-dim" />
          <span className="h-[1.5px] w-4 bg-paper-dim" />
        </button>
        <h1 className="truncate font-display text-[17px] font-700 tracking-tight text-paper sm:text-[19px]">
          {viewLabel}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {loading ? (
          <span className="font-mono text-[11px] text-paper-dim">
            checking link…
          </span>
        ) : connected ? (
          <div className="flex items-center gap-2 border border-line px-2.5 py-1.5 sm:px-3">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal-green" />
            <span className="hidden font-mono text-[11px] text-paper-dim sm:inline">
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
            className="focus-ring flex items-center gap-2 border border-amber-dim bg-panel px-2.5 py-1.5 text-[11.5px] font-600 text-amber transition-colors hover:bg-panel-raised sm:px-3 sm:text-[12px]"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal-rust" />
            <span className="hidden sm:inline">Connect LinkedIn</span>
            <span className="sm:hidden">Connect</span>
          </button>
        )}
      </div>
    </header>
  );
}