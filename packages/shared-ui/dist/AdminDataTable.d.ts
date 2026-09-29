import * as React from "react";
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
export type AdminDataTableSort = {
    id: string;
    dir: "asc" | "desc";
};
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
/**
 * Props-driven admin list table: sort, pagination, bulk select, empty + loading states.
 * No hardcoded product copy — pass empty/action labels from the page or labels registry.
 */
export declare function AdminDataTable<T>({ columns, rows, getRowId, sort: controlledSort, onSortChange, page, pageSize, pageSizeOptions, totalRows, onPageChange, onPageSizeChange, selectable, selectedIds, onSelectionChange, bulkActions, rowActions, loading, emptyTitle, emptyDescription, emptyActionLabel, onEmptyAction, emptyIcon, className, caption, }: AdminDataTableProps<T>): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=AdminDataTable.d.ts.map