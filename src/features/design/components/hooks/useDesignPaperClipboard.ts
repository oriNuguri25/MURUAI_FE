import { useCallback, type MutableRefObject } from "react";
import type { CanvasElement } from "../../model/canvasTypes";
import { measureTextBoxSize } from "../../utils/textMeasure";
import { DEFAULT_TEXT_LINE_HEIGHT } from "../designPaperUtils";

type UseDesignPaperClipboardProps = {
  pageId: string;
  elements: CanvasElement[];
  selectedIdsRef: MutableRefObject<string[]>;
  onElementsChange?: (elements: CanvasElement[]) => void;
  onSelectedIdsChange?: (ids: string[]) => void;
  readOnly: boolean;
  clearContextMenu: () => void;
};

export const useDesignPaperClipboard = ({
  pageId,
  elements,
  selectedIdsRef,
  onElementsChange,
  onSelectedIdsChange,
  readOnly,
  clearContextMenu,
}: UseDesignPaperClipboardProps) => {
  const setClipboard = useCallback(
    (items: CanvasElement[]) => {
      try {
        sessionStorage.setItem("copiedElements", JSON.stringify(items));
        sessionStorage.setItem(
          "copiedElementsMeta",
          JSON.stringify({ pageId })
        );
        sessionStorage.removeItem("copiedPageId");
      } catch {
        // ignore clipboard failures
      }
    },
    [pageId]
  );

  const getClipboard = useCallback((): CanvasElement[] | null => {
    try {
      const raw = sessionStorage.getItem("copiedElements");
      if (!raw) return null;
      return JSON.parse(raw) as CanvasElement[];
    } catch {
      return null;
    }
  }, []);

  const getClipboardMeta = useCallback((): { pageId?: string } | null => {
    try {
      const raw = sessionStorage.getItem("copiedElementsMeta");
      if (!raw) return null;
      return JSON.parse(raw) as { pageId?: string };
    } catch {
      return null;
    }
  }, []);

  const copySelectedElements = useCallback(() => {
    const ids = selectedIdsRef.current;
    const selected = elements.filter((element) => ids.includes(element.id));
    if (selected.length === 0) return;
    setClipboard(selected);
    clearContextMenu();
  }, [elements, selectedIdsRef, setClipboard, clearContextMenu]);

  const pasteElements = useCallback(() => {
    if (readOnly || !onElementsChange) return;
    const clipboard = getClipboard();
    if (!clipboard || clipboard.length === 0) return;
    const meta = getClipboardMeta();
    const offset = meta?.pageId && meta.pageId !== pageId ? 0 : 10;
    const groupIdMap = new Map<string, string>();
    const nextElements = clipboard.map((element) => {
      const id = crypto.randomUUID();
      const nextGroupId =
        element.groupId != null
          ? groupIdMap.get(element.groupId) ??
            (() => {
              const newId = crypto.randomUUID();
              groupIdMap.set(element.groupId as string, newId);
              return newId;
            })()
          : undefined;
      if (element.type === "line" || element.type === "arrow") {
        return {
          ...element,
          id,
          groupId: nextGroupId,
          start: {
            x: element.start.x + offset,
            y: element.start.y + offset,
          },
          end: { x: element.end.x + offset, y: element.end.y + offset },
        };
      }
      if ("x" in element && "y" in element) {
        if (element.type === "text") {
          const lineHeight = element.style.lineHeight ?? DEFAULT_TEXT_LINE_HEIGHT;
          const letterSpacing = element.style.letterSpacing ?? 0;
          const widthMode = element.widthMode ?? "auto";
          const { width, height } = measureTextBoxSize(
            element.text ?? "",
            element.style.fontSize,
            element.style.fontWeight,
            {
              lineHeight,
              letterSpacing,
              maxWidth: widthMode === "fixed" ? element.w : undefined,
            }
          );
          return {
            ...element,
            id,
            groupId: nextGroupId,
            x: element.x + offset,
            y: element.y + offset,
            w: widthMode === "fixed" ? element.w : Math.max(width, 1),
            h: Math.max(height, 1),
            widthMode,
          };
        }
        return {
          ...element,
          id,
          groupId: nextGroupId,
          x: element.x + offset,
          y: element.y + offset,
        };
      }
      return { ...element, id, groupId: nextGroupId };
    });
    onElementsChange([...elements, ...nextElements]);
    const nextSelectedIds = nextElements.map((element) => element.id);
    selectedIdsRef.current = nextSelectedIds;
    onSelectedIdsChange?.(nextSelectedIds);
    clearContextMenu();
  }, [
    readOnly,
    onElementsChange,
    elements,
    onSelectedIdsChange,
    getClipboard,
    getClipboardMeta,
    pageId,
    selectedIdsRef,
    clearContextMenu,
  ]);

  return {
    copySelectedElements,
    pasteElements,
    getClipboard,
  };
};
