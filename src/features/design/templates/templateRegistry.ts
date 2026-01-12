import type { Template } from "../model/canvasTypes";
import { emotionWorksheetTemplate } from "./emotionWorksheetTemplate";
import { emotionInferencePage1 } from "./emotion_inference/page_1";
import { emotionInferencePage2 } from "./emotion_inference/page_2";
import { emotionInferencePage3 } from "./emotion_inference/page_3";
import { emotionInferencePage4 } from "./emotion_inference/page_4";
import { findItemTemplate } from "./findItemTemplate";
import { normal_1 } from "../normal_templates/normal_1";
import { normal_2 } from "../normal_templates/normal_2";
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
    template: emotionInferencePage1,
    orientation: "vertical-only" as TemplateOrientation,
    pages: [
      emotionInferencePage1,
      emotionInferencePage2,
      emotionInferencePage3,
      emotionInferencePage4,
    ],
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
  normal_1: {
    id: "normal_1",
    label: "템플릿1",
    template: normal_1,
    orientation: "vertical-only" as TemplateOrientation,
  },
  normal_2: {
    id: "normal_2",
    label: "템플릿2",
    template: normal_2,
    orientation: "vertical-only" as TemplateOrientation,
  },
};

export type TemplateId = keyof typeof TEMPLATE_REGISTRY;

export type TemplateDefinition = {
  id: TemplateId;
  label: string;
  template: Template;
  orientation: TemplateOrientation;
  pages?: Template[];
};
