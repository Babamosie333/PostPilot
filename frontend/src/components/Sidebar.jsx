import {
  PenSquare,
  FileText,
  CheckCircle2,
  Clock,
  Send,
  AlertTriangle,
  BarChart3,
  Settings as SettingsIcon,
  ShieldCheck,
  Info,
} from "lucide-react";

const NAV_ITEMS = [
  { key: "compose", label: "Compose", hint: "New post", icon: PenSquare },
  { key: "draft", label: "Drafts", hint: "Awaiting review", icon: FileText },
  { key: "approved", label: "Approved", hint: "Ready to schedule", icon: CheckCircle2 },
  { key: "scheduled", label: "Scheduled", hint: "Queued to fire", icon: Clock },
  { key: "posted", label: "Posted", hint: "Live on LinkedIn", icon: Send },
  { key: "failed", label: "Failed", hint: "Needs attention", icon: AlertTriangle },
  { key: "analytics", label: "Analytics", hint: "How posts perform", icon: BarChart3, divider: true },
  { key: "settings", label: "Settings", hint: "GitHub recap", icon: SettingsIcon },
  { key: "about", label: "About", hint: "Contact the creator", icon: Info },
];

const ADMIN_ITEM = { key: "admin", label: "Admin", hint: "Manage users", icon: ShieldCheck, divider: true };

export default function Sidebar({ active, onSelect, counts, isAdmin, userEmail, onLogout, open, onClose }) {
  const items = isAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS;

  return (
    <>
      {/* Backdrop — only rendered/visible on mobile while the drawer is open */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/60 transition-opacity duration-200 md:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

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
            className="focus-ring font-mono text-[16px] text-paper-dim transition-colors hover:text-paper md:hidden"
          >
            ×
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {items.map((item) => {
            const isActive = active === item.key;
            const count = counts?.[item.key];
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => {
                  onSelect(item.key);
                  onClose?.();
                }}
                className={`focus-ring group relative flex w-full items-center justify-between border-l-2 px-5 py-3 text-left transition-all duration-150 ${
                  isActive
                    ? "border-amber bg-panel-raised text-paper"
                    : "border-transparent text-paper-dim hover:border-line-bright hover:bg-panel-raised/40 hover:text-paper"
                } ${item.divider ? "mt-2 border-t border-line" : ""}`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      isActive ? "text-amber" : "text-paper-dim group-hover:text-paper"
                    }`}
                    strokeWidth={1.75}
                  />
                  <span>
                    <span className="block text-[13.5px] font-600">{item.label}</span>
                    <span className="block font-mono text-[10.5px] text-paper-dim">
                      {item.hint}
                    </span>
                  </span>
                </span>
                {typeof count === "number" && count > 0 && (
                  <span
                    className={`font-mono text-[11px] transition-colors ${
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
                className="focus-ring shrink-0 font-mono text-[10.5px] text-paper-dim transition-colors hover:text-paper"
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