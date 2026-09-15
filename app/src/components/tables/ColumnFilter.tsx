import { Filter } from "lucide-react";
import type { DashboardColumn, DashboardFilters } from "@/lib/dashboardFilters";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function ColumnFilter<T>({
  column,
  rows,
  filters,
  onChange,
}: {
  column: DashboardColumn<T>;
  rows: Array<T>;
  filters: DashboardFilters;
  onChange: (changes: DashboardFilters) => void;
}) {
  const { key, label, kind } = column;
  const value = filters[key] ?? "";
  const from = filters[`${key}.from`] ?? "";
  const to = filters[`${key}.to`] ?? "";
  const active = kind === "date" ? Boolean(from || to) : Boolean(value.trim());
  const choices =
    kind === "choice"
      ? [
          ...new Set(
            rows.flatMap((row) => {
              const cell = column.value(row);
              return Array.isArray(cell) ? cell : [cell ?? ""];
            })
          ),
        ]
          .filter(Boolean)
          .sort()
      : [];

  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={active ? "secondary" : "ghost"}
            size="icon-sm"
            aria-label={`Filter ${label}${active ? " (active)" : ""}`}
          >
            <Filter aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" aria-label={`Filter ${label}`}>
          {kind === "date" ? (
            <>
              <label className="flex flex-col gap-1">
                From
                <Input
                  type="date"
                  aria-label={`${label} from`}
                  value={from}
                  max={to || undefined}
                  onChange={(event) =>
                    onChange({ [`${key}.from`]: event.target.value })
                  }
                />
              </label>
              <label className="flex flex-col gap-1">
                To
                <Input
                  type="date"
                  aria-label={`${label} to`}
                  value={to}
                  min={from || undefined}
                  onChange={(event) =>
                    onChange({ [`${key}.to`]: event.target.value })
                  }
                />
              </label>
            </>
          ) : kind === "choice" ? (
            <div className="flex max-h-60 flex-col gap-2 overflow-y-auto">
              {choices.map((choice) => (
                <label key={choice} className="flex items-center gap-2">
                  <Checkbox
                    checked={value === choice}
                    onCheckedChange={(checked) =>
                      onChange({ [key]: checked ? choice : "" })
                    }
                  />
                  {choice}
                </label>
              ))}
            </div>
          ) : (
            <Input
              type="search"
              aria-label={`Search ${label}`}
              placeholder={`Search ${label.toLowerCase()}…`}
              value={value}
              onChange={(event) => onChange({ [key]: event.target.value })}
            />
          )}
          <Button
            type="button"
            variant="outline"
            disabled={!active}
            onClick={() =>
              onChange({ [key]: "", [`${key}.from`]: "", [`${key}.to`]: "" })
            }
          >
            Clear filter
          </Button>
        </PopoverContent>
      </Popover>
    </span>
  );
}
