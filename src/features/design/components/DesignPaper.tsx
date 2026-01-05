import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  ArrowUpFromLine,
  ArrowUpToLine,
  ChevronsDown,
  ChevronsUp,
  ChevronRight,
  Clipboard,
  Copy,
  Layers,
  Trash2,
} from "lucide-react";
import type {
  CanvasElement,
  LineElement,
  ShapeElement,
  TextElement,
} from "../model/canvasTypes";
import SmartGuideOverlay from "./SmartGuideOverlay";
import { useSmartGuides } from "../model/useSmartGuides";
import Arrow from "./template_component/arrow/Arrow";
import CircleBox from "./template_component/circle/CircleBox";
import Line from "./template_component/line/Line";
import RoundBox from "./template_component/round_box/RoundBox";
import TextBox from "./template_component/text/TextBox";
import { useSideBarStore } from "../store/sideBarStore";

interface DesignPaperProps {
  pageId: string;
  orientation: "horizontal" | "vertical";
  elements: CanvasElement[];
  selectedIds?: string[];
  editingTextId?: string | null;
  onElementsChange?: (elements: CanvasElement[]) => void;
  onSelectedIdsChange?: (ids: string[]) => void;
  onEditingTextIdChange?: (id: string | null) => void;
  readOnly?: boolean;
  className?: string;
  showShadow?: boolean;
}

type Rect = { x: number; y: number; width: number; height: number };
type TextStylePatch = Partial<TextElement["style"]>;
type TextElementPatch = Omit<Partial<TextElement>, "style"> & {
  style?: TextStylePatch;
};
type ShapeBorderPatch = Partial<ShapeElement["border"]>;
type ShapeElementPatch = Omit<Partial<ShapeElement>, "border"> & {
  border?: ShapeBorderPatch;
};
type LineStrokePatch = Partial<LineElement["stroke"]>;
type LineElementPatch = Omit<Partial<LineElement>, "stroke"> & {
  stroke?: LineStrokePatch;
};
type ElementPatch =
  | TextElementPatch
  | ShapeElementPatch
  | LineElementPatch
  | Partial<CanvasElement>;

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;
const PAGE_WIDTH_PX = mmToPx(210);
const PAGE_HEIGHT_PX = mmToPx(297);
const GUIDE_THRESHOLD_PX = 6;
const RECT_TOLERANCE = 1;

const isEmotionSlotShape = (
  element: CanvasElement
): element is ShapeElement =>
  (element.type === "rect" ||
    element.type === "roundRect" ||
    element.type === "ellipse") &&
  element.border?.enabled === true &&
  element.border?.color === "#A5B4FC";

const getRectFromElement = (element: CanvasElement): Rect | null => {
  if ("x" in element && "w" in element && "h" in element) {
    return {
      x: element.x,
      y: element.y,
      width: element.w,
      height: element.h,
    };
  }
  return null;
};

const isSameRect = (rect: Rect, element: TextElement) =>
  Math.abs(rect.x - element.x) <= RECT_TOLERANCE &&
  Math.abs(rect.y - element.y) <= RECT_TOLERANCE &&
  Math.abs(rect.width - element.w) <= RECT_TOLERANCE &&
  Math.abs(rect.height - element.h) <= RECT_TOLERANCE;

const DesignPaper = ({
  pageId,
  orientation,
  elements,
  selectedIds = [],
  editingTextId = null,
  onElementsChange,
  onSelectedIdsChange,
  onEditingTextIdChange,
  readOnly = false,
  className,
  showShadow = false,
}: DesignPaperProps) => {
  const setSideBarMenu = useSideBarStore((state) => state.setSelectedMenu);
  const [activePreview, setActivePreview] = useState<{
    id: string;
    rect: Rect;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    id: string;
    x: number;
    y: number;
    activeSubmenu?: "layer";
  } | null>(null);
  const activeInteractionRef = useRef<{
    id: string;
    type: "drag" | "resize";
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isHorizontal = orientation === "horizontal";
  const pageWidth = isHorizontal ? PAGE_HEIGHT_PX : PAGE_WIDTH_PX;
  const pageHeight = isHorizontal ? PAGE_WIDTH_PX : PAGE_HEIGHT_PX;
  const smartGuides = useSmartGuides({
    canvasWidth: pageWidth,
    canvasHeight: pageHeight,
    threshold: GUIDE_THRESHOLD_PX,
  });
  const findEmotionSlotTextId = useCallback(
    (shape: ShapeElement) => {
      const shapeRect = getRectFromElement(shape);
      if (!shapeRect) return null;
      const matched = elements.find(
        (element) => element.type === "text" && isSameRect(shapeRect, element)
      );
      return matched?.id ?? null;
    },
    [elements]
  );
  const emotionSlotTextIds = new Set<string>();
  elements.forEach((element) => {
    if (!isEmotionSlotShape(element)) return;
    const slotTextId = findEmotionSlotTextId(element);
    if (slotTextId) {
      emotionSlotTextIds.add(slotTextId);
    }
  });

  const updateElement = useCallback((id: string, patch: ElementPatch) => {
    if (readOnly || !onElementsChange) return;
    const nextElements = elements.map((element): CanvasElement => {
      if (element.id !== id) return element;
      if (element.type === "text" && "style" in patch) {
        const nextStyle = {
          ...(element as TextElement).style,
          ...(patch as TextElementPatch).style,
        };
        return {
          ...(element as TextElement),
          ...patch,
          style: nextStyle,
        };
      }
      if (
        (element.type === "rect" ||
          element.type === "roundRect" ||
          element.type === "ellipse") &&
        "border" in patch
      ) {
        const baseBorder = element.border ?? {
          enabled: false,
          color: "#000000",
          width: 2,
          style: "solid",
        };
        const patchBorder = (patch as ShapeElementPatch).border;
        const nextBorder: ShapeElement["border"] = patchBorder
          ? {
              ...baseBorder,
              ...patchBorder,
            }
          : element.border;
        return {
          ...(element as ShapeElement),
          ...patch,
          border: nextBorder,
        };
      }
      if (
        (element.type === "line" || element.type === "arrow") &&
        "stroke" in patch
      ) {
        const nextStroke = {
          ...(element as LineElement).stroke,
          ...(patch as LineElementPatch).stroke,
        };
        return {
          ...(element as LineElement),
          ...patch,
          stroke: nextStroke,
        };
      }
      return { ...element, ...patch } as CanvasElement;
    });
    onElementsChange(nextElements);
  }, [elements, onElementsChange, readOnly]);

  const getRenderableRect = (element: CanvasElement) => {
    if (activePreview?.id === element.id) return activePreview.rect;
    return getRectFromElement(element);
  };

  const getTargetRects = (activeId: string) =>
    elements
      .filter(
        (element) =>
          element.id !== activeId &&
          element.visible !== false &&
          !element.locked
      )
      .map((element) => getRectFromElement(element))
      .filter((rect): rect is Rect => Boolean(rect));

  const handleRectChange = (elementId: string, nextRect: Rect) => {
    const activeInteraction = activeInteractionRef.current;
    if (!activeInteraction || activeInteraction.id !== elementId) return;
    setActivePreview({ id: elementId, rect: nextRect });
  };

  const handleDragStateChange = (
    elementId: string,
    isDragging: boolean,
    finalRect?: Rect,
    context?: { type: "drag" | "resize" }
  ) => {
    if (isDragging) {
      activeInteractionRef.current = {
        id: elementId,
        type: context?.type ?? "drag",
      };
      return;
    }
    if (finalRect) {
      updateElement(elementId, {
        x: finalRect.x,
        y: finalRect.y,
        w: finalRect.width,
        h: finalRect.height,
      });
    }
    activeInteractionRef.current = null;
    setActivePreview(null);
    smartGuides.clear();
  };

  const handleSelect = (
    elementId: string,
    options?: { keepContextMenu?: boolean }
  ) => {
    if (readOnly) return;
    onSelectedIdsChange?.([elementId]);
    const selectedElement = elements.find((element) => element.id === elementId);
    if (selectedElement && isEmotionSlotShape(selectedElement)) {
      setSideBarMenu("emotion");
    }
    if (editingTextId && editingTextId !== elementId) {
      onEditingTextIdChange?.(null);
    }
    if (!options?.keepContextMenu) {
      setContextMenu(null);
    }
  };

  const handleBackgroundPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (event.currentTarget !== event.target) return;
    onSelectedIdsChange?.([]);
    onEditingTextIdChange?.(null);
    setContextMenu(null);
  };

  useEffect(() => {
    if (readOnly || !onElementsChange) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (editingTextId) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (selectedIds.length !== 1) return;
      const selectedElement = elements.find(
        (element) => element.id === selectedIds[0]
      );
      if (!selectedElement || !isEmotionSlotShape(selectedElement)) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.length !== 1) return;
      const slotTextId = findEmotionSlotTextId(selectedElement);
      if (!slotTextId) return;
      const slotText = elements.find((element) => element.id === slotTextId);
      if (!slotText || slotText.type !== "text") return;
      event.preventDefault();
      const nextText =
        slotText.text === "감정을 선택해주세요"
          ? event.key
          : `${slotText.text}${event.key}`;
      updateElement(slotTextId, {
        text: nextText,
        style: { fontSize: 12, color: "#111827" },
      });
      onEditingTextIdChange?.(slotTextId);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    editingTextId,
    elements,
    findEmotionSlotTextId,
    onElementsChange,
    onEditingTextIdChange,
    readOnly,
    selectedIds,
    updateElement,
  ]);

  const openContextMenu = (
    event: ReactMouseEvent<HTMLElement>,
    elementId: string
  ) => {
    if (readOnly) return;
    event.preventDefault();
    event.stopPropagation();
    handleSelect(elementId, { keepContextMenu: true });
    const rect = containerRef.current?.getBoundingClientRect();
    const rawX = event.clientX - (rect?.left ?? 0);
    const rawY = event.clientY - (rect?.top ?? 0);
    const menuWidth = 220;
    const menuHeight = 4 * 36 + 8;
    const clampedX = Math.min(
      Math.max(rawX, 8),
      Math.max(8, pageWidth - menuWidth)
    );
    const clampedY = Math.min(
      Math.max(rawY, 8),
      Math.max(8, pageHeight - menuHeight)
    );
    setContextMenu({ id: elementId, x: clampedX, y: clampedY });
  };

  const moveElement = (
    elementId: string,
    direction: "forward" | "front" | "backward" | "back"
  ) => {
    if (readOnly || !onElementsChange) return;
    const index = elements.findIndex((element) => element.id === elementId);
    if (index === -1) return;
    const nextElements = [...elements];
    if (direction === "forward") {
      if (index >= nextElements.length - 1) return;
      [nextElements[index], nextElements[index + 1]] = [
        nextElements[index + 1],
        nextElements[index],
      ];
    } else if (direction === "backward") {
      if (index <= 0) return;
      [nextElements[index - 1], nextElements[index]] = [
        nextElements[index],
        nextElements[index - 1],
      ];
    } else if (direction === "front") {
      if (index >= nextElements.length - 1) return;
      const [target] = nextElements.splice(index, 1);
      nextElements.push(target);
    } else {
      if (index <= 0) return;
      const [target] = nextElements.splice(index, 1);
      nextElements.unshift(target);
    }
    onElementsChange(nextElements);
    setContextMenu(null);
  };

  const setClipboard = (items: CanvasElement[]) => {
    try {
      sessionStorage.setItem("copiedElements", JSON.stringify(items));
    } catch {
      // ignore clipboard failures
    }
  };

  const getClipboard = (): CanvasElement[] | null => {
    try {
      const raw = sessionStorage.getItem("copiedElements");
      if (!raw) return null;
      return JSON.parse(raw) as CanvasElement[];
    } catch {
      return null;
    }
  };

  const copySelectedElements = () => {
    const selected = elements.filter((element) =>
      selectedIds.includes(element.id)
    );
    if (selected.length === 0) return;
    setClipboard(selected);
    setContextMenu(null);
  };

  const pasteElements = () => {
    if (readOnly || !onElementsChange) return;
    const clipboard = getClipboard();
    if (!clipboard || clipboard.length === 0) return;
    const offset = 10;
    const nextElements = clipboard.map((element) => {
      const id = crypto.randomUUID();
      if (element.type === "line" || element.type === "arrow") {
        return {
          ...element,
          id,
          start: {
            x: element.start.x + offset,
            y: element.start.y + offset,
          },
          end: { x: element.end.x + offset, y: element.end.y + offset },
        };
      }
      if ("x" in element && "y" in element) {
        return {
          ...element,
          id,
          x: element.x + offset,
          y: element.y + offset,
        };
      }
      return { ...element, id };
    });
    onElementsChange([...elements, ...nextElements]);
    onSelectedIdsChange?.(nextElements.map((element) => element.id));
    setContextMenu(null);
  };

  const deleteSelectedElements = () => {
    if (readOnly || !onElementsChange) return;
    if (selectedIds.length === 0) return;
    onElementsChange(
      elements.filter((element) => !selectedIds.includes(element.id))
    );
    onSelectedIdsChange?.([]);
    onEditingTextIdChange?.(null);
    setContextMenu(null);
  };

  return (
    <div
      ref={containerRef}
      className={`relative bg-white shrink-0 ${
        showShadow ? "shadow-lg" : ""
      } ${isHorizontal ? "w-[297mm] h-[210mm]" : "w-[210mm] h-[297mm]"} ${
        className ?? ""
      }`}
      data-page-id={pageId}
      onPointerDown={readOnly ? undefined : handleBackgroundPointerDown}
    >
      {elements.map((element) => {
        if (element.type === "text") {
          const isSelected = selectedIds.includes(element.id);
          const isEditing = editingTextId === element.id;
          const isEmotionSlotText = emotionSlotTextIds.has(element.id);
          const forceEditable = isEmotionSlotText && isEditing;
          const locked =
            readOnly ||
            (element.locked && !forceEditable) ||
            (isEmotionSlotText && !isEditing);
          const rect = getRenderableRect(element);
          if (!rect) return null;
          const minFontSize = 12;
          const maxFontSize = 120;
          const clampFontSize = (value: number) =>
            Math.min(maxFontSize, Math.max(minFontSize, value));
          const fontWeight =
            element.style.fontWeight === "bold" ? 700 : 400;
          return (
            <TextBox
              key={element.id}
              text={element.text}
              editable={!readOnly && (!element.locked || forceEditable)}
              rect={rect}
              showChrome={!isEmotionSlotText}
              textClassName="text-headline-42-semibold"
              textStyle={{
                fontSize: `${element.style.fontSize}px`,
                fontWeight,
                color: element.style.color,
                textDecoration: element.style.underline ? "underline" : "none",
                lineHeight: 1.3,
              }}
              textAlign={element.style.alignX}
              textAlignY={element.style.alignY}
              isSelected={isSelected}
              isEditing={isEditing}
              locked={locked}
              toolbar={{
                offset: mmToPx(4),
                minFontSize,
                maxFontSize,
                fontSize: element.style.fontSize,
                color: element.style.color,
                isBold: element.style.fontWeight === "bold",
                isUnderline: Boolean(element.style.underline),
                align: element.style.alignX,
                alignY: element.style.alignY,
                onFontSizeChange: (value) =>
                  updateElement(element.id, {
                    style: { fontSize: clampFontSize(value) },
                  }),
                onFontSizeStep: (delta) =>
                  updateElement(element.id, {
                    style: {
                      fontSize: clampFontSize(
                        element.style.fontSize + delta
                      ),
                    },
                  }),
                onColorChange: (color) =>
                  updateElement(element.id, { style: { color } }),
                onToggleBold: () =>
                  updateElement(element.id, {
                    style: {
                      fontWeight:
                        element.style.fontWeight === "bold"
                          ? "normal"
                          : "bold",
                    },
                  }),
                onToggleUnderline: () =>
                  updateElement(element.id, {
                    style: { underline: !element.style.underline },
                  }),
                onAlignChange: (align) =>
                  updateElement(element.id, { style: { alignX: align } }),
                onAlignYChange: (alignY) =>
                  updateElement(element.id, { style: { alignY } }),
              }}
              onTextChange={(nextText) =>
                updateElement(element.id, { text: nextText })
              }
              onRectChange={(nextRect) =>
                handleRectChange(element.id, nextRect)
              }
              onDragStateChange={(isDragging, finalRect, context) =>
                handleDragStateChange(element.id, isDragging, finalRect, context)
              }
              onSelectChange={() => handleSelect(element.id)}
              onContextMenu={(event) => openContextMenu(event, element.id)}
              onStartEditing={() =>
                onEditingTextIdChange?.(element.id)
              }
              onFinishEditing={() => onEditingTextIdChange?.(null)}
              transformRect={(nextRect, context) => {
                const activeInteraction = activeInteractionRef.current;
                if (!activeInteraction || activeInteraction.id !== element.id) {
                  return nextRect;
                }
                if (context.type === "resize") {
                  const handle = context.handle ?? "";
                  const activeX = handle.includes("e")
                    ? [nextRect.x + nextRect.width]
                    : handle.includes("w")
                    ? [nextRect.x]
                    : [];
                  const activeY = handle.includes("s")
                    ? [nextRect.y + nextRect.height]
                    : handle.includes("n")
                    ? [nextRect.y]
                    : [];
                  const { snapOffset } = smartGuides.compute({
                    activeRect: nextRect,
                    otherRects: getTargetRects(element.id),
                    activeX,
                    activeY,
                  });
                  const next = { ...nextRect };
                  if (handle.includes("e")) {
                    next.width += snapOffset.x;
                  } else if (handle.includes("w")) {
                    next.x += snapOffset.x;
                    next.width -= snapOffset.x;
                  }
                  if (handle.includes("s")) {
                    next.height += snapOffset.y;
                  } else if (handle.includes("n")) {
                    next.y += snapOffset.y;
                    next.height -= snapOffset.y;
                  }
                  return next;
                }
                const { snapOffset } = smartGuides.compute({
                  activeRect: nextRect,
                  otherRects: getTargetRects(element.id),
                });
                return {
                  ...nextRect,
                  x: nextRect.x + snapOffset.x,
                  y: nextRect.y + snapOffset.y,
                };
              }}
            />
          );
        }

        if (
          element.type === "rect" ||
          element.type === "roundRect" ||
          element.type === "ellipse"
        ) {
          const rect = getRenderableRect(element);
          if (!rect) return null;
          const isSelected = selectedIds.includes(element.id);
          const radius =
            element.type === "roundRect"
              ? element.radius ?? 0
              : element.type === "ellipse"
              ? Math.min(rect.width, rect.height) / 2
              : 0;
          const maxRadius = Math.min(rect.width, rect.height) / 2;
          const minRadius = 0;
          const clampRadius = (value: number) =>
            Math.min(maxRadius, Math.max(minRadius, value));
          const isImageFill =
            element.fill.startsWith("url(") ||
            element.fill.startsWith("data:");
          const colorValue = isImageFill ? "#ffffff" : element.fill;
          const borderEnabled = element.border?.enabled ?? false;
          const borderColor = element.border?.color ?? "#000000";
          const borderWidth = element.border?.width ?? 2;
          const borderStyle = element.border?.style ?? "solid";

          const toolbar =
            readOnly || element.locked
              ? undefined
              : {
                  offset: mmToPx(4),
                  minBorderRadius: minRadius,
                  maxBorderRadius: maxRadius,
                  showRadius: element.type !== "ellipse",
                  borderRadius: radius,
                  color: colorValue,
                  borderEnabled,
                  borderColor,
                  borderWidth,
                  borderStyle,
                  onBorderRadiusChange: (value: number) =>
                    updateElement(element.id, {
                      radius: clampRadius(value),
                    }),
                  onBorderRadiusStep: (delta: number) =>
                    updateElement(element.id, {
                      radius: clampRadius(radius + delta),
                    }),
                  onColorChange: (color: string) =>
                    updateElement(element.id, { fill: color }),
                  onImageUpload: (imageUrl: string) =>
                    updateElement(element.id, { fill: imageUrl }),
                  onBorderEnabledChange: (enabled: boolean) =>
                    updateElement(element.id, {
                      border: {
                        enabled,
                        color: borderColor,
                        width: borderWidth,
                        style: borderStyle,
                      },
                    }),
                  onBorderStyleChange: (
                    style: "solid" | "dashed" | "dotted" | "double"
                  ) =>
                    updateElement(element.id, {
                      border: {
                        enabled: true,
                        color: borderColor,
                        width: borderWidth,
                        style,
                      },
                    }),
                  onBorderColorChange: (color: string) =>
                    updateElement(element.id, {
                      border: {
                        color,
                      },
                    }),
                  onBorderWidthChange: (value: number) =>
                    updateElement(element.id, {
                      border: {
                        width: value,
                      },
                    }),
                };

          const ShapeComponent =
            element.type === "ellipse" ? CircleBox : RoundBox;

          return (
            <ShapeComponent
              key={element.id}
              rect={rect}
              minWidth={mmToPx(40)}
              minHeight={mmToPx(40)}
              borderRadius={radius}
              fill={element.fill}
              border={element.border}
              isSelected={isSelected}
              locked={readOnly || element.locked}
              toolbar={toolbar}
              onImageDrop={
                readOnly || element.locked
                  ? undefined
                  : (imageUrl) =>
                      updateElement(element.id, {
                        fill: imageUrl.startsWith("url(")
                          ? imageUrl
                          : `url(${imageUrl})`,
                      })
              }
              onRectChange={(nextRect) =>
                handleRectChange(element.id, nextRect)
              }
              onDragStateChange={(isDragging, finalRect, context) =>
                handleDragStateChange(element.id, isDragging, finalRect, context)
              }
              onSelectChange={() => handleSelect(element.id)}
              onContextMenu={(event) => openContextMenu(event, element.id)}
              transformRect={(nextRect, context) => {
                const activeInteraction = activeInteractionRef.current;
                if (!activeInteraction || activeInteraction.id !== element.id) {
                  return nextRect;
                }
                if (context.type === "resize") {
                  const handle = context.handle ?? "";
                  const activeX = handle.includes("e")
                    ? [nextRect.x + nextRect.width]
                    : handle.includes("w")
                    ? [nextRect.x]
                    : [];
                  const activeY = handle.includes("s")
                    ? [nextRect.y + nextRect.height]
                    : handle.includes("n")
                    ? [nextRect.y]
                    : [];
                  const { snapOffset } = smartGuides.compute({
                    activeRect: nextRect,
                    otherRects: getTargetRects(element.id),
                    activeX,
                    activeY,
                  });
                  const next = { ...nextRect };
                  if (handle.includes("e")) {
                    next.width += snapOffset.x;
                  } else if (handle.includes("w")) {
                    next.x += snapOffset.x;
                    next.width -= snapOffset.x;
                  }
                  if (handle.includes("s")) {
                    next.height += snapOffset.y;
                  } else if (handle.includes("n")) {
                    next.y += snapOffset.y;
                    next.height -= snapOffset.y;
                  }
                  return next;
                }
                const { snapOffset } = smartGuides.compute({
                  activeRect: nextRect,
                  otherRects: getTargetRects(element.id),
                });
                return {
                  ...nextRect,
                  x: nextRect.x + snapOffset.x,
                  y: nextRect.y + snapOffset.y,
                };
              }}
            />
          );
        }

        if (element.type === "line" || element.type === "arrow") {
          const isSelected = selectedIds.includes(element.id);
          const minStroke = 1;
          const maxStroke = 20;
          const clampStroke = (value: number) =>
            Math.min(maxStroke, Math.max(minStroke, value));
          const strokeWidth = element.stroke.width;
          const strokeColor = element.stroke.color;
          const commonToolbar = readOnly || element.locked
            ? undefined
            : {
                offset: mmToPx(4),
                minWidth: minStroke,
                maxWidth: maxStroke,
                color: strokeColor,
                width: strokeWidth,
                onColorChange: (color: string) =>
                  updateElement(element.id, { stroke: { color } }),
                onWidthChange: (value: number) =>
                  updateElement(element.id, {
                    stroke: { width: clampStroke(value) },
                  }),
              };

          if (element.type === "line") {
            return (
              <Line
                key={element.id}
                id={element.id}
                start={element.start}
                end={element.end}
                stroke={element.stroke}
                isSelected={isSelected}
                locked={readOnly || element.locked}
                toolbar={commonToolbar}
                onLineChange={(nextLine) =>
                  updateElement(element.id, {
                    start: nextLine.start,
                    end: nextLine.end,
                  })
                }
                onSelectChange={() => handleSelect(element.id)}
                onContextMenu={(event) => openContextMenu(event, element.id)}
              />
            );
          }

          return (
            <Arrow
              key={element.id}
              id={element.id}
              start={element.start}
              end={element.end}
              stroke={element.stroke}
              isSelected={isSelected}
              locked={readOnly || element.locked}
              toolbar={commonToolbar}
              onLineChange={(nextLine) =>
                updateElement(element.id, {
                  start: nextLine.start,
                  end: nextLine.end,
                })
              }
              onSelectChange={() => handleSelect(element.id)}
              onContextMenu={(event) => openContextMenu(event, element.id)}
            />
          );
        }
        return null;
      })}
      {contextMenu && (
        <div
          className="absolute z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
          onMouseLeave={() =>
            setContextMenu((prev) =>
              prev ? { ...prev, activeSubmenu: undefined } : prev
            )
          }
        >
          <div className="w-56 rounded-lg border border-black-25 bg-white-100 py-1 shadow-lg">
            <button
              type="button"
              onClick={copySelectedElements}
              className="flex w-full items-center justify-between px-3 py-2 text-14-regular text-black-90 hover:bg-black-5"
            >
              <span className="flex items-center gap-2">
                <Copy className="h-4 w-4" />
                복사
              </span>
            </button>
            <button
              type="button"
              onClick={pasteElements}
              disabled={!getClipboard()}
              className={`flex w-full items-center justify-between px-3 py-2 text-14-regular ${
                getClipboard()
                  ? "text-black-90 hover:bg-black-5"
                  : "text-black-40"
              }`}
            >
              <span className="flex items-center gap-2">
                <Clipboard className="h-4 w-4" />
                붙여넣기
              </span>
            </button>
            <button
              type="button"
              onClick={deleteSelectedElements}
              className="flex w-full items-center justify-between px-3 py-2 text-14-regular text-black-90 hover:bg-black-5"
            >
              <span className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                삭제
              </span>
            </button>
            <button
              type="button"
              onMouseEnter={() =>
                setContextMenu((prev) =>
                  prev ? { ...prev, activeSubmenu: "layer" } : prev
                )
              }
              className="flex w-full items-center justify-between px-3 py-2 text-14-regular text-black-90 hover:bg-black-5"
            >
              <span className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                레이어
              </span>
              <ChevronRight className="h-4 w-4 text-black-50" />
            </button>
          </div>
          {contextMenu.activeSubmenu === "layer" && (() => {
            const index = elements.findIndex(
              (element) => element.id === contextMenu.id
            );
            const canForward = index < elements.length - 1;
            const canBackward = index > 0;
            const items = [
              {
                key: "forward",
                label: "앞으로 가져오기",
                Icon: ArrowUpFromLine,
                enabled: canForward,
                action: () => moveElement(contextMenu.id, "forward"),
              },
              {
                key: "front",
                label: "맨 앞으로 가져오기",
                Icon: ChevronsUp,
                enabled: canForward,
                action: () => moveElement(contextMenu.id, "front"),
              },
              {
                key: "backward",
                label: "뒤로 보내기",
                Icon: ArrowUpToLine,
                enabled: canBackward,
                action: () => moveElement(contextMenu.id, "backward"),
              },
              {
                key: "back",
                label: "맨 뒤로 보내기",
                Icon: ChevronsDown,
                enabled: canBackward,
                action: () => moveElement(contextMenu.id, "back"),
              },
            ];
            return (
              <div className="absolute left-full top-0 ml-2 w-60 rounded-lg border border-black-25 bg-white-100 py-1 shadow-lg">
                {items.map(({ key, label, Icon, enabled, action }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={action}
                    disabled={!enabled}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-14-regular ${
                      enabled
                        ? "text-black-90 hover:bg-black-5"
                        : "text-black-40"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            );
          })()}
        </div>
      )}
      <SmartGuideOverlay guides={smartGuides.guides} />
    </div>
  );
};

export default DesignPaper;
