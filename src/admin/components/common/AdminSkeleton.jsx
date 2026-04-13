import React from "react";
const joinClasses = (...classes) => classes.filter(Boolean).join(" ");
export function SkeletonBlock({ className = "" }) {
  return (
    <div
      className={joinClasses(
        "animate-pulse rounded-xl bg-linear-to-r from-gray-100 via-gray-200 to-gray-100 bg-size-[200%_100%]",
        className,
      )}
    />
  );
}
export function AdminStatsGridSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({
        length: count,
      }).map((_, index) => (
        <div
          key={`stats-skeleton-${index}`}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="mt-3 h-8 w-20" />
          <div className="mt-4 flex items-center justify-between">
            <SkeletonBlock className="h-3 w-28" />
            <SkeletonBlock className="h-10 w-10 rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
export function AdminCardGridSkeleton({
  count = 6,
  cardHeight = "h-40",
  columns = "md:grid-cols-2 xl:grid-cols-3",
}) {
  return (
    <div className={joinClasses("grid grid-cols-1 gap-6", columns)}>
      {Array.from({
        length: count,
      }).map((_, index) => (
        <div
          key={`card-skeleton-${index}`}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div
            className={joinClasses("flex flex-col justify-between", cardHeight)}
          >
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="w-full space-y-3">
                  <SkeletonBlock className="h-5 w-1/2" />
                  <SkeletonBlock className="h-4 w-2/3" />
                </div>
                <SkeletonBlock className="h-10 w-10 rounded-2xl" />
              </div>
              <div className="mt-5 space-y-2">
                <SkeletonBlock className="h-4 w-full" />
                <SkeletonBlock className="h-4 w-5/6" />
                <SkeletonBlock className="h-4 w-2/3" />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <SkeletonBlock className="h-10 flex-1 rounded-lg" />
              <SkeletonBlock className="h-10 w-24 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
export function AdminListSkeleton({ rows = 6 }) {
  return (
    <div className="space-y-4">
      {Array.from({
        length: rows,
      }).map((_, index) => (
        <div
          key={`list-skeleton-${index}`}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="w-full space-y-3">
              <SkeletonBlock className="h-5 w-48" />
              <SkeletonBlock className="h-4 w-72 max-w-full" />
              <div className="flex flex-wrap gap-2">
                <SkeletonBlock className="h-7 w-24 rounded-full" />
                <SkeletonBlock className="h-7 w-20 rounded-full" />
                <SkeletonBlock className="h-7 w-28 rounded-full" />
              </div>
            </div>
            <div className="flex w-full gap-3 lg:w-auto">
              <SkeletonBlock className="h-10 flex-1 rounded-lg lg:w-28" />
              <SkeletonBlock className="h-10 flex-1 rounded-lg lg:w-28" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
export function AdminFormSkeleton({ fields = 6 }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({
          length: fields,
        }).map((_, index) => (
          <div key={`form-skeleton-${index}`} className="space-y-2">
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="h-12 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <SkeletonBlock className="h-10 w-28 rounded-lg" />
        <SkeletonBlock className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  );
}
export function AdminPageSkeleton({
  stats = 4,
  filters = 3,
  cards = 6,
  cardHeight = "h-40",
  headerActions = 2,
  listRows = 0,
  columns,
}) {
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <SkeletonBlock className="h-8 w-56" />
          <SkeletonBlock className="h-4 w-80 max-w-full" />
        </div>
        {headerActions > 0 ? (
          <div className="flex flex-wrap gap-3">
            {Array.from({
              length: headerActions,
            }).map((_, index) => (
              <SkeletonBlock
                key={`header-action-${index}`}
                className="h-11 w-32 rounded-lg"
              />
            ))}
          </div>
        ) : null}
      </div>

      {stats > 0 ? <AdminStatsGridSkeleton count={stats} /> : null}

      {filters > 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({
              length: filters,
            }).map((_, index) => (
              <SkeletonBlock
                key={`filter-skeleton-${index}`}
                className="h-11 w-full rounded-lg"
              />
            ))}
          </div>
        </div>
      ) : null}

      {listRows > 0 ? (
        <AdminListSkeleton rows={listRows} />
      ) : (
        <AdminCardGridSkeleton
          count={cards}
          cardHeight={cardHeight}
          columns={columns}
        />
      )}
    </div>
  );
}
export default AdminPageSkeleton;
