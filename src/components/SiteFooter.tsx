export function SiteFooter() {
  return (
    <footer className="relative border-t border-border mt-32 py-12 px-6">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-muted-foreground">
        <div className="font-display">
          © {new Date().getFullYear()} Service-mit-Herz · AI Engineering
        </div>
        <div className="flex gap-6">
          <span>Crafted with intent.</span>
          <span className="text-gradient font-medium">Midnight Indigo</span>
        </div>
      </div>
    </footer>
  );
}
