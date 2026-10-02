// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardSearch } from "@/lib/dashboardFilters";
import {
  parseDashboardSearch,
  useDashboardSearch,
  usePageSelection,
} from "@/lib/dashboardFilters";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

// The route's URL, fed back to the hook the way TanStack Router does.
function renderSearch(initial: DashboardSearch) {
  const commit = vi.fn();
  const view = renderHook(({ search }) => useDashboardSearch(search, commit), {
    initialProps: { search: initial },
  });
  const land = (search: DashboardSearch) => view.rerender({ search });
  return { ...view, commit, land };
}

describe("useDashboardSearch", () => {
  it("sends edits to the URL once typing pauses", () => {
    const { result, commit } = renderSearch({});
    act(() => result.current.updateFilters({ username: "al" }));
    act(() => result.current.updateFilters({ username: "ali" }));
    expect(commit).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(300));
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith({ username: "ali" });
  });

  it("keeps typing that happens while its own commit lands", () => {
    const { result, commit, land } = renderSearch({});
    act(() => result.current.updateFilters({ username: "ab" }));
    act(() => vi.advanceTimersByTime(300));
    act(() => result.current.updateFilters({ username: "abc" }));
    land({ username: "ab" });
    expect(result.current.filters.username).toBe("abc");
    act(() => vi.advanceTimersByTime(300));
    expect(commit).toHaveBeenLastCalledWith({ username: "abc" });
  });

  it("shows the URL's filters after back or forward changes them", () => {
    const { result, commit, land } = renderSearch({ username: "ab" });
    land({ status: ["active"], page: 3 });
    expect(result.current.filters).toEqual({ status: ["active"] });
    act(() => vi.advanceTimersByTime(300));
    expect(commit).not.toHaveBeenCalled();
  });

  it("drops cleared filters from the URL", () => {
    const { result, commit } = renderSearch({ username: "ab", bio: "x" });
    act(() => result.current.updateFilters({ username: "", bio: undefined }));
    act(() => vi.advanceTimersByTime(300));
    expect(commit).toHaveBeenCalledWith({});
  });
});

describe("usePageSelection", () => {
  it("starts empty when a new page of rows arrives", () => {
    const first = { data: [] };
    const view = renderHook(({ page }) => usePageSelection(page), {
      initialProps: { page: first },
    });
    act(() => view.result.current[1](new Set(["alice"])));
    expect([...view.result.current[0]]).toEqual(["alice"]);
    view.rerender({ page: first });
    expect([...view.result.current[0]]).toEqual(["alice"]);
    view.rerender({ page: { data: [] } });
    expect(view.result.current[0].size).toBe(0);
  });
});

describe("parseDashboardSearch", () => {
  it("keeps filter text that looks like a number and only real pages", () => {
    expect(
      parseDashboardSearch({ username: 123, status: ["active"], page: 2 })
    ).toEqual({ username: "123", status: ["active"], page: 2 });
    expect(parseDashboardSearch({ page: 1 })).toEqual({});
    expect(parseDashboardSearch({ page: "x" })).toEqual({});
    expect(parseDashboardSearch({ page: 2.5 })).toEqual({});
  });
});
