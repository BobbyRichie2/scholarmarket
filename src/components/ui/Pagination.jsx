import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

export default function Pagination({ page, totalPages, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null;

  const pages = [];
  const siblingCount = 1;
  const left = Math.max(1, page - siblingCount);
  const right = Math.min(totalPages, page + siblingCount);

  if (page > 1) pages.push(1);
  for (let index = left; index <= right; index += 1) {
    if (index > 1 && index < totalPages) {
      pages.push(index);
    }
  }
  if (page < totalPages) pages.push(totalPages);

  const uniquePages = [...new Set(pages.filter((value) => Number.isInteger(value)))];
  const displayPages = [];
  for (let index = 0; index < uniquePages.length; index += 1) {
    const current = uniquePages[index];
    const previous = uniquePages[index - 1];
    if (previous !== undefined && current - previous > 1) {
      displayPages.push("...");
    }
    displayPages.push(current);
  }

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <FaChevronLeft size={12} />
        Previous
      </button>

      {displayPages.map((value, index) =>
        value === "..." ? (
          <span key={`ellipsis-${index}`} className="px-1 text-sm text-slate-400">
            …
          </span>
        ) : (
          <button
            key={`page-${value}`}
            type="button"
            onClick={() => onPageChange(value)}
            aria-label={`Page ${value}`}
            aria-current={value === page ? "page" : undefined}
            className={[
              "h-9 min-w-9 rounded-lg border text-sm font-medium transition",
              value === page
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            ].join(" ")}
          >
            {value}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
        <FaChevronRight size={12} />
      </button>
    </nav>
  );
}
