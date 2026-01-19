import {
  useCallback,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { CanvasElement } from "../../model/canvasTypes";
import {
  getElementBoundsForSelection,
  normalizeSelectionRect,
  rectsIntersect,
  type Rect,
  type SelectionRect,
} from "../designPaperUtils";

type PointerPositionGetter = (
  event: PointerEvent | ReactPointerEvent<HTMLElement>
) => { x: number; y: number };

type UseDesignPaperSelectionProps = {
  readOnly: boolean;
  elements: CanvasElement[];
  selectedIdsRef: MutableRefObject<string[]>;
  onSelectedIdsChange?: (ids: string[]) => void;
  onEditingTextIdChange?: (id: string | null) => void;
  clearContextMenu: () => void;
  setEditingImageId: (id: string | null) => void;
  setEditingShapeTextId: (id: string | null) => void;
  getPointerPosition: PointerPositionGetter;
};

export const useDesignPaperSelection = ({
  readOnly,
  elements,
  selectedIdsRef,
  onSelectedIdsChange,
  onEditingTextIdChange,
  clearContextMenu,
  setEditingImageId,
  setEditingShapeTextId,
  getPointerPosition,
}: UseDesignPaperSelectionProps) => {
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const selectionAdditiveRef = useRef(false);

  const handleBackgroundPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (readOnly) return;
      if (event.currentTarget !== event.target) return;
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      clearContextMenu();
      setEditingImageId(null);
      setEditingShapeTextId(null);
      const startPoint = getPointerPosition(event);
      selectionStartRef.current = startPoint;
      selectionAdditiveRef.current = event.shiftKey;
      setSelectionRect({ x: startPoint.x, y: startPoint.y, width: 0, height: 0 });

      const moveListener = (moveEvent: PointerEvent) => {
        const movePoint = getPointerPosition(moveEvent);
        const nextRect = normalizeSelectionRect(startPoint, movePoint);
        setSelectionRect(nextRect);
      };

      const upListener = (upEvent: PointerEvent) => {
        window.removeEventListener("pointermove", moveListener);
        window.removeEventListener("pointerup", upListener);
        const endPoint = getPointerPosition(upEvent);
        const nextRect = normalizeSelectionRect(startPoint, endPoint);
        const isAdditive = selectionAdditiveRef.current;
        selectionStartRef.current = null;
        selectionAdditiveRef.current = false;
        setSelectionRect(null);

        const isClick = nextRect.width < 3 && nextRect.height < 3;
        if (isClick) {
          if (isAdditive) return;
          selectedIdsRef.current = [];
          onSelectedIdsChange?.([]);
          onEditingTextIdChange?.(null);
          return;
        }

        const hitIds = elements
          .filter((element) => !element.locked && element.selectable !== false)
          .map((element) => ({
            id: element.id,
            rect: getElementBoundsForSelection(element),
          }))
          .filter((item): item is { id: string; rect: Rect } => Boolean(item.rect))
          .filter((item) => rectsIntersect(nextRect, item.rect))
          .map((item) => item.id);

        const baseIds = isAdditive ? selectedIdsRef.current : [];
        const nextSelectedIds = [...new Set([...baseIds, ...hitIds])];
        selectedIdsRef.current = nextSelectedIds;
        onSelectedIdsChange?.(nextSelectedIds);
        if (!isAdditive) {
          onEditingTextIdChange?.(null);
        }
      };

      window.addEventListener("pointermove", moveListener);
      window.addEventListener("pointerup", upListener);
    },
    [
      readOnly,
      clearContextMenu,
      setEditingImageId,
      setEditingShapeTextId,
      getPointerPosition,
      elements,
      onSelectedIdsChange,
      onEditingTextIdChange,
      selectedIdsRef,
    ]
  );

  return { selectionRect, handleBackgroundPointerDown };
};
