// Common utility types
export type Point = {
  x: number;
  y: number;
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ResizeHandle = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

export type ElementType =
  | "text"
  | "rect"
  | "roundRect"
  | "ellipse"
  | "line"
  | "arrow";

export type ElementBase = {
  id: string;
  type: ElementType;
  visible?: boolean;
  locked?: boolean;
  selectable?: boolean;
  groupId?: string;
};

export type TextElement = ElementBase & {
  type: "text";
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  richText?: string;
  widthMode?: "auto" | "fixed";
  lockHeight?: boolean;
  style: {
    fontSize: number;
    fontWeight: "normal" | "bold";
    color: string;
    underline?: boolean;
    alignX: "left" | "center" | "right";
    alignY: "top" | "middle" | "bottom";
    lineHeight?: number;
    letterSpacing?: number;
  };
};

export type ShapeElement = ElementBase & {
  type: "rect" | "roundRect" | "ellipse";
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  imageScale?: number;
  imageOffset?: {
    x: number;
    y: number;
  };
  imageBox?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  radius?: number;
  border?: {
    enabled: boolean;
    color: string;
    width: number;
    style?: "solid" | "dashed" | "dotted" | "double";
  };
  text?: string;
  textStyle?: {
    fontSize?: number;
    fontWeight?: "normal" | "bold";
    color?: string;
  };
  labelId?: string;
};

export type LineElement = ElementBase & {
  type: "line" | "arrow";
  start: { x: number; y: number };
  end: { x: number; y: number };
  stroke: {
    color: string;
    width: number;
  };
};

export type CanvasElement = TextElement | ShapeElement | LineElement;

export type TemplateElement =
  | Omit<TextElement, "id">
  | Omit<ShapeElement, "id">
  | Omit<LineElement, "id">;

export type Template = {
  id: string;
  name: string;
  elements: TemplateElement[];
};
