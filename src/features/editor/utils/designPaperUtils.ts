import type {
  CanvasElement,
  LineElement,
  ShapeElement,
  TextElement,
} from "../model/canvasTypes";

export type Rect = { x: number; y: number; width: number; height: number };
export type SelectionRect = Rect;

export const RECT_TOLERANCE = 1;
export const DEFAULT_TEXT_LINE_HEIGHT = 1.2;
export const DEFAULT_STROKE: LineElement["stroke"] = {
  color: "#000000",
  width: 2,
};

export const isEditableTarget = (
  target: EventTarget | null
): target is HTMLElement => {
  if (!target) return false;
  const element = target as HTMLElement;
  if (!element.tagName) return false;
  return (
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    element.isContentEditable
  );
};

export const isEmotionSlotShape = (
  element: CanvasElement
): element is ShapeElement =>
  (element.type === "rect" ||
    element.type === "roundRect" ||
    element.type === "ellipse") &&
  element.border?.enabled === true &&
  element.border?.color === "#A5B4FC";

const isNormalWeight = (weight: TextElement["style"]["fontWeight"]) =>
  weight === "normal" || weight === 400;

export const isEmotionPlaceholderText = (
  element: CanvasElement
): element is TextElement =>
  element.type === "text" &&
  element.style.fontSize === 10 &&
  isNormalWeight(element.style.fontWeight) &&
  element.style.color === "#A5B4FC" &&
  element.style.alignX === "center" &&
  element.style.alignY === "middle";

export const isEmotionLabelText = (
  element: CanvasElement
): element is TextElement =>
  element.type === "text" &&
  isNormalWeight(element.style.fontWeight) &&
  element.style.color === "#111827" &&
  element.style.alignX === "center" &&
  element.style.alignY === "middle";

export const getRectFromElement = (element: CanvasElement): Rect | null => {
  if ("x" in element && "w" in element && "h" in element) {
    return {
      x: element.x,
      y: element.y,
      width: element.w,
      height: element.h,
    };
  }
  if (element.type === "line" || element.type === "arrow") {
    const strokeWidth = element.stroke?.width ?? DEFAULT_STROKE.width;
    const halfStroke = Math.max(strokeWidth, 1) / 2;
    const minX = Math.min(element.start.x, element.end.x);
    const minY = Math.min(element.start.y, element.end.y);
    const width = Math.max(Math.abs(element.end.x - element.start.x), 1);
    const height = Math.max(Math.abs(element.end.y - element.start.y), 1);
    return {
      x: minX - halfStroke,
      y: minY - halfStroke,
      width: width + halfStroke * 2,
      height: height + halfStroke * 2,
    };
  }
  return null;
};

export const isSameRect = (rect: Rect, element: TextElement) =>
  Math.abs(rect.x - element.x) <= RECT_TOLERANCE &&
  Math.abs(rect.y - element.y) <= RECT_TOLERANCE &&
  Math.abs(rect.width - element.w) <= RECT_TOLERANCE &&
  Math.abs(rect.height - element.h) <= RECT_TOLERANCE;

export const getElementBoundsForSelection = (
  element: CanvasElement
): Rect | null => {
  if (element.visible === false || element.selectable === false) return null;
  if (element.type === "line" || element.type === "arrow") {
    const stroke = element.stroke ?? DEFAULT_STROKE;
    const markerPadding = element.type === "arrow" ? 12 : 0;
    const padding = Math.max(6, stroke.width, markerPadding);
    const minX = Math.min(element.start.x, element.end.x) - padding;
    const minY = Math.min(element.start.y, element.end.y) - padding;
    const width =
      Math.max(Math.abs(element.end.x - element.start.x), 1) + padding * 2;
    const height =
      Math.max(Math.abs(element.end.y - element.start.y), 1) + padding * 2;
    return { x: minX, y: minY, width, height };
  }
  return getRectFromElement(element);
};

export const normalizeSelectionRect = (
  start: { x: number; y: number },
  current: { x: number; y: number }
): SelectionRect => ({
  x: Math.min(start.x, current.x),
  y: Math.min(start.y, current.y),
  width: Math.abs(current.x - start.x),
  height: Math.abs(current.y - start.y),
});

export const rectsIntersect = (a: SelectionRect, b: Rect) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;
