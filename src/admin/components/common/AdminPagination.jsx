import React from "react";

export function AdminPagination({
  page = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 10,
  pageSizeOptions = [5, 10, 12, 20, 50, 100],
  itemLabel = "items",
  onPageChange,
  onPageSizeChange,
}) {
  const safeTotalPages = Math.max(1, totalPages);
  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
        <p>
          Showing <span className="font-bold text-slate-900">{startItem}-{endItem}</span> of{" "}
          <span className="font-bold text-slate-900">{totalItems}</span> {itemLabel}
        </p>

        {typeof onPageSizeChange === "function" && (
          <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
            <label htmlFor="admin-page-size-select" className="text-xs text-slate-500 font-semibold">
              Rows per page:
            </label>
            <select
              id="admin-page-size-select"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-100 focus:border-slate-900 focus:outline-none"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange && onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 shadow-2xs"
        >
          Previous
        </button>
        <span className="min-w-0 text-xs font-medium text-slate-600 px-1">
          Page <span className="font-bold text-slate-900">{page}</span> of{" "}
          <span className="font-bold text-slate-900">{safeTotalPages}</span>
        </span>
        <button
          type="button"
          onClick={() => onPageChange && onPageChange(page + 1)}
          disabled={page >= safeTotalPages}
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 shadow-2xs"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default AdminPagination;
