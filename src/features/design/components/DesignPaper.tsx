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
  Group,
  Layers,
  Trash2,
  Ungroup,
} from "lucide-react";
import type {
  CanvasElement,
  LineElement,
  ShapeElement,
  TextElement,
  ResizeHandle,
} from "../model/canvasTypes";
import SmartGuideOverlay from "./SmartGuideOverlay";
import { useSmartGuides } from "../model/useSmartGuides";
import Arrow from "./template_component/arrow/Arrow";
import CircleBox from "./template_component/circle/CircleBox";
import Line from "./template_component/line/Line";
import RoundBox from "./template_component/round_box/RoundBox";
import TextBox from "./template_component/text/TextBox";
import { useSideBarStore } from "../store/sideBarStore";
import { measureTextBoxSize } from "../utils/textMeasure";

interface DesignPaperProps {
  pageId: string;
  orientation: "horizontal" | "vertical";
  elements: CanvasElement[];
  selectedIds?: string[];
  editingTextId?: string | null;
  onElementsChange?: (elements: CanvasElement[]) => void;
  onSelectedIdsChange?: (ids: string[]) => void;
  onEditingTextIdChange?: (id: string | null) => void;
  onInteractionChange?: (
    isActive: boolean,
    context?: { type: "drag" | "resize" }
  ) => void;
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
type Point = LineElement["start"];
type GroupDragItem =
  | { kind: "rect"; rect: Rect }
  | { kind: "line"; line: { start: Point; end: Point } };
type GroupDragState = {
  activeId: string;
  activeKind: GroupDragItem["kind"];
  activeRect?: Rect;
  activeLine?: { start: Point; end: Point };
  items: Map<string, GroupDragItem>;
};
type SelectionRect = { x: number; y: number; width: number; height: number };

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;
const PAGE_WIDTH_PX = mmToPx(210);
const PAGE_HEIGHT_PX = mmToPx(297);
const GUIDE_THRESHOLD_PX = 6;
const SNAP_THRESHOLD_PX = 3;
const RECT_TOLERANCE = 1;
const DEFAULT_TEXT_FONT_SIZE = 24;
const DEFAULT_TEXT_LINE_HEIGHT = 1.2;
const PASTE_TEXT_WIDTH = 400;
const DEFAULT_STROKE: LineElement["stroke"] = {
  color: "#000000",
  width: 2,
};

const isEmotionSlotShape = (
  element: CanvasElement
): element is ShapeElement =>
  (element.type === "rect" ||
    element.type === "roundRect" ||
    element.type === "ellipse") &&
  element.border?.enabled === true &&
  element.border?.color === "#A5B4FC";

const isEmotionPlaceholderText = (
  element: CanvasElement
): element is TextElement =>
  element.type === "text" &&
  element.style.fontSize === 10 &&
  element.style.fontWeight === "normal" &&
  element.style.color === "#A5B4FC" &&
  element.style.alignX === "center" &&
  element.style.alignY === "middle";

const isEmotionLabelText = (
  element: CanvasElement
): element is TextElement =>
  element.type === "text" &&
  element.style.fontWeight === "normal" &&
  element.style.color === "#111827" &&
  element.style.alignX === "center" &&
  element.style.alignY === "middle";

const EMOTION_LABEL_TOLERANCE = 8;
const EMOTION_PLACEHOLDER_TOLERANCE = 8;

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
  onInteractionChange,
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
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [editingShapeTextId, setEditingShapeTextId] = useState<string | null>(null);
  const activeInteractionRef = useRef<{
    id: string;
    type: "drag" | "resize";
    startRect?: Rect;
    startFontSize?: number;
    handle?: ResizeHandle;
  } | null>(null);
  const groupDragRef = useRef<GroupDragState | null>(null);
  const selectedIdsRef = useRef<string[]>(selectedIds);
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const selectionAdditiveRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const isHorizontal = orientation === "horizontal";
  const pageWidth = isHorizontal ? PAGE_HEIGHT_PX : PAGE_WIDTH_PX;
  const pageHeight = isHorizontal ? PAGE_WIDTH_PX : PAGE_HEIGHT_PX;
  const smartGuides = useSmartGuides({
    canvasWidth: pageWidth,
    canvasHeight: pageHeight,
    threshold: GUIDE_THRESHOLD_PX,
    snapThreshold: SNAP_THRESHOLD_PX,
  });

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);
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

  const findEmotionPlaceholderId = useCallback(
    (shape: ShapeElement) => {
      const exactId = findEmotionSlotTextId(shape);
      if (exactId) return exactId;
      const shapeRect = getRectFromElement(shape);
      if (!shapeRect) return null;
      const targetCenterX = shapeRect.x + shapeRect.width / 2;
      const targetCenterY = shapeRect.y + shapeRect.height / 2;
      let bestId: string | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      elements.forEach((element) => {
        if (!isEmotionPlaceholderText(element)) return;
        const centerX = element.x + element.w / 2;
        const centerY = element.y + element.h / 2;
        if (
          centerX < shapeRect.x - EMOTION_PLACEHOLDER_TOLERANCE ||
          centerX >
            shapeRect.x + shapeRect.width + EMOTION_PLACEHOLDER_TOLERANCE
        ) {
          return;
        }
        if (
          centerY < shapeRect.y - EMOTION_PLACEHOLDER_TOLERANCE ||
          centerY >
            shapeRect.y + shapeRect.height + EMOTION_PLACEHOLDER_TOLERANCE
        ) {
          return;
        }
        const distance = Math.hypot(
          centerX - targetCenterX,
          centerY - targetCenterY
        );
        if (distance < bestDistance) {
          bestDistance = distance;
          bestId = element.id;
        }
      });
      return bestId;
    },
    [elements, findEmotionSlotTextId]
  );

  const findEmotionLabelId = useCallback(
    (shape: ShapeElement) => {
      const shapeRect = getRectFromElement(shape);
      if (!shapeRect) return null;
      const targetCenterX = shapeRect.x + shapeRect.width / 2;
      let bestId: string | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      elements.forEach((element) => {
        if (!isEmotionLabelText(element)) return;
        const centerX = element.x + element.w / 2;
        const matchesCenter =
          Math.abs(centerX - targetCenterX) <= EMOTION_LABEL_TOLERANCE;
        const matchesLeft =
          Math.abs(element.x - shapeRect.x) <= EMOTION_LABEL_TOLERANCE;
        if (!matchesCenter && !matchesLeft) {
          return;
        }
        const centerY = element.y + element.h / 2;
        const distance = centerY - (shapeRect.y + shapeRect.height);
        if (distance < -EMOTION_LABEL_TOLERANCE) return;
        if (distance < bestDistance) {
          bestDistance = distance;
          bestId = element.id;
        }
      });
      return bestId;
    },
    [elements]
  );

  const emotionSlotTextIds = new Set<string>();
  elements.forEach((element) => {
    if (!isEmotionSlotShape(element)) return;
    const slotTextId = findEmotionPlaceholderId(element);
    if (slotTextId) {
      emotionSlotTextIds.add(slotTextId);
    }
  });

  const applyEmotionSlotRectUpdate = useCallback(
    (shapeId: string, nextRect: Rect) => {
      if (readOnly || !onElementsChange) return;
      const shape = elements.find(
        (element) => element.id === shapeId
      );
      if (!shape || !isEmotionSlotShape(shape)) return;
      const shapeRect = getRectFromElement(shape) ?? {
        x: shape.x,
        y: shape.y,
        width: shape.w,
        height: shape.h,
      };
      const placeholderId = findEmotionPlaceholderId(shape);
      const labelId = findEmotionLabelId(shape);
      const label = labelId
        ? elements.find(
            (element) => element.id === labelId && element.type === "text"
          )
        : null;
      const labelOffset =
        label && label.type === "text"
          ? label.y - (shapeRect.y + shapeRect.height)
          : 0;
      const nextElements = elements.map((element) => {
        if (element.id === shapeId && "x" in element) {
          return {
            ...element,
            x: nextRect.x,
            y: nextRect.y,
            w: nextRect.width,
            h: nextRect.height,
          } as ShapeElement;
        }
        if (placeholderId && element.id === placeholderId) {
          return {
            ...element,
            x: nextRect.x,
            y: nextRect.y,
            w: nextRect.width,
            h: nextRect.height,
            widthMode: "fixed",
          } as TextElement;
        }
        if (labelId && element.id === labelId) {
          return {
            ...element,
            x: nextRect.x,
            y: nextRect.y + nextRect.height + labelOffset,
            w: nextRect.width,
            widthMode: "fixed",
          } as TextElement;
        }
        return element;
      });
      onElementsChange(nextElements);
    },
    [
      elements,
      findEmotionLabelId,
      findEmotionPlaceholderId,
      onElementsChange,
      readOnly,
    ]
  );

  const getContainerScale = useCallback(() => {
    const node = containerRef.current;
    if (!node) return 1;
    const rect = node.getBoundingClientRect();
    return node.offsetWidth ? rect.width / node.offsetWidth : 1;
  }, []);

  const getPointerPosition = useCallback(
    (event: PointerEvent | ReactPointerEvent<HTMLElement>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      const scale = getContainerScale();
      return {
        x: (event.clientX - rect.left) / scale,
        y: (event.clientY - rect.top) / scale,
      };
    },
    [getContainerScale]
  );

  const getElementBoundsForSelection = (element: CanvasElement): Rect | null => {
    if (element.visible === false) return null;
    if (element.type === "line" || element.type === "arrow") {
      const stroke = element.stroke ?? DEFAULT_STROKE;
      const markerPadding = element.type === "arrow" ? 12 : 0;
      const padding = Math.max(6, stroke.width, markerPadding);
      const minX = Math.min(element.start.x, element.end.x) - padding;
      const minY = Math.min(element.start.y, element.end.y) - padding;
      const width = Math.max(Math.abs(element.end.x - element.start.x), 1) + padding * 2;
      const height = Math.max(Math.abs(element.end.y - element.start.y), 1) + padding * 2;
      return { x: minX, y: minY, width, height };
    }
    return getRectFromElement(element);
  };

  const normalizeSelectionRect = (
    start: { x: number; y: number },
    current: { x: number; y: number }
  ): SelectionRect => ({
    x: Math.min(start.x, current.x),
    y: Math.min(start.y, current.y),
    width: Math.abs(current.x - start.x),
    height: Math.abs(current.y - start.y),
  });

  const rectsIntersect = (a: SelectionRect, b: Rect) =>
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;

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
        const baseStroke = (element as LineElement).stroke ?? DEFAULT_STROKE;
        const patchStroke = (patch as LineElementPatch).stroke;
        const nextStroke = patchStroke
          ? {
              ...baseStroke,
              ...patchStroke,
            }
          : baseStroke;
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

  const clearEmotionSlotImage = useCallback(
    (shapeId: string) => {
      if (readOnly || !onElementsChange) return;
      const target = elements.find((element) => element.id === shapeId);
      if (!target || !isEmotionSlotShape(target)) return;
      const isImageFill =
        target.fill.startsWith("url(") || target.fill.startsWith("data:");
      if (!isImageFill) return;
      const placeholderId = findEmotionPlaceholderId(target);
      const nextElements = elements.map((element) => {
        if (element.id === target.id) {
          return {
            ...element,
            fill: "#FFFFFF",
            imageBox: undefined,
          };
        }
        if (
          placeholderId &&
          element.id === placeholderId &&
          element.type === "text"
        ) {
          return { ...element, text: "감정을 선택해주세요" };
        }
        return element;
      });
      onElementsChange(nextElements);
    },
    [elements, findEmotionPlaceholderId, onElementsChange, readOnly]
  );

  const buildGroupDragState = useCallback(
    (activeId: string): GroupDragState | null => {
      const activeSelectedIds = selectedIdsRef.current;
      if (activeSelectedIds.length <= 1) return null;
      const items = new Map<string, GroupDragItem>();
      elements.forEach((element) => {
        if (!activeSelectedIds.includes(element.id) || element.locked) return;
        if (element.type === "line" || element.type === "arrow") {
          items.set(element.id, {
            kind: "line",
            line: {
              start: { ...element.start },
              end: { ...element.end },
            },
          });
          return;
        }
        if ("x" in element && "y" in element && "w" in element && "h" in element) {
          items.set(element.id, {
            kind: "rect",
            rect: {
              x: element.x,
              y: element.y,
              width: element.w,
              height: element.h,
            },
          });
        }
      });
      const activeItem = items.get(activeId);
      if (!activeItem) return null;
      return {
        activeId,
        activeKind: activeItem.kind,
        activeRect: activeItem.kind === "rect" ? activeItem.rect : undefined,
        activeLine: activeItem.kind === "line" ? activeItem.line : undefined,
        items,
      };
    },
    [elements]
  );

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

  const applyGroupDelta = useCallback(
    (delta: { x: number; y: number }) => {
      if (readOnly || !onElementsChange) return;
      const snapshot = groupDragRef.current;
      if (!snapshot) return;
      const selectedIds = new Set(snapshot.items.keys());
      const linkedIds = new Set<string>();
      elements.forEach((element) => {
        if (!selectedIds.has(element.id)) return;
        if (!isEmotionSlotShape(element)) return;
        const placeholderId = findEmotionPlaceholderId(element);
        const labelId = findEmotionLabelId(element);
        if (placeholderId && !selectedIds.has(placeholderId)) {
          linkedIds.add(placeholderId);
        }
        if (labelId && !selectedIds.has(labelId)) {
          linkedIds.add(labelId);
        }
      });
      const nextElements = elements.map((element) => {
        const item = snapshot.items.get(element.id);
        if (!item) return element;
        if (item.kind === "line" && (element.type === "line" || element.type === "arrow")) {
          return {
            ...element,
            start: {
              x: item.line.start.x + delta.x,
              y: item.line.start.y + delta.y,
            },
            end: {
              x: item.line.end.x + delta.x,
              y: item.line.end.y + delta.y,
            },
          };
        }
        if (item.kind === "rect" && "x" in element && "y" in element) {
          return {
            ...element,
            x: item.rect.x + delta.x,
            y: item.rect.y + delta.y,
          };
        }
        return element;
      });
      const nextElementsWithLinked = linkedIds.size
        ? nextElements.map((element) => {
            if (!linkedIds.has(element.id)) return element;
            if (!("x" in element && "y" in element)) return element;
            return {
              ...element,
              x: element.x + delta.x,
              y: element.y + delta.y,
            } as CanvasElement;
          })
        : nextElements;
      onElementsChange(nextElementsWithLinked);
    },
    [
      elements,
      findEmotionLabelId,
      findEmotionPlaceholderId,
      onElementsChange,
      readOnly,
    ]
  );

  const handleRectChange = (elementId: string, nextRect: Rect) => {
    const activeInteraction = activeInteractionRef.current;
    if (!activeInteraction || activeInteraction.id !== elementId) {
      const targetElement = elements.find((element) => element.id === elementId);
      const updates: Partial<ShapeElement> = {
        w: nextRect.width,
        h: nextRect.height,
      };

      // 이미지가 있는 요소의 경우 imageBox도 함께 업데이트
      if (targetElement &&
          (targetElement.type === "rect" || targetElement.type === "roundRect" || targetElement.type === "ellipse") &&
          targetElement.fill &&
          (targetElement.fill.startsWith("url(") || targetElement.fill.startsWith("data:"))) {
        updates.imageBox = {
          x: 0,
          y: 0,
          w: nextRect.width,
          h: nextRect.height,
        };
      }

      updateElement(elementId, updates);
      return;
    }
    const groupDrag = groupDragRef.current;
    if (
      groupDrag &&
      groupDrag.activeId === elementId &&
      activeInteraction.type === "drag"
    ) {
      if (groupDrag.activeKind !== "rect" || !groupDrag.activeRect) return;
      const delta = {
        x: nextRect.x - groupDrag.activeRect.x,
        y: nextRect.y - groupDrag.activeRect.y,
      };
      applyGroupDelta(delta);
      setActivePreview(null);
      return;
    }
    const targetElement = elements.find((element) => element.id === elementId);
    if (
      activeInteraction.type === "resize" ||
      activeInteraction.type === "drag"
    ) {
      if (targetElement && isEmotionSlotShape(targetElement)) {
        applyEmotionSlotRectUpdate(elementId, nextRect);
        setActivePreview(null);
        return;
      }
    }
    if (
      activeInteraction.type === "resize" &&
      targetElement &&
      targetElement.type === "text"
    ) {
      const startRect =
        activeInteraction.startRect ??
        ("x" in targetElement && "w" in targetElement
          ? {
              x: targetElement.x,
              y: targetElement.y,
              width: targetElement.w,
              height: targetElement.h,
            }
          : nextRect);
      const handle = activeInteraction.handle;
      const hasWidthHandle =
        handle != null && (handle.includes("e") || handle.includes("w"));
      const shouldScaleFont =
        handle != null && ["nw", "ne", "sw", "se"].includes(handle);
      const baseFontSize =
        activeInteraction.startFontSize ?? targetElement.style.fontSize;
      const heightRatio = startRect.height
        ? nextRect.height / startRect.height
        : 1;
      const nextFontSize = shouldScaleFont
        ? Math.max(6, Math.round(baseFontSize * heightRatio))
        : baseFontSize;
      const patch: TextElementPatch = {
        x: nextRect.x,
        y: nextRect.y,
        w: nextRect.width,
        h: nextRect.height,
      };
      if (hasWidthHandle) {
        patch.widthMode = "fixed";
      }
      if (shouldScaleFont) {
        patch.style = { fontSize: nextFontSize };
      }
      updateElement(elementId, patch);
      setActivePreview({ id: elementId, rect: nextRect });
      return;
    }

    // Shape 요소의 resize 중 이미지가 있으면 실시간으로 imageBox 업데이트
    if (
      activeInteraction.type === "resize" &&
      targetElement &&
      (targetElement.type === "rect" || targetElement.type === "roundRect" || targetElement.type === "ellipse") &&
      targetElement.fill &&
      (targetElement.fill.startsWith("url(") || targetElement.fill.startsWith("data:"))
    ) {
      updateElement(elementId, {
        x: nextRect.x,
        y: nextRect.y,
        w: nextRect.width,
        h: nextRect.height,
        imageBox: {
          x: 0,
          y: 0,
          w: nextRect.width,
          h: nextRect.height,
        },
      });
      setActivePreview({ id: elementId, rect: nextRect });
      return;
    }

    setActivePreview({ id: elementId, rect: nextRect });
  };

  const handleDragStateChange = (
    elementId: string,
    isDragging: boolean,
    finalRect?: Rect,
    context?: { type: "drag" | "resize"; handle?: ResizeHandle }
  ) => {
    if (isDragging) {
      const targetElement = elements.find((element) => element.id === elementId);
      const startRect =
        finalRect ??
        (targetElement && "x" in targetElement && "w" in targetElement
          ? {
              x: targetElement.x,
              y: targetElement.y,
              width: targetElement.w,
              height: targetElement.h,
            }
          : undefined);
      const handle = context?.handle;
      const hasWidthHandle =
        handle != null && (handle.includes("e") || handle.includes("w"));
      if (
        targetElement &&
        targetElement.type === "text" &&
        context?.type === "resize" &&
        hasWidthHandle &&
        targetElement.widthMode !== "fixed"
      ) {
        updateElement(elementId, { widthMode: "fixed" });
      }
      activeInteractionRef.current = {
        id: elementId,
        type: context?.type ?? "drag",
        startRect,
        startFontSize:
          targetElement && targetElement.type === "text"
            ? targetElement.style.fontSize
            : undefined,
        handle,
      };
      if (context?.type === "drag") {
        groupDragRef.current = buildGroupDragState(elementId);
        if (groupDragRef.current) {
          setActivePreview(null);
        }
      } else {
        groupDragRef.current = null;
      }
      onInteractionChange?.(true, context);
      return;
    }
    const hadGroupDrag = groupDragRef.current?.activeId === elementId;
    if (hadGroupDrag) {
      groupDragRef.current = null;
    }
    if (finalRect && !hadGroupDrag) {
      const targetElement = elements.find((element) => element.id === elementId);
      const activeInteraction = activeInteractionRef.current;
      if (
        targetElement &&
        isEmotionSlotShape(targetElement) &&
        (context?.type === "drag" || context?.type === "resize")
      ) {
        applyEmotionSlotRectUpdate(elementId, finalRect);
        activeInteractionRef.current = null;
        setActivePreview(null);
        smartGuides.clear();
        return;
      }
      if (
        targetElement &&
        targetElement.type === "text" &&
        context?.type === "resize" &&
        activeInteraction?.startRect
      ) {
        const handle = activeInteraction.handle;
        const hasWidthHandle =
          handle != null && (handle.includes("e") || handle.includes("w"));
        const shouldScaleFont =
          handle != null && ["nw", "ne", "sw", "se"].includes(handle);
        const heightRatio =
          activeInteraction.startRect.height
            ? finalRect.height / activeInteraction.startRect.height
            : 1;
        const baseFontSize =
          activeInteraction.startFontSize ?? targetElement.style.fontSize;
        const nextFontSize = shouldScaleFont
          ? Math.max(6, Math.round(baseFontSize * heightRatio))
          : baseFontSize;
        const patch: TextElementPatch = {
          x: finalRect.x,
          y: finalRect.y,
          w: finalRect.width,
          h: finalRect.height,
        };
        if (hasWidthHandle) {
          patch.widthMode = "fixed";
        }
        if (shouldScaleFont) {
          patch.style = { fontSize: nextFontSize };
        }
        updateElement(elementId, patch);
      } else {
        const updates: Partial<ShapeElement> = {
          x: finalRect.x,
          y: finalRect.y,
          w: finalRect.width,
          h: finalRect.height,
        };

        // 이미지가 있는 요소의 경우 imageBox도 함께 업데이트
        if (targetElement &&
            (targetElement.type === "rect" || targetElement.type === "roundRect" || targetElement.type === "ellipse") &&
            targetElement.fill &&
            (targetElement.fill.startsWith("url(") || targetElement.fill.startsWith("data:"))) {
          updates.imageBox = {
            x: 0,
            y: 0,
            w: finalRect.width,
            h: finalRect.height,
          };
        }

        updateElement(elementId, updates);
      }
    }
    if (context?.type) {
      onInteractionChange?.(false, context);
    }
    activeInteractionRef.current = null;
    setActivePreview(null);
    smartGuides.clear();
  };

  const handleLineChange = (
    elementId: string,
    nextLine: { start: Point; end: Point }
  ) => {
    const groupDrag = groupDragRef.current;
    if (
      groupDrag &&
      groupDrag.activeId === elementId &&
      activeInteractionRef.current?.type === "drag"
    ) {
      if (groupDrag.activeKind !== "line" || !groupDrag.activeLine) return;
      const delta = {
        x: nextLine.start.x - groupDrag.activeLine.start.x,
        y: nextLine.start.y - groupDrag.activeLine.start.y,
      };
      applyGroupDelta(delta);
      return;
    }
    updateElement(elementId, { start: nextLine.start, end: nextLine.end });
  };

  const handleLineDragStateChange = (
    elementId: string,
    isDragging: boolean,
    _nextLine?: { start: Point; end: Point },
    context?: { type: "drag" | "resize" }
  ) => {
    void _nextLine;
    if (isDragging) {
      activeInteractionRef.current = {
        id: elementId,
        type: context?.type ?? "drag",
      };
      if (context?.type === "drag") {
        groupDragRef.current = buildGroupDragState(elementId);
      } else {
        groupDragRef.current = null;
      }
      onInteractionChange?.(true, context);
      return;
    }
    if (groupDragRef.current?.activeId === elementId) {
      groupDragRef.current = null;
    }
    activeInteractionRef.current = null;
    if (context?.type) {
      onInteractionChange?.(false, context);
    }
  };

  const handleSelect = (
    elementId: string,
    options?: { keepContextMenu?: boolean; additive?: boolean }
  ) => {
    if (readOnly) return;
    const currentSelectedIds = selectedIdsRef.current;
    const selectedElement = elements.find((element) => element.id === elementId);
    const groupedIds =
      selectedElement?.groupId != null
        ? elements
            .filter((element) => element.groupId === selectedElement.groupId)
            .map((element) => element.id)
        : [elementId];
    const orderedGroupedIds =
      selectedElement?.groupId != null
        ? [
            elementId,
            ...groupedIds.filter((id) => id !== elementId),
          ]
        : [elementId];
    const baseIds = options?.additive ? currentSelectedIds : [];
    const nextSelectedIds = [
      ...orderedGroupedIds,
      ...baseIds.filter((id) => !orderedGroupedIds.includes(id)),
    ];
    selectedIdsRef.current = nextSelectedIds;
    onSelectedIdsChange?.(nextSelectedIds);
    if (selectedElement && isEmotionSlotShape(selectedElement)) {
      setSideBarMenu("emotion");
    }
    if (editingImageId && editingImageId !== elementId) {
      setEditingImageId(null);
    }
    if (editingShapeTextId && editingShapeTextId !== elementId) {
      setEditingShapeTextId(null);
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
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    setContextMenu(null);
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

      const isClick =
        nextRect.width < 3 && nextRect.height < 3;
      if (isClick) {
        if (isAdditive) return;
        selectedIdsRef.current = [];
        onSelectedIdsChange?.([]);
        onEditingTextIdChange?.(null);
        // 요소 선택 해제 시 요소 클립보드 초기화 (페이지 복사가 가능하도록)
        sessionStorage.removeItem("copiedElements");
        return;
      }

      const hitIds = elements
        .map((element) => ({
          id: element.id,
          rect: getElementBoundsForSelection(element),
        }))
        .filter((item): item is { id: string; rect: Rect } => Boolean(item.rect))
        .filter((item) => rectsIntersect(nextRect, item.rect))
        .map((item) => item.id);

      const baseIds = isAdditive ? selectedIdsRef.current : [];
      const nextSelectedIds = [
        ...new Set([...baseIds, ...hitIds]),
      ];
      selectedIdsRef.current = nextSelectedIds;
      onSelectedIdsChange?.(nextSelectedIds);
      if (!isAdditive) {
        onEditingTextIdChange?.(null);
      }
    };

    window.addEventListener("pointermove", moveListener);
    window.addEventListener("pointerup", upListener);
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
      const slotTextId = findEmotionPlaceholderId(selectedElement);
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
    findEmotionPlaceholderId,
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
    if (!selectedIdsRef.current.includes(elementId)) {
      handleSelect(elementId, { keepContextMenu: true });
    }
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

  const setClipboard = useCallback((items: CanvasElement[]) => {
    try {
      sessionStorage.setItem("copiedElements", JSON.stringify(items));
    } catch {
      // ignore clipboard failures
    }
  }, []);

  const getClipboard = useCallback((): CanvasElement[] | null => {
    try {
      const raw = sessionStorage.getItem("copiedElements");
      if (!raw) return null;
      return JSON.parse(raw) as CanvasElement[];
    } catch {
      return null;
    }
  }, []);

  const copySelectedElements = useCallback(() => {
    const selected = elements.filter((element) =>
      selectedIds.includes(element.id)
    );
    if (selected.length === 0) return;
    setClipboard(selected);
    setContextMenu(null);
  }, [elements, selectedIds, setClipboard]);

  const pasteElements = useCallback(() => {
    if (readOnly || !onElementsChange) return;
    const clipboard = getClipboard();
    if (!clipboard || clipboard.length === 0) return;
    const offset = 10;
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
    setContextMenu(null);
  }, [readOnly, onElementsChange, elements, onSelectedIdsChange, getClipboard]);

  const groupSelectedElements = () => {
    if (readOnly || !onElementsChange) return;
    const ids = selectedIdsRef.current;
    if (ids.length < 2) return;
    const nextGroupId = crypto.randomUUID();
    const nextElements = elements.map((element) =>
      ids.includes(element.id) ? { ...element, groupId: nextGroupId } : element
    );
    onElementsChange(nextElements);
    setContextMenu(null);
  };

  const ungroupSelectedElements = () => {
    if (readOnly || !onElementsChange) return;
    const ids = selectedIdsRef.current;
    const groupIds = new Set(
      elements
        .filter((element) => ids.includes(element.id) && element.groupId)
        .map((element) => element.groupId as string)
    );
    if (groupIds.size === 0) return;
    const nextElements = elements.map((element) =>
      element.groupId && groupIds.has(element.groupId)
        ? { ...element, groupId: undefined }
        : element
    );
    onElementsChange(nextElements);
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

      if (event.key === "Escape") {
        selectedIdsRef.current = [];
        onSelectedIdsChange?.([]);
        onEditingTextIdChange?.(null);
        setContextMenu(null);
        sessionStorage.removeItem("copiedElements");
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        if (editingImageId) {
          const targetElement = elements.find(
            (element) => element.id === editingImageId
          );
          if (targetElement && isEmotionSlotShape(targetElement)) {
            event.preventDefault();
            clearEmotionSlotImage(editingImageId);
            setEditingImageId(null);
            return;
          }
        }
      }

      if (
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown"
      ) {
        if (selectedIds.length === 0) return;
        event.preventDefault();
        const delta =
          event.key === "ArrowLeft"
            ? { x: -1, y: 0 }
            : event.key === "ArrowRight"
            ? { x: 1, y: 0 }
            : event.key === "ArrowUp"
            ? { x: 0, y: -1 }
            : { x: 0, y: 1 };
        onElementsChange(
          elements.map((element) => {
            if (!selectedIds.includes(element.id) || element.locked) {
              return element;
            }
            if (element.type === "line" || element.type === "arrow") {
              return {
                ...element,
                start: {
                  x: element.start.x + delta.x,
                  y: element.start.y + delta.y,
                },
                end: {
                  x: element.end.x + delta.x,
                  y: element.end.y + delta.y,
                },
              };
            }
            if ("x" in element && "y" in element) {
              return {
                ...element,
                x: element.x + delta.x,
                y: element.y + delta.y,
              };
            }
            return element;
          })
        );
        return;
      }

      // Ctrl+C 또는 Cmd+C (요소 복사)
      if ((event.ctrlKey || event.metaKey) && event.key === "c") {
        if (selectedIds.length === 0) return;
        copySelectedElements();
      }

      // Ctrl+V 또는 Cmd+V (요소 붙여넣기)
      if ((event.ctrlKey || event.metaKey) && event.key === "v") {
        const clipboard = getClipboard();
        if (!clipboard || clipboard.length === 0) return;
        event.preventDefault();
        pasteElements();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    readOnly,
    onElementsChange,
    editingTextId,
    editingImageId,
    clearEmotionSlotImage,
    onEditingTextIdChange,
    onSelectedIdsChange,
    selectedIds,
    copySelectedElements,
    pasteElements,
    getClipboard,
    elements,
  ]);

  const deleteElementById = useCallback(
    (id: string) => {
      if (readOnly || !onElementsChange) return;
      onElementsChange(
        elements.filter((element) => element.id !== id)
      );
      const nextSelected = selectedIdsRef.current.filter(
        (selectedId) => selectedId !== id
      );
      selectedIdsRef.current = nextSelected;
      onSelectedIdsChange?.(nextSelected);
      if (editingTextId === id) {
        onEditingTextIdChange?.(null);
      }
      if (editingImageId === id) {
        setEditingImageId(null);
      }
      setContextMenu((prev) => (prev?.id === id ? null : prev));
    },
    [
      readOnly,
      onElementsChange,
      elements,
      onSelectedIdsChange,
      onEditingTextIdChange,
      editingTextId,
      editingImageId,
    ]
  );

  const deleteSelectedElements = () => {
    if (readOnly || !onElementsChange) return;
    if (selectedIds.length === 0) return;
    onElementsChange(
      elements.filter((element) => !selectedIds.includes(element.id))
    );
    selectedIdsRef.current = [];
    onSelectedIdsChange?.([]);
    onEditingTextIdChange?.(null);
    setContextMenu(null);
  };

  const selectedGroupId =
    selectedIds.length > 1
      ? elements.find((element) => element.id === selectedIds[0])?.groupId ??
        null
      : null;
  const isGroupedSelection =
    selectedGroupId != null &&
    selectedIds.length > 1 &&
    selectedIds.every(
      (id) =>
        elements.find((element) => element.id === id)?.groupId ===
        selectedGroupId
    );
  const canGroupSelection = selectedIds.length > 1;
  const canUngroupSelection = elements.some(
    (element) => selectedIds.includes(element.id) && element.groupId
  );

  // Handle global paste events
  useEffect(() => {
    if (readOnly || !onElementsChange) return;

    const handlePaste = (event: ClipboardEvent) => {
      // Check if we're pasting into a text box or input field (don't create new one)
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.closest('[contenteditable="true"]') ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA")
      ) {
        return;
      }

      const rawText = event.clipboardData?.getData("text/plain") ?? "";
      if (!rawText.trim()) return;

      event.preventDefault();

      // Create a new text element at the last pointer position or canvas center
      const container = containerRef.current;
      if (!container) return;

      const basePoint = lastPointerRef.current;
      const centerX =
        basePoint?.x ??
        container.offsetWidth / 2;
      const centerY =
        basePoint?.y ??
        container.offsetHeight / 2;

      const { height } = measureTextBoxSize(
        rawText,
        DEFAULT_TEXT_FONT_SIZE,
        "normal",
        {
          lineHeight: DEFAULT_TEXT_LINE_HEIGHT,
          maxWidth: PASTE_TEXT_WIDTH,
        }
      );
      const x = centerX - PASTE_TEXT_WIDTH / 2;
      const y = centerY - Math.max(height, 1) / 2;

      const newTextElement: Omit<TextElement, "id"> = {
        type: "text",
        text: rawText,
        richText: undefined,
        x,
        y,
        w: PASTE_TEXT_WIDTH,
        h: Math.max(height, 1),
        widthMode: "fixed",
        style: {
          fontSize: DEFAULT_TEXT_FONT_SIZE,
          fontWeight: "normal",
          color: "#000000",
          underline: false,
          alignX: "left",
          alignY: "top",
          lineHeight: DEFAULT_TEXT_LINE_HEIGHT,
          letterSpacing: 0,
        },
        locked: false,
        visible: true,
      };

      const newId = crypto.randomUUID();
      const newElement: TextElement = { ...newTextElement, id: newId };

      onElementsChange([...elements, newElement]);
      selectedIdsRef.current = [newId];
      onSelectedIdsChange?.([newId]);
      onEditingTextIdChange?.(null);
    };

    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [
    readOnly,
    onElementsChange,
    elements,
    onSelectedIdsChange,
    onEditingTextIdChange,
  ]);

  return (
    <div
      ref={containerRef}
      className={`relative bg-white shrink-0 ${
        showShadow ? "shadow-lg" : ""
      } ${isHorizontal ? "w-[297mm] h-[210mm]" : "w-[210mm] h-[297mm]"} ${
        className ?? ""
      }`}
      data-page-id={pageId}
      onPointerDownCapture={(event) => {
        lastPointerRef.current = getPointerPosition(event);
      }}
      onPointerMoveCapture={(event) => {
        lastPointerRef.current = getPointerPosition(event);
      }}
      onPointerDown={readOnly ? undefined : handleBackgroundPointerDown}
    >
      {elements.map((element) => {
        if (element.type === "text") {
          const isSelected = selectedIds.includes(element.id);
          const showToolbar = selectedIds[0] === element.id;
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
          const lineHeight = element.style.lineHeight ?? 1.3;
          const letterSpacing = element.style.letterSpacing ?? 0;
          const fontWeight =
            element.style.fontWeight === "bold" ? 700 : 400;
          const minTextHeight = element.lockHeight ? rect.height : 1;
          return (
            <TextBox
              key={element.id}
              text={element.text}
              richText={element.richText}
              editable={!readOnly && (!element.locked || forceEditable)}
              rect={rect}
              minWidth={1}
              minHeight={minTextHeight}
              showChrome={!isEmotionSlotText}
              textClassName="text-headline-42-semibold"
              textStyle={{
                fontSize: `${element.style.fontSize}px`,
                fontWeight,
                color: element.style.color,
                textDecoration: element.style.underline ? "underline" : "none",
                lineHeight,
                letterSpacing,
              }}
              textAlign={element.style.alignX}
              textAlignY={element.style.alignY}
              isSelected={isSelected}
              isEditing={isEditing}
              locked={locked}
              showToolbar={showToolbar}
              widthMode={element.widthMode ?? "auto"}
              toolbar={{
                offset: mmToPx(4),
                minFontSize,
                maxFontSize,
                fontSize: element.style.fontSize,
                lineHeight,
                letterSpacing,
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
                onLineHeightChange: (value) =>
                  updateElement(element.id, { style: { lineHeight: value } }),
                onLetterSpacingChange: (value) =>
                  updateElement(element.id, {
                    style: { letterSpacing: value },
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
              onTextChange={(nextText, nextRichText) =>
                updateElement(element.id, { text: nextText, richText: nextRichText })
              }
              onRectChange={
                isEmotionSlotText
                  ? undefined
                  : (nextRect) => handleRectChange(element.id, nextRect)
              }
              onWidthModeChange={(mode) =>
                updateElement(element.id, { widthMode: mode })
              }
              onDragStateChange={(isDragging, finalRect, context) =>
                handleDragStateChange(element.id, isDragging, finalRect, context)
              }
              onSelectChange={(isSelected, options) => {
                if (isSelected) {
                  handleSelect(element.id, options);
                }
              }}
              onContextMenu={(event) => openContextMenu(event, element.id)}
              onStartEditing={() =>
                onEditingTextIdChange?.(element.id)
              }
              onFinishEditing={() => onEditingTextIdChange?.(null)}
              onRequestDelete={() => deleteElementById(element.id)}
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
          const isImageFill =
            element.fill.startsWith("url(") ||
            element.fill.startsWith("data:");
          const isImageEditing =
            isImageFill && editingImageId === element.id && isSelected;
          const imageBox = element.imageBox;

          const ShapeComponent =
            element.type === "ellipse" ? CircleBox : RoundBox;
          const handleImageBoxChange =
            readOnly || element.locked || !isImageFill
              ? undefined
              : (value: { x: number; y: number; w: number; h: number }) =>
                  updateElement(element.id, { imageBox: value });

          const isShapeTextEditing = editingShapeTextId === element.id;

          return (
            <ShapeComponent
              key={element.id}
              rect={rect}
              minWidth={1}
              minHeight={1}
              borderRadius={radius}
              fill={element.fill}
              imageBox={imageBox}
              border={element.border}
              text={element.text}
              textStyle={element.textStyle}
              isSelected={isSelected}
              isImageEditing={isImageEditing}
              isTextEditing={isShapeTextEditing}
              locked={readOnly || element.locked}
              onImageEditingChange={(isEditing: boolean) =>
                setEditingImageId(isEditing ? element.id : null)
              }
              onTextEditingChange={(isEditing: boolean) =>
                setEditingShapeTextId(isEditing ? element.id : null)
              }
              onTextChange={(text: string) =>
                updateElement(element.id, { text })
              }
              onImageBoxChange={handleImageBoxChange}
              onImageDrop={
                readOnly || element.locked
                  ? undefined
                  : (imageUrl) =>
                      updateElement(element.id, {
                        fill: imageUrl.startsWith("url(")
                          ? imageUrl
                          : `url(${imageUrl})`,
                        imageBox: {
                          x: 0,
                          y: 0,
                          w: rect.width,
                          h: rect.height,
                        },
                      })
              }
              onRectChange={(nextRect) =>
                handleRectChange(element.id, nextRect)
              }
              onDragStateChange={(isDragging, finalRect, context) =>
                handleDragStateChange(element.id, isDragging, finalRect, context)
              }
              onSelectChange={(isSelected, options) => {
                if (isSelected) {
                  handleSelect(element.id, options);
                }
              }}
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
          const stroke = element.stroke ?? DEFAULT_STROKE;
          const isSelected = selectedIds.includes(element.id);

          if (element.type === "line") {
            return (
              <Line
                key={element.id}
                id={element.id}
                start={element.start}
                end={element.end}
                stroke={stroke}
                isSelected={isSelected}
                locked={readOnly || element.locked}
                onLineChange={(nextLine) => handleLineChange(element.id, nextLine)}
                onDragStateChange={(isDragging, nextLine, context) =>
                  handleLineDragStateChange(
                    element.id,
                    isDragging,
                    nextLine,
                    context
                  )
                }
                onSelectChange={(isSelected, options) => {
                  if (isSelected) {
                    handleSelect(element.id, options);
                  }
                }}
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
              stroke={stroke}
              isSelected={isSelected}
              locked={readOnly || element.locked}
              onLineChange={(nextLine) => handleLineChange(element.id, nextLine)}
              onDragStateChange={(isDragging, nextLine, context) =>
                handleLineDragStateChange(
                  element.id,
                  isDragging,
                  nextLine,
                  context
                )
              }
              onSelectChange={(isSelected, options) => {
                if (isSelected) {
                  handleSelect(element.id, options);
                }
              }}
              onContextMenu={(event) => openContextMenu(event, element.id)}
            />
          );
        }
        return null;
      })}
      {selectionRect && (
        <div
          className="absolute z-40 border border-primary/60 bg-primary/10 pointer-events-none"
          style={{
            left: selectionRect.x,
            top: selectionRect.y,
            width: selectionRect.width,
            height: selectionRect.height,
          }}
        />
      )}
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
            {canGroupSelection && (
              <button
                type="button"
                onClick={groupSelectedElements}
                disabled={isGroupedSelection}
                className={`flex w-full items-center justify-between px-3 py-2 text-14-regular ${
                  isGroupedSelection
                    ? "cursor-not-allowed text-black-40"
                    : "text-black-90 hover:bg-black-5"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Group className="h-4 w-4" />
                  그룹화
                </span>
              </button>
            )}
            {canUngroupSelection && (
              <button
                type="button"
                onClick={ungroupSelectedElements}
                className="flex w-full items-center justify-between px-3 py-2 text-14-regular text-black-90 hover:bg-black-5"
              >
                <span className="flex items-center gap-2">
                  <Ungroup className="h-4 w-4" />
                  그룹 해제
                </span>
              </button>
            )}
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
