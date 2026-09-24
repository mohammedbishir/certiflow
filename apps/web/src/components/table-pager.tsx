"use client";

import { useMemo, useState } from "react";

const PAGE_SIZES = [10, 25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export function usePagedList<T>(items: T[]) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(25);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const { pageItems, from, to } = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return {
      pageItems: items.slice(start, start + pageSize),
      from: items.length === 0 ? 0 : start + 1,
      to: Math.min(start + pageSize, items.length),
      start,
    };
  }, [items, pageSize, safePage]);

  return {
    page: safePage,
    setPage,
    pageSize,
    setPageSize: (size: PageSize) => {
      setPageSize(size);
      setPage(1);
    },
    pageItems,
    totalPages,
    from,
    to,
    total: items.length,
    pageSizes: PAGE_SIZES,
    rowOffset: (safePage - 1) * pageSize,
  };
}

export function TablePager({
  from,
  to,
  total,
  page,
  totalPages,
  pageSize,
  pageSizes,
  onPageChange,
  onPageSizeChange,
}: {
  from: number;
  to: number;
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
  pageSizes: readonly number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm">
      <p className="text-muted">
        Showing <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-muted">
          Rows
          <select
            value={pageSize}
            onChange={(e) =>
              onPageSizeChange(Number(e.target.value) as PageSize)
            }
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-foreground outline-none"
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-full border border-border px-3 py-1.5 font-medium text-foreground hover:bg-surface-muted disabled:opacity-40"
        >
          Prev
        </button>
        <span className="min-w-[5.5rem] text-center text-muted">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-full border border-border px-3 py-1.5 font-medium text-foreground hover:bg-surface-muted disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
