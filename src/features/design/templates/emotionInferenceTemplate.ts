import type { Template } from "../model/canvasTypes";

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;

const pageWidthMm = 210;
const horizontalPaddingMm = 20;

const dateWidthMm = 50;
const dateHeightMm = 6;
const dateXmm = pageWidthMm - horizontalPaddingMm - dateWidthMm;
const dateYmm = 10;

const titleWidthMm = 160;
const titleHeightMm = 12;
const titleXmm = (pageWidthMm - titleWidthMm) / 2;
const titleYmm = 38;

const heroWidthMm = 160;
const heroHeightMm = 90;
const heroXmm = (pageWidthMm - heroWidthMm) / 2;
const heroYmm = 58;

const questionWidthMm = 160;
const questionHeightMm = 10;
const questionXmm = (pageWidthMm - questionWidthMm) / 2;
const questionYmm = heroYmm + heroHeightMm + 12;

const cardWidthMm = 40;
const cardHeightMm = 56;
const cardGapMm = 10;
const cardsRowWidthMm = cardWidthMm * 3 + cardGapMm * 2;
const cardsStartXmm = (pageWidthMm - cardsRowWidthMm) / 2;
const cardsStartYmm = questionYmm + 12;
const labelHeightMm = 8;
const labelYmm = cardsStartYmm + cardHeightMm + 6;

const pillWidthMm = 140;
const pillHeightMm = 18;
const pillXmm = (pageWidthMm - pillWidthMm) / 2;
const pillYmm = labelYmm + labelHeightMm + 12;

export const emotionInferenceTemplate: Template = {
  id: "emotionInference",
  name: "감정 추론 활동",
  elements: [
    {
      type: "text",
      x: mmToPx(dateXmm),
      y: mmToPx(dateYmm),
      w: mmToPx(dateWidthMm),
      h: mmToPx(dateHeightMm),
      text: "월&nbsp;&nbsp;&nbsp;&nbsp;일&nbsp;&nbsp;&nbsp;&nbsp;요일",
      style: {
        fontSize: 24,
        fontWeight: "normal",
        color: "#111827",
        underline: false,
        alignX: "right",
        alignY: "middle",
      },
    },
    {
      type: "text",
      x: mmToPx(titleXmm),
      y: mmToPx(titleYmm),
      w: mmToPx(titleWidthMm),
      h: mmToPx(titleHeightMm),
      text: "제목을 입력하세요",
      widthMode: "fixed",
      lockHeight: true,
      style: {
        fontSize: 26,
        fontWeight: "bold",
        color: "#111827",
        underline: false,
        alignX: "center",
        alignY: "middle",
      },
    },
    {
      type: "roundRect",
      x: mmToPx(heroXmm),
      y: mmToPx(heroYmm),
      w: mmToPx(heroWidthMm),
      h: mmToPx(heroHeightMm),
      fill: "#D1D5DB",
      radius: mmToPx(8),
      border: {
        enabled: false,
        color: "#D1D5DB",
        width: 2,
        style: "solid" as const,
      },
    },
    {
      type: "text",
      x: mmToPx(questionXmm),
      y: mmToPx(questionYmm),
      w: mmToPx(questionWidthMm),
      h: mmToPx(questionHeightMm),
      text: "기분이 어떨까요?",
      widthMode: "fixed",
      lockHeight: true,
      style: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#111827",
        underline: false,
        alignX: "center",
        alignY: "middle",
      },
    },
    ...Array.from({ length: 3 }).flatMap((_, index) => {
      const cardXmm = cardsStartXmm + index * (cardWidthMm + cardGapMm);
      return [
        {
          type: "roundRect" as const,
          x: mmToPx(cardXmm),
          y: mmToPx(cardsStartYmm),
          w: mmToPx(cardWidthMm),
          h: mmToPx(cardHeightMm),
          fill: "#FFFFFF",
          radius: mmToPx(6),
          border: {
            enabled: true,
            color: "#A5B4FC",
            width: 2,
            style: "solid" as const,
          },
        },
        {
          type: "text" as const,
          x: mmToPx(cardXmm),
          y: mmToPx(cardsStartYmm),
          w: mmToPx(cardWidthMm),
          h: mmToPx(cardHeightMm),
          text: "감정을 선택해주세요",
          locked: true,
          widthMode: "fixed" as const,
          style: {
            fontSize: 10,
            fontWeight: "normal" as const,
            color: "#A5B4FC",
            underline: false as const,
            alignX: "center" as const,
            alignY: "middle" as const,
          },
        },
        {
          type: "text" as const,
          x: mmToPx(cardXmm),
          y: mmToPx(labelYmm),
          w: mmToPx(cardWidthMm),
          h: mmToPx(labelHeightMm),
          text: "(감정)",
          widthMode: "fixed" as const,
          style: {
            fontSize: 20,
            fontWeight: "normal" as const,
            color: "#111827",
            underline: false as const,
            alignX: "center" as const,
            alignY: "middle" as const,
          },
        },
      ];
    }),
    {
      type: "roundRect",
      x: mmToPx(pillXmm),
      y: mmToPx(pillYmm),
      w: mmToPx(pillWidthMm),
      h: mmToPx(pillHeightMm),
      fill: "#E5E7EB",
      radius: mmToPx(12),
      border: {
        enabled: false,
        color: "#E5E7EB",
        width: 2,
        style: "solid" as const,
      },
    },
    {
      type: "text",
      x: mmToPx(pillXmm),
      y: mmToPx(pillYmm),
      w: mmToPx(pillWidthMm),
      h: mmToPx(pillHeightMm),
      text: "아이는 __________",
      widthMode: "fixed",
      lockHeight: true,
      style: {
        fontSize: 20,
        fontWeight: "normal",
        color: "#111827",
        underline: false,
        alignX: "center",
        alignY: "middle",
      },
    },
  ],
};
