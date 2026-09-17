// @vitest-environment jsdom
import { render, renderHook, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type * as ReactType from "react";
import type { Walkthrough } from "@bluelearn/schemas";
import type { GraphNodeData } from "@/lib/useGraphLayout";
import { GuideGraphNode } from "@/components/graph/GuideGraphNode";
import { useGraphLayout } from "@/lib/useGraphLayout";

vi.mock("@xyflow/react", async () => {
  const React = await vi.importActual<typeof ReactType>("react");

  const useCollectionState = <TItem,>(initialValue: Array<TItem>) => {
    const [items, setItems] = React.useState(initialValue);
    return [items, setItems, vi.fn()] as const;
  };

  return {
    Handle: ({
      type,
      position,
      className,
    }: {
      type: string;
      position: string;
      className?: string;
    }) =>
      React.createElement("div", {
        "data-testid": `${type}-handle`,
        "data-position": position,
        className,
      }),
    MarkerType: { ArrowClosed: "arrow-closed" },
    Position: { Bottom: "bottom", Top: "top" },
    useEdgesState: useCollectionState,
    useNodesState: useCollectionState,
  };
});

const walkthroughData: Walkthrough = {
  nodes: [
    {
      id: "prerequisite-id",
      slug: "prerequisite",
      title: "Prerequisite",
      level: 1,
      summary: null,
      duration_minutes: 10,
      tags: [],
    },
    {
      id: "target-id",
      slug: "target",
      title: "Target",
      level: 2,
      summary: null,
      duration_minutes: 10,
      tags: [],
    },
    {
      id: "follow-up-id",
      slug: "follow-up",
      title: "Follow-up",
      level: 3,
      summary: null,
      duration_minutes: 10,
      tags: [],
    },
  ],
  edges: [
    { from_id: "prerequisite-id", to_id: "target-id" },
    { from_id: "target-id", to_id: "follow-up-id" },
  ],
};

describe("walkthrough graph direction", () => {
  it("places prerequisites below the target and follow-ups above it", async () => {
    const { result } = renderHook(() =>
      useGraphLayout({
        walkthroughData,
        targetSlug: "target",
        hoveredGuide: null,
        nodeType: "walkthroughNode",
        nodeWidth: 320,
        nodeSpacing: 560,
      })
    );

    await waitFor(() => expect(result.current.nodes).toHaveLength(3));

    const positions = new Map(
      result.current.nodes.map((node) => [node.id, node.position.y])
    );
    expect(positions.get("prerequisite")).toBeGreaterThan(
      positions.get("target")!
    );
    expect(positions.get("target")).toBeGreaterThan(
      positions.get("follow-up")!
    );
  });

  it("connects edges through the facing sides of each node", () => {
    const data: GraphNodeData = {
      title: "Target",
      level: 2,
      summary: null,
      duration_minutes: 10,
      tags: [],
      isTarget: true,
      isHovered: false,
      isDimmed: false,
      centerX: 0,
    };

    render(<GuideGraphNode data={data} isSelected={false} />);

    expect(screen.getByTestId("target-handle").dataset.position).toBe("bottom");
    expect(screen.getByTestId("source-handle").dataset.position).toBe("top");
  });
});
