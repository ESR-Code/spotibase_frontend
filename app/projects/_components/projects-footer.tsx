export function ProjectsFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--studio-line)] bg-[var(--studio-bg)]">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col items-center justify-between gap-2 px-4 py-4 text-xs font-semibold text-[var(--studio-muted)] sm:flex-row sm:px-6 lg:px-8">
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--studio-teal)] shadow-[0_0_8px_var(--studio-teal)]" />
          Spotibase Studio
        </span>
        <span className="text-[var(--studio-muted-2)]">© {new Date().getFullYear()} Spotibase. All rights reserved.</span>
      </div>
    </footer>
  );
}
