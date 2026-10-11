import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  GuideListItem,
  Objective,
  ObjectiveSnapshot,
} from "@bluelearn/schemas";
import { GuideGraph } from "@/components/graph/GuideGraph";
import { WalkthroughNode } from "@/components/graph/WalkthroughNode";
import { WalkthroughPanel } from "@/components/graph/WalkthroughPanel";
import { buildObjectiveGraph, defaultTargetId } from "@/lib/objectiveGraph";

const nodeTypes = { walkthroughNode: WalkthroughNode };

type ObjectiveGraphProps = {
  objective: Pick<Objective, "slug" | "title">;
  snapshot: ObjectiveSnapshot;
  guides: Array<GuideListItem>;
  // Owned by the page so a switch to the linear view and back keeps it.
  selectedId: string | null;
  onSelect: (id: string) => void;
  // The contribution preview renders an unsaved draft, so nothing may
  // navigate away from it.
  preview?: boolean;
};

// Inspecting a prerequisite must not change the reader's active target.
export function useObjectiveSelection(
  snapshot: Pick<ObjectiveSnapshot, "nodes">
) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chosenTargetId, setChosenTargetId] = useState<string | null>(null);

  const isTarget = (id: string) =>
    snapshot.nodes.some(
      (node) => node.id === id && node.is_included && node.is_target
    );

  const targetId =
    chosenTargetId !== null && isTarget(chosenTargetId)
      ? chosenTargetId
      : defaultTargetId(snapshot);

  const select = (id: string) => {
    setSelectedId(id);
    if (isTarget(id)) setChosenTargetId(id);
  };

  return { selectedId, targetId, select };
}

export function ObjectiveGraph({
  objective,
  snapshot,
  guides,
  selectedId,
  onSelect,
  preview = false,
}: ObjectiveGraphProps) {
  const { walkthrough, nodes, defaultId } = useMemo(
    () => buildObjectiveGraph(snapshot, guides),
    [snapshot, guides]
  );

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const selectedNode =
    walkthrough.nodes.find((node) => node.id === selectedId) ??
    walkthrough.nodes.find((node) => node.id === defaultId);
  const selectedNodeId = selectedNode?.id;

  const getNodeState = useCallback(
    (id: string) => ({
      isSelected: id === selectedNodeId,
      isTarget: nodes.get(id)!.isTarget,
      isRequest: nodes.get(id)!.isRequest,
    }),
    [selectedNodeId, nodes]
  );

  useEffect(() => {
    if (!isFullscreen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFullscreen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen]);

  if (!selectedNode) {
    return (
      <p className="text-sm text-muted-foreground">
        This objective has no included guides yet.
      </p>
    );
  }

  const selected = nodes.get(selectedNode.id)!;

  return (
    <div className="flex flex-col-reverse md:grid md:grid-cols-[320px_1fr]">
      <WalkthroughPanel
        node={selectedNode}
        objective={objective}
        guideSlug={selected.guideSlug}
        isRequest={selected.isRequest}
        preview={preview}
      />
      <div
        className={
          isFullscreen
            ? "fixed inset-0 z-50 bg-background"
            : "h-[500px] min-w-0 overflow-hidden rounded-xl border border-border bg-muted/10"
        }
      >
        <GuideGraph
          walkthroughData={walkthrough}
          targetSlug={objective.slug}
          hoveredGuide={hoveredId}
          onHoverGuide={setHoveredId}
          nodeType="walkthroughNode"
          nodeTypes={nodeTypes}
          getNodeState={getNodeState}
          onNodeClick={onSelect}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen((value) => !value)}
          showFitView={false}
        />
      </div>
    </div>
  );
}
