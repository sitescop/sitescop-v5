export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface px-4 py-4 lg:px-6">
      <div className="flex flex-col items-center justify-between gap-2 text-xs text-text-light sm:flex-row">
        <p>&copy; {new Date().getFullYear()} SiteScop Inspections. All rights reserved.</p>
        <p>
          SiteScop V5 &middot; Phase 3
        </p>
      </div>
    </footer>
  );
}
