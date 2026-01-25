import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import type { CanvasElement } from "../model/canvasTypes";
import type { Page } from "../model/pageTypes";
import DesignPaper from "./DesignPaper";
import type { DesignPaperStageActions } from "./DesignPaper";
import { SelectionRectOverlay } from "./DesignPaperOverlays";
import {
  getElementBoundsForSelection,
  normalizeSelectionRect,
  rectsIntersect,
  type SelectionRect,
} from "./designPaperUtils";

type CanvasStageProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  padding: number;
  paperWidth: number;
  paperHeight: number;
  scale: number;
  selectedPage: Page | undefined;
  activeOrientation: "horizontal" | "vertical";
  selectedIds: string[];
  editingTextId: string | null;
  onClearSelection: () => void;
  onSelectedIdsChange: (nextIds: string[]) => void;
  onEditingTextIdChange: (nextId: string | null) => void;
  onElementsChange: (nextElements: CanvasElement[]) => void;
  onInteractionChange: (isActive: boolean) => void;
};

const CanvasStage = ({
  containerRef,
  canvasRef,
  padding,
  paperWidth,
  paperHeight,
  scale,
  selectedPage,
  activeOrientation,
  selectedIds,
  editingTextId,
  onClearSelection,
  onSelectedIdsChange,
  onEditingTextIdChange,
  onElementsChange,
  onInteractionChange,
}: CanvasStageProps) => {
  const stageActionsRef = useRef<DesignPaperStageActions | null>(null);
  const selectedIdsRef = useRef(selectedIds);
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const selectionAdditiveRef = useRef(false);
  const selectionDragRef = useRef(false);
  const selectionPointerIdRef = useRef<number | null>(null);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const dragThreshold = 3;

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  const getPointerPosition = (
    event: PointerEvent | ReactPointerEvent<HTMLElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left - padding) / scale,
      y: (event.clientY - rect.top - padding) / scale,
    };
  };

  const shouldStartSelection = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return false;
    const target = event.target as HTMLElement;
    const pageRoot = target.closest("[data-page-id]");
    if (!pageRoot) return true;
    return target === pageRoot;
  };

  const finalizeSelection = (endPoint: { x: number; y: number }) => {
    const startPoint = selectionStartRef.current;
    if (!startPoint) return;
    const nextRect = normalizeSelectionRect(startPoint, endPoint);
    const isAdditive = selectionAdditiveRef.current;
    selectionStartRef.current = null;
    selectionAdditiveRef.current = false;

    const isClick =
      !selectionDragRef.current ||
      (nextRect.width < dragThreshold && nextRect.height < dragThreshold);
    if (isClick) {
      if (!isAdditive) {
        onClearSelection();
      }
      return;
    }

    const elements = selectedPage?.elements ?? [];
    const hitIds = elements
      .filter((element) => !element.locked && element.selectable !== false)
      .map((element) => ({
        id: element.id,
        rect: getElementBoundsForSelection(element),
      }))
      .filter((item): item is { id: string; rect: SelectionRect } =>
        Boolean(item.rect)
      )
      .filter((item) => rectsIntersect(nextRect, item.rect))
      .map((item) => item.id);

    const baseIds = isAdditive ? selectedIdsRef.current : [];
    const nextSelectedIds = [...new Set([...baseIds, ...hitIds])];
    onSelectedIdsChange(nextSelectedIds);
    if (!isAdditive) {
      onEditingTextIdChange(null);
    }
  };

  const handleStagePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!selectedPage) return;
    if (!shouldStartSelection(event)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    selectionPointerIdRef.current = event.pointerId;
    selectionStartRef.current = getPointerPosition(event);
    selectionAdditiveRef.current = event.shiftKey;
    selectionDragRef.current = false;
    setSelectionRect(null);
    stageActionsRef.current?.clearContextMenu();
    stageActionsRef.current?.setEditingImageId(null);
    stageActionsRef.current?.setEditingShapeTextId(null);
  };

  const handleStagePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (selectionPointerIdRef.current !== event.pointerId) return;
    const startPoint = selectionStartRef.current;
    if (!startPoint) return;
    const movePoint = getPointerPosition(event);
    const nextRect = normalizeSelectionRect(startPoint, movePoint);
    if (
      !selectionDragRef.current &&
      nextRect.width < dragThreshold &&
      nextRect.height < dragThreshold
    ) {
      return;
    }
    selectionDragRef.current = true;
    setSelectionRect(nextRect);
  };

  const handleStagePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (selectionPointerIdRef.current !== event.pointerId) return;
    selectionPointerIdRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const endPoint = getPointerPosition(event);
    setSelectionRect(null);
    finalizeSelection(endPoint);
    selectionDragRef.current = false;
  };

  const handleStagePointerCancel = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (selectionPointerIdRef.current !== event.pointerId) return;
    selectionPointerIdRef.current = null;
    selectionDragRef.current = false;
    selectionStartRef.current = null;
    selectionAdditiveRef.current = false;
    setSelectionRect(null);
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 w-full min-h-0 overflow-auto"
      // 텍스트 편집 중 레이아웃 변화로 인한 스크롤 점프를 차단한다.
      style={{ padding: "10px", overflowAnchor: "none" }}
      onPointerDownCapture={handleStagePointerDown}
      onPointerMove={handleStagePointerMove}
      onPointerUp={handleStagePointerUp}
      onPointerCancel={handleStagePointerCancel}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: "100%",
          minHeight: "100%",
        }}
      >
        <div style={{ position: "relative" }}>
          <canvas
            ref={canvasRef}
            style={{
              display: "block",
              imageRendering: "crisp-edges",
            }}
          />
          {/* DesignPaper를 Canvas 위에 오버레이로 배치 */}
          <div
            style={{
              position: "absolute",
              top: `${padding}px`,
              left: `${padding}px`,
              width: `${paperWidth}px`,
              height: `${paperHeight}px`,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              pointerEvents: "all",
            }}
          >
            {selectedPage && (
              <>
                <DesignPaper
                  key={selectedPage.id}
                  pageId={selectedPage.id}
                  orientation={activeOrientation}
                  elements={selectedPage.elements}
                  selectedIds={selectedIds}
                  editingTextId={editingTextId}
                  stageActionsRef={stageActionsRef}
                  onInteractionChange={onInteractionChange}
                  onSelectedIdsChange={onSelectedIdsChange}
                  onEditingTextIdChange={onEditingTextIdChange}
                  onElementsChange={onElementsChange}
                />
                <SelectionRectOverlay selectionRect={selectionRect} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CanvasStage;
