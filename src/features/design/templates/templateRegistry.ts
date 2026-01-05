import type { Template } from "../model/canvasTypes";
import { emotionWorksheetTemplate } from "./emotionWorksheetTemplate";
import { emotionInferenceTemplate } from "./emotionInferenceTemplate";
import { findItemTemplate } from "./findItemTemplate";
import { wordPairTemplate } from "./wordPairTemplate";

export type TemplateOrientation = "free" | "vertical-only" | "horizontal-only";

export const TEMPLATE_REGISTRY = {
  findItem: {
    id: "findItem",
    label: "사물 찾기",
    template: findItemTemplate,
    orientation: "vertical-only" as TemplateOrientation,
  },
  emotionInference: {
    id: "emotionInference",
    label: "감정 추론 활동",
    template: emotionInferenceTemplate,
    orientation: "vertical-only" as TemplateOrientation,
  },
  emotionWorksheet: {
    id: "emotionWorksheet",
    label: "감정 워크시트(심화)",
    template: emotionWorksheetTemplate,
    orientation: "vertical-only" as TemplateOrientation,
  },
  wordPair: {
    id: "wordPair",
    label: "낱말 짝꿍 (단어+그림)",
    template: wordPairTemplate,
    orientation: "vertical-only" as TemplateOrientation,
  },
};

export type TemplateId = keyof typeof TEMPLATE_REGISTRY;

export type TemplateDefinition = {
  id: TemplateId;
  label: string;
  template: Template;
  orientation: TemplateOrientation;
};
