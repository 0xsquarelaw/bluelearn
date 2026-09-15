// @vitest-environment jsdom
import { useState } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type {
  AssignmentTable,
  DashboardRoleRow,
  MemberRow,
} from "@/lib/api/dashboard";
import { MembersTable } from "@/components/tables/MembersTable";
import { RolesTable } from "@/components/tables/RolesTable";
import { AssignmentsTable } from "@/components/tables/AssignmentsTable";

const members: Array<MemberRow> = [
  {
    id: "alice",
    username: "alice",
    display_name: "Alice Smith",
    bio: "Physics",
    status: "active",
    date_created: "2026-09-01T12:00:00",
    date_updated: "2026-09-15T12:00:00",
  },
  {
    id: "bob",
    username: "bob",
    display_name: null,
    bio: null,
    status: "inactive",
    date_created: "2026-09-10T12:00:00",
    date_updated: "2026-09-15T12:00:00",
  },
];
const roles: DashboardRoleRow = members.map((member, index) => ({
  ...member,
  roles: index ? [] : ["verifier", "moderator"],
}));
const assignments: AssignmentTable = [
  {
    id: "alice",
    panel_id: "one",
    username: "alice",
    title: "Gravity",
    change_summary: "Explain mass",
    status: "assigned",
    user_status: "active",
    type: "guide",
    time_left: null,
    date_created: "2026-09-01T12:00:00",
    date_updated: "2026-09-15T12:00:00",
  },
  {
    id: "alice",
    panel_id: "two",
    username: "alice",
    title: "Algebra",
    change_summary: "Add examples",
    status: "completed",
    user_status: "active",
    type: "guide_revision",
    time_left: "2026-09-10T12:00:00",
    date_created: "2026-09-10T12:00:00",
    date_updated: "2026-09-15T12:00:00",
  },
];

function Dashboard({
  table,
  empty = false,
}: {
  table: "members" | "roles" | "assignments";
  empty?: boolean;
}) {
  const [selectedIds, setSelectedIds] = useState(new Set<string>());
  const props = { selectedIds, setSelectedIds };
  return (
    <>
      <output aria-label="Selected rows">
        {[...selectedIds].sort().join(",")}
      </output>
      {table === "members" ? (
        <MembersTable MemberData={empty ? [] : members} {...props} />
      ) : table === "roles" ? (
        <RolesTable roleData={empty ? [] : roles} {...props} />
      ) : (
        <AssignmentsTable
          assignmentsData={empty ? [] : assignments}
          {...props}
        />
      )}
    </>
  );
}

function openFilter(label: string) {
  fireEvent.click(screen.getByRole("button", { name: `Filter ${label}` }));
  return screen.getByRole("dialog", { name: `Filter ${label}` });
}
function closeFilter() {
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
}
afterEach(cleanup);

it("searches members case-insensitively and clears hidden bulk selections", () => {
  render(<Dashboard table="members" />);
  fireEvent.click(screen.getByRole("checkbox", { name: "Select all users" }));
  expect(screen.getByLabelText("Selected rows").textContent).toBe("alice,bob");
  const popup = openFilter("Display Name");
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "  SMITH " },
  });
  expect(screen.getByLabelText("Selected rows").textContent).toBe("alice");
  expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
  fireEvent.click(within(popup).getByRole("button", { name: "Clear filter" }));
  expect(document.querySelectorAll("tbody tr")).toHaveLength(2);
  expect(screen.getByLabelText("Selected rows").textContent).toBe("alice");
});

it("combines member text and status filters with an empty state", () => {
  render(<Dashboard table="members" />);
  openFilter("Username");
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "alice" },
  });
  closeFilter();
  const popup = openFilter("Status");
  fireEvent.click(within(popup).getByRole("checkbox", { name: "inactive" }));
  expect(screen.getByText("No matching members.")).toBeDefined();
  fireEvent.click(within(popup).getByRole("button", { name: "Clear filter" }));
  expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
});

it("searches the displayed username when display name is missing", () => {
  render(<Dashboard table="members" />);
  openFilter("Display Name");
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "bob" } });
  expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
  expect(document.querySelector("tbody")?.textContent).toContain("bob");
});

it("filters dates inclusively and clears both bounds", () => {
  render(<Dashboard table="members" />);
  const popup = openFilter("Date Created");
  fireEvent.change(screen.getByLabelText("Date Created from"), {
    target: { value: "2026-09-10" },
  });
  fireEvent.change(screen.getByLabelText("Date Created to"), {
    target: { value: "2026-09-10" },
  });
  expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
  expect(document.querySelector("tbody")?.textContent).toContain("bob");
  fireEvent.click(within(popup).getByRole("button", { name: "Clear filter" }));
  expect(document.querySelectorAll("tbody tr")).toHaveLength(2);
});

it("matches individual roles and selects or deselects only visible users", () => {
  render(<Dashboard table="roles" />);
  openFilter("Roles");
  fireEvent.click(screen.getByRole("checkbox", { name: "moderator" }));
  closeFilter();
  expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
  fireEvent.click(screen.getByRole("checkbox", { name: "Select all users" }));
  expect(screen.getByLabelText("Selected rows").textContent).toBe("alice");
  fireEvent.click(screen.getByRole("checkbox", { name: "Select all users" }));
  expect(screen.getByLabelText("Selected rows").textContent).toBe("");
});

it("can filter users without roles", () => {
  render(<Dashboard table="roles" />);
  openFilter("Roles");
  fireEvent.click(screen.getByRole("checkbox", { name: "No roles" }));
  expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
  expect(document.querySelector("tbody")?.textContent).toContain("bob");
});

it("searches guide titles without conflating assignments for the same user", () => {
  render(<Dashboard table="assignments" />);
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Select all assignments" })
  );
  openFilter("Title");
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "GRAV" },
  });
  closeFilter();
  expect(screen.getByLabelText("Selected rows").textContent).toBe("alice:one");
  expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Select all assignments" })
  );
  expect(screen.getByLabelText("Selected rows").textContent).toBe("");
});

it("combines assignment type and status filters", () => {
  render(<Dashboard table="assignments" />);
  openFilter("Type");
  fireEvent.click(screen.getByRole("checkbox", { name: "guide_revision" }));
  closeFilter();
  openFilter("Status");
  fireEvent.click(screen.getByRole("checkbox", { name: "assigned" }));
  expect(screen.getByText("No matching assignments.")).toBeDefined();
});

describe.each(["members", "roles", "assignments"] as const)(
  "%s table",
  (table) => {
    it("keeps every data column filterable", () => {
      render(<Dashboard table={table} />);
      expect(screen.getAllByRole("button", { name: /^Filter / })).toHaveLength(
        table === "members" ? 6 : table === "roles" ? 5 : 9
      );
    });
    it("handles an empty dataset without selecting any rows", () => {
      render(<Dashboard table={table} empty />);
      expect(screen.getByText(/^No matching/)).toBeDefined();
      fireEvent.click(screen.getByRole("checkbox", { name: /^Select all/ }));
      expect(screen.getByLabelText("Selected rows").textContent).toBe("");
    });
  }
);
