export function ProjectsLoading() {
  return (
    <div className="flex min-h-dvh flex-col" aria-busy="true" aria-label="Loading projects">
      <div className="h-14 border-b border-[var(--studio-line)] bg-[var(--studio-bar)] sm:h-16" />
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="studio-skeleton h-[76px]" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="studio-skeleton h-[148px]" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="studio-skeleton h-[340px]" />
          ))}
        </div>
      </div>
    </div>
  );
}
