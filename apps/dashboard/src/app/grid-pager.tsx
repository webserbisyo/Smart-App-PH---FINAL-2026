import { gridWords as W } from '@smartapp/core';
import { DataGridPagination } from '@smartapp/ui/components/reui/data-grid/data-grid-pagination';

// Long tables page through 25 rows at a time (T83): before this the grid quietly showed its first 10.
export const GRID_PAGE_SIZE = 25;
const SIZES = [10, 25, 50, 100];
// A grid that loads more with its own Show more button shows every loaded row on one page.
export const GRID_ALL_ROWS = 100_000;

/** Our words for the Data Grid's pager, passed as the grid's `i18n`. */
export const GRID_I18N = {
  labels: {
    rowsPerPage: W.rowsPerPage,
    paginationInfo: ({ from, to, count }: { from: number; to: number; count: number }) =>
      W.info(from, to, count),
    previousPage: W.previous,
    nextPage: W.next,
    goToPage: W.page,
    paginationEllipsis: W.more,
  },
};

/** The pager under a grid, only when there is more than the smallest page. */
export function GridPager({ count }: { count: number }) {
  if (count <= (SIZES[0] ?? 10)) return null;
  return <DataGridPagination sizes={SIZES} className="border-t border-border px-3 py-2" />;
}
