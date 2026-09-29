import * as React from "react";
import { EmptyState } from "./EmptyState";
import { Button } from "./Button";
import "./AdminDataTable.css";

export type AdminDataTableColumn<T> = {
  id: string;
  header: React.ReactNode;
  /** Cell renderer. Prefer over `accessor` for custom cells. */
  cell?: (row: T, index: number) => React.ReactNode;
  accessor?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  width?: string | number;
};

export type AdminDataTableSort = { id: string; dir: "asc" | "desc" };

export type AdminDataTableProps<T> = {
  columns: AdminDataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  /** Controlled sort; omit for client-side sort on sortable columns. */
  sort?: AdminDataTableSort | null;
  onSortChange?: (next: AdminDataTableSort | null) => void;
  page?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  totalRows?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  bulkActions?: React.ReactNode;
  rowActions?: (row: T) => React.ReactNode;
  loading?: boolean;
  emptyTitle?: React.ReactNode;
  emptyDescription?: React.ReactNode;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  emptyIcon?: React.ReactNode;
  className?: string;
  caption?: string;
};

function defaultCompare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { sensitivity: "base" });
}

function SkeletonRows({ cols, n }: { cols: number; n: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <tr key={`sk-${i}`} className="ceg-adt__skeleton-row" aria-hidden="true">
          {Array.from({ length: cols }, (_, j) => (
            <td key={j}>
              <span className="ceg-adt__skeleton-bar" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * Props-driven admin list table: sort, pagination, bulk select, empty + loading states.
 * No hardcoded product copy — pass empty/action labels from the page or labels registry.
 */
export function AdminDataTable<T>({
  columns,
  rows,
  getRowId,
  sort: controlledSort,
  onSortChange,
  page = 0,
  pageSize = 25,
  pageSizeOptions = [10, 25, 50, 100],
  totalRows,
  onPageChange,
  onPageSizeChange,
  selectable = false,
  selectedIds,
  onSelectionChange,
  bulkActions,
  rowActions,
  loading = false,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  emptyIcon,
  className,
  caption,
}: AdminDataTableProps<T>) {
  const [localSort, setLocalSort] = React.useState<AdminDataTableSort | null>(null);
  const sort = controlledSort !== undefined ? controlledSort : localSort;
  const setSort = onSortChange ?? setLocalSort;

  const selected = selectedIds ?? [];
  const setSelected = onSelectionChange;

  const sortedRows = React.useMemo(() => {
    if (!sort || onSortChange) return rows;
    const col = columns.find((c) => c.id === sort.id);
    if (!col) return rows;
    const copy = [...rows];
    copy.sort((ra, rb) => {
      const va = col.accessor ? col.accessor(ra) : (ra as Record<string, unknown>)[col.id];
      const vb = col.accessor ? col.accessor(rb) : (rb as Record<string, unknown>)[col.id];
      const cmp = defaultCompare(va, vb);
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sort, columns, onSortChange]);

  const total = totalRows ?? sortedRows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(page, pageCount - 1);
  const paged =
    totalRows != null || onPageChange
      ? sortedRows
      : sortedRows.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const pageIds = paged.map(getRowId);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const somePageSelected = pageIds.some((id) => selected.includes(id));

  const toggleSort = (id: string) => {
    if (!sort || sort.id !== id) {
      setSort({ id, dir: "asc" });
      return;
    }
    if (sort.dir === "asc") setSort({ id, dir: "desc" });
    else setSort(null);
  };

  const toggleAllPage = () => {
    if (!setSelected) return;
    if (allPageSelected) {
      setSelected(selected.filter((id) => !pageIds.includes(id)));
    } else {
      setSelected(Array.from(new Set([...selected, ...pageIds])));
    }
  };

  const toggleOne = (id: string) => {
    if (!setSelected) return;
    setSelected(
      selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id],
    );
  };

  const colCount = columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0);
  const showEmpty = !loading && paged.length === 0;

  return (
    <div className={["ceg-adt", className].filter(Boolean).join(" ")}>
      {selectable && selected.length > 0 && bulkActions ? (
        <div className="ceg-adt__bulk" role="region" aria-label="Bulk actions">
          <span className="ceg-adt__bulk-count">{selected.length} selected</span>
          <div className="ceg-adt__bulk-actions">{bulkActions}</div>
        </div>
      ) : null}

      <div className="ceg-adt__scroll">
        <table className="ceg-adt__table">
          {caption ? <caption className="ceg-adt__caption">{caption}</caption> : null}
          <thead>
            <tr>
              {selectable ? (
                <th scope="col" className="ceg-adt__check">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = somePageSelected && !allPageSelected;
                    }}
                    onChange={toggleAllPage}
                    aria-label="Select all rows on this page"
                    disabled={loading || pageIds.length === 0}
                  />
                </th>
              ) : null}
              {columns.map((col) => {
                const active = sort?.id === col.id;
                const ariaSort = !col.sortable
                  ? undefined
                  : active
                    ? sort!.dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none";
                return (
                  <th
                    key={col.id}
                    scope="col"
                    style={{
                      width: col.width,
                      textAlign: col.align ?? "left",
                    }}
                    aria-sort={ariaSort}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        className="ceg-adt__sort"
                        onClick={() => toggleSort(col.id)}
                      >
                        {col.header}
                        <span className="ceg-adt__sort-ind" aria-hidden="true">
                          {active ? (sort!.dir === "asc" ? " ▲" : " ▼") : ""}
                        </span>
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
              {rowActions ? (
                <th scope="col" className="ceg-adt__actions-h">
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {loading ? <SkeletonRows cols={colCount} n={Math.min(pageSize, 8)} /> : null}
            {!loading
              ? paged.map((row, index) => {
                  const id = getRowId(row);
                  return (
                    <tr key={id}>
                      {selectable ? (
                        <td className="ceg-adt__check">
                          <input
                            type="checkbox"
                            checked={selected.includes(id)}
                            onChange={() => toggleOne(id)}
                            aria-label={`Select row ${id}`}
                          />
                        </td>
                      ) : null}
                      {columns.map((col) => (
                        <td
                          key={col.id}
                          style={{ textAlign: col.align ?? "left" }}
                        >
                          {col.cell
                            ? col.cell(row, index)
                            : col.accessor
                              ? col.accessor(row)
                              : String((row as Record<string, unknown>)[col.id] ?? "")}
                        </td>
                      ))}
                      {rowActions ? (
                        <td className="ceg-adt__actions">{rowActions(row)}</td>
                      ) : null}
                    </tr>
                  );
                })
              : null}
          </tbody>
        </table>
      </div>

      {showEmpty ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          icon={emptyIcon}
          actionLabel={emptyActionLabel}
          onAction={onEmptyAction}
        />
      ) : null}

      {!showEmpty || loading ? (
        <div className="ceg-adt__footer">
          <label className="ceg-adt__page-size">
            Rows
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              disabled={!onPageSizeChange}
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <span className="ceg-adt__range">
            {total === 0
              ? "0"
              : `${safePage * pageSize + 1}–${Math.min((safePage + 1) * pageSize, total)} of ${total}`}
          </span>
          <div className="ceg-adt__pager">
            <Button
              size="sm"
              variant="ghost"
              disabled={safePage <= 0 || loading}
              onClick={() => onPageChange?.(safePage - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={safePage >= pageCount - 1 || loading}
              onClick={() => onPageChange?.(safePage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
