import Link from "next/link";

const QUICK_ACTIONS = [
  { href: "/train",   label: "Start Training",    desc: "Random preflop spots", accent: "#22c55e" },
  { href: "/ranges",  label: "View Ranges",       desc: "Browse GTO charts",    accent: "#3b82f6" },
  { href: "/solver",  label: "Postflop Solver",   desc: "Coming soon",          accent: "#f59e0b", disabled: true },
  { href: "/analyze", label: "Analyze a Hand",    desc: "GTO coaching + feedback", accent: "#8b5cf6" },
];

const STATS = [
  { label: "Hands Today",     value: "0" },
  { label: "Accuracy",        value: "—" },
  { label: "Study Streak",    value: "0 days" },
  { label: "EV Lost Today",   value: "—" },
];

export default function Dashboard() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Welcome back
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Ready to study? Pick up where you left off.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {STATS.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl p-4 border"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>{label}</p>
            <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <h2 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
        Quick Actions
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {QUICK_ACTIONS.map(({ href, label, desc, accent, disabled }) => (
          <Link
            key={href}
            href={disabled ? "#" : href}
            className={`rounded-xl p-5 border flex flex-col gap-1 transition-colors ${disabled ? "opacity-40 cursor-not-allowed" : "hover:border-gray-600"}`}
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: accent }} />
              <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                {label}
              </span>
              {disabled && (
                <span className="text-xs ml-auto px-2 py-0.5 rounded-full" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
                  Soon
                </span>
              )}
            </div>
            <p className="text-xs pl-4" style={{ color: "var(--text-secondary)" }}>{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
