export default function BannedScreen({ reason, onLogout }) {
  return (
    <div className="flex h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm border border-signal-rust/40 bg-panel p-6 text-center">
        <span className="mx-auto mb-3 block h-1.5 w-1.5 rounded-full bg-signal-rust" />
        <h1 className="font-display text-[17px] font-700 text-paper">Account banned</h1>
        <p className="mt-2 font-mono text-[12px] leading-relaxed text-paper-dim">
          {reason ? reason : "This account has lost access to PostPilot."}
        </p>
        <button
          onClick={onLogout}
          className="focus-ring mt-5 border border-line px-4 py-2 text-[12px] font-600 text-paper-dim hover:text-paper"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
