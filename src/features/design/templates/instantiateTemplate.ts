import type { CanvasElement, Template } from "../model/canvasTypes";
import { fitTemplateTextElement } from "../utils/templateTextFit";

export const instantiateTemplate = (template: Template): CanvasElement[] =>
  template.elements.map((element) => ({
    ...fitTemplateTextElement(element),
    id: crypto.randomUUID(),
  }));
