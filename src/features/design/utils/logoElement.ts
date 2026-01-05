import { images } from "@/shared/assets";
import type { CanvasElement, TemplateElement } from "../model/canvasTypes";

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;

const logoFill = `url(${images.mainLogo})`;

export const getLogoTemplateElement = (): TemplateElement => ({
  type: "rect",
  x: mmToPx(0),
  y: mmToPx(-12),
  w: mmToPx(40),
  h: mmToPx(40),
  fill: logoFill,
  locked: true,
});

export const hasLogoElement = (
  elements: Array<CanvasElement | TemplateElement>
) =>
  elements.some(
    (element) =>
      element.type === "rect" &&
      "fill" in element &&
      element.fill === logoFill
  );

export const withLogoTemplateElements = (elements: TemplateElement[]) =>
  hasLogoElement(elements) ? elements : [getLogoTemplateElement(), ...elements];

export const withLogoCanvasElements = (elements: CanvasElement[]) =>
  hasLogoElement(elements)
    ? elements
    : [{ ...getLogoTemplateElement(), id: crypto.randomUUID() }, ...elements];
