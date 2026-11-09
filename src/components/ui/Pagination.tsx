import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-theme-border bg-theme-surface px-4 py-3 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-md border border-theme-border bg-theme-bg px-4 py-2 text-sm font-medium text-theme-ink hover:bg-theme-surface-alt disabled:opacity-50 transition-colors"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center rounded-md border border-theme-border bg-theme-bg px-4 py-2 text-sm font-medium text-theme-ink hover:bg-theme-surface-alt disabled:opacity-50 transition-colors"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-theme-ink-dim">
            Showing <span className="font-medium text-theme-ink">{Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}</span> to <span className="font-medium text-theme-ink">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{' '}
            <span className="font-medium text-theme-ink">{totalItems}</span> results
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-theme-ink-dim hover:text-theme-ink hover:bg-theme-surface-alt focus:z-20 border border-theme-border bg-theme-bg disabled:opacity-50 transition-colors"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-theme-ink border-y border-theme-border bg-theme-surface-alt">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-theme-ink-dim hover:text-theme-ink hover:bg-theme-surface-alt focus:z-20 border border-theme-border bg-theme-bg disabled:opacity-50 transition-colors"
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
