import { useState } from "react";

export type DashboardColumn<T> = {
  key: string;
  label: string;
  kind?: "text" | "choice" | "date";
  value: (row: T) => string | Array<string> | null | undefined;
};

export type DashboardFilters = Record<string, string>;

export function filterDashboardRows<T>(
  rows: Array<T>,
  columns: Array<DashboardColumn<T>>,
  filters: DashboardFilters
) {
  return rows.filter((row) =>
    columns.every((column) => {
      const value = column.value(row);
      if (column.kind === "date") {
        const from = filters[`${column.key}.from`];
        const to = filters[`${column.key}.to`];
        if (!from && !to) return true;
        const date = new Date(typeof value === "string" ? value : "");
        if (Number.isNaN(date.getTime())) return false;
        // Match the local calendar date shown in the table, including both ends.
        const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        return (!from || day >= from) && (!to || day <= to);
      }
      const query = filters[column.key] ?? "";
      if (!query.trim()) return true;
      const values = Array.isArray(value) ? value : [value ?? ""];
      return column.kind === "choice"
        ? values.includes(query)
        : values.some((text) =>
            text.toLowerCase().includes(query.trim().toLowerCase())
          );
    })
  );
}

export function useDashboardFilters<T>(
  rows: Array<T>,
  columns: Array<DashboardColumn<T>>,
  selectedIds: Set<string>,
  setSelectedIds: (ids: Set<string>) => void,
  getKey: (row: T) => string
) {
  const [filters, setFilters] = useState<DashboardFilters>({});
  const visibleRows = filterDashboardRows(rows, columns, filters);

  function updateFilters(changes: DashboardFilters) {
    const nextFilters = { ...filters, ...changes };
    setFilters(nextFilters);
    const visibleIds = new Set(
      filterDashboardRows(rows, columns, nextFilters).map(getKey)
    );
    // Bulk dashboard actions must not include rows hidden by a new filter.
    setSelectedIds(
      new Set([...selectedIds].filter((id) => visibleIds.has(id)))
    );
  }

  return { filters, visibleRows, updateFilters };
}
