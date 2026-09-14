const NAV_ITEMS = [
  { key: "compose", label: "Compose", hint: "New post" },
  { key: "draft", label: "Drafts", hint: "Awaiting review" },
  { key: "approved", label: "Approved", hint: "Ready to schedule" },
  { key: "scheduled", label: "Scheduled", hint: "Queued to fire" },
  { key: "posted", label: "Posted", hint: "Live on LinkedIn" },
  { key: "failed", label: "Failed", hint: "Needs attention" },
  { key: "analytics", label: "Analytics", hint: "How posts perform", divider: true },
  { key: "settings", label: "Settings", hint: "GitHub recap" },
];

const ADMIN_ITEM = { key: "admin", label: "Admin", hint: "Manage users", divider: true };

export default function Sidebar({ active, onSelect, counts, isAdmin, userEmail, onLogout, open, onClose }) {
  const items = isAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS;

  return (
    <>
      {/* Backdrop — only rendered/visible on mobile while the drawer is open */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-64 shrink-0 flex-col border-r border-line bg-panel transition-transform duration-200 md:static md:z-auto md:w-56 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-5">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber shadow-[0_0_8px_2px_rgba(242,169,59,0.55)]" />
            <span className="font-display text-[15px] font-700 tracking-tight text-paper">
              PostPilot
            </span>
          </div>
          <button
            onClick={onClose}
            className="focus-ring font-mono text-[16px] text-paper-dim hover:text-paper md:hidden"
          >
            ×
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {items.map((item) => {
            const isActive = active === item.key;
            const count = counts?.[item.key];
            return (
              <button
                key={item.key}
                onClick={() => {
                  onSelect(item.key);
                  onClose?.();
                }}
                className={`focus-ring group relative flex w-full items-center justify-between border-l-2 px-5 py-3 text-left transition-colors ${
                  isActive
                    ? "border-amber bg-panel-raised text-paper"
                    : "border-transparent text-paper-dim hover:border-line-bright hover:text-paper"
                } ${item.divider ? "mt-2 border-t border-line" : ""}`}
              >
                <span>
                  <span className="block text-[13.5px] font-600">{item.label}</span>
                  <span className="block font-mono text-[10.5px] text-paper-dim">
                    {item.hint}
                  </span>
                </span>
                {typeof count === "number" && count > 0 && (
                  <span
                    className={`font-mono text-[11px] ${
                      isActive ? "text-amber" : "text-paper-dim"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-line px-5 py-4">
          {userEmail && (
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="truncate font-mono text-[10.5px] text-paper-dim">{userEmail}</span>
              <button
                onClick={onLogout}
                className="focus-ring shrink-0 font-mono text-[10.5px] text-paper-dim hover:text-paper"
              >
                log out
              </button>
            </div>
          )}
          <p className="font-mono text-[10px] leading-relaxed text-paper-dim">
            Your own queue, your own LinkedIn. Nothing leaves the runway
            without a scheduled time.
          </p>
        </div>
      </aside>
    </>
  );
}