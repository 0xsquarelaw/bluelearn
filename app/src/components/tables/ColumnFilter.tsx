import {
  ChoiceColumnFilter,
  DateColumnFilter,
  ColumnFilter as FilterPopover,
  SortRow,
} from "./ActivityColumnFilters";
import type { DashboardColumn, DashboardFilters } from "@/lib/dashboardFilters";
import { filterText } from "@/lib/dashboardFilters";
import { Input } from "@/components/ui/input";

export function ColumnFilter<T>({
  column,
  filters,
  onChange,
}: {
  column: DashboardColumn<T>;
  filters: DashboardFilters;
  onChange: (changes: DashboardFilters) => void;
}) {
  const { key, label, kind } = column;
  const direction =
    filters.sortBy === key ? filterText(filters.sortDirection) : "";
  const sort = direction === "asc" || direction === "desc" ? direction : null;
  const clearSort =
    filters.sortBy === key
      ? { sortBy: undefined, sortDirection: undefined }
      : {};
  const setSort = (next: "asc" | "desc" | null) =>
    onChange(next ? { sortBy: key, sortDirection: next } : clearSort);

  if (kind === "date") {
    return (
      <DateColumnFilter
        label={label}
        search={{
          from: filterText(filters[`${key}.from`]) || undefined,
          to: filterText(filters[`${key}.to`]) || undefined,
        }}
        setFilters={(next) =>
          onChange({ [`${key}.from`]: next.from, [`${key}.to`]: next.to })
        }
        sortControl={{
          direction: sort,
          onChange: setSort,
          onClear: () =>
            onChange({
              [`${key}.from`]: undefined,
              [`${key}.to`]: undefined,
              ...clearSort,
            }),
        }}
      />
    );
  }
  if (kind === "choice") {
    const selected = filters[key];
    return (
      <ChoiceColumnFilter
        label={label}
        field="subject"
        options={(column.options ?? []).map((value) => ({
          value,
          label: value,
        }))}
        search={{ subject: Array.isArray(selected) ? selected : [] }}
        setFilters={(next) => onChange({ [key]: next.subject })}
      />
    );
  }
  const value = filterText(filters[key]);
  return (
    <FilterPopover
      label={label}
      active={Boolean(value.trim()) || sort !== null}
      onClear={() => onChange({ [key]: undefined, ...clearSort })}
    >
      <Input
        type="search"
        aria-label={`Search ${label}`}
        value={value}
        onChange={(event) => onChange({ [key]: event.target.value })}
        placeholder={`Search ${label.toLowerCase()}...`}
        className="h-7"
      />
      <div className="flex flex-col">
        <SortRow
          ascending
          label="Sort A - Z"
          active={sort === "asc"}
          onClick={() => setSort(sort === "asc" ? null : "asc")}
        />
        <SortRow
          ascending={false}
          label="Sort Z - A"
          active={sort === "desc"}
          onClick={() => setSort(sort === "desc" ? null : "desc")}
        />
      </div>
    </FilterPopover>
  );
}
