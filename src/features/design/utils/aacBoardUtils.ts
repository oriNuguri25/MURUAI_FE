import type { TemplateElement } from "../model/canvasTypes";

export type AacLabelPosition = "top" | "bottom" | "none";

export type AacBoardConfig = {
  rows: number;
  columns: number;
  orientation: "horizontal" | "vertical";
  labelPosition: AacLabelPosition;
};

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;

export const buildAacBoardElements = ({
  rows,
  columns,
  orientation,
  labelPosition,
}: AacBoardConfig): TemplateElement[] => {
  const pageWidthMm = orientation === "horizontal" ? 297 : 210;
  const pageHeightMm = orientation === "horizontal" ? 210 : 297;
  const paddingTopMm = 18;
  const paddingBottomMm = 12;
  const paddingHorizontalMm = 12;
  const gapMm = 6;
  const contentWidthMm = pageWidthMm - paddingHorizontalMm * 2;
  const contentHeightMm = pageHeightMm - paddingTopMm - paddingBottomMm;
  const cellWidthMm = (contentWidthMm - gapMm * (columns - 1)) / columns;
  const cellHeightMm = (contentHeightMm - gapMm * (rows - 1)) / rows;
  const maxLabelHeightMm = 12;
  const labelInset = mmToPx(2);
  const labelGap = mmToPx(4);
  const boxInset = mmToPx(1);
  const imagePadding = mmToPx(3);
  const labelFontSize = 18;
  const elements: TemplateElement[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const cellX = mmToPx(paddingHorizontalMm + col * (cellWidthMm + gapMm));
      const cellY = mmToPx(paddingTopMm + row * (cellHeightMm + gapMm));
      const cellWidth = mmToPx(cellWidthMm);
      const cellHeight = mmToPx(cellHeightMm);
      const boxWidth = Math.max(1, cellWidth - boxInset * 2);
      const boxHeight = Math.max(1, cellHeight - boxInset * 2);
      const boxX = cellX + (cellWidth - boxWidth) / 2;
      const boxY = cellY + (cellHeight - boxHeight) / 2;
      const labelHeight =
        labelPosition === "none"
          ? 0
          : Math.min(mmToPx(maxLabelHeightMm), Math.max(0, boxHeight * 0.35));
      const labelY =
        labelPosition === "top"
          ? boxY + labelInset
          : labelPosition === "bottom"
          ? boxY + boxHeight - labelHeight - labelInset
          : boxY;
      const labelAreaHeight =
        labelPosition === "none" ? 0 : labelHeight + labelGap;
      const imageAreaX = boxX + imagePadding;
      const imageAreaWidth = Math.max(1, boxWidth - imagePadding * 2);
      const imageAreaY =
        boxY + imagePadding + (labelPosition === "top" ? labelAreaHeight : 0);
      const imageAreaHeight = Math.max(
        1,
        boxHeight - imagePadding * 2 - labelAreaHeight
      );
      const imageBoxSize = Math.max(
        1,
        Math.min(imageAreaWidth, imageAreaHeight)
      );
      const imageBoxX = imageAreaX + (imageAreaWidth - imageBoxSize) / 2;
      const imageBoxY = imageAreaY + (imageAreaHeight - imageBoxSize) / 2;
      const radius = Math.min(
        mmToPx(6),
        Math.min(boxWidth, boxHeight) / 2
      );

      elements.push({
        type: "roundRect",
        x: boxX,
        y: boxY,
        w: boxWidth,
        h: boxHeight,
        fill: "#ffffff",
        radius,
        imageBox: {
          x: imageBoxX - boxX,
          y: imageBoxY - boxY,
          w: imageBoxSize,
          h: imageBoxSize,
        },
        border: {
          enabled: true,
          color: "#E5E7EB",
          width: 2,
          style: "solid",
        },
      });

      if (labelPosition !== "none" && labelHeight > 0) {
        elements.push({
          type: "text",
          x: boxX,
          y: labelY,
          w: boxWidth,
          h: labelHeight,
          text: "단어",
          widthMode: "fixed",
          lockHeight: true,
          style: {
            fontSize: labelFontSize,
            fontWeight: "normal",
            color: "#6B7280",
            underline: false,
            alignX: "center",
            alignY: "middle",
          },
        });
      }
    }
  }

  return elements;
};
