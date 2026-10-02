// @vitest-environment jsdom
import { useState } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AssignmentTable } from "@/lib/api/dashboard";
import type { DashboardColumn, DashboardFilters } from "@/lib/dashboardFilters";
import { dashboardQuery } from "@/lib/dashboardFilters";
import {
  AssignmentsTable,
  assignmentColumns,
} from "@/components/tables/AssignmentsTable";

const now = Date.parse("2026-09-16T12:00:00Z");
const at = (hours: number) => new Date(now + hours * 3600000).toISOString();
const justAfter = (hours: number) =>
  new Date(now + hours * 3600000 + 1).toISOString();

const columns: Array<DashboardColumn> = [
  { key: "time_left", label: "Time Left", kind: "duration" },
];
const range = (filters: DashboardFilters) => {
  const params = dashboardQuery(columns, filters, now);
  return [params.time_left_from, params.time_left_to];
};

describe("Time Left range boundaries", () => {
  it.each([
    ["expired", [undefined, at(0)]],
    ["under1", [at(0), at(1)]],
    ["1to4", [at(1), at(4)]],
    ["4to12", [at(4), at(12)]],
    ["12to24", [at(12), justAfter(24)]],
  ])(
    "sends %s as a range that does not overlap its neighbours",
    (mode, bounds) => {
      expect(range({ time_left: mode })).toEqual(bounds);
    }
  );
  it("sends no range for Any, so missing and far deadlines stay", () => {
    expect(range({})).toEqual([undefined, undefined]);
  });
  it.each([
    ["0.5", "4", [at(0.5), justAfter(4)]],
    ["4", "4", [at(4), justAfter(4)]],
    ["", "1", [at(0), justAfter(1)]],
    ["24", "", [at(24), undefined]],
    ["", "", [at(0), undefined]],
  ])(
    "sends custom range %s to %s with both ends included",
    (min, max, bounds) => {
      expect(
        range({
          time_left: "custom",
          "time_left.min": min,
          "time_left.max": max,
        })
      ).toEqual(bounds);
    }
  );
  it.each([
    ["4", "1"],
    ["-1", "4"],
    ["NaN", "4"],
    ["0", "Infinity"],
  ])("sends an empty range for invalid custom range %s to %s", (min, max) => {
    expect(
      range({ time_left: "custom", "time_left.min": min, "time_left.max": max })
    ).toEqual([at(0), at(0)]);
  });
});

const assignments: AssignmentTable = [
  {
    id: "alice",
    panel_id: "one",
    username: "alice",
    title: "Gravity",
    change_summary: "Explain mass",
    status: "assigned",
    user_status: "active",
    type: "guide_publish",
    time_left: at(0.5),
    date_created: at(-24),
    date_updated: at(-1),
  },
];
function Dashboard() {
  const [selectedIds, setSelectedIds] = useState(new Set<string>());
  const [filters, setFilters] = useState<DashboardFilters>({});
  return (
    <>
      <output aria-label="Query">
        {JSON.stringify(dashboardQuery(assignmentColumns, filters, now))}
      </output>
      <AssignmentsTable
        assignmentsData={assignments}
        filters={filters}
        onFiltersChange={(changes) =>
          setFilters((current) => ({ ...current, ...changes }))
        }
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
      />
    </>
  );
}
function query(): Record<string, string | Array<string>> {
  return JSON.parse(screen.getByLabelText("Query").textContent);
}
function openFilter() {
  fireEvent.click(screen.getByRole("button", { name: "Filter Time Left" }));
  return screen.getByRole("dialog", { name: "Filter Time Left" });
}
function closeFilter() {
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("shows every preset and drops the range when Any is selected", () => {
  render(<Dashboard />);
  const popup = openFilter();
  expect(within(popup).getAllByRole("radio")).toHaveLength(7);
  fireEvent.click(screen.getByRole("radio", { name: "< 1 hr" }));
  expect(query()).toMatchObject({ time_left_from: at(0), time_left_to: at(1) });
  fireEvent.click(screen.getByRole("radio", { name: "Any" }));
  expect(query()).not.toHaveProperty("time_left_from");
  expect(query()).not.toHaveProperty("time_left_to");
});

it("sends custom decimal hours, alerts on reversed bounds and clears the range", () => {
  render(<Dashboard />);
  openFilter();
  fireEvent.click(screen.getByRole("radio", { name: "Custom range" }));
  fireEvent.change(screen.getByRole("spinbutton", { name: "Minimum hours" }), {
    target: { value: "0.5" },
  });
  fireEvent.change(screen.getByRole("spinbutton", { name: "Maximum hours" }), {
    target: { value: "0.5" },
  });
  expect(query()).toMatchObject({
    time_left_from: at(0.5),
    time_left_to: justAfter(0.5),
  });
  fireEvent.change(screen.getByRole("spinbutton", { name: "Minimum hours" }), {
    target: { value: "2" },
  });
  expect(screen.getByRole("alert")).toBeDefined();
  expect(query()).toMatchObject({ time_left_from: at(0), time_left_to: at(0) });
  closeFilter();
  fireEvent.click(
    screen.getByRole("button", { name: "Clear Time Left filter" })
  );
  expect(query()).not.toHaveProperty("time_left_from");
  openFilter();
  fireEvent.click(screen.getByRole("radio", { name: "Custom range" }));
  expect(
    screen.getByRole("spinbutton", { name: "Minimum hours" })
  ).toHaveProperty("value", "");
});

it("combines Time Left with another column", () => {
  render(<Dashboard />);
  openFilter();
  fireEvent.click(screen.getByRole("radio", { name: "< 1 hr" }));
  closeFilter();
  fireEvent.click(screen.getByRole("button", { name: "Filter Title" }));
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "Algebra" },
  });
  expect(query()).toMatchObject({
    title: "Algebra",
    time_left_from: at(0),
    time_left_to: at(1),
  });
});
