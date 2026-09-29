import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { EmptyState } from "./EmptyState";
import { Button } from "./Button";
import "./AdminDataTable.css";
function defaultCompare(a, b) {
    if (a == null && b == null)
        return 0;
    if (a == null)
        return -1;
    if (b == null)
        return 1;
    if (typeof a === "number" && typeof b === "number")
        return a - b;
    return String(a).localeCompare(String(b), undefined, { sensitivity: "base" });
}
function SkeletonRows({ cols, n }) {
    return (_jsx(_Fragment, { children: Array.from({ length: n }, (_, i) => (_jsx("tr", { className: "ceg-adt__skeleton-row", "aria-hidden": "true", children: Array.from({ length: cols }, (_, j) => (_jsx("td", { children: _jsx("span", { className: "ceg-adt__skeleton-bar" }) }, j))) }, `sk-${i}`))) }));
}
/**
 * Props-driven admin list table: sort, pagination, bulk select, empty + loading states.
 * No hardcoded product copy — pass empty/action labels from the page or labels registry.
 */
export function AdminDataTable({ columns, rows, getRowId, sort: controlledSort, onSortChange, page = 0, pageSize = 25, pageSizeOptions = [10, 25, 50, 100], totalRows, onPageChange, onPageSizeChange, selectable = false, selectedIds, onSelectionChange, bulkActions, rowActions, loading = false, emptyTitle, emptyDescription, emptyActionLabel, onEmptyAction, emptyIcon, className, caption, }) {
    const [localSort, setLocalSort] = React.useState(null);
    const sort = controlledSort !== undefined ? controlledSort : localSort;
    const setSort = onSortChange ?? setLocalSort;
    const selected = selectedIds ?? [];
    const setSelected = onSelectionChange;
    const sortedRows = React.useMemo(() => {
        if (!sort || onSortChange)
            return rows;
        const col = columns.find((c) => c.id === sort.id);
        if (!col)
            return rows;
        const copy = [...rows];
        copy.sort((ra, rb) => {
            const va = col.accessor ? col.accessor(ra) : ra[col.id];
            const vb = col.accessor ? col.accessor(rb) : rb[col.id];
            const cmp = defaultCompare(va, vb);
            return sort.dir === "asc" ? cmp : -cmp;
        });
        return copy;
    }, [rows, sort, columns, onSortChange]);
    const total = totalRows ?? sortedRows.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
    const safePage = Math.min(page, pageCount - 1);
    const paged = totalRows != null || onPageChange
        ? sortedRows
        : sortedRows.slice(safePage * pageSize, safePage * pageSize + pageSize);
    const pageIds = paged.map(getRowId);
    const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
    const somePageSelected = pageIds.some((id) => selected.includes(id));
    const toggleSort = (id) => {
        if (!sort || sort.id !== id) {
            setSort({ id, dir: "asc" });
            return;
        }
        if (sort.dir === "asc")
            setSort({ id, dir: "desc" });
        else
            setSort(null);
    };
    const toggleAllPage = () => {
        if (!setSelected)
            return;
        if (allPageSelected) {
            setSelected(selected.filter((id) => !pageIds.includes(id)));
        }
        else {
            setSelected(Array.from(new Set([...selected, ...pageIds])));
        }
    };
    const toggleOne = (id) => {
        if (!setSelected)
            return;
        setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
    };
    const colCount = columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0);
    const showEmpty = !loading && paged.length === 0;
    return (_jsxs("div", { className: ["ceg-adt", className].filter(Boolean).join(" "), children: [selectable && selected.length > 0 && bulkActions ? (_jsxs("div", { className: "ceg-adt__bulk", role: "region", "aria-label": "Bulk actions", children: [_jsxs("span", { className: "ceg-adt__bulk-count", children: [selected.length, " selected"] }), _jsx("div", { className: "ceg-adt__bulk-actions", children: bulkActions })] })) : null, _jsx("div", { className: "ceg-adt__scroll", children: _jsxs("table", { className: "ceg-adt__table", children: [caption ? _jsx("caption", { className: "ceg-adt__caption", children: caption }) : null, _jsx("thead", { children: _jsxs("tr", { children: [selectable ? (_jsx("th", { scope: "col", className: "ceg-adt__check", children: _jsx("input", { type: "checkbox", checked: allPageSelected, ref: (el) => {
                                                if (el)
                                                    el.indeterminate = somePageSelected && !allPageSelected;
                                            }, onChange: toggleAllPage, "aria-label": "Select all rows on this page", disabled: loading || pageIds.length === 0 }) })) : null, columns.map((col) => {
                                        const active = sort?.id === col.id;
                                        const ariaSort = !col.sortable
                                            ? undefined
                                            : active
                                                ? sort.dir === "asc"
                                                    ? "ascending"
                                                    : "descending"
                                                : "none";
                                        return (_jsx("th", { scope: "col", style: {
                                                width: col.width,
                                                textAlign: col.align ?? "left",
                                            }, "aria-sort": ariaSort, children: col.sortable ? (_jsxs("button", { type: "button", className: "ceg-adt__sort", onClick: () => toggleSort(col.id), children: [col.header, _jsx("span", { className: "ceg-adt__sort-ind", "aria-hidden": "true", children: active ? (sort.dir === "asc" ? " ▲" : " ▼") : "" })] })) : (col.header) }, col.id));
                                    }), rowActions ? (_jsx("th", { scope: "col", className: "ceg-adt__actions-h", children: "Actions" })) : null] }) }), _jsxs("tbody", { children: [loading ? _jsx(SkeletonRows, { cols: colCount, n: Math.min(pageSize, 8) }) : null, !loading
                                    ? paged.map((row, index) => {
                                        const id = getRowId(row);
                                        return (_jsxs("tr", { children: [selectable ? (_jsx("td", { className: "ceg-adt__check", children: _jsx("input", { type: "checkbox", checked: selected.includes(id), onChange: () => toggleOne(id), "aria-label": `Select row ${id}` }) })) : null, columns.map((col) => (_jsx("td", { style: { textAlign: col.align ?? "left" }, children: col.cell
                                                        ? col.cell(row, index)
                                                        : col.accessor
                                                            ? col.accessor(row)
                                                            : String(row[col.id] ?? "") }, col.id))), rowActions ? (_jsx("td", { className: "ceg-adt__actions", children: rowActions(row) })) : null] }, id));
                                    })
                                    : null] })] }) }), showEmpty ? (_jsx(EmptyState, { title: emptyTitle, description: emptyDescription, icon: emptyIcon, actionLabel: emptyActionLabel, onAction: onEmptyAction })) : null, !showEmpty || loading ? (_jsxs("div", { className: "ceg-adt__footer", children: [_jsxs("label", { className: "ceg-adt__page-size", children: ["Rows", _jsx("select", { value: pageSize, onChange: (e) => onPageSizeChange?.(Number(e.target.value)), disabled: !onPageSizeChange, children: pageSizeOptions.map((n) => (_jsx("option", { value: n, children: n }, n))) })] }), _jsx("span", { className: "ceg-adt__range", children: total === 0
                            ? "0"
                            : `${safePage * pageSize + 1}–${Math.min((safePage + 1) * pageSize, total)} of ${total}` }), _jsxs("div", { className: "ceg-adt__pager", children: [_jsx(Button, { size: "sm", variant: "ghost", disabled: safePage <= 0 || loading, onClick: () => onPageChange?.(safePage - 1), children: "Previous" }), _jsx(Button, { size: "sm", variant: "ghost", disabled: safePage >= pageCount - 1 || loading, onClick: () => onPageChange?.(safePage + 1), children: "Next" })] })] })) : null] }));
}
//# sourceMappingURL=AdminDataTable.js.map