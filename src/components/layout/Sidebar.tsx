"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const NAV = [
  { href: "/",            label: "Dashboard",     icon: "⬛" },
  { href: "/ranges",      label: "Range Viewer",  icon: "◼" },
  { href: "/train",       label: "Train",         icon: "▶" },
  { href: "/solver",      label: "Solver",        icon: "⚡" },
  { href: "/analyze",     label: "Hand Analyzer", icon: "🔍" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-56 flex flex-col border-r z-10"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold" style={{ color: "var(--accent-green)" }}>♠</span>
          <span className="font-bold text-sm tracking-wide" style={{ color: "var(--text-primary)" }}>
            GTO Platform
          </span>
        </div>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
          Beta
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "text-white"
                  : "hover:text-white"
              )}
              style={{
                background: active ? "var(--surface-2)" : "transparent",
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t text-xs" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
        MVP v0.1
      </div>
    </aside>
  );
}
