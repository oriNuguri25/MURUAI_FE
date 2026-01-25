import type { CanvasElement } from "../../model/canvasTypes";
import { getRectFromElement, type Rect, type SelectionRect } from "../../utils/designPaperUtils";

type SelectionRectOverlayProps = {
  selectionRect: SelectionRect | null;
};

// 다중 선택 드래그 중 선택 사각형을 그린다.
export const SelectionRectOverlay = ({
  selectionRect,
}: SelectionRectOverlayProps) => {
  if (!selectionRect) return null;
  return (
    <div
      className="absolute z-40 border border-primary/60 bg-primary/10 pointer-events-none"
      style={{
        left: selectionRect.x,
        top: selectionRect.y,
        width: selectionRect.width,
        height: selectionRect.height,
      }}
    />
  );
};

type GroupSelectionOverlayProps = {
  isGroupedSelection: boolean;
  readOnly: boolean;
  selectedIds: string[];
  elements: CanvasElement[];
};

// 그룹 선택 시 바운딩 박스를 그린다.
export const GroupSelectionOverlay = ({
  isGroupedSelection,
  readOnly,
  selectedIds,
  elements,
}: GroupSelectionOverlayProps) => {
  if (!isGroupedSelection || readOnly) return null;

  const groupRects = selectedIds
    .map((id) => {
      const element = elements.find((el) => el.id === id);
      if (!element) return null;
      return getRectFromElement(element);
    })
    .filter((rect): rect is Rect => Boolean(rect));

  if (groupRects.length === 0) return null;

  const minX = Math.min(...groupRects.map((r) => r.x));
  const minY = Math.min(...groupRects.map((r) => r.y));
  const maxX = Math.max(...groupRects.map((r) => r.x + r.width));
  const maxY = Math.max(...groupRects.map((r) => r.y + r.height));

  const groupBoundingBox = {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };

  return (
    <div
      className="absolute z-30 border border-primary/40 pointer-events-none"
      style={{
        left: groupBoundingBox.x,
        top: groupBoundingBox.y,
        width: groupBoundingBox.width,
        height: groupBoundingBox.height,
      }}
    />
  );
};
