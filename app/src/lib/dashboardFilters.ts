import { useState } from "react";

export type DashboardColumn<T> = {
  key: string;
  label: string;
  kind?: "text" | "choice" | "date";
  options?: ReadonlyArray<string>;
  value: (row: T) => string | Array<string> | null | undefined;
};

export type DashboardFilters = Record<
  string,
  string | Array<string> | undefined
>;

export function filterText(value: DashboardFilters[string]) {
  return typeof value === "string" ? value : "";
}

export function filterDashboardRows<T>(
  rows: Array<T>,
  columns: Array<DashboardColumn<T>>,
  filters: DashboardFilters
) {
  const filtered = rows.filter((row) =>
    columns.every((column) => {
      const value = column.value(row);
      if (column.kind === "date") {
        const from = filterText(filters[`${column.key}.from`]);
        const to = filterText(filters[`${column.key}.to`]);
        if (!from && !to) return true;
        const date = new Date(typeof value === "string" ? value : "");
        if (Number.isNaN(date.getTime())) return false;
        // Match the local calendar date shown in the table, including both ends.
        const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        return (!from || day >= from) && (!to || day <= to);
      }
      const values = Array.isArray(value) ? value : [value ?? ""];
      if (column.kind === "choice") {
        const selected = filters[column.key];
        return (
          !Array.isArray(selected) ||
          selected.length === 0 ||
          selected.some((choice) => values.includes(choice))
        );
      }
      const query = filterText(filters[column.key]);
      if (!query.trim()) return true;
      return values.some((text) =>
        text.toLowerCase().includes(query.trim().toLowerCase())
      );
    })
  );
  const column = columns.find((candidate) => candidate.key === filters.sortBy);
  if (
    !column ||
    (filters.sortDirection !== "asc" && filters.sortDirection !== "desc")
  )
    return filtered;
  const direction = filters.sortDirection === "asc" ? 1 : -1;
  return filtered.sort((left, right) => {
    const a = column.value(left);
    const b = column.value(right);
    if (column.kind === "date") {
      const aTime = new Date(typeof a === "string" ? a : "").getTime();
      const bTime = new Date(typeof b === "string" ? b : "").getTime();
      if (Number.isNaN(aTime)) return Number.isNaN(bTime) ? 0 : 1;
      if (Number.isNaN(bTime)) return -1;
      return (aTime - bTime) * direction;
    }
    return (
      String(a ?? "").localeCompare(String(b ?? ""), undefined, {
        sensitivity: "base",
      }) * direction
    );
  });
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
