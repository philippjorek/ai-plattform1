import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="relative border-t border-border mt-32 py-12 px-6">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-muted-foreground">
        <div className="font-display">
          © {new Date().getFullYear()} iMPLI Informations-Systeme GmbH
        </div>
        <div className="flex items-center gap-6">
          <Link to="/impressum" className="hover:text-foreground transition-colors">
            Impressum
          </Link>
          <Link to="/datenschutz" className="hover:text-foreground transition-colors">
            Datenschutz
          </Link>
          <span>Developed with </span>
          <span className="text-gradient font-medium">human AI</span>
        </div>
      </div>
    </footer>
  );
}
