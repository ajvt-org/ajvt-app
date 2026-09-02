import { activityRow as texts } from "@/lib/texts";

function Bar({ height, width }: { height: number; width: string }) {
  return (
    <div style={{ height, width, background: "var(--mint-100)" }} className="rounded-lg shrink-0" />
  );
}

function HeaderSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Bar height={40} width="7rem" />
      <span className="flex-1" />
      <Bar height={40} width="7rem" />
    </div>
  );
}

function FiltersSkeleton() {
  return (
    <div className="space-y-1.5">
      <Bar height={37} width="100%" />
      <div className="flex gap-1.5">
        <Bar height={31} width="5rem" />
        <Bar height={31} width="4rem" />
        <Bar height={31} width="4.5rem" />
      </div>
      <div className="flex gap-1.5">
        <Bar height={31} width="3rem" />
        <Bar height={31} width="6rem" />
      </div>
    </div>
  );
}

export function WorkSkeleton() {
  return (
    <div className="card p-3 space-y-2">
      <Bar height={18} width="9rem" />
      <Bar height={44} width="100%" />
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="space-y-3">
      <Bar height={14} width="6rem" />
      <div className="space-y-2">
        {[0, 1, 2].map((n) => (
          <div key={n} className="card p-3 sm:p-4 flex items-center gap-3">
            <Bar height={52} width="3.25rem" />
            <div className="min-w-0 flex-1 space-y-2">
              <Bar height={15} width="70%" />
              <Bar height={12} width="45%" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ActivitiesSkeleton() {
  return (
    <div className="admin-page space-y-3 animate-pulse" role="status">
      <HeaderSkeleton />
      <WorkSkeleton />
      <FiltersSkeleton />
      <ListSkeleton />
      <span className="sr-only">{texts.loadingList}</span>
    </div>
  );
}
