import { useRef, type RefObject } from "react";
import type { CanvasElement } from "../../model/canvasTypes";
import type { Page } from "../../model/pageTypes";
import DesignPaper from "./DesignPaper";
import type { DesignPaperStageActions } from "./DesignPaper";
import { useCanvasStageSelection } from "../../hooks/useCanvasStageSelection";

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
  const {
    selectionRect,
    previewSelectedIds,
    handleStagePointerDown,
    handleStagePointerMove,
    handleStagePointerUp,
    handleStagePointerCancel,
  } = useCanvasStageSelection({
    canvasRef,
    padding,
    scale,
    selectedPage,
    selectedIds,
    stageActionsRef,
    onClearSelection,
    onSelectedIdsChange,
    onEditingTextIdChange,
  });

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
              <DesignPaper
                key={selectedPage.id}
                pageId={selectedPage.id}
                orientation={activeOrientation}
                elements={selectedPage.elements}
                selectedIds={selectedIds}
                editingTextId={editingTextId}
                selectionRect={selectionRect}
                previewSelectedIds={previewSelectedIds}
                stageActionsRef={stageActionsRef}
                onInteractionChange={onInteractionChange}
                onSelectedIdsChange={onSelectedIdsChange}
                onEditingTextIdChange={onEditingTextIdChange}
                onElementsChange={onElementsChange}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CanvasStage;
