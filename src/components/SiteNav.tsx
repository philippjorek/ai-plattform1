import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const links = [
  { to: "/", label: "Home" },
  { to: "/architecture", label: "Architecture" },
  { to: "/projekte", label: "Projekte" },
  { to: "/kontakt", label: "Kontakt" },
] as const;

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "glass py-3" : "py-6 bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative h-8 w-8">
            <div className="absolute inset-0 rounded-md bg-gradient-to-br from-primary to-accent animate-pulse-glow" />
            <div className="absolute inset-[3px] rounded-[4px] bg-background flex items-center justify-center text-primary font-display font-bold">
              S
            </div>
          </div>
          <span className="font-display font-semibold tracking-tight">
            Service<span className="text-gradient">-mit-Herz</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="relative px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              activeProps={{ className: "text-foreground" }}
            >
              {({ isActive }) => (
                <>
                  <span>{l.label}</span>
                  {isActive && (
                    <span className="absolute left-3 right-3 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
                  )}
                </>
              )}
            </Link>
          ))}
        </nav>

        <button
          className="md:hidden h-10 w-10 grid place-items-center rounded-md border border-border"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          <span className="block w-5 h-px bg-foreground mb-1.5" />
          <span className="block w-5 h-px bg-foreground" />
        </button>
      </div>

      {open && (
        <div className="md:hidden glass mt-3 mx-6 rounded-lg p-2">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="block px-4 py-3 text-sm rounded-md hover:bg-secondary"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
