import type { CanvasElement, Template } from "../model/canvasTypes";

export const instantiateTemplate = (template: Template): CanvasElement[] =>
  template.elements.map((element) => ({
    ...element,
    id: crypto.randomUUID(),
  }));
