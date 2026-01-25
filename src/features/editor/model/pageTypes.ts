import type { CanvasElement } from "./canvasTypes";
import type { TemplateId } from "../templates/templateRegistry";

export interface Page {
  id: string;
  pageNumber: number;
  templateId?: TemplateId | null;
  elements: CanvasElement[];
  orientation?: "horizontal" | "vertical";
}

export type CanvasDocument = {
  pages: Page[];
};
